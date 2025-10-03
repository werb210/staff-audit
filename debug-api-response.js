/**
 * Debug API Response to understand the actual data structure
 */

async function debugApiResponse() {
  try {
    const response = await fetch('https://staffportal.replit.app/api/public/lenders');
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('Response Keys:', Object.keys(data));
    
    if (data.products && Array.isArray(data.products)) {
      console.log('Total Products:', data.products.length);
      
      // Check first few products
      console.log('\nFirst 3 Products:');
      data.products.slice(0, 3).forEach((product, index) => {
        console.log(`Product ${index + 1}:`, {
          id: product.id,
          productName: product.productName,
          category: product.category,
          lenderName: product.lenderName
        });
      });
      
      // Check category distribution
      const categoryCount = {};
      data.products.forEach(product => {
        const cat = product.category || 'UNDEFINED';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      
      console.log('\nCategory Distribution:');
      Object.entries(categoryCount).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
      });
      
      // Check for invalid categories
      const validCategories = ['line_of_credit', 'term_loan', 'equipment_financing', 'invoice_factoring'];
      const invalidProducts = data.products.filter(p => !validCategories.includes(p.category));
      
      console.log(`\nInvalid Products: ${invalidProducts.length}`);
      invalidProducts.forEach(product => {
        console.log(`  - ${product.productName}: ${product.category}`);
      });
      
    } else {
      console.log('No products array found in response');
      console.log('Full Response:', data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugApiResponse();