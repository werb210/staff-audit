/**
 * Create Sample Applications for Sales Pipeline
 * Generates real application data in database for staff portal pipeline testing
 */

const { db } = await import('./server/db.ts');
const { applications, businesses, users } = await import('./shared/schema.ts');
import crypto from 'crypto';

async function createSampleApplications() {
  try {
    console.log('🔄 Creating sample applications for sales pipeline...');

    // Sample application data with realistic business information
    const sampleApps = [
      {
        businessName: 'TechFlow Solutions',
        industry: 'Technology',
        requestedAmount: 250000,
        stage: 'draft',
        loanPurpose: 'Working capital for expansion',
        revenue: 1200000,
        timeInBusiness: 36,
        creditScore: 720,
        contactName: 'Sarah Johnson',
        contactEmail: 'sarah@techflow.com',
        contactPhone: '+1-555-0123'
      },
      {
        businessName: 'Green Valley Manufacturing',
        industry: 'Manufacturing',
        requestedAmount: 500000,
        stage: 'submitted',
        loanPurpose: 'Equipment financing for new machinery',
        revenue: 2400000,
        timeInBusiness: 84,
        creditScore: 750,
        contactName: 'Michael Chen',
        contactEmail: 'mike@greenvalley.com',
        contactPhone: '+1-555-0456'
      },
      {
        businessName: 'Urban Eats Restaurant Group',
        industry: 'Food Service',
        requestedAmount: 150000,
        stage: 'submitted',
        loanPurpose: 'Restaurant renovation and expansion',
        revenue: 800000,
        timeInBusiness: 48,
        creditScore: 680,
        contactName: 'Elena Rodriguez',
        contactEmail: 'elena@urbaneats.com',
        contactPhone: '+1-555-0789'
      },
      {
        businessName: 'Digital Marketing Pro',
        industry: 'Marketing',
        requestedAmount: 75000,
        stage: 'under_review',
        loanPurpose: 'Software licenses and team expansion',
        revenue: 450000,
        timeInBusiness: 24,
        creditScore: 690,
        contactName: 'David Kim',
        contactEmail: 'david@digitalmarketingpro.com',
        contactPhone: '+1-555-0321'
      },
      {
        businessName: 'Coastal Construction LLC',
        industry: 'Construction',
        requestedAmount: 800000,
        stage: 'approved',
        loanPurpose: 'Fleet expansion and working capital',
        revenue: 3200000,
        timeInBusiness: 120,
        creditScore: 780,
        contactName: 'Robert Thompson',
        contactEmail: 'robert@coastalconstruction.com',
        contactPhone: '+1-555-0654'
      },
      {
        businessName: 'HealthTech Innovations',
        industry: 'Healthcare',
        requestedAmount: 350000,
        stage: 'funded',
        loanPurpose: 'Medical equipment and R&D',
        revenue: 1800000,
        timeInBusiness: 60,
        creditScore: 740,
        contactName: 'Dr. Jennifer Lee',
        contactEmail: 'jennifer@healthtech.com',
        contactPhone: '+1-555-0987'
      }
    ];

    const tenantId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // Use existing tenant ID

    for (const app of sampleApps) {
      // Create user for contact
      const userId = crypto.randomUUID();
      await db.insert(users).values({
        id: userId,
        email: app.contactEmail,
        firstName: app.contactName.split(' ')[0],
        lastName: app.contactName.split(' ')[1] || '',
        phone: app.contactPhone,
        role: 'client',
        tenantId: tenantId,
        passwordHash: 'temp_hash', // Placeholder
        isVerified: true
      });

      // Create business
      const businessId = crypto.randomUUID();
      await db.insert(businesses).values({
        id: businessId,
        userId: userId,
        tenantId: tenantId,
        businessName: app.businessName,
        industry: app.industry,
        yearEstablished: new Date().getFullYear() - Math.floor(app.timeInBusiness / 12),
        numberOfEmployees: Math.floor(Math.random() * 50) + 5,
        annualRevenue: app.revenue,
        businessStructure: 'LLC',
        taxId: `${Math.floor(Math.random() * 900000000) + 100000000}`,
        businessAddress: '123 Business St',
        businessCity: 'Business City',
        businessState: 'CA',
        businessZip: '90210'
      });

      // Create application
      const applicationId = crypto.randomUUID();
      await db.insert(applications).values({
        id: applicationId,
        userId: userId,
        businessId: businessId,
        tenantId: tenantId,
        requestedAmount: app.requestedAmount,
        loanPurpose: app.loanPurpose,
        stage: app.stage,
        status: 'draft',
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        creditScore: app.creditScore,
        timeInBusiness: app.timeInBusiness
      });

      console.log(`✅ Created application for ${app.businessName} - Stage: ${app.stage}`);
    }

    console.log('🎉 Sample applications created successfully!');
    console.log('📊 Sales pipeline now has real data from database');
    
  } catch (error) {
    console.error('❌ Error creating sample applications:', error);
  }
}

createSampleApplications();