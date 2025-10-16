const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createBankingAnalysisTable() {
  console.log('Creating banking_analysis table...\n');

  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS banking_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES applications(id),
        document_id UUID REFERENCES documents(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- Bank Information
        bank_name VARCHAR(255),
        account_number VARCHAR(100),
        account_type VARCHAR(50),
        statement_start_date VARCHAR(50),
        statement_end_date VARCHAR(50),
        
        -- Balance Information
        opening_balance DECIMAL(15,2),
        closing_balance DECIMAL(15,2),
        average_daily_balance DECIMAL(15,2),
        minimum_balance DECIMAL(15,2),
        maximum_balance DECIMAL(15,2),
        
        -- Transaction Summary
        total_deposits DECIMAL(15,2),
        total_withdrawals DECIMAL(15,2),
        total_checks DECIMAL(15,2),
        total_fees DECIMAL(15,2),
        transaction_count INTEGER,
        deposit_count INTEGER,
        withdrawal_count INTEGER,
        
        -- Cash Flow Analysis
        net_cash_flow DECIMAL(15,2),
        average_monthly_inflow DECIMAL(15,2),
        average_monthly_outflow DECIMAL(15,2),
        cash_flow_trend VARCHAR(20),
        volatility_score DECIMAL(5,2),
        
        -- NSF Analysis
        nsf_count INTEGER,
        nsf_fees DECIMAL(15,2),
        overdraft_days INTEGER,
        insufficient_funds_risk VARCHAR(20),
        
        -- Transaction Patterns (JSON)
        large_deposits JSONB,
        recurring_withdrawals JSONB,
        unusual_activity JSONB,
        
        -- Business Indicators
        business_deposits DECIMAL(15,2),
        personal_withdrawals DECIMAL(15,2),
        operating_expenses DECIMAL(15,2),
        merchant_fees DECIMAL(15,2),
        employee_payments DECIMAL(15,2),
        
        -- Risk Assessment
        risk_factors JSONB,
        financial_health_score INTEGER,
        recommendations TEXT[],
        
        -- Metadata
        confidence_level VARCHAR(20),
        analysis_version VARCHAR(20),
        processing_time INTEGER
      );
    `;

    await pool.query(createTableSQL);
    console.log('✅ banking_analysis table created successfully');

    // Create indexes for better performance
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_banking_analysis_application_id ON banking_analysis(application_id);
      CREATE INDEX IF NOT EXISTS idx_banking_analysis_document_id ON banking_analysis(document_id);
      CREATE INDEX IF NOT EXISTS idx_banking_analysis_created_at ON banking_analysis(created_at);
    `;

    await pool.query(indexSQL);
    console.log('✅ Database indexes created successfully');

    console.log('\n🎉 V2 Banking Analysis Module database schema ready!');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await pool.end();
  }
}

createBankingAnalysisTable();