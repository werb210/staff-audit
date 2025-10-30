import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
// REMOVED: requirePermission from authz service (authentication system deleted)
const router = Router();
/* Global Search Endpoint */
router.post("/", async (req, res) => {
    const { query, filters, limit = 50, offset = 0 } = req.body || {};
    if (!query || query.length < 2) {
        return res.status(400).json({ error: "Query must be at least 2 characters" });
    }
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = {
        applications: [],
        contacts: [],
        documents: [],
        lenders: [],
        communications: [],
        total: 0
    };
    try {
        // Search Applications
        if (!filters?.types || filters.types.includes('applications')) {
            const appResults = await db.execute(sql `
        SELECT a.id, a.legal_business_name as business_name, a.contact_first_name as first_name, 
               a.contact_last_name as last_name, a.business_email as email, a.business_phone as phone, 
               a.status, a.createdAt, 'application' as type
        FROM applications a 
        WHERE LOWER(a.legal_business_name) LIKE ${searchTerm} 
           OR LOWER(a.contact_first_name) LIKE ${searchTerm}
           OR LOWER(a.contact_last_name) LIKE ${searchTerm}
           OR LOWER(a.business_email) LIKE ${searchTerm}
           OR a.business_phone LIKE ${searchTerm}
        ORDER BY a.createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
            results.applications = appResults.rows || [];
        }
        // Search Contacts
        if (!filters?.types || filters.types.includes('contacts')) {
            const contactResults = await db.execute(sql `
        SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.company,
               c.createdAt, 'contact' as type
        FROM contacts c
        WHERE LOWER(c.first_name) LIKE ${searchTerm}
           OR LOWER(c.last_name) LIKE ${searchTerm}
           OR LOWER(c.email) LIKE ${searchTerm}
           OR c.phone LIKE ${searchTerm}
           OR LOWER(c.company) LIKE ${searchTerm}
        ORDER BY c.createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
            results.contacts = contactResults.rows || [];
        }
        // Search Documents
        if (!filters?.types || filters.types.includes('documents')) {
            const docResults = await db.execute(sql `
        SELECT d.id, d.filename, d.category, d.applicationId, d.createdAt,
               a.legal_business_name as business_name, a.contact_first_name as first_name, a.contact_last_name as last_name, 'document' as type
        FROM documents d
        LEFT JOIN applications a ON a.id = d.applicationId
        WHERE LOWER(d.filename) LIKE ${searchTerm}
           OR LOWER(d.category) LIKE ${searchTerm}
        ORDER BY d.createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
            results.documents = docResults.rows || [];
        }
        // Search Lender Partners
        if (!filters?.types || filters.types.includes('lenders')) {
            const lenderResults = await db.execute(sql `
        SELECT l.id, l.name, l.email, l.createdAt, 'lender' as type
        FROM lender_partners l
        WHERE LOWER(l.name) LIKE ${searchTerm}
           OR LOWER(l.email) LIKE ${searchTerm}
        ORDER BY l.createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
            results.lenders = lenderResults.rows || [];
        }
        // Search Communications (if table exists)
        if (!filters?.types || filters.types.includes('communications')) {
            try {
                const commResults = await db.execute(sql `
          SELECT c.id, c.body, c.channel, c.createdAt, c.applicationId,
                 a.legal_business_name as business_name, a.contact_first_name as first_name, a.contact_last_name as last_name, 'communication' as type
          FROM comm_messages c
          LEFT JOIN applications a ON a.id = c.applicationId
          WHERE LOWER(c.body) LIKE ${searchTerm}
          ORDER BY c.createdAt DESC
          LIMIT ${limit} OFFSET ${offset}
        `);
                results.communications = commResults.rows || [];
            }
            catch (error) {
                // Communications table may not exist in all environments
                console.warn('Communications search failed:', error);
                results.communications = [];
            }
        }
        // Calculate total results
        results.total = results.applications.length + results.contacts.length +
            results.documents.length + results.lenders.length +
            results.communications.length;
        res.json(results);
    }
    catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
/* Search Suggestions Endpoint */
router.get("/suggestions", async (req, res) => {
    const { query = "", limit = 10 } = req.query;
    if (!query || query.length < 1) {
        return res.json([]);
    }
    const searchTerm = `%${query.toLowerCase()}%`;
    const suggestions = [];
    try {
        // Get business names
        const businesses = await db.execute(sql `
      SELECT DISTINCT legal_business_name as business_name 
      FROM applications 
      WHERE legal_business_name IS NOT NULL AND LOWER(legal_business_name) LIKE ${searchTerm}
      ORDER BY legal_business_name
      LIMIT ${Math.floor(limit / 3)}
    `);
        suggestions.push(...(businesses.rows?.map(r => r.business_name) || []));
        // Get contact names
        const names = await db.execute(sql `
      SELECT DISTINCT CONCAT(first_name, ' ', last_name) as full_name
      FROM contacts 
      WHERE (LOWER(first_name) LIKE ${searchTerm} OR LOWER(last_name) LIKE ${searchTerm})
        AND first_name IS NOT NULL AND last_name IS NOT NULL
      ORDER BY full_name
      LIMIT ${Math.floor(limit / 3)}
    `);
        suggestions.push(...(names.rows?.map(r => r.full_name) || []));
        // Get email domains
        const domains = await db.execute(sql `
      SELECT DISTINCT SUBSTRING(email FROM '@(.*)') as domain
      FROM applications
      WHERE email IS NOT NULL AND LOWER(email) LIKE ${searchTerm}
      UNION
      SELECT DISTINCT SUBSTRING(email FROM '@(.*)') as domain
      FROM contacts
      WHERE email IS NOT NULL AND LOWER(email) LIKE ${searchTerm}
      ORDER BY domain
      LIMIT ${Math.floor(limit / 3)}
    `);
        suggestions.push(...(domains.rows?.map(r => '@' + r.domain) || []));
        // Remove duplicates and limit
        const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, limit);
        res.json(uniqueSuggestions);
    }
    catch (error) {
        console.error('Search suggestions error:', error);
        res.json([]);
    }
});
/* Advanced Search with Filters */
router.post("/advanced", async (req, res) => {
    const { query, dateRange, status, category, assignedTo, limit = 50, offset = 0 } = req.body || {};
    const searchTerm = query ? `%${query.toLowerCase()}%` : null;
    const results = {
        applications: [],
        total: 0
    };
    try {
        let whereConditions = [];
        let params = [];
        let paramIndex = 0;
        if (searchTerm) {
            whereConditions.push(`(
        LOWER(a.legal_business_name) LIKE $${++paramIndex} 
        OR LOWER(a.contact_first_name) LIKE $${paramIndex}
        OR LOWER(a.contact_last_name) LIKE $${paramIndex}
        OR LOWER(a.business_email) LIKE $${paramIndex}
        OR a.business_phone LIKE $${paramIndex}
      )`);
            params.push(searchTerm);
        }
        if (dateRange?.start && dateRange?.end) {
            whereConditions.push(`a.createdAt BETWEEN $${++paramIndex} AND $${++paramIndex}`);
            params.push(dateRange.start, dateRange.end);
        }
        if (status && status.length > 0) {
            const statusPlaceholders = status.map(() => `$${++paramIndex}`).join(',');
            whereConditions.push(`a.status IN (${statusPlaceholders})`);
            params.push(...status);
        }
        const whereClause = whereConditions.length > 0 ?
            'WHERE ' + whereConditions.join(' AND ') : '';
        const queryString = `
      SELECT a.id, a.legal_business_name as business_name, a.contact_first_name as first_name, a.contact_last_name as last_name, a.business_email as email, 
             a.business_phone as phone, a.status, a.createdAt, 'application' as type
      FROM applications a 
      ${whereClause}
      ORDER BY a.createdAt DESC
      LIMIT $${++paramIndex} OFFSET $${++paramIndex}
    `;
        params.push(limit, offset);
        const appResults = await db.execute(sql.raw(queryString, params));
        results.applications = appResults.rows || [];
        results.total = results.applications.length;
        res.json(results);
    }
    catch (error) {
        console.error('Advanced search error:', error);
        res.status(500).json({ error: 'Advanced search failed' });
    }
});
export default router;
