package domain

import (
	"errors"
	"time"
)

var (
	ErrPersonNotFound      = errors.New("person not found")
	ErrInvalidAmount        = errors.New("amount must be greater than zero")
	ErrPurchaseItemNotFound = errors.New("purchase item not found")
)

type PersonStatus string

const (
	StatusPending PersonStatus = "Pending"
	StatusPaid    PersonStatus = "Paid"
)

type Person struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	TotalOwed float64      `json:"total_owed"`
	TotalPaid float64      `json:"total_paid"`
	Balance   float64      `json:"balance"`
	Status    PersonStatus `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

func NewPerson(id string, name string) *Person {
	currentTime := time.Now()
	return &Person{
		ID:        id,
		Name:      name,
		TotalOwed: 0.0,
		TotalPaid: 0.0,
		Balance:   0.0,
		Status:    StatusPaid,
		CreatedAt: currentTime,
		UpdatedAt: currentTime,
	}
}

func (person *Person) RecalculateBalance() {
	person.Balance = person.TotalOwed - person.TotalPaid
	if person.Balance <= 0.01 {
		person.Balance = 0.0
		person.Status = StatusPaid
	} else {
		person.Status = StatusPending
	}
	person.UpdatedAt = time.Now()
}

type PurchaseItem struct {
	ID            string    `json:"id"`
	PersonID      string    `json:"person_id"`
	PersonName    string    `json:"person_name"`
	OrderNumber   string    `json:"order_number"`
	Description   string    `json:"description"`
	ItemAmount    float64   `json:"item_amount"`
	TaxAmount     float64   `json:"tax_amount"`
	ShippingCost  float64   `json:"shipping_cost"`
	TotalCost     float64   `json:"total_cost"`
	DetailPeriod  string    `json:"detail_period"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func NewPurchaseItem(id string, personID string, personName string, orderNumber string, description string, itemAmount float64, taxAmount float64, shippingCost float64, detailPeriod string) (*PurchaseItem, error) {
	if itemAmount < 0 || taxAmount < 0 || shippingCost < 0 {
		return nil, ErrInvalidAmount
	}

	totalCost := itemAmount + taxAmount + shippingCost
	currentTime := time.Now()

	return &PurchaseItem{
		ID:           id,
		PersonID:     personID,
		PersonName:   personName,
		OrderNumber:  orderNumber,
		Description:  description,
		ItemAmount:   itemAmount,
		TaxAmount:    taxAmount,
		ShippingCost: shippingCost,
		TotalCost:    totalCost,
		DetailPeriod: detailPeriod,
		CreatedAt:    currentTime,
		UpdatedAt:    currentTime,
	}, nil
}

type PaymentTransaction struct {
	ID          string    `json:"id"`
	PersonID    string    `json:"person_id"`
	AmountPaid  float64   `json:"amount_paid"`
	Notes       string    `json:"notes"`
	PaymentDate time.Time `json:"payment_date"`
}

type ShippingPackage struct {
	ID                string    `json:"id"`
	OrderNumber       string    `json:"order_number"`
	TrackingNumber    string    `json:"tracking_number"`
	ShippingCost      float64   `json:"shipping_cost"`
	ItemDescription   string    `json:"item_description"`
	WarehouseReceived bool      `json:"warehouse_received"`
	DispatchDate      string    `json:"dispatch_date"`
	BatchMonth        string    `json:"batch_month"`
	CreatedAt         time.Time `json:"created_at"`
}
