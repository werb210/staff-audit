#!/usr/bin/env node
/**
 * Marketing Module Database Schema Creation
 * Creates all tables for Phase 2 Marketing Features
 */

const { db } = require('./server/db.cjs');

async function createMarketingTables() {
  console.log('🎯 Creating Marketing Module Database Schema...');
  
  try {
    // Marketing Campaigns Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        channel VARCHAR(50) NOT NULL DEFAULT 'email',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        subject VARCHAR(255),
        html_content TEXT,
        text_content TEXT,
        list_id UUID,
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        metrics JSONB DEFAULT '{}',
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created marketing_campaigns table');

    // Marketing Lists Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS marketing_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL DEFAULT 'manual',
        criteria JSONB,
        contact_count INTEGER DEFAULT 0,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created marketing_lists table');

    // Social Media Posts Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        platform VARCHAR(50) NOT NULL,
        caption TEXT,
        image_url TEXT,
        link_url TEXT,
        scheduled_at TIMESTAMP,
        posted_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        metrics JSONB DEFAULT '{}',
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created social_posts table');

    // SEO Reports Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS seo_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        target_url TEXT NOT NULL,
        title VARCHAR(255),
        report JSONB DEFAULT '{}',
        score INTEGER,
        issues_found INTEGER DEFAULT 0,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created seo_reports table');

    // Marketing Calendar Events Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS marketing_calendar (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        campaign_id UUID,
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created marketing_calendar table');

    // Ad Campaigns Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS ad_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        campaign_type VARCHAR(50),
        budget DECIMAL(10,2),
        target_audience JSONB,
        ad_content JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        metrics JSONB DEFAULT '{}',
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created ad_campaigns table');

    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_lists_tenant ON marketing_lists(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON social_posts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_seo_reports_tenant ON seo_reports(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_marketing_calendar_tenant ON marketing_calendar(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ad_campaigns_tenant ON ad_campaigns(tenant_id);
    `);
    console.log('✅ Created performance indexes');

    console.log('\n🎉 Marketing Module Database Schema Created Successfully!');
    console.log('📊 Tables created: 6 (campaigns, lists, posts, seo, calendar, ads)');
    console.log('🔍 Indexes created: 6 (tenant-based for optimal query performance)');
    
  } catch (error) {
    console.error('❌ Error creating marketing tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createMarketingTables().then(() => {
    console.log('✅ Marketing database schema setup complete');
    process.exit(0);
  });
}

module.exports = { createMarketingTables };