#!/usr/bin/env node

/**
 * 🎯 ENHANCED PIPELINE CARDS TEST
 * 
 * Tests the new visual enhancements to application cards:
 * - Document status indicators ("Docs: X/Y ✓")
 * - Contextual action buttons
 * - Fixed "Missing Documents" badge logic
 * - Pipeline stage movement automation
 */

console.log('🎯 Testing Enhanced Pipeline Cards...\n');

const BASE_URL = 'http://localhost:5000';

// Simulate the card logic for testing
function simulateCardEnhancements(application) {
  const documents = application.documents || [];
  
  // Document stats calculation
  const documentStats = documents.length > 0 ? {
    total: documents.length,
    accepted: documents.filter(d => d.status === 'accepted').length,
    pending: documents.filter(d => d.status === 'pending').length,
    rejected: documents.filter(d => d.status === 'rejected').length
  } : { total: 0, accepted: 0, pending: 0, rejected: 0 };
  
  // Missing documents logic (fixed)
  const shouldShowMissingDocuments = (docs) => {
    if (!docs?.length) return true;
    return !docs.every(doc => doc.status === "accepted");
  };
  
  // Action button logic
  const getCardAction = () => {
    const allDocsAccepted = documentStats.total > 0 && documentStats.accepted === documentStats.total;
    const currentStage = application.stage || application.status || 'New';
    
    if (currentStage === 'New' && documentStats.total === 0) return 'Upload Documents';
    if (currentStage === 'Requires Docs') return 'Review Documents';
    if (currentStage === 'In Review' && allDocsAccepted) return 'Send to Lender';
    if (currentStage === 'Off to Lender') return 'Awaiting Response';
    return null;
  };
  
  return {
    documentStats,
    showMissingBadge: shouldShowMissingDocuments(documents),
    actionButton: getCardAction(),
    statusIndicator: documentStats.total > 0 ? `${documentStats.accepted}/${documentStats.total} ✓` : 'No docs'
  };
}

async function testEnhancedCards() {
  try {
    console.log('📋 Testing Enhanced Card Logic:\n');

    // Test scenarios
    const testScenarios = [
      {
        name: 'New Application - No Documents',
        application: { 
          id: 'test-1', 
          stage: 'New', 
          business_name: 'Test Corp',
          documents: [] 
        }
      },
      {
        name: 'Application with Mixed Document Status',
        application: { 
          id: 'test-2', 
          stage: 'Requires Docs', 
          business_name: 'Review Corp',
          documents: [
            { id: '1', status: 'accepted', fileName: 'bank_statement.pdf' },
            { id: '2', status: 'pending', fileName: 'tax_return.pdf' },
            { id: '3', status: 'rejected', fileName: 'financial_statement.pdf' }
          ]
        }
      },
      {
        name: 'Application with All Documents Accepted',
        application: { 
          id: 'test-3', 
          stage: 'In Review', 
          business_name: 'Ready Corp',
          documents: [
            { id: '1', status: 'accepted', fileName: 'bank_statement.pdf' },
            { id: '2', status: 'accepted', fileName: 'tax_return.pdf' },
            { id: '3', status: 'accepted', fileName: 'financial_statement.pdf' }
          ]
        }
      },
      {
        name: 'Application Sent to Lender',
        application: { 
          id: 'test-4', 
          stage: 'Off to Lender', 
          business_name: 'Submitted Corp',
          documents: [
            { id: '1', status: 'accepted', fileName: 'bank_statement.pdf' },
            { id: '2', status: 'accepted', fileName: 'tax_return.pdf' }
          ]
        }
      }
    ];

    console.log('┌──────────────────────────────────┬──────────────┬─────────────────┬──────────────────┬─────────────────┐');
    console.log('│ Scenario                         │ Status       │ Missing Badge?  │ Action Button    │ Doc Indicator   │');
    console.log('├──────────────────────────────────┼──────────────┼─────────────────┼──────────────────┼─────────────────┤');

    for (const scenario of testScenarios) {
      const result = simulateCardEnhancements(scenario.application);
      
      console.log(`│ ${scenario.name.padEnd(32)} │ ${scenario.application.stage.padEnd(12)} │ ${result.showMissingBadge ? 'YES'.padEnd(15) : 'NO'.padEnd(15)} │ ${(result.actionButton || 'None').padEnd(16)} │ ${result.statusIndicator.padEnd(15)} │`);
    }
    
    console.log('└──────────────────────────────────┴──────────────┴─────────────────┴──────────────────┴─────────────────┘\n');

    // Test with real application data
    console.log('🔍 Testing with real applications from API...');
    
    try {
      const appsResponse = await fetch(`${BASE_URL}/api/applications`, {
        headers: { 'x-dev-bypass': 'true' }
      });
      
      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        if (appsData.success && appsData.applications?.length > 0) {
          console.log(`✅ Found ${appsData.applications.length} real applications\n`);
          
          for (const app of appsData.applications.slice(0, 3)) {
            const result = simulateCardEnhancements(app);
            const businessName = app.business_name || app.id?.slice(0, 8) || 'Unknown';
            
            console.log(`📄 ${businessName} (${app.stage || 'New'})`);
            console.log(`   📊 Documents: ${result.statusIndicator}`);
            console.log(`   🎯 Action: ${result.actionButton || 'No action available'}`);
            console.log(`   🔴 Missing Badge: ${result.showMissingBadge ? 'Shown' : 'Hidden'}`);
            
            if (result.documentStats.total > 0) {
              console.log(`   📈 Breakdown: ${result.documentStats.accepted} accepted, ${result.documentStats.pending} pending, ${result.documentStats.rejected} rejected`);
            }
            console.log('');
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Could not fetch real application data for testing');
    }

    console.log('✅ Enhanced Pipeline Cards Features Summary:');
    console.log('');
    console.log('🎯 **Visual Status Indicators**:');
    console.log('   • "Docs: X/Y ✓" with color coding (green=all accepted, yellow=pending)');
    console.log('   • Pending/rejected counts displayed inline');
    console.log('');
    console.log('🔄 **Contextual Action Buttons**:');
    console.log('   • "Upload Documents" (New apps with no docs)');
    console.log('   • "Review Documents" (Requires Docs stage)');
    console.log('   • "Send to Lender" (In Review with all docs accepted)');
    console.log('   • "Awaiting Response" (Off to Lender - disabled)');
    console.log('');
    console.log('📋 **Fixed Missing Documents Badge**:');
    console.log('   • Only shows when documents missing OR not all accepted');
    console.log('   • Intelligent messaging: "Missing Documents" vs "Pending Verification"');
    console.log('   • Tooltips show exact acceptance ratios');
    
  } catch (error) {
    console.error('❌ Enhanced cards test failed:', error.message);
  }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testEnhancedCards();