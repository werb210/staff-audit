// Quick script to check current product state
import fetch from 'node-fetch';

async function checkProduct() {
  try {
    const response = await fetch('https://staffportal.replit.app/api/public/lenders');
    const data = await response.json();
    
    const product = data.products.find(p => p.id === 'accord-accordaccess-36');
    if (product) {
      console.log('✅ Current product state:');
      console.log('ID:', product.id);
      console.log('Lender:', product.lenderName);
      console.log('Category:', product.category);
      console.log('Required Documents:', product.requiredDocuments);
      console.log('Number of documents:', product.requiredDocuments.length);
    } else {
      console.log('❌ Product not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkProduct();