package postgres

import (
	"time"
)

type UserModel struct {
	ID           string    `gorm:"primaryKey;type:varchar(64)"`
	Email        string    `gorm:"uniqueIndex;type:varchar(255);not null"`
	PasswordHash string    `gorm:"type:text;not null"`
	FullName     string    `gorm:"type:varchar(255);not null"`
	Role         string    `gorm:"type:varchar(50);not null;default:'user'"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}

func (UserModel) TableName() string {
	return "users"
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
	ID           string    `gorm:"primaryKey;type:varchar(64)"`
	PersonID     string    `gorm:"index;type:varchar(64);not null"`
	PersonName   string    `gorm:"type:varchar(255)"`
	OrderNumber  string    `gorm:"type:varchar(255)"`
	Description  string    `gorm:"type:text"`
	ItemAmount   float64   `gorm:"type:numeric(10,2);default:0"`
	TaxAmount    float64   `gorm:"type:numeric(10,2);default:0"`
	ShippingCost float64   `gorm:"type:numeric(10,2);default:0"`
	TotalCost    float64   `gorm:"type:numeric(10,2);default:0"`
	DetailPeriod string    `gorm:"type:varchar(50)"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}

func (PurchaseItemModel) TableName() string {
	return "purchase_items"
}

type PaymentTransactionModel struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)"`
	PersonID    string    `gorm:"index;type:varchar(64);not null"`
	AmountPaid  float64   `gorm:"type:numeric(10,2);not null"`
	Notes       string    `gorm:"type:text"`
	PaymentDate time.Time `gorm:"autoCreateTime"`
}

func (PaymentTransactionModel) TableName() string {
	return "payment_transactions"
}

type ShippingPackageModel struct {
	ID                string    `gorm:"primaryKey;type:varchar(64)"`
	OrderNumber       string    `gorm:"type:varchar(255)"`
	TrackingNumber    string    `gorm:"type:varchar(255)"`
	ShippingCost      float64   `gorm:"type:numeric(10,2);default:0"`
	ItemDescription   string    `gorm:"type:text"`
	WarehouseReceived bool      `gorm:"default:false"`
	DispatchDate      string    `gorm:"type:varchar(100)"`
	BatchMonth        string    `gorm:"type:varchar(50)"`
	CreatedAt         time.Time `gorm:"autoCreateTime"`
}

func (ShippingPackageModel) TableName() string {
	return "shipping_packages"
}
