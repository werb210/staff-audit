import { Router } from 'express';
import { db } from '../../db';
const router = Router();
// Document type mappings - client types to database enum values
const DOCUMENT_TYPE_MAPPINGS = {
    'void_cheque': 'void_pad',
    'bank_statement': 'bank_statements',
    'government_id': 'proof_of_identity',
    'business_license': 'business_license',
    'financial_statements': 'financial_statements',
    'profit_loss_statement': 'profit_loss_statement',
    'balance_sheet': 'balance_sheet',
    'tax_return': 'tax_returns',
    'invoice_summary': 'invoice_samples',
    'accounts_receivable': 'accounts_receivable',
    'accounts_payable': 'accounts_payable',
    'account_prepared_financials': 'account_prepared_financials',
    'pnl_statement': 'pnl_statement'
};
/**
 * GET /api/internal/document-types/map-reference
 * Returns live reference table of all document type mappings with validation status
 */
router.get('/map-reference', async (req, res) => {
    try {
        console.log('[DOC-TYPE-REFERENCE] Generating live reference table...');
        // Get all valid document types from database enum
        const validTypesResult = await db.execute(`
      SELECT enumlabel FROM pg_enum WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'document_type'
      ) ORDER BY enumlabel
    `);
        const validDbTypes = new Set(validTypesResult.rows.map(row => row.enumlabel));
        console.log(`[DOC-TYPE-REFERENCE] Found ${validDbTypes.size} valid database types`);
        // Generate reference table with validation
        const referenceTable = [];
        for (const [clientType, mappedType] of Object.entries(DOCUMENT_TYPE_MAPPINGS)) {
            let status = 'unknown';
            // Check if mapped type exists in database enum
            if (validDbTypes.has(mappedType)) {
                status = 'working';
                console.log(`[DOC-TYPE-REFERENCE] ✅ ${clientType} → ${mappedType} (valid)`);
            }
            else {
                status = 'invalid_mapping';
                console.log(`[DOC-TYPE-REFERENCE] ❌ ${clientType} → ${mappedType} (invalid DB type)`);
            }
            referenceTable.push({
                client_type: clientType,
                mapped_type: mappedType,
                status: status,
                db_enum_exists: validDbTypes.has(mappedType)
            });
        }
        // Add unmapped database types for reference
        const mappedDbTypes = new Set(Object.values(DOCUMENT_TYPE_MAPPINGS));
        const unmappedDbTypes = [];
        for (const dbType of validDbTypes) {
            if (!mappedDbTypes.has(dbType)) {
                unmappedDbTypes.push({
                    client_type: null,
                    mapped_type: dbType,
                    status: 'unmapped',
                    db_enum_exists: true
                });
            }
        }
        console.log(`[DOC-TYPE-REFERENCE] Generated reference table with ${referenceTable.length} mappings and ${unmappedDbTypes.length} unmapped types`);
        res.json({
            success: true,
            mapped_types: referenceTable,
            unmapped_db_types: unmappedDbTypes,
            total_valid_db_types: validDbTypes.size,
            total_mappings: referenceTable.length,
            generated_at: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[DOC-TYPE-REFERENCE] Error generating reference table:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate document type reference table',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
