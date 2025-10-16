// server/routes/lenders-api.ts - Simple lender API endpoints for Staff app
import { Router } from "express";
import { db } from "../db/index.js";
import { lenders, lenderProducts } from "../../shared/schema.js";
import { eq, count, sql } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import validator from "validator";

const router = Router();

// GET /api/lenders - List all lenders with product counts
router.get("/lenders", async (req: any, res: any) => {
  try {
    console.log("📦 [LENDERS-API] Fetching lenders with product counts");
    
    const lendersWithProducts = await db
      .select({
        id: lenders.id,
        name: lenders.name,
        address: lenders.address,
        mainPhone: lenders.mainPhone,
        mainContactFirst: lenders.mainContactFirst,
        mainContactLast: lenders.mainContactLast,
        mainContactMobile: lenders.mainContactMobile,
        mainContactEmail: lenders.mainContactEmail,
        url: lenders.url,
        description: lenders.description,
        productCount: count(lenderProducts.id)
      })
      .from(lenders)
      .leftJoin(lenderProducts, eq(lenders.id, lenderProducts.lenderId))
      .groupBy(lenders.id, lenders.name, lenders.address, lenders.mainPhone, 
               lenders.mainContactFirst, lenders.mainContactLast, lenders.mainContactMobile,
               lenders.mainContactEmail, lenders.url, lenders.description)
      .orderBy(lenders.name);
    
    console.log(`✅ [LENDERS-API] Found ${lendersWithProducts.length} lenders`);
    res.json(lendersWithProducts);
  } catch (e: any) {
    console.error("❌ [LENDERS-API] Error fetching lenders:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// GET /api/lender-products - List all products with clean schema and lender relationships
router.get("/lender-products", async (req: any, res: any) => {
  try {
    console.log("📦 [LENDER-PRODUCTS] Fetching products with lender names");
    
    // Try raw SQL first to debug
    const { rows } = await db.execute(sql`
      SELECT 
        p.id,
        p.product_name as "productName",
        p.category,
        p.amount_min as "minAmount", 
        p.amount_max as "maxAmount",
        p.min_term_months as "minTermMonths",
        p.max_term_months as "maxTermMonths", 
        p.min_interest as "minInterest",
        p.max_interest as "maxInterest",
        p.country,
        p.is_active as "isActive",
        l.name as lender,
        p.lender_id as "lenderId"
      FROM lender_products p
      LEFT JOIN lenders l ON p.lender_id = l.id
      ORDER BY l.name, p.product_name
    `);
    const products = rows;

    console.log(`✅ [LENDER-PRODUCTS] Returning ${products.length} products`);
    res.json({
      success: true,
      total: products.length,
      count: products.length,
      products: products
    });
  } catch (e: any) {
    console.error("❌ [LENDER-PRODUCTS] Error fetching products:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch lender products",
      error: e?.message || String(e) 
    });
  }
});

// POST /api/lenders - Create new lender
router.post("/lenders", async (req: any, res: any) => {
  try {
    console.log("📝 [LENDERS-API] Creating new lender");
    
    // 🔒 SECURITY: Sanitize all input fields to prevent XSS
    const sanitizedData = {
      name: req.body.name ? sanitizeHtml(req.body.name, { allowedTags: [], allowedAttributes: {} }) : null,
      address: req.body.address ? sanitizeHtml(req.body.address, { allowedTags: [], allowedAttributes: {} }) : null,
      mainPhone: req.body.mainPhone ? sanitizeHtml(req.body.mainPhone, { allowedTags: [], allowedAttributes: {} }) : null,
      mainContactFirst: req.body.mainContactFirst ? sanitizeHtml(req.body.mainContactFirst, { allowedTags: [], allowedAttributes: {} }) : null,
      mainContactLast: req.body.mainContactLast ? sanitizeHtml(req.body.mainContactLast, { allowedTags: [], allowedAttributes: {} }) : null,
      mainContactMobile: req.body.mainContactMobile ? sanitizeHtml(req.body.mainContactMobile, { allowedTags: [], allowedAttributes: {} }) : null,
      mainContactEmail: req.body.mainContactEmail && validator.isEmail(req.body.mainContactEmail) ? sanitizeHtml(req.body.mainContactEmail, { allowedTags: [], allowedAttributes: {} }) : null,
      url: req.body.url ? sanitizeHtml(req.body.url, { allowedTags: [], allowedAttributes: {} }) : null,
      description: req.body.description ? sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} }) : null
    };
    
    // Validate required fields
    if (!sanitizedData.name) {
      return res.status(400).json({ 
        success: false, 
        message: "Lender name is required" 
      });
    }
    
    const newLender = await db.insert(lenders)
      .values(sanitizedData)
      .returning();
    
    console.log(`✅ [LENDERS-API] Created lender: ${newLender[0].name}`);
    res.json({ success: true, lender: newLender[0] });
  } catch (e: any) {
    console.error("❌ [LENDERS-API] Error creating lender:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create lender",
      error: e?.message || String(e) 
    });
  }
});

