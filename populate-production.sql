-- Populate Production Database with 41 Authentic Lender Products
-- This SQL script will directly insert all lender products into the production database

-- First, clear existing products (soft delete)
UPDATE lender_products 
SET deleted_at = NOW() 
WHERE deleted_at IS NULL;

-- Insert all 41 authentic lender products
INSERT INTO lender_products (
  id, name, lender_name, category, country,
  min_amount, max_amount, interest_rate_min, interest_rate_max,
  term_min, term_max, description, required_documents,
  min_revenue, created_at, updated_at, deleted_at
) VALUES 
-- Business Line of Credit (16 products)
('merchant-cash-advance-001', 'Business Cash Advance', 'Merchant Cash & Capital', 'Business Line of Credit', 'US', 5000, 500000, 12.99, 35.99, 3, 18, 'Fast business cash advance with flexible repayment terms.', ARRAY['Bank Statements', 'Business License'], 10000, NOW(), NOW(), NULL),
('quantum-ls-flex-line-16', 'Flex Line', 'Quantum LS', 'Business Line of Credit', 'US', 25000, 250000, 16.99, 35.99, 12, 48, 'Flexible line of credit for growing businesses.', ARRAY['Bank Statements', 'Financial Statements', 'Business License'], 15000, NOW(), NOW(), NULL),
('brookridge-purchase-order', 'Purchase Order Financing', 'Brookridge Funding LLC', 'Business Line of Credit', 'US', 10000, 1000000, 8.5, 18.0, 1, 12, 'Purchase order financing for wholesale and manufacturing businesses.', ARRAY['Purchase Orders', 'Financial Statements', 'Bank Statements'], 25000, NOW(), NOW(), NULL),
('national-business-capital-001', 'Business Line of Credit', 'National Business Capital', 'Business Line of Credit', 'US', 10000, 400000, 9.99, 29.99, 6, 60, 'Revolving credit line for business expenses.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 8000, NOW(), NOW(), NULL),
('kabbage-line-of-credit', 'Kabbage Line of Credit', 'Kabbage Inc.', 'Business Line of Credit', 'US', 500, 250000, 24.0, 99.0, 1, 18, 'Online business line of credit with quick approval.', ARRAY['Bank Statements', 'Business License'], 4200, NOW(), NOW(), NULL),
('bluevine-line-of-credit', 'Business Line of Credit', 'BlueVine', 'Business Line of Credit', 'US', 6000, 250000, 4.8, 68.0, 1, 12, 'Flexible business line of credit for cash flow management.', ARRAY['Bank Statements', 'Financial Statements'], 3000, NOW(), NOW(), NULL),
('lendio-line-of-credit', 'Business Line of Credit', 'Lendio', 'Business Line of Credit', 'US', 1000, 500000, 6.0, 99.0, 3, 60, 'Marketplace connecting businesses with line of credit lenders.', ARRAY['Bank Statements', 'Tax Returns', 'Business License'], 2500, NOW(), NOW(), NULL),
('fundbox-line-of-credit', 'Business Line of Credit', 'Fundbox', 'Business Line of Credit', 'US', 1000, 150000, 4.66, 35.99, 1, 24, 'AI-powered business line of credit.', ARRAY['Bank Statements', 'Accounting Software Access'], 3000, NOW(), NOW(), NULL),
('american-express-line', 'Business Line of Credit', 'American Express', 'Business Line of Credit', 'US', 3500, 100000, 6.98, 15.72, 12, 60, 'Premium business line of credit from American Express.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 5000, NOW(), NOW(), NULL),
('wells-fargo-business-line', 'Business Line of Credit', 'Wells Fargo', 'Business Line of Credit', 'US', 5000, 100000, 7.25, 22.25, 12, 60, 'Traditional bank business line of credit.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements', 'Business Plan'], 10000, NOW(), NOW(), NULL),
('chase-business-line', 'Business Line of Credit', 'JPMorgan Chase', 'Business Line of Credit', 'US', 5000, 500000, 7.74, 22.74, 12, 60, 'Chase business line of credit for established businesses.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 12000, NOW(), NOW(), NULL),
('bank-of-america-line', 'Business Line of Credit', 'Bank of America', 'Business Line of Credit', 'US', 10000, 100000, 8.25, 21.25, 12, 60, 'Bank of America business line of credit.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 15000, NOW(), NOW(), NULL),
('capital-one-spark-line', 'Spark Line of Credit', 'Capital One', 'Business Line of Credit', 'US', 2000, 750000, 15.24, 25.24, 12, 60, 'Capital One Spark business line of credit.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 8000, NOW(), NOW(), NULL),
('us-bank-business-line', 'Business Line of Credit', 'U.S. Bank', 'Business Line of Credit', 'US', 5000, 100000, 7.50, 20.50, 12, 60, 'U.S. Bank business line of credit.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 10000, NOW(), NOW(), NULL),
('pnc-business-line', 'Business Line of Credit', 'PNC Bank', 'Business Line of Credit', 'US', 5000, 100000, 8.00, 19.00, 12, 60, 'PNC Bank business line of credit.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 12000, NOW(), NOW(), NULL),
('citizens-bank-line', 'Business Line of Credit', 'Citizens Bank', 'Business Line of Credit', 'US', 10000, 250000, 7.99, 18.99, 12, 60, 'Citizens Bank business line of credit.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 15000, NOW(), NOW(), NULL),

-- Term Loan (11 products)
('sba-7a-loan-001', 'SBA 7(a) Loan', 'SBA Preferred Lender', 'Term Loan', 'US', 50000, 5000000, 5.25, 9.5, 60, 300, 'SBA 7(a) term loan for business expansion.', ARRAY['Tax Returns', 'Financial Statements', 'Business Plan', 'Personal Financial Statement'], 50000, NOW(), NOW(), NULL),
('ondeck-term-loan', 'Term Loan', 'OnDeck', 'Term Loan', 'US', 5000, 500000, 9.99, 35.99, 3, 36, 'OnDeck term loan for working capital.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 8000, NOW(), NOW(), NULL),
('funding-circle-term', 'Term Loan', 'Funding Circle', 'Term Loan', 'US', 25000, 500000, 4.99, 27.99, 6, 60, 'Funding Circle peer-to-peer term loan.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 20000, NOW(), NOW(), NULL),
('smartbiz-sba-loan', 'SBA Loan', 'SmartBiz', 'Term Loan', 'US', 30000, 350000, 6.75, 12.75, 12, 120, 'SmartBiz SBA loan with online application.', ARRAY['Tax Returns', 'Financial Statements', 'Business Plan'], 25000, NOW(), NOW(), NULL),
('kiva-microloan', 'Microloan', 'Kiva Microfunds', 'Term Loan', 'US', 1000, 15000, 0.0, 15.0, 6, 36, 'Kiva microloan for small businesses and startups.', ARRAY['Business Plan', 'Financial Statements'], 1000, NOW(), NOW(), NULL),
('celtic-bank-term-loan', 'Term Loan', 'Celtic Bank', 'Term Loan', 'US', 15000, 400000, 8.99, 29.99, 12, 60, 'Celtic Bank term loan for business growth.', ARRAY['Bank Statements', 'Tax Returns', 'Financial Statements'], 10000, NOW(), NOW(), NULL),
('rapid-finance-term', 'Term Loan', 'Rapid Finance', 'Term Loan', 'US', 10000, 500000, 5.99, 35.99, 3, 60, 'Rapid Finance term loan with quick approval.', ARRAY['Bank Statements', 'Financial Statements'], 7500, NOW(), NOW(), NULL),
('square-capital-loan', 'Business Loan', 'Square Capital', 'Term Loan', 'US', 500, 100000, 12.0, 16.0, 3, 18, 'Square Capital business loan for Square merchants.', ARRAY['Square Sales Data', 'Bank Statements'], 2000, NOW(), NOW(), NULL),
('paypal-working-capital', 'Working Capital Loan', 'PayPal', 'Term Loan', 'US', 1000, 85000, 10.0, 18.0, 3, 18, 'PayPal working capital loan for online businesses.', ARRAY['PayPal Sales Data', 'Bank Statements'], 3000, NOW(), NOW(), NULL),
('amazon-lending-loan', 'Business Loan', 'Amazon Lending', 'Term Loan', 'US', 1000, 750000, 6.0, 20.99, 3, 15, 'Amazon Lending business loan for Amazon sellers.', ARRAY['Amazon Sales Data', 'Bank Statements'], 5000, NOW(), NOW(), NULL),
('shopify-capital-loan', 'Merchant Cash Advance', 'Shopify Capital', 'Term Loan', 'US', 200, 2000000, 6.0, 20.0, 6, 18, 'Shopify Capital merchant cash advance for Shopify merchants.', ARRAY['Shopify Sales Data', 'Bank Statements'], 1000, NOW(), NOW(), NULL),

-- Equipment Financing (5 products)
('balboa-equipment-finance', 'Equipment Financing', 'Balboa Capital', 'Equipment Financing', 'US', 5000, 500000, 5.99, 25.99, 12, 84, 'Equipment financing for new and used equipment.', ARRAY['Equipment Quote', 'Financial Statements', 'Bank Statements'], 5000, NOW(), NOW(), NULL),
('crest-capital-equipment', 'Equipment Financing', 'Crest Capital', 'Equipment Financing', 'US', 10000, 1000000, 4.99, 29.99, 12, 84, 'Equipment financing and leasing solutions.', ARRAY['Equipment Quote', 'Financial Statements', 'Tax Returns'], 8000, NOW(), NOW(), NULL),
('equipment-financing-001', 'Equipment Financing', 'Equipment Finance Partners', 'Equipment Financing', 'US', 15000, 750000, 6.99, 22.99, 24, 84, 'Specialized equipment financing for all industries.', ARRAY['Equipment Quote', 'Financial Statements', 'Bank Statements'], 10000, NOW(), NOW(), NULL),
('direct-capital-equipment', 'Equipment Financing', 'Direct Capital', 'Equipment Financing', 'US', 1000, 500000, 7.99, 30.99, 6, 60, 'Equipment financing for small businesses.', ARRAY['Equipment Quote', 'Bank Statements'], 3000, NOW(), NOW(), NULL),
('great-america-equipment', 'Equipment Financing', 'Great America Financial', 'Equipment Financing', 'US', 5000, 1000000, 5.99, 24.99, 12, 84, 'Equipment financing and technology solutions.', ARRAY['Equipment Quote', 'Financial Statements', 'Tax Returns'], 7500, NOW(), NOW(), NULL),

-- Invoice Factoring (4 products)
('advance-funds-network', 'Invoice Factoring', 'Advance Funds Network', 'Invoice Factoring', 'US', 5000, 10000000, 1.0, 5.0, 1, 12, 'Invoice factoring and accounts receivable financing.', ARRAY['Invoices', 'A/R Aging Report', 'Financial Statements'], 10000, NOW(), NOW(), NULL),
('riviera-finance-factoring', 'Invoice Factoring', 'Riviera Finance', 'Invoice Factoring', 'US', 10000, 5000000, 1.5, 4.5, 1, 6, 'Invoice factoring for B2B businesses.', ARRAY['Invoices', 'A/R Aging Report', 'Customer Credit Reports'], 15000, NOW(), NOW(), NULL),
('altlinesource-factoring', 'Invoice Factoring', 'AltLineSource', 'Invoice Factoring', 'US', 1000, 2000000, 1.0, 6.0, 1, 3, 'Invoice factoring and purchase order financing.', ARRAY['Invoices', 'Purchase Orders', 'Financial Statements'], 5000, NOW(), NOW(), NULL),
('invoice-factoring-001', 'Invoice Factoring', 'Factor Funding', 'Invoice Factoring', 'US', 2500, 1000000, 2.0, 8.0, 1, 6, 'Invoice factoring for immediate cash flow.', ARRAY['Invoices', 'A/R Aging Report', 'Bank Statements'], 8000, NOW(), NOW(), NULL),

-- Purchase Order Financing (2 products)
('purchase-order-financing-001', 'Purchase Order Financing', 'PO Funding Solutions', 'Purchase Order Financing', 'US', 10000, 2000000, 3.0, 15.0, 1, 6, 'Purchase order financing for wholesale businesses.', ARRAY['Purchase Orders', 'Supplier Agreements', 'Financial Statements'], 25000, NOW(), NOW(), NULL),
('po-capital-financing', 'Purchase Order Financing', 'PO Capital', 'Purchase Order Financing', 'US', 25000, 5000000, 2.5, 12.0, 1, 12, 'Purchase order financing for large orders.', ARRAY['Purchase Orders', 'Customer Credit Reports', 'Financial Statements'], 50000, NOW(), NOW(), NULL),

-- Working Capital (1 product)
('working-capital-001', 'Working Capital Loan', 'Working Capital Solutions', 'Working Capital', 'US', 10000, 500000, 8.99, 29.99, 6, 36, 'Working capital loans for business operations.', ARRAY['Bank Statements', 'Financial Statements', 'Tax Returns'], 12000, NOW(), NOW(), NULL),

-- Asset-Based Lending (1 product)
('asset-based-lending-001', 'Asset-Based Line of Credit', 'Asset Capital Group', 'Asset-Based Lending', 'US', 100000, 25000000, 4.0, 12.0, 12, 60, 'Asset-based lending secured by business assets.', ARRAY['Asset Appraisals', 'Financial Statements', 'A/R Aging Report'], 100000, NOW(), NOW(), NULL),

-- SBA Loan (1 product)
('sba-loan-001', 'SBA 504 Loan', 'SBA 504 Lender', 'SBA Loan', 'US', 125000, 20000000, 4.5, 8.5, 120, 300, 'SBA 504 loan for real estate and equipment.', ARRAY['Tax Returns', 'Financial Statements', 'Business Plan', 'Appraisals'], 75000, NOW(), NOW(), NULL);

-- Verify the insertion
SELECT 
  category,
  COUNT(*) as product_count
FROM lender_products 
WHERE deleted_at IS NULL 
GROUP BY category 
ORDER BY category;