package domain

import "time"

type CatExpense struct {
	ID             string    `json:"id"`
	ItemName       string    `json:"item_name"`
	Platform       string    `json:"platform"`
	PaymentMethod  string    `json:"payment_method"`
	AmountUSD      float64   `json:"amount_usd"`
	AmountVEF      *float64  `json:"amount_vef"`
	ExchangeRateID *string   `json:"exchange_rate_id"`
	RegisteredBy   string    `json:"registered_by"`
	ExpenseDate    time.Time `json:"expense_date"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
