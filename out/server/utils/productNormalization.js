/**
 * Product Schema Normalization Utility
 *
 * Ensures consistent product data structure for API consumption
 * by the client application.
 */
/**
 * Normalizes document requirements to lowercase underscore format
 */
function normalizeDocumentRequirements(docs) {
    if (!docs)
        return [];
    // Handle array of strings
    if (Array.isArray(docs)) {
        return docs.map(doc => {
            if (typeof doc === 'string') {
                // Convert to lowercase underscore format
                return doc
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^\w_]/g, '')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
            }
            return doc;
        }).filter(Boolean);
    }
    // Handle string format (comma-separated or single)
    if (typeof docs === 'string') {
        return docs
            .split(',')
            .map(doc => doc.trim().toLowerCase().replace(/\s+/g, '_'))
            .filter(Boolean);
    }
    return [];
}
/**
 * Normalizes product schema to canonical format
 */
export function normalizeProductSchema(product) {
    // Normalize geography - ensure it's an array and fallback to country
    let geography = [];
    if (product.geography && Array.isArray(product.geography) && product.geography.length > 0) {
        geography = product.geography.filter(Boolean);
    }
    else if (product.country) {
        geography = [product.country];
    }
    // Normalize amount fields with dual field support
    const amount_min = product.amount_min ?? product.min_amount ?? 0;
    const amount_max = product.amount_max ?? product.max_amount ?? null;
    const revenue_min = product.revenue_min ?? product.min_revenue ?? 0;
    // Normalize interest rate and term fields
    const interest_rate_min = product.interest_rate_min ?? null;
    const interest_rate_max = product.interest_rate_max ?? null;
    const term_min = product.term_min ?? null;
    const term_max = product.term_max ?? null;
    // Normalize document requirements - use standardized field first, fallback to legacy
    let docRequirements = product.docRequirements ?? product.doc_requirements ?? [];
    let rawDocRequirements = product.rawDocRequirements ?? product.raw_doc_requirements ?? docRequirements;
    // Special handling for database field that comes as array of objects or strings
    if (Array.isArray(docRequirements) && docRequirements.length > 0) {
        // If it's an array of strings, use as-is
        if (typeof docRequirements[0] === 'string') {
            docRequirements = docRequirements;
        }
    }
    const required_documents = docRequirements;
    // Normalize product type
    const product_type = product.product_type ??
        product.funding_type ??
        null;
    return {
        id: product.id || '',
        name: product.name || product.product_name || '',
        category: product.category || '',
        country: product.country || '',
        geography,
        amount_min,
        amount_max,
        revenue_min,
        interest_rate_min,
        interest_rate_max,
        term_min,
        term_max,
        required_documents,
        raw_required_documents: rawDocRequirements,
        product_type,
        // 🚀 DUAL FIELD SUPPORT: Provide legacy aliases for backward compatibility
        minAmount: amount_min,
        maxAmount: amount_max,
        min_amount: amount_min,
        max_amount: amount_max,
        min_revenue: revenue_min,
        interestRateMin: interest_rate_min,
        interestRateMax: interest_rate_max,
        termMin: term_min,
        termMax: term_max,
        // Document requirements dual field support  
        doc_requirements: required_documents,
        raw_doc_requirements: rawDocRequirements
    };
}
/**
 * Normalizes an array of products
 */
export function normalizeProductsArray(products) {
    return products.map(normalizeProductSchema);
}
/**
 * Validation function to ensure product meets schema requirements
 */
export function validateNormalizedProduct(product) {
    const errors = [];
    if (!product.id)
        errors.push('Missing required field: id');
    if (!product.name)
        errors.push('Missing required field: name');
    if (!product.category)
        errors.push('Missing required field: category');
    if (!product.country)
        errors.push('Missing required field: country');
    if (!Array.isArray(product.geography))
        errors.push('geography must be an array');
    if (typeof product.amount_min !== 'number')
        errors.push('amount_min must be a number');
    if (typeof product.amount_max !== 'number')
        errors.push('amount_max must be a number');
    if (!Array.isArray(product.required_documents))
        errors.push('required_documents must be an array');
    if (typeof product.revenue_min !== 'number')
        errors.push('revenue_min must be a number');
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Logs product structure for schema drift detection
 */
export function logProductStructure(products, endpoint) {
    console.log(`[PRODUCT API] ${endpoint} - Serving ${products.length} normalized products`);
    if (products.length > 0) {
        const sampleProduct = products[0];
        const structure = {
            fields: Object.keys(sampleProduct),
            documentTypesCount: sampleProduct.required_documents?.length || 0,
            geographyCount: sampleProduct.geography?.length || 0,
            hasProductType: !!sampleProduct.product_type
        };
        console.log(`[PRODUCT API] Structure:`, structure);
        // Log any validation issues
        const validation = validateNormalizedProduct(sampleProduct);
        if (!validation.valid) {
            console.warn(`[PRODUCT API] Validation issues:`, validation.errors);
        }
    }
}
