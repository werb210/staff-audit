import { z } from "zod";
export const ProductSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1), // product display name
    lender_name: z.string().min(1),
    country: z.enum(["CA", "US"]).nullable(),
    category: z.string().min(1),
    min_amount: z.number().int().nonnegative(),
    max_amount: z.number().int().nonnegative(),
    active: z.boolean(),
    updatedAt: z.string().datetime(),
    // Optional but recommended for filtering:
    min_time_in_business: z.number().int().nonnegative().nullable().optional(),
    min_monthly_revenue: z.number().int().nonnegative().nullable().optional(),
    excluded_industries: z.array(z.string()).optional().default([]),
    required_documents: z.array(z.string()).optional().default([]),
    // Optional normalization / ops:
    currency: z.enum(["USD", "CAD"]).optional().default("CAD"),
    version: z.number().int().nonnegative().optional().default(1)
});
export const ProductArraySchema = z.array(ProductSchema);