// PUT /api/lenders/:id - Update existing lender
router.put("/lenders/:id", async (req: any, res: any) => {
  try {
    console.log(`📝 [LENDERS-API] Updating lender: ${req.params.id}`);
    
    // 🔒 SECURITY: Sanitize all input fields to prevent XSS
    const sanitizedData = {
      name: req.body.name ? sanitizeHtml(req.body.name, { allowedTags: [], allowedAttributes: {} }) : undefined,
      address: req.body.address ? sanitizeHtml(req.body.address, { allowedTags: [], allowedAttributes: {} }) : undefined,
      mainPhone: req.body.mainPhone ? sanitizeHtml(req.body.mainPhone, { allowedTags: [], allowedAttributes: {} }) : undefined,
      mainContactFirst: req.body.mainContactFirst ? sanitizeHtml(req.body.mainContactFirst, { allowedTags: [], allowedAttributes: {} }) : undefined,
      mainContactLast: req.body.mainContactLast ? sanitizeHtml(req.body.mainContactLast, { allowedTags: [], allowedAttributes: {} }) : undefined,
      mainContactMobile: req.body.mainContactMobile ? sanitizeHtml(req.body.mainContactMobile, { allowedTags: [], allowedAttributes: {} }) : undefined,
      mainContactEmail: req.body.mainContactEmail && validator.isEmail(req.body.mainContactEmail) ? sanitizeHtml(req.body.mainContactEmail, { allowedTags: [], allowedAttributes: {} }) : undefined,
      url: req.body.url ? sanitizeHtml(req.body.url, { allowedTags: [], allowedAttributes: {} }) : undefined,
      description: req.body.description ? sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} }) : undefined,
      updatedAt: new Date()
    };
    
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
    );
    
    const updatedLender = await db.update(lenders)
      .set(cleanData)
      .where(eq(lenders.id, req.params.id))
      .returning();

    if (updatedLender.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Lender not found" 
      });
    }
    
    console.log(`✅ [LENDERS-API] Updated lender: ${updatedLender[0].name}`);
    res.json({ success: true, lender: updatedLender[0] });
  } catch (e: any) {
    console.error("❌ [LENDERS-API] Error updating lender:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update lender",
      error: e?.message || String(e) 
    });
  }
});

// DELETE /api/lenders/:id - Delete lender
router.delete("/lenders/:id", async (req: any, res: any) => {
  try {
    console.log(`🗑️ [LENDERS-API] Deleting lender: ${req.params.id}`);
    
    const deletedLender = await db.delete(lenders)
      .where(eq(lenders.id, req.params.id))
      .returning();

    if (deletedLender.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Lender not found" 
      });
    }
    
    console.log(`✅ [LENDERS-API] Deleted lender: ${deletedLender[0].name}`);
    res.json({ success: true, message: "Lender deleted successfully" });
  } catch (e: any) {
    console.error("❌ [LENDERS-API] Error deleting lender:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete lender",
      error: e?.message || String(e) 
    });
  }
});

