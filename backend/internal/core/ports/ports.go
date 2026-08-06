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
	FindAll(ctx context.Context) ([]*domain.User, error)
	EnsureFirstUserIsAdmin(ctx context.Context) error

	AssignPersonsToUser(ctx context.Context, userID string, personIDs []string) error
	GetAssignedPersonIDs(ctx context.Context, userID string) ([]string, error)
}

type AuditRepository interface {
	SaveAuditLog(ctx context.Context, log *domain.AuditLog) error
	GetAuditLogs(ctx context.Context, limit int, offset int) ([]*domain.AuditLog, error)
}

type DebtRepository interface {
	FindAllPersons(ctx context.Context) ([]*domain.Person, error)
	FindPersonByID(ctx context.Context, id string) (*domain.Person, error)
	SavePerson(ctx context.Context, person *domain.Person) error

	FindAllPurchases(ctx context.Context) ([]*domain.PurchaseItem, error)
	FindPurchaseByID(ctx context.Context, id string) (*domain.PurchaseItem, error)
	FindPurchaseItemByOrderNumber(ctx context.Context, orderNumber string) (*domain.PurchaseItem, error)
	SavePurchase(ctx context.Context, purchase *domain.PurchaseItem) error
	DeletePurchase(ctx context.Context, id string) error

	FindPaymentsByPersonID(ctx context.Context, personID string) ([]*domain.PaymentTransaction, error)
	SavePayment(ctx context.Context, payment *domain.PaymentTransaction) error

	FindAllPackages(ctx context.Context) ([]*domain.ShippingPackage, error)
	FindPackagesByOrderNumber(ctx context.Context, orderNumber string) ([]*domain.ShippingPackage, error)
	FindPackagesByPurchaseID(ctx context.Context, purchaseID string) ([]*domain.ShippingPackage, error)
	FindPackageByID(ctx context.Context, id string) (*domain.ShippingPackage, error)
	SavePackage(ctx context.Context, pkg *domain.ShippingPackage) error
	DeletePackagesByPurchaseID(ctx context.Context, purchaseID string) error

	SearchOrders(ctx context.Context, query string, personIDs []string, limit int) ([]*SearchResult, error)

	RecalculateAllBalances(ctx context.Context) error
	ResetAllData(ctx context.Context) error
	RunInTransaction(ctx context.Context, fn func(ctx context.Context) error) error
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

type UserWithPersons struct {
	User            *domain.User     `json:"user"`
	AssignedPersons []*domain.Person `json:"assigned_persons"`
	AssignedIDs     []string         `json:"assigned_person_ids"`
}

type AdminUseCase interface {
	CreateUser(ctx context.Context, email string, password string, fullName string, role string) (*domain.User, error)
	ListUsersWithPersons(ctx context.Context) ([]*UserWithPersons, error)
	AssignPersonsToUser(ctx context.Context, userID string, personIDs []string) error
}

type DashboardSummary struct {
	TotalOutstanding float64                  `json:"total_outstanding"`
	TotalJuly26      float64                  `json:"total_july_26"`
	TotalAugust26    float64                  `json:"total_august_26"`
	Persons          []*domain.Person         `json:"persons"`
	RecentPurchases  []*domain.PurchaseItem   `json:"recent_purchases"`
	ShippingPackages []*domain.ShippingPackage `json:"shipping_packages"`
}

type ParseInvoiceResult struct {
	OrderNumber         string               `json:"order_number"`
	Description         string               `json:"description"`
	ItemAmount          float64              `json:"item_amount"`
	TaxAmount           float64              `json:"tax_amount"`
	ShippingCost        float64              `json:"shipping_cost"`
	TotalCost           float64              `json:"total_cost"`
	Matched             bool                 `json:"matched"`
	MatchedPurchaseItem *domain.PurchaseItem `json:"matched_purchase_item,omitempty"`
}

type SearchResult struct {
	PurchaseID     string  `json:"purchase_id"`
	PersonName     string  `json:"person_name"`
	OrderNumber    string  `json:"order_number"`
	Description    string  `json:"description"`
	TrackingNumber string  `json:"tracking_number,omitempty"`
	TotalCost      float64 `json:"total_cost"`
}

type DebtUseCase interface {
	GetDashboardSummaryForUser(ctx context.Context, user *domain.User) (*DashboardSummary, error)
	ListPersonsForUser(ctx context.Context, user *domain.User) ([]*domain.Person, error)
	CreatePurchaseItem(ctx context.Context, personName string, orderNumber string, description string, amount float64, tax float64, shipping float64, detailPeriod string) (*domain.PurchaseItem, error)
	UpdatePurchaseItem(ctx context.Context, id string, itemAmount float64, taxAmount float64, shippingCost float64, invoiceURL string) (*domain.PurchaseItem, error)
	UpdateShippingPackage(ctx context.Context, id string, shippingCost float64, warehouseReceived bool, personallyReceived bool, dispatchDate string) (*domain.ShippingPackage, error)
	CreateShippingPackage(ctx context.Context, purchaseID string, trackingNumber string, shippingCost float64) (*domain.ShippingPackage, error)
	ReassignPurchaseToPerson(ctx context.Context, orderID string, newPersonID string) (*domain.PurchaseItem, error)
	DeletePurchase(ctx context.Context, orderID string) error
	RecordPayment(ctx context.Context, personID string, amount float64, notes string) (*domain.PaymentTransaction, error)
	ProcessInvoiceUpload(ctx context.Context, fileBytes []byte, filename string) (*ParseInvoiceResult, error)
	ConfirmAttachInvoice(ctx context.Context, purchaseID string, invoiceFilename string, mode string) (*domain.PurchaseItem, error)
	SearchOrders(ctx context.Context, query string, user *domain.User, limit int) ([]*SearchResult, error)
	SeedInitialSpreadsheetData(ctx context.Context) error
	ResetAndSeedData(ctx context.Context) error
	GetAuditLogs(ctx context.Context, limit int, offset int) ([]*domain.AuditLog, error)
}
