-- Future database schema for full banking analysis implementation
-- This would be used when actual bank transaction data is available

-- Bank transactions table for detailed transaction analysis
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id),
    tx_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
    description TEXT NOT NULL,
    normalized_description TEXT,
    merchant_name VARCHAR(255),
    counterparty_name VARCHAR(255),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bank statement headers table for address extraction
CREATE TABLE IF NOT EXISTS bank_statement_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id),
    page INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    line TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_app_date ON bank_transactions(application_id, tx_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_description ON bank_transactions USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_bank_statement_headers_app ON bank_statement_headers(application_id);

-- Note: Currently using applications.banking_analysis JSONB column for demo data
-- This schema would be used when implementing full OCR-based transaction extraction