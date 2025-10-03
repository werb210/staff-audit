import { z } from 'zod';

// Base object schema without refinements
const baseLenderProductSchema = z.object({
  // Core required fields
  tenantId: z.string().uuid(),
  productName: z.string().min(2).max(255),
  lenderName: z.string().min(2).max(255),
  productType: z.enum([
    "term_loan", "line_of_credit", "factoring", "merchant_cash_advance", 
    "sba_loan", "equipment_financing", "invoice_factoring", 
    "purchase_order_financing", "working_capital"
  ]),
  geography: z.array(z.string()).min(1),
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().nonnegative(),
  
  // Strict schema fields (required)
  name: z.string().min(2).max(255),
  country: z.enum(["US", "CA"]),
  category: z.enum(["line_of_credit", "term_loan", "equipment_financing", "invoice_factoring"]),
  
  // Optional fields
  minRevenue: z.number().nonnegative().nullable().optional(),
  industries: z.array(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().nullable().optional().default(true),
  docRequirements: z.array(z.string()).nullable().optional().default([]),
});

// Single source of truth Zod schema for lender products with validation
export const lenderProductSchema = baseLenderProductSchema.refine((data) => data.maxAmount >= data.minAmount, {
  message: "maxAmount must be greater than or equal to minAmount",
  path: ["maxAmount"]
});

// Input type for creating/updating lender products
export type LenderProductInput = z.infer<typeof lenderProductSchema>;

// Partial schema for updates (allows partial field updates)
export const lenderProductUpdateSchema = baseLenderProductSchema.partial().extend({
  id: z.string().uuid() // ID required for updates
});

export type LenderProductUpdate = z.infer<typeof lenderProductUpdateSchema>;

// Public API schema (subset for client consumption)
export const publicLenderProductSchema = z.object({
  id: z.string().uuid(),
  productName: z.string(),
  lenderName: z.string(),
  category: z.enum(["line_of_credit", "term_loan", "equipment_financing", "invoice_factoring"]),
  geography: z.array(z.string()),
  minAmount: z.number(),
  maxAmount: z.number(),
  country: z.enum(["US", "CA"]),
  industries: z.array(z.string()).nullable(),
  description: z.string().nullable(),
});

export type PublicLenderProduct = z.infer<typeof publicLenderProductSchema>;