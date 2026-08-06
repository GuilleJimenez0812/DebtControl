package main

import (
	"context"
	"fmt"
	"log"
	"os"

	httpAdapter "debtcontrol/backend/internal/adapters/http"
	postgresAdapter "debtcontrol/backend/internal/adapters/postgres"
	redisAdapter "debtcontrol/backend/internal/adapters/redis"
	"debtcontrol/backend/internal/core/services"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func getEnvOrDefault(envKey string, defaultValue string) string {
	value := os.Getenv(envKey)
	if value == "" {
		return defaultValue
	}
	return value
}

func main() {
	log.Println("Starting DebtControl Backend API...")

	postgresHost := getEnvOrDefault("POSTGRES_HOST", "localhost")
	postgresUser := getEnvOrDefault("POSTGRES_USER", "postgres")
	postgresPassword := getEnvOrDefault("POSTGRES_PASSWORD", "postgres")
	postgresDB := getEnvOrDefault("POSTGRES_DB", "debtcontrol")
	postgresPort := getEnvOrDefault("POSTGRES_PORT", "5432")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		postgresHost, postgresUser, postgresPassword, postgresDB, postgresPort)

	databaseConnection, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Warning: Failed to connect to Postgres (%v). Falling back to local SQLite memory database for local execution.", err)
		// SQLite driver import fallback can be used if needed
		log.Fatalf("Database connection failure: %v", err)
	}

	err = databaseConnection.AutoMigrate(
		&postgresAdapter.UserModel{},
		&postgresAdapter.PersonModel{},
		&postgresAdapter.PurchaseItemModel{},
		&postgresAdapter.PaymentTransactionModel{},
		&postgresAdapter.ShippingPackageModel{},
	)
	if err != nil {
		log.Fatalf("Failed to execute database migrations: %v", err)
	}
	log.Println("Database migrations completed successfully.")

	redisHost := getEnvOrDefault("REDIS_HOST", "localhost")
	redisPort := getEnvOrDefault("REDIS_PORT", "6379")
	redisClient := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", redisHost, redisPort),
	})

	userRepository := postgresAdapter.NewUserRepository(databaseConnection)
	debtRepository := postgresAdapter.NewDebtRepository(databaseConnection)
	sessionRepository := redisAdapter.NewSessionRepository(redisClient)

	jwtSecret := getEnvOrDefault("JWT_SECRET", "super-secret-debtcontrol-jwt-key-2026")
	authService := services.NewAuthService(userRepository, sessionRepository, jwtSecret)
	debtService := services.NewDebtService(debtRepository)

	ctx := context.Background()
	_ = debtService.SeedInitialSpreadsheetData(ctx)

	routerEngine := httpAdapter.SetupRouter(authService, debtService)

	serverPort := getEnvOrDefault("PORT", "8080")
	log.Printf("Server listening on http://localhost:%s", serverPort)
	if err := routerEngine.Run(":" + serverPort); err != nil {
		log.Fatalf("Server shutdown with error: %v", err)
	}
}
