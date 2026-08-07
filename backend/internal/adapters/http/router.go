package http

import (
	"time"

	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/pkg/ratelimit"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SecurityOptions wires the anti-bruteforce guards into the router.
type SecurityOptions struct {
	RateLimiter      *ratelimit.Limiter
	LoginPolicies    []ratelimit.Policy // per IP+account
	RegisterPolicies []ratelimit.Policy // per IP
	GlobalPolicies   []ratelimit.Policy // per IP, every /api/v1 request
	TurnstileSecret  string
}

func SetupRouter(authUseCase ports.AuthUseCase, debtUseCase ports.DebtUseCase, adminUseCase ports.AdminUseCase, allowedOrigins []string, registrationEnabled bool, security SecurityOptions) *gin.Engine {
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
	if security.RateLimiter != nil && len(security.GlobalPolicies) > 0 {
		apiGroup.Use(RateLimitMiddleware(security.RateLimiter, "api", security.GlobalPolicies, nil))
	}
	{
		authGroup := apiGroup.Group("/auth")
		{
			authGroup.GET("/registration-status", authHandler.RegistrationStatus)
			if registrationEnabled {
				authGroup.POST("/register",
					CSRFMiddleware(true),
					RateLimitMiddleware(security.RateLimiter, "register", security.RegisterPolicies, nil),
					TurnstileMiddleware(security.TurnstileSecret),
					authHandler.Register)
			}
			authGroup.POST("/login",
				CSRFMiddleware(true),
				RateLimitMiddleware(security.RateLimiter, "login", security.LoginPolicies, func(ginContext *gin.Context) string {
					var payload struct {
						Email string `json:"email"`
					}
					_ = ginContext.ShouldBindBodyWithJSON(&payload)
					return payload.Email
				}),
				TurnstileMiddleware(security.TurnstileSecret),
				authHandler.Login)
			authGroup.POST("/login/totp", CSRFMiddleware(true), authHandler.CompleteLoginWithTOTP)
			authGroup.GET("/mfa/status", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.GetTOTPStatus)
			authGroup.POST("/mfa/setup", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.GenerateTOTP)
			authGroup.POST("/mfa/enable", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.EnableTOTP)
			authGroup.POST("/mfa/disable", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.DisableTOTP)
			authGroup.POST("/refresh", CSRFMiddleware(true), authHandler.Refresh)
			authGroup.POST("/logout", CSRFMiddleware(true), authHandler.Logout)
			authGroup.POST("/logout-everywhere", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.LogoutEverywhere)
			authGroup.POST("/change-password", CSRFMiddleware(true), AuthMiddleware(authUseCase), authHandler.ChangePassword)
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
