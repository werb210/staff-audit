/**
 * Check specific product via API to see current state
 */

async function checkSpecificProduct() {
  try {
    const response = await fetch(`http://localhost:5000/api/lender-products?_t=${Date.now()}`);
    const data = await response.json();
    
    const accordProduct = data.products.find(p => p.id === "accord-accordaccess-36");
    
    if (accordProduct) {
      console.log("✅ Found Accord product:");
      console.log("ID:", accordProduct.id);
      console.log("Name:", accordProduct.name);
      console.log("Lender:", accordProduct.lenderName);
      console.log("docRequirements:", accordProduct.docRequirements);
      console.log("requiredDocuments:", accordProduct.requiredDocuments);
      console.log("Number of docs:", accordProduct.docRequirements?.length || 0);
    } else {
      console.log("❌ Accord product not found");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkSpecificProduct();