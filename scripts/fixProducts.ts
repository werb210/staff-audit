import fs from "fs";
import path from "path";
import { ProductArraySchema, Product } from "../server/schemas/product";
import { CATEGORY_BASELINES } from "../server/services/productBaselines";

const file = path.resolve("data/lenderProducts.json");
const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as unknown[];

function parseDate(s?: string) { return s ? new Date(s).getTime() : 0; }

function normalizeCurrency(p: Product): "USD"|"CAD" {
  if (p.currency === "USD" || p.currency === "CAD") return p.currency;
  return p.country === "US" ? "USD" : "CAD";
}

function keyById(products: Product[]) {
  const map = new Map<string, Product>();
  for (const p of products) {
    const existing = map.get(p.id);
    if (!existing || parseDate(p.updated_at) > parseDate(existing.updated_at)) {
      map.set(p.id, p);
    }
  }
  return Array.from(map.values());
}

function keyByLenderName(products: Product[]) {
  const map = new Map<string, Product>();
  for (const p of products) {
    const k = `${p.lender_name}::${p.name}`.toLowerCase();
    const existing = map.get(k);
    if (!existing || parseDate(p.updated_at) > parseDate(existing.updated_at)) {
      map.set(k, p);
    }
  }
  return Array.from(map.values());
}

function backfill(p: Product): Product {
  const baseline = CATEGORY_BASELINES[p.category];
  // copy to avoid mutating original
  const q: Product = { ...p };

  // normalize currency by country default
  q.currency = normalizeCurrency(q);

  if (!baseline) return q;

  if (!q.min_amount || q.min_amount === 0) q.min_amount = baseline.min_amount;
  if (!q.max_amount || q.max_amount === 0) q.max_amount = baseline.max_amount;
  if (!q.required_documents || q.required_documents.length === 0) {
    q.required_documents = baseline.required_documents;
  }
  if (!q.updated_at) {
    q.updated_at = new Date().toISOString();
  }
  if (q.version == null) q.version = 1;

  return q;
}

function validate(products: Product[]) {
  const errors: string[] = [];
  for (const p of products) {
    if (p.min_amount <= 0) errors.push(`${p.id} min_amount<=0`);
    if (p.max_amount <= 0) errors.push(`${p.id} max_amount<=0`);
    if (p.max_amount < p.min_amount) errors.push(`${p.id} max<min`);
    if (!p.required_documents || p.required_documents.length < 1) {
      errors.push(`${p.id} no required_documents`);
    }
  }
  return errors;
}

function main() {
  console.log("🔧 Starting product data fix...");
  
  // Parse and validate initial data
  const parseResult = ProductArraySchema.safeParse(raw);
  if (!parseResult.success) {
    console.error("❌ Initial data validation failed:", parseResult.error.issues);
    process.exit(1);
  }
  
  let products = parseResult.data;
  console.log(`📊 Initial products: ${products.length}`);
  
  // Step 1: Deduplicate by ID (keeping newest updated_at)
  products = keyById(products);
  console.log(`🔑 After ID dedup: ${products.length}`);
  
  // Step 2: Deduplicate by lender_name + name (keeping newest)
  products = keyByLenderName(products);
  console.log(`👥 After lender+name dedup: ${products.length}`);
  
  // Step 3: Backfill missing data
  products = products.map(backfill);
  console.log(`📝 Backfilled missing data`);
  
  // Step 4: Validate business rules
  const errors = validate(products);
  if (errors.length > 0) {
    console.error("❌ Validation errors found:");
    errors.forEach(e => console.error(`   ${e}`));
    process.exit(1);
  }
  
  // Step 5: Final schema validation
  const finalResult = ProductArraySchema.safeParse(products);
  if (!finalResult.success) {
    console.error("❌ Final schema validation failed:", finalResult.error.issues);
    process.exit(1);
  }
  
  // Step 6: Write back to file with backup
  const backupFile = file + `.backup.${Date.now()}`;
  fs.copyFileSync(file, backupFile);
  console.log(`💾 Backup created: ${backupFile}`);
  
  fs.writeFileSync(file, JSON.stringify(products, null, 2));
  console.log(`✅ Fixed products written to ${file}`);
  
  // Step 7: Summary report
  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log("\n📈 Summary:");
  console.log(`   Total products: ${products.length}`);
  console.log(`   Categories:`);
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`     ${cat}: ${count}`);
  });
  
  const avgMin = products.reduce((sum, p) => sum + p.min_amount, 0) / products.length;
  const avgMax = products.reduce((sum, p) => sum + p.max_amount, 0) / products.length;
  console.log(`   Avg min amount: $${Math.round(avgMin).toLocaleString()}`);
  console.log(`   Avg max amount: $${Math.round(avgMax).toLocaleString()}`);
  
  console.log("🎉 Product data fix completed successfully!");
}

if (require.main === module) {
  main();
}