// POST /api/lender-products - Create new lender product
router.post("/lender-products", async (req: any, res: any) => {
  try {
    console.log("📝 [LENDER-PRODUCTS] Creating new product");
    console.log("📝 [LENDER-PRODUCTS] Request body:", req.body);
    
    // 🔒 SECURITY: Sanitize and validate all input fields
    const sanitizedData = {
      lenderId: req.body.lenderId,
      productName: req.body.productName ? sanitizeHtml(req.body.productName, { allowedTags: [], allowedAttributes: {} }) : null,
      category: req.body.category,
      minAmount: req.body.minAmount ? parseInt(req.body.minAmount) : null,
      maxAmount: req.body.maxAmount ? parseInt(req.body.maxAmount) : null,
      minTermMonths: req.body.minTermMonths ? parseInt(req.body.minTermMonths) : null,
      maxTermMonths: req.body.maxTermMonths ? parseInt(req.body.maxTermMonths) : null,
      minInterest: req.body.minInterest ? parseFloat(req.body.minInterest) : null,
      maxInterest: req.body.maxInterest ? parseFloat(req.body.maxInterest) : null,
      minCreditScore: req.body.minCreditScore ? parseInt(req.body.minCreditScore) : null,
      description: req.body.description ? sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} }) : null,
      country: req.body.country || 'US',
      tenantId: req.body.tenantId ? sanitizeHtml(req.body.tenantId, { allowedTags: [], allowedAttributes: {} }) : null,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
    };
    
    // Validate required fields
    if (!sanitizedData.lenderId) {
      return res.status(400).json({ 
        success: false, 
        message: "Lender ID is required" 
      });
    }
    
    if (!sanitizedData.productName) {
      return res.status(400).json({ 
        success: false, 
        message: "Product name is required" 
      });
    }
    
    if (!sanitizedData.category) {
      return res.status(400).json({ 
        success: false, 
        message: "Category is required" 
      });
    }
    
    if (!sanitizedData.minAmount || !sanitizedData.maxAmount) {
      return res.status(400).json({ 
        success: false, 
        message: "Minimum and maximum amounts are required" 
      });
    }
    
    const newProduct = await db.insert(lenderProducts)
      .values({
        ...sanitizedData,
        id: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      .returning();
    
    console.log(`✅ [LENDER-PRODUCTS] Created product: ${newProduct[0].productName}`);
    res.json({ success: true, product: newProduct[0] });
  } catch (e: any) {
    console.error("❌ [LENDER-PRODUCTS] Error creating product:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create product",
      error: e?.message || String(e) 
    });
  }
});

// PUT /api/lender-products/:id - Update existing lender product
router.put("/lender-products/:id", async (req: any, res: any) => {
  try {
    console.log(`📝 [LENDER-PRODUCTS] Updating product: ${req.params.id}`);
    console.log("📝 [LENDER-PRODUCTS] Request body:", req.body);
    
    // 🔒 SECURITY: Sanitize and validate all input fields
    const sanitizedData = {
      lenderId: req.body.lenderId,
      productName: req.body.productName ? sanitizeHtml(req.body.productName, { allowedTags: [], allowedAttributes: {} }) : undefined,
      category: req.body.category,
      minAmount: req.body.minAmount ? parseInt(req.body.minAmount) : undefined,
      maxAmount: req.body.maxAmount ? parseInt(req.body.maxAmount) : undefined,
      minTermMonths: req.body.minTermMonths ? parseInt(req.body.minTermMonths) : undefined,
      maxTermMonths: req.body.maxTermMonths ? parseInt(req.body.maxTermMonths) : undefined,
      minInterest: req.body.minInterest ? parseFloat(req.body.minInterest) : undefined,
      maxInterest: req.body.maxInterest ? parseFloat(req.body.maxInterest) : undefined,
      minCreditScore: req.body.minCreditScore ? parseInt(req.body.minCreditScore) : undefined,
      description: req.body.description ? sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} }) : undefined,
      country: req.body.country,
      tenantId: req.body.tenantId ? sanitizeHtml(req.body.tenantId, { allowedTags: [], allowedAttributes: {} }) : undefined,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined,
      updatedAt: new Date()
    };
    
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
    );
    
    const updatedProduct = await db.update(lenderProducts)
      .set(cleanData)
      .where(eq(lenderProducts.id, req.params.id))
      .returning();

    if (updatedProduct.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }
    
    console.log(`✅ [LENDER-PRODUCTS] Updated product: ${updatedProduct[0].productName}`);
    res.json({ success: true, product: updatedProduct[0] });
  } catch (e: any) {
    console.error("❌ [LENDER-PRODUCTS] Error updating product:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update product",
      error: e?.message || String(e) 
    });
  }
});

