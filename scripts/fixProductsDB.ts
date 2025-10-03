import { db } from "../server/db";
import { lenderProducts } from "../shared/schema";
import { eq, or, isNull } from "drizzle-orm";
import { CATEGORY_BASELINES } from "../server/services/productBaselines";

const CATEGORY_MAPPING: Record<string, string> = {
  "working_capital": "Working Capital",
  "equipment_financing": "Equipment Financing", 
  "line_of_credit": "Line of Credit",
  "term_loan": "Term Loan"
};

async function main() {
  console.log("🔧 Starting database product fixes...");
  
  try {
    // Step 1: Get all products that need fixing
    const problemProducts = await db.select()
      .from(lenderProducts)
      .where(or(
        eq(lenderProducts.minAmount, 0),
        eq(lenderProducts.maxAmount, 0),
        isNull(lenderProducts.minAmount),
        isNull(lenderProducts.maxAmount),
        eq(lenderProducts.requiredDocuments, ""),
        isNull(lenderProducts.requiredDocuments)
      ));
    
    console.log(`📊 Found ${problemProducts.length} products needing fixes`);
    
    // Step 2: Apply fixes to each product
    let fixedCount = 0;
    
    for (const product of problemProducts) {
      const categoryKey = product.category;
      const categoryName = CATEGORY_MAPPING[categoryKey] || categoryKey;
      const baseline = CATEGORY_BASELINES[categoryName];
      
      if (!baseline) {
        console.log(`⚠️  No baseline found for category: ${categoryName} (${categoryKey})`);
        continue;
      }
      
      const fixes: Partial<typeof product> = {};
      
      // Fix min amount
      if (!product.minAmount || product.minAmount === 0) {
        fixes.minAmount = baseline.min_amount;
      }
      
      // Fix max amount  
      if (!product.maxAmount || product.maxAmount === 0) {
        fixes.maxAmount = baseline.max_amount;
      }
      
      // Fix required documents
      if (!product.requiredDocuments || product.requiredDocuments.trim() === "") {
        fixes.requiredDocuments = baseline.required_documents.join(", ");
      }
      
      // Update timestamp
      fixes.updatedAt = new Date();
      
      if (Object.keys(fixes).length > 0) {
        await db.update(lenderProducts)
          .set(fixes)
          .where(eq(lenderProducts.id, product.id));
        
        console.log(`✅ Fixed product ${product.id} (${product.productName}): ${Object.keys(fixes).join(", ")}`);
        fixedCount++;
      }
    }
    
    // Step 3: Validation check
    const allProducts = await db.select().from(lenderProducts);
    const stillBroken = allProducts.filter(p => 
      !p.minAmount || p.minAmount === 0 ||
      !p.maxAmount || p.maxAmount === 0 ||
      p.maxAmount < p.minAmount ||
      !p.requiredDocuments || p.requiredDocuments.trim() === ""
    );
    
    if (stillBroken.length > 0) {
      console.log(`❌ Still ${stillBroken.length} products with issues:`);
      stillBroken.forEach(p => {
        const issues = [];
        if (!p.minAmount || p.minAmount === 0) issues.push("min_amount" as any);
        if (!p.maxAmount || p.maxAmount === 0) issues.push("max_amount" as any);
        if (p.maxAmount < p.minAmount) issues.push("max<min" as any);
        if (!p.requiredDocuments || p.requiredDocuments.trim() === "") issues.push("no_docs" as any);
        console.log(`   ${p.id}: ${issues.join(", ")}`);
      });
    }
    
    // Step 4: Summary report
    console.log("\n📈 Summary:");
    console.log(`   Fixed products: ${fixedCount}`);
    console.log(`   Total products: ${allProducts.length}`);
    console.log(`   Remaining issues: ${stillBroken.length}`);
    
    const categoryCounts = allProducts.reduce((acc, p) => {
      const cat = CATEGORY_MAPPING[p.category] || p.category;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("   Categories:");
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`     ${cat}: ${count}`);
    });
    
    const avgMin = allProducts.reduce((sum, p) => sum + (p.minAmount || 0), 0) / allProducts.length;
    const avgMax = allProducts.reduce((sum, p) => sum + (p.maxAmount || 0), 0) / allProducts.length;
    console.log(`   Avg min amount: $${Math.round(avgMin).toLocaleString()}`);
    console.log(`   Avg max amount: $${Math.round(avgMax).toLocaleString()}`);
    
    console.log("🎉 Database product fixes completed!");
    
  } catch (error) {
    console.error("❌ Fix script failed:", error);
    process.exit(1);
  }
}

// Run if called directly
main().then(() => process.exit(0));