package main

import (
	"context"
	"fmt"
	"log"
	"time"
	"os"

	"debtcontrol/backend/internal/adapters/postgres"
	"debtcontrol/backend/internal/core/domain"

	"github.com/google/uuid"
	gorm_postgres "gorm.io/driver/postgres"
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
	fmt.Println("Starting restore script...")
	
	postgresHost := getEnvOrDefault("POSTGRES_HOST", "localhost")
	postgresUser := getEnvOrDefault("POSTGRES_USER", "postgres")
	postgresPassword := getEnvOrDefault("POSTGRES_PASSWORD", "postgrespassword")
	postgresDB := getEnvOrDefault("POSTGRES_DB", "debtcontrol")
	postgresPort := getEnvOrDefault("POSTGRES_PORT", "5432")
	postgresSSLMode := getEnvOrDefault("POSTGRES_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		postgresHost, postgresUser, postgresPassword, postgresDB, postgresPort, postgresSSLMode)

	if err := postgres.SetupEncryption(getEnvOrDefault("ENCRYPTION_KEY", "insecure-dev-encryption-key")); err != nil {
		log.Fatalf("Failed to configure field encryption: %v", err)
	}

	db, err := gorm.Open(gorm_postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Database connection failure: %v", err)
	}

	repo := postgres.NewDebtRepository(db)

	ctx := context.Background()

	personData := []struct {
		Name      string
		TotalPaid float64
	}{
		{"Mama", 7.95},
		{"Papa", 110.00},
		{"Vale", 184.11},
		{"Antonio/Sonia", 300.00},
		{"Yo", 279.43},
	}

	persons, err := repo.FindAllPersons(ctx)
	if err != nil {
		log.Fatal(err)
	}

	for _, p := range persons {
		var matched float64
		for _, seed := range personData {
			if p.Name == seed.Name {
				matched = seed.TotalPaid
				break
			}
		}

		if matched > 0 {
			payment := &domain.PaymentTransaction{
				ID:          uuid.New().String(),
				PersonID:    p.ID,
				AmountPaid:  matched,
				Notes:       "Restauración de pago inicial (Seed Data)",
				PaymentDate: time.Now(),
			}

			err = repo.SavePayment(ctx, payment)
			if err != nil {
				log.Printf("Failed to save payment for %s: %v", p.Name, err)
			} else {
				fmt.Printf("Restored payment for %s: $%.2f\n", p.Name, matched)
			}
		}
	}

	err = repo.RecalculateAllBalances(ctx)
	if err != nil {
		log.Fatal("Failed to recalculate balances:", err)
	}
	
	fmt.Println("Done!")
}