// DELETE /api/lender-products/:id - Delete lender product
router.delete("/lender-products/:id", async (req: any, res: any) => {
  try {
    console.log(`🗑️ [LENDER-PRODUCTS] Deleting product: ${req.params.id}`);
    
    const deletedProduct = await db.delete(lenderProducts)
      .where(eq(lenderProducts.id, req.params.id))
      .returning();

    if (deletedProduct.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }
    
    console.log(`✅ [LENDER-PRODUCTS] Deleted product: ${deletedProduct[0].productName}`);
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (e: any) {
    console.error("❌ [LENDER-PRODUCTS] Error deleting product:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete product",
      error: e?.message || String(e) 
    });
  }
});

// Nested product routes for specific lenders
// POST /api/lenders/:lenderId/products - Create product for specific lender
router.post("/lenders/:lenderId/products", async (req: any, res: any) => {
  try {
    console.log("📝 [NESTED-PRODUCTS] Creating product for lender:", req.params.lenderId);
    console.log("📝 [NESTED-PRODUCTS] Request body:", req.body);
    
    // 🔒 SECURITY: Sanitize and validate all input fields
    const sanitizedData = {
      lenderId: req.params.lenderId, // Use lenderId from URL
      productName: req.body.productName || req.body.name ? sanitizeHtml(req.body.productName || req.body.name, { allowedTags: [], allowedAttributes: {} }) : null,
      category: req.body.category,
      minAmount: req.body.minAmount || req.body.min_amount ? parseInt(req.body.minAmount || req.body.min_amount) : null,
      maxAmount: req.body.maxAmount || req.body.max_amount ? parseInt(req.body.maxAmount || req.body.max_amount) : null,
      minTermMonths: req.body.minTermMonths ? parseInt(req.body.minTermMonths) : null,
      maxTermMonths: req.body.maxTermMonths ? parseInt(req.body.maxTermMonths) : null,
      minInterest: req.body.minInterest ? parseFloat(req.body.minInterest) : null,
      maxInterest: req.body.maxInterest ? parseFloat(req.body.maxInterest) : null,
      minCreditScore: req.body.minCreditScore ? parseInt(req.body.minCreditScore) : null,
      description: req.body.description ? sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} }) : null,
      country: req.body.country || 'US',
      tenantId: req.body.tenantId || req.body.tenant_id ? sanitizeHtml(req.body.tenantId || req.body.tenant_id, { allowedTags: [], allowedAttributes: {} }) : null,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : (req.body.active !== undefined ? Boolean(req.body.active) : true)
    };
    
    // Validate required fields
    if (!sanitizedData.productName) {
      return res.status(400).json({ 
        success: false, 
        message: "Product name is required" 
      });
    }
    
    if (!sanitizedData.category) {
      return res.status(400).json({ 
        success: false, 
        message: "Category is required" 
      });
    }
    
    if (!sanitizedData.minAmount || !sanitizedData.maxAmount) {
      return res.status(400).json({ 
        success: false, 
        message: "Minimum and maximum amounts are required" 
      });
    }
    
    const newProduct = await db.insert(lenderProducts)
      .values({
        ...sanitizedData,
        id: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      .returning();
    
    console.log(`✅ [NESTED-PRODUCTS] Created product: ${newProduct[0].productName}`);
    res.json({ success: true, product: newProduct[0] });
    
  } catch (e: any) {
    console.error("❌ [NESTED-PRODUCTS] Error creating product:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create product",
      error: e?.message || String(e) 
    });
  }
});

