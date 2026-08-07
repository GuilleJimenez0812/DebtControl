package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	httpAdapter "debtcontrol/backend/internal/adapters/http"
	emailAdapter "debtcontrol/backend/internal/adapters/email"
	postgresAdapter "debtcontrol/backend/internal/adapters/postgres"
	redisAdapter "debtcontrol/backend/internal/adapters/redis"
	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/internal/core/services"
	"debtcontrol/backend/pkg/ratelimit"
	"debtcontrol/backend/pkg/secrets"

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

func getEnvBoolOrDefault(envKey string, defaultValue bool) bool {
	raw := os.Getenv(envKey)
	if raw == "" {
		return defaultValue
	}
	parsed, err := strconv.ParseBool(raw)
	if err != nil {
		log.Printf("WARNING: %s has an invalid boolean value; using default %t", envKey, defaultValue)
		return defaultValue
	}
	return parsed
}

// getAppEnv returns the deployment environment, defaulting to development.
// Non-development environments (production, staging, preview, ...) enforce
// strict startup: secrets must be supplied or the process aborts.
func getAppEnv() string {
	return getEnvOrDefault("APP_ENV", secrets.EnvDevelopment)
}

func main() {
	log.Println("Starting DebtControl Backend API...")

	appEnv := getAppEnv()

	encryptionKey, err := secrets.Resolve("ENCRYPTION_KEY", appEnv, "insecure-dev-encryption-key")
	if err != nil {
		log.Fatalf("FATAL: %v", err)
	}
	if err := postgresAdapter.SetupEncryption(encryptionKey); err != nil {
		log.Fatalf("Failed to configure field encryption: %v", err)
	}

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

	// The plaintext unique index on users.email predates field encryption;
	// uniqueness is now enforced through users.email_hash.
	if databaseConnection.Migrator().HasIndex(&postgresAdapter.UserModel{}, "idx_users_email") {
		_ = databaseConnection.Migrator().DropIndex(&postgresAdapter.UserModel{}, "idx_users_email")
	}
	log.Println("Database migrations completed successfully.")

	userRepository := postgresAdapter.NewUserRepository(databaseConnection)
	debtRepository := postgresAdapter.NewDebtRepository(databaseConnection)
	orderSearcher := postgresAdapter.NewOrderSearchRepository(databaseConnection)
	ctx := context.Background()
	_ = userRepository.EnsureFirstUserIsAdmin(ctx)
	_ = debtRepository.EnsurePurchaseItemForeignKey(ctx)

	var sessionRepository ports.SessionStore
	var redisClient *redis.Client
	redisHost := os.Getenv("REDIS_HOST")
	redisEnabled := getEnvOrDefault("REDIS_ENABLED", "false")

	if redisEnabled == "true" && redisHost != "" {
		redisPort := getEnvOrDefault("REDIS_PORT", "6379")
		redisClient = redis.NewClient(&redis.Options{
			Addr: fmt.Sprintf("%s:%s", redisHost, redisPort),
		})
		sessionRepository = redisAdapter.NewSessionRepository(redisClient)
		log.Println("Redis session store connected.")
	} else {
		sessionRepository = redisAdapter.NewMemorySessionRepository()
		log.Println("Redis is disabled. Using in-memory session store fallback.")
	}

	auditRepository := postgresAdapter.NewAuditRepository(databaseConnection)

	jwtSecret, err := secrets.Resolve("JWT_SECRET", appEnv, "super-secret-debtcontrol-jwt-key-2026")
	if err != nil {
		log.Fatalf("FATAL: %v", err)
	}
	emailSender := emailAdapter.NewResendSender(getEnvOrDefault("EMAIL_FROM", "DebtControl <otp@mail.yourdomain.com>"))
	authService := services.NewAuthService(userRepository, sessionRepository, emailSender, jwtSecret)
	debtService := services.NewDebtService(debtRepository, auditRepository, userRepository, orderSearcher)
	adminService := services.NewAdminService(userRepository, debtRepository)

	_ = debtService.SeedInitialSpreadsheetData(ctx)

	var rateLimitStore ratelimit.Store = ratelimit.NewMemoryStore()
	if redisClient != nil {
		rateLimitStore = ratelimit.NewRedisStore(redisClient)
	}
	rateLimiter := ratelimit.NewLimiter(rateLimitStore)

	securityOptions := httpAdapter.SecurityOptions{
		RateLimiter:     rateLimiter,
		TurnstileSecret: getEnvOrDefault("TURNSTILE_SECRET", ""),
		// Login: per IP+account, 5 per 15 minutes (credential stuffing resistant).
		LoginPolicies: []ratelimit.Policy{
			{Limit: 5, Window: 15 * time.Minute},
		},
		// Register: per IP, 10 per 24h (closed by default; generous ceiling for admins).
		RegisterPolicies: []ratelimit.Policy{
			{Limit: 10, Window: 24 * time.Hour},
		},
		// Global API throttle: per IP, 300 per minute protects against abusive traffic.
		GlobalPolicies: []ratelimit.Policy{
			{Limit: 300, Window: time.Minute},
		},
		// Forgot-password: per IP, 3 per 15 minutes (OTP mailbox flooding).
		ResetRequestPolicies: []ratelimit.Policy{
			{Limit: 3, Window: 15 * time.Minute},
		},
		// OTP/ticket verification: per IP, 10 per 15 minutes (code guessing).
		ResetVerifyPolicies: []ratelimit.Policy{
			{Limit: 10, Window: 15 * time.Minute},
		},
	}

	allowedOrigins := strings.Split(getEnvOrDefault(
		"ALLOWED_ORIGINS",
		"http://localhost:5173,http://localhost:3000,https://debtcontrol-1.onrender.com",
	), ",")
	routerEngine := httpAdapter.SetupRouter(authService, debtService, adminService, allowedOrigins, getEnvBoolOrDefault("REGISTRATION_ENABLED", false), securityOptions)

	serverPort := getEnvOrDefault("PORT", "8080")
	log.Printf("Server listening on http://localhost:%s", serverPort)
	if err := routerEngine.Run(":" + serverPort); err != nil {
		log.Fatalf("Server shutdown with error: %v", err)
	}
}
