import { z } from "zod";
export const ProductFormZ = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Name is required"),
    country: z.enum(["CA", "US"], { required_error: "Country is required" }),
    category: z.string().min(2, "Category is required"),
    min_amount: z.number().nullable().optional(),
    max_amount: z.number().nullable().optional(),
    active: z.boolean().default(true),
    min_time_in_business: z.number().int().nullable().optional(),
    min_monthly_revenue: z.number().nullable().optional(),
    required_documents: z.array(z.string()).default([]),
    excluded_industries: z.array(z.string()).default([]),
}).refine(v => {
    if (v.min_amount != null && v.max_amount != null)
        return v.min_amount <= v.max_amount;
    return true;
}, "Minimum amount must be <= maximum amount");
