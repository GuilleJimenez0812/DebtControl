package ports

import (
	"context"
	"errors"
	"time"

	"debtcontrol/backend/internal/core/domain"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	Update(ctx context.Context, user *domain.User) error
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

type OrderSearcher interface {
	SearchOrders(ctx context.Context, query string, personIDs []string, limit int) ([]*SearchResult, error)
}

// EmailSender delivers transactional emails (currently password-reset OTPs).
// Implementations must be safe to call without a configured provider (a no-op
// or dev logger) so local dev and tests never need real credentials.
type EmailSender interface {
	SendPasswordResetOTP(ctx context.Context, toEmail string, code string) error
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
	FindPackagesByPurchaseID(ctx context.Context, purchaseID string) ([]*domain.ShippingPackage, error)
	FindPackageByID(ctx context.Context, id string) (*domain.ShippingPackage, error)
	SavePackage(ctx context.Context, pkg *domain.ShippingPackage) error
	DeletePackagesByPurchaseID(ctx context.Context, purchaseID string) error

	ResetAllData(ctx context.Context) error
	RunInTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}

// SessionStore persists access-token revocation and opaque refresh sessions.
type SessionStore interface {
	// --- access token blacklist (existing behaviour) ---
	StoreSession(ctx context.Context, userID string, tokenID string, expiration time.Duration) error
	IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error)
	InvalidateSession(ctx context.Context, tokenID string, expiration time.Duration) error

	// --- refresh session families (rotation + reuse detection) ---
	// CreateRefreshSession issues a fresh opaque refresh token for the user and
	// returns the plaintext token (sent to the client once) and its family id.
	// Only a hash of the token is ever stored.
	CreateRefreshSession(ctx context.Context, userID string, expiration time.Duration) (token string, familyID string, err error)
	// RotateRefreshSession validates the presented opaque token, rotates it to a
	// new token, and returns the new plaintext (familyID unchanged). If the
	// presented token was already spent (reuse detected) the whole family is
	// revoked and ErrRefreshReuse is returned.
	RefreshSession(ctx context.Context, presentedToken string, expiration time.Duration) (userID string, familyID string, newToken string, err error)
	// RevokeSession revokes the family owning the presented refresh token (single-device logout).
	RevokeSession(ctx context.Context, presentedToken string) error
	// RevokeAllUserSessions revokes every refresh session family of the user (logout-everywhere).
	RevokeAllUserSessions(ctx context.Context, userID string) error

	// StoreMFAChallenge records a short-lived, single-use MFA login ticket for
	// the user (used to bridge a verified password to a completed login).
	StoreMFAChallenge(ctx context.Context, ticket string, userID string, expiration time.Duration) error
	// ConsumeMFAChallenge atomically redeems the ticket once, returning the
	// user id. Redeeming an already-spent ticket returns an error.
	ConsumeMFAChallenge(ctx context.Context, ticket string) (string, error)

	// StorePasswordResetOTP records a short-lived 6-digit reset code keyed by
	// email, with a limited attempt budget. Codes are redeemed once (single-use).
	StorePasswordResetOTP(ctx context.Context, email string, code string, maxAttempts int, expiration time.Duration) error
	// VerifyPasswordResetOTP checks the presented code in constant time. On a
	// valid code it consumes it (single-use) and returns true, nil. A wrong
	// code decrements the remaining attempts. A bool=false with nil error means
	// the code was wrong but the caller may retry; any error means the code can
	// no longer be used (exhausted, expired, or never issued).
	VerifyPasswordResetOTP(ctx context.Context, email string, presentedCode string) (valid bool, err error)

	// ResetPasswordTicket mirrors the MFA ticket so a verified OTP can be
	// exchanged single-use for the actual password update.
	StorePasswordResetTicket(ctx context.Context, ticket string, email string, expiration time.Duration) error
	ConsumePasswordResetTicket(ctx context.Context, ticket string) (string, error)
}

// ErrRefreshReuse signals a previously rotated refresh token was presented again.
var ErrRefreshReuse = errors.New("refresh token reuse detected, session revoked")

type AuthUseCase interface {
	Register(ctx context.Context, email string, password string, fullName string) (*domain.User, error)
	Login(ctx context.Context, email string, password string) (*LoginResult, error)
	CompleteLoginWithTOTP(ctx context.Context, ticket string, presentedCode string) (*LoginResult, error)
	Refresh(ctx context.Context, presentedRefreshToken string) (accessToken string, newRefreshToken string, user *domain.User, err error)
	Logout(ctx context.Context, tokenID string, refreshToken string) error
	LogoutEverywhere(ctx context.Context, userID string) error
	ValidateAccessToken(ctx context.Context, tokenString string) (*domain.User, string, error)

	GenerateTOTP(ctx context.Context, userID string) (secret string, provisioningURI string, err error)
	EnableTOTP(ctx context.Context, userID string, presentedCode string) error
	DisableTOTP(ctx context.Context, userID string, presentedCode string) error
	GetTOTPStatus(ctx context.Context, userID string) (enabled bool, err error)

	// ChangePassword verifies the current password, applies the password policy
	// to the new one, and revokes the user's other sessions.
	ChangePassword(ctx context.Context, userID string, currentPassword string, newPassword string) error

	// RequestPasswordReset emails a short-lived single-use OTP to the account
	// (or silently succeeds for unknown emails to avoid enumeration).
	RequestPasswordReset(ctx context.Context, email string) error
	// VerifyPasswordResetOTP validates the emailed code and returns a single-use
	// ticket that unlocks the actual password update.
	VerifyPasswordResetOTP(ctx context.Context, email string, presentedCode string) (ticket string, err error)
	// ResetPassword redeems the verified ticket and sets the new password.
	ResetPassword(ctx context.Context, ticket string, newPassword string) error
}

// LoginResult captures a successful password check. When MFA is required the
// service does not yet issue tokens; it returns a short-lived, single-use
// challenge that the client must redeem with a verified TOTP code.
type LoginResult struct {
	User            *domain.User
	AccessToken     string
	RefreshToken    string
	MFAPendingLogin bool
	MFATicket       string
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
	TotalOutstanding float64                   `json:"total_outstanding"`
	TotalJuly26      float64                   `json:"total_july_26"`
	TotalAugust26    float64                   `json:"total_august_26"`
	Persons          []*domain.Person          `json:"persons"`
	RecentPurchases  []*domain.PurchaseItem    `json:"recent_purchases"`
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
