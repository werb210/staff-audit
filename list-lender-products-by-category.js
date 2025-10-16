/**
 * List All Lender Products by Category
 * Comprehensive breakdown of all 43 authentic lender products organized by category
 */

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function listLenderProductsByCategory() {
  try {
    console.log('🔍 Fetching all lender products from database...\n');
    
    // Fetch all lender products
    const products = await makeRequest('https://staffportal.replit.app/api/lender-products');
    
    console.log(`📊 Total Products Found: ${products.length}\n`);
    
    // Group products by category
    const productsByCategory = products.reduce((acc, product) => {
      const category = product.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});
    
    // Sort categories alphabetically
    const sortedCategories = Object.keys(productsByCategory).sort();
    
    console.log('📋 LENDER PRODUCTS BY CATEGORY\n');
    console.log('=' .repeat(80));
    
    let totalProducts = 0;
    let totalValue = 0;
    
    sortedCategories.forEach(category => {
      const categoryProducts = productsByCategory[category];
      const categoryCount = categoryProducts.length;
      totalProducts += categoryCount;
      
      console.log(`\n🏷️  ${category.toUpperCase().replace(/_/g, ' ')} (${categoryCount} products)`);
      console.log('-'.repeat(60));
      
      categoryProducts.forEach((product, index) => {
        const maxAmount = product.amountMax || product.maxAmount || 0;
        totalValue += maxAmount;
        
        console.log(`${index + 1}. ${product.lenderName} - ${product.name || product.productName}`);
        console.log(`   Amount: $${(product.amountMin || product.minAmount || 0).toLocaleString()} - $${maxAmount.toLocaleString()}`);
        console.log(`   Rate: ${product.interestRateMin || product.minRate || 0}% - ${product.interestRateMax || product.maxRate || 0}%`);
        console.log(`   Term: ${product.termMin || product.minTerm || 0} - ${product.termMax || product.maxTerm || 0} months`);
        console.log(`   Country: ${product.country || 'Not specified'}`);
        if (product.minMonthlyRevenue) {
          console.log(`   Min Revenue: $${product.minMonthlyRevenue.toLocaleString()}/month`);
        }
        console.log('');
      });
    });
    
    // Summary statistics
    console.log('=' .repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('=' .repeat(80));
    console.log(`Total Categories: ${sortedCategories.length}`);
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Total Lending Capacity: $${totalValue.toLocaleString()}`);
    console.log(`Average Products per Category: ${Math.round(totalProducts / sortedCategories.length)}`);
    
    // Category breakdown
    console.log('\n📊 CATEGORY BREAKDOWN:');
    sortedCategories.forEach(category => {
      const count = productsByCategory[category].length;
      const percentage = ((count / totalProducts) * 100).toFixed(1);
      console.log(`   ${category.replace(/_/g, ' ')}: ${count} products (${percentage}%)`);
    });
    
    // Country distribution
    console.log('\n🌍 COUNTRY DISTRIBUTION:');
    const countryDistribution = products.reduce((acc, product) => {
      const country = product.country || 'Not specified';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(countryDistribution)
      .sort(([,a], [,b]) => b - a)
      .forEach(([country, count]) => {
        const percentage = ((count / totalProducts) * 100).toFixed(1);
        console.log(`   ${country}: ${count} products (${percentage}%)`);
      });
    
    // Top lenders
    console.log('\n🏦 TOP LENDERS BY PRODUCT COUNT:');
    const lenderDistribution = products.reduce((acc, product) => {
      const lender = product.lenderName || 'Unknown';
      acc[lender] = (acc[lender] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(lenderDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([lender, count]) => {
        console.log(`   ${lender}: ${count} products`);
      });
    
    console.log('\n✅ Lender products analysis complete!');
    
  } catch (error) {
    console.error('❌ Error fetching lender products:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Verify the server is running');
      console.log('2. Check the API endpoint URL');
      console.log('3. Ensure proper authentication if required');
    }
  }
}

// Run the analysis
listLenderProductsByCategory();