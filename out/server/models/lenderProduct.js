/*-----------------------------------------------------
  Canonical types for LenderProducts
  🔒 Updated to match exact staff portal schema requirements
  Based on definitive schema specification
-----------------------------------------------------*/
import { pgTable, uuid, text, numeric, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
// Product category enum matching new database constraints
export const productCategoryOptions = [
    'Working Capital',
    'Equipment Financing',
    'Asset-Based Lending',
    'Purchase Order Financing',
    'Invoice Factoring',
    'Business Line of Credit',
    'Term Loan',
    'SBA Loan'
];
// Country enum matching new database constraints  
export const countryOptions = ['United States', 'Canada'];
// Rate type enum
export const rateTypeOptions = ['Fixed', 'Floating'];
// Rate frequency enum
export const rateFrequencyOptions = ['Monthly', 'Annually'];
// Drizzle table definition matching exact database schema
export const lenderProducts = pgTable('lenderproducts', {
    id: uuid('id').primaryKey().defaultRandom(),
    lenderName: text('lendername').notNull(),
    productName: text('productname').notNull(),
    productCategory: text('productcategory'),
    minAmount: numeric('minamount', { precision: 14, scale: 2 }),
    maxAmount: numeric('maxamount', { precision: 14, scale: 2 }),
    minRatePct: numeric('minratepct', { precision: 5, scale: 2 }),
    maxRatePct: numeric('maxratepct', { precision: 5, scale: 2 }),
    minTermMonths: integer('mintermmonths'),
    maxTermMonths: integer('maxtermmonths'),
    rateType: text('ratetype'),
    rateFrequency: text('ratefrequency'),
    country: text('country'),
    minAvgMonthlyRevenue: numeric('minavgmonthlyrevenue', { precision: 14, scale: 2 }),
    minCreditScore: integer('mincreditscore'),
    requiredDocuments: text('requireddocuments').array()
});
// Zod schemas for validation
export const insertLenderProductSchema = createInsertSchema(lenderProducts, {
    lenderName: z.string().min(1).max(255),
    productName: z.string().min(1).max(255),
    productCategory: z.enum(productCategoryOptions).optional(),
    country: z.enum(countryOptions).optional(),
    rateType: z.enum(rateTypeOptions).optional(),
    rateFrequency: z.enum(rateFrequencyOptions).optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    minRatePct: z.number().min(0).max(100).optional(),
    maxRatePct: z.number().min(0).max(100).optional(),
    minTermMonths: z.number().int().min(1).optional(),
    maxTermMonths: z.number().int().min(1).optional(),
    minAvgMonthlyRevenue: z.number().min(0).optional(),
    minCreditScore: z.number().int().min(300).max(850).optional(),
    requiredDocuments: z.array(z.string()).optional()
});
export const selectLenderProductSchema = createSelectSchema(lenderProducts);
