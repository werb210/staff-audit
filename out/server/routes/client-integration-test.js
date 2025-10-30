// Simple test endpoint to verify client integration routing
import { Router } from "express";
import { Client } from "pg";
import crypto from "crypto";
const router = Router();
async function pgc() {
    const c = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await c.connect();
    return c;
}
// Test endpoint
router.get("/test", (req, res) => {
    res.json({
        message: "Client integration API is working!",
        timestamp: new Date().toISOString(),
        endpoint: "client-integration-test"
    });
});
// Simple application creation (fixed version)
router.post("/", async (req, res) => {
    const client = await pgc();
    try {
        const { product_id = "test-product", country = "CA", amount = 50000, timeInBusinessMonths = 12, monthlyRevenue = 10000, industry = "Technology", business_name = "Test Business", contact_email = "test@example.com", contact_phone = "555-123-4567" } = req.body;
        // Generate proper UUID
        const appId = crypto.randomUUID();
        const query = `
      INSERT INTO applications (
        id, 
        requested_amount, 
        use_of_funds, 
        status,
        form_data,
        product_id,
        submission_country,
        business_name,
        contact_email,
        contact_phone,
        annual_revenue,
        years_in_business,
        createdAt, 
        updatedAt
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, status, requested_amount, createdAt
    `;
        const formData = {
            product_id, country, amount, timeInBusinessMonths,
            monthlyRevenue, industry, business_name, contact_email, contact_phone
        };
        const result = await client.query(query, [
            appId,
            amount,
            `${industry} business funding`,
            'draft',
            JSON.stringify(formData),
            product_id,
            country,
            business_name,
            contact_email,
            contact_phone,
            monthlyRevenue * 12, // Convert to annual
            Math.max(1, Math.floor(timeInBusinessMonths / 12)) // Convert to years, minimum 1
        ]);
        const app = result.rows[0];
        res.status(201).json({
            success: true,
            application: {
                id: app.id,
                status: app.status,
                amount: app.requested_amount,
                createdAt: app.createdAt
            },
            input: {
                product_id, country, amount, industry
            }
        });
    }
    catch (e) {
        console.error("Application creation error:", e);
        res.status(500).json({
            error: "Failed to create application",
            details: e.message
        });
    }
    finally {
        await client.end();
    }
});
// Simple recommendations endpoint
router.get("/:id/recommendations", async (req, res) => {
    try {
        // Fetch products for recommendations
        const response = await fetch('http://localhost:5000/api/v1/products');
        const products = await response.json();
        // Simple recommendation logic - return first 3 active products
        const recommendations = products
            .filter((p) => p.isActive)
            .slice(0, 3)
            .map((p) => ({
            id: p.id,
            lenderName: p.lenderName,
            productName: p.productName,
            productCategory: p.productCategory,
            matchScore: 85,
            matchReasons: ["Available in your country", "Amount within range"]
        }));
        res.json({
            applicationId: req.params.id,
            recommendationCount: recommendations.length,
            recommendations,
            generatedAt: new Date().toISOString()
        });
    }
    catch (e) {
        console.error("Recommendations error:", e);
        res.status(500).json({ error: "Failed to generate recommendations" });
    }
});
// Simple documents endpoint
router.get("/:id/required-documents", async (req, res) => {
    try {
        const documents = [
            {
                document_type: 'bank_statements',
                display_name: 'Bank Statements',
                description: 'Last 3 months of business bank statements',
                required: true,
                step: 1,
                status: 'pending'
            },
            {
                document_type: 'tax_returns',
                display_name: 'Tax Returns',
                description: 'Most recent business tax return',
                required: true,
                step: 2,
                status: 'pending'
            },
            {
                document_type: 'business_license',
                display_name: 'Business License',
                description: 'Business registration or license',
                required: true,
                step: 3,
                status: 'pending'
            }
        ];
        res.json({
            applicationId: req.params.id,
            totalDocuments: documents.length,
            requiredDocuments: documents.filter(d => d.required).length,
            completionPercentage: 0,
            documents,
            generatedAt: new Date().toISOString()
        });
    }
    catch (e) {
        console.error("Documents error:", e);
        res.status(500).json({ error: "Failed to generate document requirements" });
    }
});
export default router;
