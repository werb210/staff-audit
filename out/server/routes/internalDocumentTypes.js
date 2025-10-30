/**
 * Internal Document Types API Route
 *
 * GET /api/internal/document-types
 *
 * Used by admin panels or dropdown builders if needed
 * Returns all document types with labels and categories
 */
import { Router } from 'express';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_CATEGORIES, ENUM_VERSION } from '../../shared/documentTypes';
const router = Router();
/**
 * GET /api/internal/document-types
 * Returns comprehensive document type information for admin panels
 */
router.get('/', (req, res) => {
    try {
        console.log('📋 [INTERNAL-API] Document types requested for admin panel/dropdown builder');
        res.json({
            success: true,
            message: 'Document types retrieved for internal use',
            data: {
                types: DOCUMENT_TYPES,
                labels: DOCUMENT_TYPE_LABELS,
                categories: DOCUMENT_CATEGORIES,
                metadata: {
                    totalCount: DOCUMENT_TYPES.length,
                    version: ENUM_VERSION,
                    usage: 'admin-panels-and-dropdown-builders',
                    lastUpdated: ENUM_VERSION.lastUpdated
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('🚨 [INTERNAL-API] Error serving document types:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to retrieve document types for internal use'
        });
    }
});
/**
 * GET /api/internal/document-types/dropdown
 * Returns document types formatted specifically for dropdown components
 */
router.get('/dropdown', (req, res) => {
    try {
        // Format for dropdown/select components
        const dropdownOptions = DOCUMENT_TYPES.map(type => ({
            value: type,
            label: DOCUMENT_TYPE_LABELS[type],
            category: Object.keys(DOCUMENT_CATEGORIES).find(cat => DOCUMENT_CATEGORIES[cat].includes(type)) || 'other'
        }));
        res.json({
            success: true,
            message: 'Document types formatted for dropdown usage',
            data: {
                options: dropdownOptions,
                grouped: DOCUMENT_CATEGORIES,
                metadata: {
                    totalOptions: dropdownOptions.length,
                    version: ENUM_VERSION
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('🚨 [INTERNAL-API] Error formatting dropdown options:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to format document types for dropdown'
        });
    }
});
export default router;
