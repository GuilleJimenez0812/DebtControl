package http

import (
	"time"

	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(authUseCase ports.AuthUseCase, debtUseCase ports.DebtUseCase, adminUseCase ports.AdminUseCase, allowedOrigins []string, registrationEnabled bool) *gin.Engine {
	routerEngine := gin.Default()

	routerEngine.Use(SecurityHeadersMiddleware())

	routerEngine.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authHandler := NewAuthHandler(authUseCase, registrationEnabled)
	debtHandler := NewDebtHandler(debtUseCase)
	adminHandler := NewAdminHandler(adminUseCase)

	apiGroup := routerEngine.Group("/api/v1")
	{
		authGroup := apiGroup.Group("/auth")
		{
			authGroup.GET("/registration-status", authHandler.RegistrationStatus)
			if registrationEnabled {
				authGroup.POST("/register", CSRFMiddleware(true), authHandler.Register)
			}
			authGroup.POST("/login", CSRFMiddleware(true), authHandler.Login)
			authGroup.POST("/refresh", CSRFMiddleware(true), authHandler.Refresh)
			authGroup.POST("/logout", CSRFMiddleware(true), authHandler.Logout)
			authGroup.POST("/logout-everywhere", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.LogoutEverywhere)
			authGroup.GET("/me", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.GetCurrentUser)
		}

		debtGroup := apiGroup.Group("/debts")
		debtGroup.Use(AuthMiddleware(authUseCase), CSRFMiddleware(false))
		{
			// Read operations (available to all authenticated users, scoped by person permissions)
			debtGroup.GET("/summary", debtHandler.GetDashboardSummary)
			debtGroup.GET("/persons", debtHandler.ListPersons)
			debtGroup.GET("/search", debtHandler.SearchOrders)

			// Admin-only write/mutation operations
			debtGroup.POST("/purchases", RequireAdminRole(), debtHandler.CreatePurchase)
			debtGroup.POST("/purchases/upload-invoice", RequireAdminRole(), debtHandler.UploadInvoice)
			debtGroup.POST("/purchases/confirm-invoice", RequireAdminRole(), debtHandler.ConfirmAttachInvoice)
			debtGroup.PUT("/purchases/:id", RequireAdminRole(), debtHandler.UpdatePurchase)
			debtGroup.PUT("/purchases/:id/person", RequireAdminRole(), debtHandler.ReassignPurchase)
			debtGroup.DELETE("/purchases/:id", RequireAdminRole(), debtHandler.DeletePurchase)
			debtGroup.POST("/purchases/:id/packages", RequireAdminRole(), debtHandler.CreatePackage)
			debtGroup.PUT("/packages/:id", RequireAdminRole(), debtHandler.UpdatePackage)
			debtGroup.POST("/payments", RequireAdminRole(), debtHandler.RecordPayment)
			debtGroup.POST("/seed", RequireAdminRole(), debtHandler.SeedData)
		}

		adminGroup := apiGroup.Group("/admin")
		adminGroup.Use(AuthMiddleware(authUseCase), RequireAdminRole(), CSRFMiddleware(false))
		{
			adminGroup.GET("/users", adminHandler.ListUsers)
			adminGroup.POST("/users", adminHandler.CreateUser)
			adminGroup.PUT("/users/:id/persons", adminHandler.AssignPersons)
			adminGroup.GET("/audit-logs", debtHandler.GetAuditLogs)
		}
	}

	return routerEngine
}
