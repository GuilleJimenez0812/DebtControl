package postgres

import (
	"time"

	"gorm.io/gorm"
)

type UserModel struct {
	ID           string    `gorm:"primaryKey;type:varchar(64)"`
	Email        string    `gorm:"type:text;not null;serializer:encrypted"`
	EmailHash    string    `gorm:"uniqueIndex;type:varchar(64)"`
	PasswordHash string    `gorm:"type:text;not null"`
	FullName     string    `gorm:"type:text;not null;serializer:encrypted"`
	Role         string    `gorm:"type:varchar(50);not null;default:'user'"`
	TOTPSecret   string    `gorm:"type:text;serializer:encrypted"`
	TOTPEnabled  bool      `gorm:"default:false"`
	CreatedAt    time.Time         `gorm:"autoCreateTime"`
	UpdatedAt    time.Time         `gorm:"autoUpdateTime"`
	Modules      []UserModuleModel `gorm:"foreignKey:UserID"`
}

func (UserModel) TableName() string {
	return "users"
}

type UserPersonModel struct {
	UserID    string    `gorm:"primaryKey;type:varchar(64);not null"`
	PersonID  string    `gorm:"primaryKey;type:varchar(64);not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (UserPersonModel) TableName() string {
	return "user_persons"
}

type UserModuleModel struct {
	UserID     string `gorm:"primaryKey;type:varchar(64);not null"`
	ModuleName string `gorm:"primaryKey;type:varchar(50);not null"`
}

func (UserModuleModel) TableName() string {
	return "user_modules"
}

type PersonModel struct {
	ID        string    `gorm:"primaryKey;type:varchar(64)"`
	Name      string    `gorm:"uniqueIndex;type:varchar(255);not null"`
	TotalOwed float64   `gorm:"type:numeric(10,2);default:0"`
	TotalPaid float64   `gorm:"type:numeric(10,2);default:0"`
	Balance   float64   `gorm:"type:numeric(10,2);default:0"`
	Status    string    `gorm:"type:varchar(50);not null;default:'Paid'"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

func (PersonModel) TableName() string {
	return "persons"
}

type PurchaseItemModel struct {
	ID           string         `gorm:"primaryKey;type:varchar(64)"`
	PersonID     string         `gorm:"index;type:varchar(64);not null"`
	PersonName   string         `gorm:"type:varchar(255)"`
	OrderNumber  string         `gorm:"type:varchar(255)"`
	Description  string         `gorm:"type:text"`
	ItemAmount   float64        `gorm:"type:numeric(10,2);default:0"`
	TaxAmount    float64        `gorm:"type:numeric(10,2);default:0"`
	ShippingCost float64        `gorm:"type:numeric(10,2);default:0"`
	TotalCost    float64        `gorm:"type:numeric(10,2);default:0"`
	DetailPeriod string         `gorm:"type:varchar(50)"`
	InvoiceURL   string         `gorm:"type:text"`
	CreatedAt    time.Time      `gorm:"autoCreateTime"`
	UpdatedAt    time.Time      `gorm:"autoUpdateTime"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

func (PurchaseItemModel) TableName() string {
	return "purchase_items"
}

type PaymentTransactionModel struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)"`
	PersonID    string    `gorm:"index;type:varchar(64);not null"`
	AmountPaid  float64   `gorm:"type:numeric(10,2);not null"`
	Notes       string    `gorm:"type:text;serializer:encrypted"`
	PaymentDate time.Time `gorm:"autoCreateTime"`
}

func (PaymentTransactionModel) TableName() string {
	return "payment_transactions"
}

type ShippingPackageModel struct {
	ID                 string         `gorm:"primaryKey;type:varchar(64)"`
	PurchaseItemID     string         `gorm:"index;type:varchar(64)"`
	OrderNumber        string         `gorm:"type:varchar(255)"`
	TrackingNumber     string         `gorm:"type:varchar(255)"`
	ShippingCost       float64        `gorm:"type:numeric(10,2);default:0"`
	ItemDescription    string         `gorm:"type:text"`
	WarehouseReceived  bool           `gorm:"default:false"`
	PersonallyReceived bool           `gorm:"default:false"`
	DispatchDate       string         `gorm:"type:varchar(100)"`
	BatchMonth         string         `gorm:"type:varchar(50)"`
	CreatedAt          time.Time      `gorm:"autoCreateTime"`
	UpdatedAt          time.Time      `gorm:"autoUpdateTime"`
	DeletedAt          gorm.DeletedAt `gorm:"index"`
}

func (ShippingPackageModel) TableName() string {
	return "shipping_packages"
}

type AuditLogModel struct {
	ID         string    `gorm:"primaryKey;type:varchar(64)"`
	UserID     string    `gorm:"index;type:varchar(64)"`
	UserEmail  string    `gorm:"type:text;serializer:encrypted"`
	Action     string    `gorm:"type:varchar(50)"`
	EntityType string    `gorm:"type:varchar(50)"`
	EntityID   string    `gorm:"type:varchar(64)"`
	Details    string    `gorm:"type:text;serializer:encrypted"`
	CreatedAt  time.Time `gorm:"autoCreateTime;index"`
}

func (AuditLogModel) TableName() string {
	return "audit_logs"
}

type ExchangeRateModel struct {
	ID        string    `gorm:"primaryKey;type:varchar(64)"`
	Currency  string    `gorm:"index:idx_exchange_rates_currency_created;type:varchar(10);not null"`
	Rate      float64   `gorm:"type:numeric(10,4);not null"`
	Source    string    `gorm:"type:varchar(20);not null"`
	CreatedAt time.Time `gorm:"index:idx_exchange_rates_currency_created;autoCreateTime"`
}

func (ExchangeRateModel) TableName() string {
	return "exchange_rates"
}

type CatExpenseModel struct {
	ID             string    `gorm:"primaryKey;type:varchar(64)"`
	ItemName       string    `gorm:"type:varchar(255);not null"`
	Platform       string    `gorm:"type:varchar(100);not null"`
	PaymentMethod  string    `gorm:"type:varchar(100);not null"`
	AmountUSD      float64   `gorm:"type:numeric(12,4);not null"`
	AmountVEF      *float64  `gorm:"type:numeric(12,4)"`
	ExchangeRateID *string   `gorm:"type:varchar(64)"`
	RegisteredBy   string    `gorm:"type:varchar(64);not null"`
	ExpenseDate    time.Time `gorm:"index:idx_cat_expenses_date;not null"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
}

func (CatExpenseModel) TableName() string {
	return "cat_expenses"
}
