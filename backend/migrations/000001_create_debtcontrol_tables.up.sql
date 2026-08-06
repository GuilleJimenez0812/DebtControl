-- Up Migration: Create DebtControl Tables

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS persons (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    total_owed NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Paid',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id VARCHAR(64) PRIMARY KEY,
    person_id VARCHAR(64) NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    person_name VARCHAR(255) NOT NULL,
    order_number VARCHAR(255),
    description TEXT NOT NULL,
    item_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    detail_period VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(64) PRIMARY KEY,
    person_id VARCHAR(64) NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipping_batches (
    id VARCHAR(64) PRIMARY KEY,
    batch_month VARCHAR(50) NOT NULL UNIQUE,
    total_flight_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipping_packages (
    id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) REFERENCES shipping_batches(id) ON DELETE SET NULL,
    order_number VARCHAR(255),
    tracking_number VARCHAR(255),
    shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    item_description TEXT,
    warehouse_received BOOLEAN NOT NULL DEFAULT FALSE,
    dispatch_date VARCHAR(100),
    batch_month VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_person ON purchase_items(person_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_person ON payment_transactions(person_id);
CREATE INDEX IF NOT EXISTS idx_shipping_packages_batch ON shipping_packages(batch_id);
