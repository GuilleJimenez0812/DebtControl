package http

import (
	"time"

	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(authUseCase ports.AuthUseCase, debtUseCase ports.DebtUseCase, adminUseCase ports.AdminUseCase) *gin.Engine {
	routerEngine := gin.Default()

	routerEngine.Use(SecurityHeadersMiddleware())

	routerEngine.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authHandler := NewAuthHandler(authUseCase)
	debtHandler := NewDebtHandler(debtUseCase)
	adminHandler := NewAdminHandler(adminUseCase)

	apiGroup := routerEngine.Group("/api/v1")
	{
		authGroup := apiGroup.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/logout", authHandler.Logout)
			authGroup.GET("/me", AuthMiddleware(authUseCase), authHandler.GetCurrentUser)
		}

		debtGroup := apiGroup.Group("/debts")
		debtGroup.Use(AuthMiddleware(authUseCase))
		{
			// Read operations (available to all authenticated users, scoped by person permissions)
			debtGroup.GET("/summary", debtHandler.GetDashboardSummary)
			debtGroup.GET("/persons", debtHandler.ListPersons)

			// Admin-only write/mutation operations
			debtGroup.POST("/purchases", RequireAdminRole(), debtHandler.CreatePurchase)
			debtGroup.POST("/purchases/upload-invoice", RequireAdminRole(), debtHandler.UploadInvoice)
			debtGroup.POST("/purchases/confirm-invoice", RequireAdminRole(), debtHandler.ConfirmAttachInvoice)
			debtGroup.PUT("/purchases/:id", RequireAdminRole(), debtHandler.UpdatePurchase)
			debtGroup.PUT("/packages/:id", RequireAdminRole(), debtHandler.UpdatePackage)
			debtGroup.POST("/payments", RequireAdminRole(), debtHandler.RecordPayment)
			debtGroup.POST("/seed", RequireAdminRole(), debtHandler.SeedData)
		}

		adminGroup := apiGroup.Group("/admin")
		adminGroup.Use(AuthMiddleware(authUseCase), RequireAdminRole())
		{
			adminGroup.GET("/users", adminHandler.ListUsers)
			adminGroup.POST("/users", adminHandler.CreateUser)
			adminGroup.PUT("/users/:id/persons", adminHandler.AssignPersons)
		}
	}

	return routerEngine
}
