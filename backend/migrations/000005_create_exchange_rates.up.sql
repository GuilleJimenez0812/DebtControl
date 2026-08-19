CREATE TABLE IF NOT EXISTS exchange_rates (
    id VARCHAR(64) PRIMARY KEY,
    currency VARCHAR(10) NOT NULL,
    rate NUMERIC(10, 4) NOT NULL,
    source VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_exchange_rates_currency_created ON exchange_rates(currency, created_at DESC);
