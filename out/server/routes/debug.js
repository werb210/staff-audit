/**
 * DEBUG ROUTES - Temporary API endpoints for data export
 * Created for STAFF APPLICATION TASK: Dump All Lender Products
 */
import { Router } from "express";
import { normalizeProductsArray, logProductStructure } from '../utils/productNormalization';
const router = Router();
// GET /api/debug/lenders - Export all lender products as JSON
router.get("/lenders", async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Exporting all lender products...");
        // Lender products temporarily disabled during schema migration
        const lenders = [];
        console.log('Lender products disabled during schema migration');
        // Apply product normalization for clean API consumption
        const normalizedProducts = normalizeProductsArray(lenders);
        // Log structure for schema monitoring
        logProductStructure(normalizedProducts, 'GET /api/debug/lenders');
        console.log(`✅ [DEBUG] Exported ${normalizedProducts.length} normalized lender products`);
        res.json({
            success: true,
            count: normalizedProducts.length,
            exportedAt: new Date().toISOString(),
            schema: 'normalized_v1',
            data: normalizedProducts
        });
    }
    catch (error) {
        console.error("❌ [DEBUG] Failed to export lender products:", error);
        res.status(500).json({
            success: false,
            error: "Failed to export lender products",
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
    }
});
// GET /api/debug/lenders/csv - Export all lender products as CSV
router.get("/lenders/csv", async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Exporting all lender products as CSV...");
        // Lender products temporarily disabled during schema migration
        const rawProducts = [];
        console.log('Raw products disabled during schema migration');
        // Normalize products before CSV export
        const normalizedProducts = normalizeProductsArray(rawProducts);
        // Log structure for schema monitoring
        logProductStructure(normalizedProducts, 'GET /api/debug/lenders/csv');
        // Convert to CSV format with normalized fields
        const headers = [
            'id', 'name', 'category', 'country', 'geography', 'amount_min', 'amount_max',
            'required_documents', 'revenue_min', 'product_type'
        ];
        const csvRows = [headers.join(',')];
        normalizedProducts.forEach(product => {
            const row = headers.map(header => {
                let value = product[header];
                if (Array.isArray(value)) {
                    value = `"${value.join(';')}"`;
                }
                else if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value}"`;
                }
                return value !== null && value !== undefined ? value : '';
            });
            csvRows.push(row.join(','));
        });
        const csvContent = csvRows.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="lender_products_normalized.csv"');
        res.send(csvContent);
        console.log(`✅ [DEBUG] CSV export completed: ${normalizedProducts.length} normalized lender products`);
    }
    catch (error) {
        console.error("❌ [DEBUG] Failed to export CSV:", error);
        res.status(500).json({
            success: false,
            error: "Failed to export CSV",
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
    }
});
export default router;
