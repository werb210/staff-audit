const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixBankingAnalysisSchema() {
  console.log('Fixing banking_analysis table schema...\n');

  try {
    // Drop the existing table and recreate it with correct schema
    const dropTableSQL = `DROP TABLE IF EXISTS banking_analysis CASCADE;`;
    await pool.query(dropTableSQL);
    console.log('✅ Dropped existing banking_analysis table');

    // Create table matching the Drizzle schema exactly
    const createTableSQL = `
      CREATE TABLE banking_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES applications(id),
        document_id UUID REFERENCES documents(id),
        
        -- Account Information
        bank_name VARCHAR(100),
        account_number VARCHAR(50),
        account_type VARCHAR(50),
        statement_period JSONB,
        
        -- Balance Analysis
        opening_balance DECIMAL(12,2),
        closing_balance DECIMAL(12,2),
        average_daily_balance DECIMAL(12,2),
        minimum_balance DECIMAL(12,2),
        maximum_balance DECIMAL(12,2),
        
        -- Transaction Summary
        total_deposits DECIMAL(12,2),
        total_withdrawals DECIMAL(12,2),
        total_checks DECIMAL(12,2),
        total_fees DECIMAL(12,2),
        transaction_count INTEGER,
        deposit_count INTEGER,
        withdrawal_count INTEGER,
        
        -- Cash Flow Metrics
        net_cash_flow DECIMAL(12,2),
        average_monthly_inflow DECIMAL(12,2),
        average_monthly_outflow DECIMAL(12,2),
        cash_flow_trend VARCHAR(20),
        volatility_score DECIMAL(5,2),
        
        -- NSF Analysis
        nsf_count INTEGER DEFAULT 0,
        nsf_fees DECIMAL(10,2) DEFAULT 0.00,
        overdraft_days INTEGER DEFAULT 0,
        insufficient_funds_risk VARCHAR(20),
        
        -- Business Indicators
        business_deposits DECIMAL(12,2),
        personal_withdrawals DECIMAL(12,2),
        operating_expenses DECIMAL(12,2),
        merchant_fees DECIMAL(12,2),
        employee_payments DECIMAL(12,2),
        
        -- Advanced Analysis (JSONB fields)
        recurring_withdrawals JSONB,
        large_deposits JSONB,
        unusual_activity JSONB,
        transaction_patterns JSONB,
        
        -- Risk Assessment
        risk_factors JSONB,
        financial_health_score INTEGER,
        recommendations TEXT[],
        
        -- Metadata
        confidence_level VARCHAR(20),
        analysis_version VARCHAR(20),
        processing_time INTEGER,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await pool.query(createTableSQL);
    console.log('✅ Created new banking_analysis table with correct schema');

    // Create indexes
    const indexSQL = `
      CREATE INDEX idx_banking_analysis_application_id ON banking_analysis(application_id);
      CREATE INDEX idx_banking_analysis_document_id ON banking_analysis(document_id);
      CREATE INDEX idx_banking_analysis_created_at ON banking_analysis(created_at);
    `;

    await pool.query(indexSQL);
    console.log('✅ Created database indexes');

    console.log('\n🎉 Banking analysis schema is now properly aligned with Drizzle schema!');

  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
  } finally {
    await pool.end();
  }
}

fixBankingAnalysisSchema();