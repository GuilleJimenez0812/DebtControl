package main

import (
	"context"
	"fmt"
	"log"
	"os"

	httpAdapter "debtcontrol/backend/internal/adapters/http"
	postgresAdapter "debtcontrol/backend/internal/adapters/postgres"
	redisAdapter "debtcontrol/backend/internal/adapters/redis"
	"debtcontrol/backend/internal/core/ports"
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

	databaseURL := os.Getenv("DATABASE_URL")
	var dsn string

	if databaseURL != "" {
		dsn = databaseURL
	} else {
		postgresHost := getEnvOrDefault("POSTGRES_HOST", "localhost")
		postgresUser := getEnvOrDefault("POSTGRES_USER", "postgres")
		postgresPassword := getEnvOrDefault("POSTGRES_PASSWORD", "postgrespassword")
		postgresDB := getEnvOrDefault("POSTGRES_DB", "debtcontrol")
		postgresPort := getEnvOrDefault("POSTGRES_PORT", "5432")
		postgresSSLMode := getEnvOrDefault("POSTGRES_SSLMODE", "disable")

		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			postgresHost, postgresUser, postgresPassword, postgresDB, postgresPort, postgresSSLMode)
	}

	databaseConnection, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Database connection failure: %v", err)
	}

	err = databaseConnection.AutoMigrate(
		&postgresAdapter.UserModel{},
		&postgresAdapter.UserPersonModel{},
		&postgresAdapter.PersonModel{},
		&postgresAdapter.PurchaseItemModel{},
		&postgresAdapter.PaymentTransactionModel{},
		&postgresAdapter.ShippingPackageModel{},
		&postgresAdapter.AuditLogModel{},
	)
	if err != nil {
		log.Fatalf("Failed to execute database migrations: %v", err)
	}
	log.Println("Database migrations completed successfully.")

	userRepository := postgresAdapter.NewUserRepository(databaseConnection)
	ctx := context.Background()
	_ = userRepository.EnsureFirstUserIsAdmin(ctx)

	var sessionRepository ports.SessionStore
	redisHost := os.Getenv("REDIS_HOST")
	redisEnabled := getEnvOrDefault("REDIS_ENABLED", "false")

	if redisEnabled == "true" && redisHost != "" {
		redisPort := getEnvOrDefault("REDIS_PORT", "6379")
		redisClient := redis.NewClient(&redis.Options{
			Addr: fmt.Sprintf("%s:%s", redisHost, redisPort),
		})
		sessionRepository = redisAdapter.NewSessionRepository(redisClient)
		log.Println("Redis session store connected.")
	} else {
		sessionRepository = redisAdapter.NewMemorySessionRepository()
		log.Println("Redis is disabled. Using in-memory session store fallback.")
	}

	debtRepository := postgresAdapter.NewDebtRepository(databaseConnection)
	auditRepository := postgresAdapter.NewAuditRepository(databaseConnection)

	jwtSecret := getEnvOrDefault("JWT_SECRET", "super-secret-debtcontrol-jwt-key-2026")
	authService := services.NewAuthService(userRepository, sessionRepository, jwtSecret)
	debtService := services.NewDebtService(debtRepository, auditRepository, userRepository)
	adminService := services.NewAdminService(userRepository, debtRepository)

	_ = debtService.SeedInitialSpreadsheetData(ctx)

	routerEngine := httpAdapter.SetupRouter(authService, debtService, adminService)

	serverPort := getEnvOrDefault("PORT", "8080")
	log.Printf("Server listening on http://localhost:%s", serverPort)
	if err := routerEngine.Run(":" + serverPort); err != nil {
		log.Fatalf("Server shutdown with error: %v", err)
	}
}
