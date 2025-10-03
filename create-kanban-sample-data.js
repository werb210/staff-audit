/**
 * Create Sample Applications for Kanban Sales Pipeline
 * Generates real application data with various pipeline stages for testing
 */

const { db } = require('./server/db');
const { applications, businesses, users, financialProfiles } = require('./shared/schema');

async function createKanbanSampleData() {
  console.log('Creating Kanban Pipeline Sample Data');
  console.log('='.repeat(50));
  
  try {
    // Create sample businesses and applications for each pipeline stage
    const stages = ['New', 'In Review', 'Requires Docs', 'Off to Lender', 'Accepted', 'Denied'];
    const sampleCompanies = [
      { name: 'TechCorp Solutions', industry: 'Technology', amount: 150000, type: 'working_capital' },
      { name: 'Green Energy LLC', industry: 'Renewable Energy', amount: 250000, type: 'equipment_financing' },
      { name: 'Family Restaurant', industry: 'Food Service', amount: 75000, type: 'term_loan' },
      { name: 'Construction Co', industry: 'Construction', amount: 300000, type: 'line_of_credit' },
      { name: 'Retail Boutique', industry: 'Retail', amount: 50000, type: 'merchant_cash_advance' },
      { name: 'Medical Practice', industry: 'Healthcare', amount: 200000, type: 'sba_loan' }
    ];

    // Get admin user for sample data
    const [adminUser] = await db.select().from(users).limit(1);
    if (!adminUser) {
      console.log('No users found - creating admin user first');
      return;
    }

    let createdCount = 0;
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const company = sampleCompanies[i];
      
      console.log(`Creating application for ${company.name} in stage: ${stage}`);
      
      // Create business
      const [newBusiness] = await db.insert(businesses).values({
        userId: adminUser.id,
        tenantId: adminUser.tenantId,
        businessName: company.name,
        businessType: 'LLC',
        industry: company.industry,
        yearEstablished: 2018 + Math.floor(Math.random() * 5),
        phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        address: {
          street: `${Math.floor(Math.random() * 9999) + 1} Business St`,
          city: 'Sample City',
          state: 'CA',
          zipCode: '90210'
        }
      }).returning();

      // Create financial profile
      await db.insert(financialProfiles).values({
        businessId: newBusiness.id,
        annualRevenue: String(company.amount * 4),
        monthlyRevenue: String(company.amount / 3),
        monthlyExpenses: String(company.amount / 4),
        timeInBusiness: '3 years',
        creditScore: 650 + Math.floor(Math.random() * 150),
        bankBalance: String(company.amount / 2)
      });

      // Create application with stage
      await db.insert(applications).values({
        userId: adminUser.id,
        businessId: newBusiness.id,
        tenantId: adminUser.tenantId,
        status: 'submitted',
        stage: stage,
        requestedAmount: String(company.amount),
        useOfFunds: getUseOfFunds(company.type),
        productCategory: company.type,
        formData: {
          businessName: company.name,
          firstName: 'John',
          lastName: 'Doe',
          email: `john@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
          phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          position: 'CEO',
          industry: company.industry,
          businessType: 'LLC',
          yearsInBusiness: 3 + Math.floor(Math.random() * 5),
          monthlyRevenue: company.amount / 3
        },
        bankingAnalysis: generateBankingAnalysis(company),
        financialsOCR: generateFinancialOCR(company),
        documentApprovals: stage === 'Accepted' ? { bank_statements: true, tax_returns: true } : {},
        submittedAt: new Date(),
        createdAt: new Date()
      });
      
      createdCount++;
    }
    
    console.log(`\nSuccessfully created ${createdCount} sample applications`);
    console.log('Pipeline stages populated:');
    stages.forEach((stage, index) => {
      console.log(`  ${stage}: ${sampleCompanies[index].name} - $${sampleCompanies[index].amount.toLocaleString()}`);
    });
    
    console.log('\nKanban sales pipeline is ready for testing!');
    console.log('Navigate to the staff portal dashboard to see the drag-and-drop interface.');
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}

function getUseOfFunds(type) {
  const purposes = {
    working_capital: 'Inventory and working capital expansion',
    equipment_financing: 'Purchase new equipment and machinery',
    term_loan: 'Business expansion and renovation',
    line_of_credit: 'Flexible funding for operations',
    merchant_cash_advance: 'Quick cash for immediate needs',
    sba_loan: 'Long-term growth and expansion'
  };
  return purposes[type] || 'General business purposes';
}

function generateBankingAnalysis(company) {
  return {
    averageBalance: company.amount / 2,
    monthlyTransactions: 150 + Math.floor(Math.random() * 100),
    depositsPattern: 'Regular',
    overdrafts: Math.floor(Math.random() * 3),
    creditScore: 650 + Math.floor(Math.random() * 150),
    riskLevel: 'Medium'
  };
}

function generateFinancialOCR(company) {
  return {
    extractedRevenue: company.amount * 4,
    extractedExpenses: company.amount * 3,
    netIncome: company.amount,
    assets: company.amount * 2,
    liabilities: company.amount * 0.8,
    confidence: 0.95
  };
}

// Run the script
createKanbanSampleData();