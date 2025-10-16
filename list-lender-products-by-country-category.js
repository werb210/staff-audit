/**
 * List All Lender Products by Country and Category
 * Queries the authentic lender products database and organizes data by geography and product type
 */

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

async function listLenderProductsByCountryAndCategory() {
  console.log('📊 Listing All Lender Products by Country and Category\n');

  try {
    // Fetch all lender products from the public API
    const { status, data } = await makeRequest('http://localhost:5000/api/public/lenders');
    
    if (status !== 200 || !data.products) {
      throw new Error(`Failed to fetch lender products: ${status}`);
    }

    const products = data.products;
    console.log(`📈 Total Products: ${products.length}\n`);

    // Organize by country
    const byCountry = {};
    products.forEach(product => {
      product.geography.forEach(country => {
        if (!byCountry[country]) {
          byCountry[country] = {};
        }
        
        const category = product.productType;
        if (!byCountry[country][category]) {
          byCountry[country][category] = [];
        }
        
        byCountry[country][category].push(product);
      });
    });

    // Display results
    Object.keys(byCountry).sort().forEach(country => {
      console.log(`🌍 ${country}`);
      console.log(''.padEnd(50, '='));
      
      const categories = byCountry[country];
      Object.keys(categories).sort().forEach(category => {
        const categoryProducts = categories[category];
        console.log(`\n📂 ${category.replace(/_/g, ' ').toUpperCase()} (${categoryProducts.length} products)`);
        console.log(''.padEnd(40, '-'));
        
        categoryProducts.forEach(product => {
          const minAmount = parseFloat(product.minAmount).toLocaleString();
          const maxAmount = parseFloat(product.maxAmount).toLocaleString();
          const minRevenue = product.minRevenue ? parseFloat(product.minRevenue).toLocaleString() : 'N/A';
          
          console.log(`• ${product.productName}`);
          console.log(`  Lender: ${product.lenderName}`);
          console.log(`  Amount: $${minAmount} - $${maxAmount}`);
          console.log(`  Min Revenue: $${minRevenue}`);
          if (product.industries && product.industries.length > 0) {
            console.log(`  Industries: ${product.industries.slice(0, 3).join(', ')}${product.industries.length > 3 ? '...' : ''}`);
          }
          console.log('');
        });
      });
      console.log('\n');
    });

    // Summary statistics
    console.log('📋 SUMMARY STATISTICS');
    console.log(''.padEnd(50, '='));
    
    // Count by country
    console.log('\n🌍 Products by Country:');
    Object.keys(byCountry).sort().forEach(country => {
      const totalProducts = Object.values(byCountry[country]).reduce((sum, products) => sum + products.length, 0);
      console.log(`  ${country}: ${totalProducts} products`);
    });

    // Count by category (across all countries)
    const allCategories = {};
    products.forEach(product => {
      const category = product.productType;
      allCategories[category] = (allCategories[category] || 0) + 1;
    });

    console.log('\n📂 Products by Category:');
    Object.keys(allCategories).sort().forEach(category => {
      console.log(`  ${category.replace(/_/g, ' ').toUpperCase()}: ${allCategories[category]} products`);
    });

    // Amount ranges
    const amounts = products.map(p => parseFloat(p.maxAmount)).filter(a => !isNaN(a));
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);

    console.log('\n💰 Funding Range:');
    console.log(`  Minimum: $${minAmount.toLocaleString()}`);
    console.log(`  Maximum: $${maxAmount.toLocaleString()}`);

    return { 
      success: true, 
      totalProducts: products.length, 
      countries: Object.keys(byCountry).length,
      categories: Object.keys(allCategories).length 
    };

  } catch (error) {
    console.error('❌ Error listing lender products:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the listing
listLenderProductsByCountryAndCategory()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Lender Products Listing Complete');
      console.log(`📊 ${result.totalProducts} products across ${result.countries} countries and ${result.categories} categories`);
    } else {
      console.log('\n❌ Lender Products Listing Failed');
      console.log(`Error: ${result.error}`);
    }
  })
  .catch(console.error);