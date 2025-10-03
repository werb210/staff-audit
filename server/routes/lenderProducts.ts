import { Router } from "express";
import { db } from "../db"; // Drizzle ORM instance
import { lenderProducts } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ProductSchema, ProductArraySchema } from "../schemas/product";

const router = Router();

/**
 * GET /api/lender-products
 * Returns all active lender products in canonical 12-field schema.
 */
/**
 * GET /api/lender-products
 * Returns all lender products with unified schema validation and filters
 * Filters: ?country=CA&productCategory=LOC&isActive=true
 */
router.get("/", async (req: any, res: any) => {
  try {
    // Extract query filters
    const { country, productCategory, isActive } = req.query;
    
    // Build dynamic where conditions
    const whereConditions = [];
    
    if (country) {
      whereConditions.push(eq(lenderProducts.country, country as string));
    }
    
    if (productCategory) {
      whereConditions.push(eq(lenderProducts.category, productCategory as any));
    }
    
    if (isActive !== undefined) {
      whereConditions.push(eq(lenderProducts.isActive, isActive === 'true'));
    } else {
      // Default to active products only
      whereConditions.push(eq(lenderProducts.isActive, true));
    }

    // Execute query with filters
    const query = db.select().from(lenderProducts);
    const products = whereConditions.length > 0 
      ? await query.where(and(...whereConditions)).orderBy(lenderProducts.updatedAt)
      : await query.orderBy(lenderProducts.updatedAt);

    // UNIFIED SCHEMA RESPONSE - Using actual database fields
    const unifiedProducts = products.map((p) => ({
      // Core Identification
      id: p.id,
      lender_id: p.lenderId,
      lender_name: "Unknown", // Will be populated via join later
      
      // Product Details  
      name: p.productName,
      category: p.category,
      country: p.country,
      
      // Financial Terms (Range-based) 
      min_amount: p.minAmount || 0,
      max_amount: p.maxAmount || 0,
      min_interest: p.minInterest ? parseFloat(p.minInterest) : null,
      max_interest: p.maxInterest ? parseFloat(p.maxInterest) : null,
      min_term_months: p.minTermMonths,
      max_term_months: p.maxTermMonths,
      
      // Requirements
      min_credit_score: p.minCreditScore,
      min_annual_revenue: p.minAnnualRevenue,
      min_time_business_months: p.minTimeBusinessMonths,
      required_documents: p.requiredDocuments ? p.requiredDocuments.split(', ') : [],
      excluded_industries: p.excludedIndustries ? p.excludedIndustries.split(', ') : [],
      preferred_industries: p.preferredIndustries ? p.preferredIndustries.split(', ') : [],
      
      // System Fields
      active: p.isActive,
      created_at: p.createdAt,
      updated_at: p.updatedAt
    }));

    console.log(`✅ [LENDER-PRODUCTS-API] Serving ${unifiedProducts.length} products (filters: country=${country}, category=${productCategory}, active=${isActive})`);
    
    return res.json({ 
      success: true, 
      products: unifiedProducts,
      count: unifiedProducts.length,
      filters: { country, productCategory, isActive },
      schema: "unified_v3" // Updated version with filters
    });
  } catch (err) {
    console.error("❌ Lender products fetch failed:", err);
    return res.status(500).json({
      success: false,
      error: "Unable to fetch lender products",
    });
  }
});

/**
 * POST /api/lender-products
 * Create new lender product with unified schema validation
 */
router.post("/", async (req: any, res: any) => {
  try {
    // Database-compatible schema validation
    const dbProductSchema = z.object({
      id: z.string().optional(), // Optional for new products
      lenderId: z.string().uuid(),
      productName: z.string().min(1),
      category: z.string().min(1),
      country: z.string().min(1),
      minAmount: z.number().min(0),
      maxAmount: z.number().min(0),
      minInterest: z.number().min(0).optional(),
      maxInterest: z.number().min(0).optional(),
      minTermMonths: z.number().min(1).optional(),
      maxTermMonths: z.number().min(1).optional(),
      minCreditScore: z.number().min(0).optional(),
      minAnnualRevenue: z.number().min(0).optional(),
      requiredDocuments: z.string().default(""),
      description: z.string().optional(),
      minimumCreditScore: z.number().min(300).max(850).optional(),
      minimumAverageMonthlyRevenue: z.number().min(0).optional(),
      index: z.string().optional(),
      externalId: z.string().optional()
    });

    const validatedData = dbProductSchema.parse(req.body);
    
    // Insert with database schema mapping  
    const [newProduct] = await db.insert(lenderProducts).values({
      productName: validatedData.productName,
      category: validatedData.category as any, // Type assertion for enum
      country: validatedData.country,
      minAmount: validatedData.minAmount,
      maxAmount: validatedData.maxAmount,
      minInterest: validatedData.minInterest?.toString(),
      maxInterest: validatedData.maxInterest?.toString(),
      minTermMonths: validatedData.minTermMonths,
      maxTermMonths: validatedData.maxTermMonths,
      minCreditScore: validatedData.minCreditScore,
      minAnnualRevenue: validatedData.minAnnualRevenue,
      requiredDocuments: validatedData.requiredDocuments,
      isActive: true,
      updatedAt: new Date()
    }).returning();
    
    console.log(`✅ [LENDER-PRODUCTS-API] Created product: ${newProduct.id}`);
    
    return res.json({
      success: true,
      message: "Lender product created successfully",
      product: newProduct
    });
  } catch (err) {
    console.error("❌ Failed to create lender product:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create lender product"
    });
  }
});

// PUT /api/lender-products/:id
router.put("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    
    const [updatedProduct] = await db.update(lenderProducts)
      .set({
        ...productData,
        updatedAt: new Date()
      })
      .where(eq(lenderProducts.id, id))
      .returning();
    
    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Lender product not found"
      });
    }
    
    console.log(`✅ [LENDER-PRODUCTS-API] Updated product: ${id}`);
    
    return res.json({
      success: true,
      message: "Lender product updated successfully",
      product: updatedProduct
    });
  } catch (err) {
    console.error("❌ Failed to update lender product:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update lender product"
    });
  }
});

export default router;