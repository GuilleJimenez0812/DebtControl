CREATE TABLE IF NOT EXISTS cat_expenses (
    id VARCHAR(64) PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    amount_usd NUMERIC(12, 4) NOT NULL,
    amount_vef NUMERIC(12, 4),
    exchange_rate_id VARCHAR(64) REFERENCES exchange_rates(id),
    registered_by VARCHAR(64) NOT NULL REFERENCES users(id),
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cat_expenses_date ON cat_expenses(expense_date DESC);
