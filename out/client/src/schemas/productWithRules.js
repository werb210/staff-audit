import { z } from "zod";
export const ProductWithRulesSchema = z.object({
    id: z.string().uuid().optional(),
    lenderId: z.string().min(1, "Lender is required"),
    name: z.string().min(2, "Product name must be at least 2 characters"),
    countryOffered: z.string().optional(),
    category: z.string().optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().nonnegative().optional(),
    minRate: z.number().min(0).max(100).optional(),
    maxRate: z.number().min(0).max(100).optional(),
    minTermMonths: z.number().int().min(0).optional(),
    maxTermMonths: z.number().int().min(0).optional(),
    active: z.boolean().default(true),
    description: z.string().optional(),
    rules: z
        .object({
        minCreditScore: z.number().int().min(0).max(900).optional(),
        minAnnualRevenue: z.number().nonnegative().optional(),
        timeInBusinessMonths: z.number().int().min(0).optional(),
        maxDebtToIncome: z.number().min(0).max(5).optional(),
        preferredIndustries: z.array(z.string()).optional(),
        excludedIndustries: z.array(z.string()).optional(),
        requiredDocs: z.array(z.string()).optional(),
        excludedRegions: z.array(z.string()).optional(),
        advancedLogic: z.string().optional(),
    })
        .default({}),
});
