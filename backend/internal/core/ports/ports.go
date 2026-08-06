package ports

import (
	"context"
	"time"

	"debtcontrol/backend/internal/core/domain"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	FindByID(ctx context.Context, id string) (*domain.User, error)
}

type DebtRepository interface {
	FindAllPersons(ctx context.Context) ([]*domain.Person, error)
	FindPersonByID(ctx context.Context, id string) (*domain.Person, error)
	SavePerson(ctx context.Context, person *domain.Person) error

	FindAllPurchases(ctx context.Context) ([]*domain.PurchaseItem, error)
	SavePurchase(ctx context.Context, purchase *domain.PurchaseItem) error
	DeletePurchase(ctx context.Context, id string) error

	FindPaymentsByPersonID(ctx context.Context, personID string) ([]*domain.PaymentTransaction, error)
	SavePayment(ctx context.Context, payment *domain.PaymentTransaction) error

	FindAllPackages(ctx context.Context) ([]*domain.ShippingPackage, error)
	SavePackage(ctx context.Context, pkg *domain.ShippingPackage) error

	RecalculateAllBalances(ctx context.Context) error
}

type SessionStore interface {
	StoreSession(ctx context.Context, userID string, tokenID string, expiration time.Duration) error
	IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error)
	InvalidateSession(ctx context.Context, tokenID string, expiration time.Duration) error
}

type AuthUseCase interface {
	Register(ctx context.Context, email string, password string, fullName string) (*domain.User, error)
	Login(ctx context.Context, email string, password string) (accessToken string, refreshToken string, user *domain.User, err error)
	Logout(ctx context.Context, tokenID string) error
	ValidateAccessToken(ctx context.Context, tokenString string) (*domain.User, string, error)
}

type DashboardSummary struct {
	TotalOutstanding float64                  `json:"total_outstanding"`
	TotalJuly26      float64                  `json:"total_july_26"`
	TotalAugust26    float64                  `json:"total_august_26"`
	Persons          []*domain.Person         `json:"persons"`
	RecentPurchases  []*domain.PurchaseItem   `json:"recent_purchases"`
	ShippingPackages []*domain.ShippingPackage `json:"shipping_packages"`
}

type DebtUseCase interface {
	GetDashboardSummary(ctx context.Context) (*DashboardSummary, error)
	ListPersons(ctx context.Context) ([]*domain.Person, error)
	CreatePurchaseItem(ctx context.Context, personName string, orderNumber string, description string, amount float64, tax float64, shipping float64, detailPeriod string) (*domain.PurchaseItem, error)
	RecordPayment(ctx context.Context, personID string, amount float64, notes string) (*domain.PaymentTransaction, error)
	SeedInitialSpreadsheetData(ctx context.Context) error
}
