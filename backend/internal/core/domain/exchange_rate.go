package domain

import (
	"time"
)

const (
	CurrencyUSD = "USD"
	CurrencyEUR = "EUR"
	CurrencyVEF = "VEF"

	SourceBCVScraper = "bcv_scraper"
	SourceManual     = "manual"
)

type ExchangeRate struct {
	ID        string    `json:"id"`
	Currency  string    `json:"currency"`
	Rate      float64   `json:"rate"`
	Source    string    `json:"source"`
	CreatedAt time.Time `json:"created_at"`
}
