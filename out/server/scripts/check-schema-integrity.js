import fs from "fs";
import path from "path";
import { db } from "../db.js";
async function getTableColumns(tableName) {
    try {
        const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      ORDER BY column_name
    `);
        return result.rows.map((row) => row.column_name);
    }
    catch (error) {
        console.warn(`Warning: Could not fetch columns for ${tableName}:`, error);
        return [];
    }
}
async function getLenderProductsCount() {
    try {
        const result = await db.execute('SELECT COUNT(*) as count FROM lender_products WHERE is_active = true');
        return Number(result.rows[0]?.count || 0);
    }
    catch (error) {
        console.warn('Warning: Could not count lender_products:', error);
        return 0;
    }
}
async function getApplicationsCount() {
    try {
        const result = await db.execute('SELECT COUNT(*) as count FROM applications');
        return Number(result.rows[0]?.count || 0);
    }
    catch (error) {
        console.warn('Warning: Could not count applications:', error);
        return 0;
    }
}
async function getSampleLenderProduct() {
    try {
        const result = await db.execute(`
      SELECT id, lender_name, product_name, product_category, 
             minimum_lending_amount, maximum_lending_amount, is_active
      FROM lender_products 
      WHERE is_active = true 
      LIMIT 1
    `);
        return result.rows[0] || null;
    }
    catch (error) {
        console.warn('Warning: Could not fetch sample product:', error);
        return null;
    }
}
async function createSchemaSnapshot() {
    console.log('📸 Creating schema snapshot...');
    const [lenderProductsColumns, applicationsColumns, lenderProductsCount, applicationsCount, sampleProduct] = await Promise.all([
        getTableColumns('lender_products'),
        getTableColumns('applications'),
        getLenderProductsCount(),
        getApplicationsCount(),
        getSampleLenderProduct()
    ]);
    return {
        lenderProducts: {
            count: lenderProductsCount,
            columns: lenderProductsColumns,
            sampleProduct: sampleProduct
        },
        applications: {
            count: applicationsCount,
            columns: applicationsColumns
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };
}
async function validateSchema(snapshot) {
    console.log('🔍 Validating current schema against snapshot...');
    const current = await createSchemaSnapshot();
    let isValid = true;
    // Check lender products count
    if (current.lenderProducts.count !== snapshot.lenderProducts.count) {
        console.error(`❌ Lender products count mismatch: expected ${snapshot.lenderProducts.count}, got ${current.lenderProducts.count}`);
        isValid = false;
    }
    // Check lender products columns
    const missingColumns = snapshot.lenderProducts.columns.filter(col => !current.lenderProducts.columns.includes(col));
    const extraColumns = current.lenderProducts.columns.filter(col => !snapshot.lenderProducts.columns.includes(col));
    if (missingColumns.length > 0) {
        console.error(`❌ Missing lender_products columns: ${missingColumns.join(', ')}`);
        isValid = false;
    }
    if (extraColumns.length > 0) {
        console.warn(`⚠️ Extra lender_products columns: ${extraColumns.join(', ')}`);
    }
    if (isValid) {
        console.log('✅ Schema validation passed!');
    }
    return isValid;
}
async function main() {
    const args = process.argv.slice(2);
    const isSnapshot = args.includes('--snapshot');
    const lockFile = path.join(process.cwd(), 'schema-lock.json');
    try {
        if (isSnapshot) {
            // Create new snapshot
            const snapshot = await createSchemaSnapshot();
            fs.writeFileSync(lockFile, JSON.stringify(snapshot, null, 2));
            console.log(`✅ Schema snapshot saved to ${lockFile}`);
            console.log(`📊 Lender products: ${snapshot.lenderProducts.count}`);
            console.log(`📊 Applications: ${snapshot.applications.count}`);
        }
        else {
            // Validate against existing snapshot
            if (!fs.existsSync(lockFile)) {
                console.error('❌ No schema lock file found. Run with --snapshot to create one.');
                process.exit(1);
            }
            const snapshot = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
            const isValid = await validateSchema(snapshot);
            if (!isValid) {
                console.error('❌ Schema validation failed!');
                process.exit(1);
            }
        }
    }
    catch (error) {
        console.error('❌ Schema check failed:', error);
        process.exit(1);
    }
    finally {
        process.exit(0);
    }
}
main().catch(console.error);
