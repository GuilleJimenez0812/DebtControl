package domain

import "time"

type AuditLog struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	UserEmail  string    `json:"user_email"`
	Action     string    `json:"action"`      // CREATE, UPDATE, DELETE
	EntityType string    `json:"entity_type"` // Person, PurchaseItem, PaymentTransaction, ShippingPackage
	EntityID   string    `json:"entity_id"`
	Details    string    `json:"details"`
	CreatedAt  time.Time `json:"created_at"`
}
