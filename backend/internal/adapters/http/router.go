package http

import (
	"time"

	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(authUseCase ports.AuthUseCase, debtUseCase ports.DebtUseCase) *gin.Engine {
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
			debtGroup.GET("/summary", debtHandler.GetDashboardSummary)
			debtGroup.GET("/persons", debtHandler.ListPersons)
			debtGroup.POST("/purchases", debtHandler.CreatePurchase)
			debtGroup.POST("/payments", debtHandler.RecordPayment)
			debtGroup.POST("/seed", debtHandler.SeedData)
		}
	}

	return routerEngine
}