// PUT /api/lenders/:lenderId/products/:productId - Update product for specific lender
router.put("/lenders/:lenderId/products/:productId", async (req: any, res: any) => {
  try {
    console.log("📝 [NESTED-PRODUCTS] Updating product:", req.params.productId, "for lender:", req.params.lenderId);
    console.log("📝 [NESTED-PRODUCTS] Request body:", req.body);
    
    // 🔒 SECURITY: Sanitize and validate all input fields
    const sanitizedData = {
      lenderId: req.params.lenderId,
      productName: req.body.productName || req.body.name ? sanitizeHtml(req.body.productName || req.body.name, { allowedTags: [], allowedAttributes: {} }) : undefined,
      category: req.body.category,
      minAmount: req.body.minAmount || req.body.min_amount ? parseInt(req.body.minAmount || req.body.min_amount) : undefined,
      maxAmount: req.body.maxAmount || req.body.max_amount ? parseInt(req.body.maxAmount || req.body.max_amount) : undefined,
      minTermMonths: req.body.minTermMonths ? parseInt(req.body.minTermMonths) : undefined,
      maxTermMonths: req.body.maxTermMonths ? parseInt(req.body.maxTermMonths) : undefined,
      minInterest: req.body.minInterest ? parseFloat(req.body.minInterest) : undefined,
      maxInterest: req.body.maxInterest ? parseFloat(req.body.maxInterest) : undefined,
      minCreditScore: req.body.minCreditScore ? parseInt(req.body.minCreditScore) : undefined,
      description: req.body.description ? sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} }) : undefined,
      country: req.body.country,
      tenantId: req.body.tenantId || req.body.tenant_id ? sanitizeHtml(req.body.tenantId || req.body.tenant_id, { allowedTags: [], allowedAttributes: {} }) : undefined,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : (req.body.active !== undefined ? Boolean(req.body.active) : undefined),
      updatedAt: new Date()
    };
    
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
    );
    
    const updatedProduct = await db.update(lenderProducts)
      .set(cleanData)
      .where(eq(lenderProducts.id, req.params.productId))
      .returning();

    if (updatedProduct.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }
    
    console.log(`✅ [NESTED-PRODUCTS] Updated product: ${updatedProduct[0].productName}`);
    res.json({ success: true, product: updatedProduct[0] });
    
  } catch (e: any) {
    console.error("❌ [NESTED-PRODUCTS] Error updating product:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update product",
      error: e?.message || String(e) 
    });
  }
});

// GET /api/lenders/:lenderId/products/:productId - Get specific product
router.get("/lenders/:lenderId/products/:productId", async (req: any, res: any) => {
  try {
    console.log("📝 [NESTED-PRODUCTS] Fetching product:", req.params.productId);
    
    const product = await db
      .select()
      .from(lenderProducts)
      .where(eq(lenderProducts.id, req.params.productId))
      .limit(1);
    
    if (product.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }
    
    console.log(`✅ [NESTED-PRODUCTS] Found product: ${product[0].productName}`);
    res.json(product[0]);
  } catch (e: any) {
    console.error("❌ [NESTED-PRODUCTS] Error fetching product:", e);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch product",
      error: e?.message || String(e) 
    });
  }
});

export default router;