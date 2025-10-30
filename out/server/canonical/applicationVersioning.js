import { z } from "zod";
/** Minimal v1 canonical shape (extend as your canonical grows) */
export const ApplicationV1 = z.object({
    version: z.literal("ApplicationV1"),
    applicationId: z.string().optional(),
    businessLocation: z.string().optional(),
    headquarters: z.string().optional(),
    headquartersState: z.string().optional(),
    industry: z.string().optional(),
    lookingFor: z.string().optional(),
    fundingAmount: z.union([z.string(), z.number()]).optional(),
    fundsPurpose: z.string().optional(),
    salesHistory: z.string().optional(),
    revenueLastYear: z.union([z.string(), z.number()]).optional(),
    averageMonthlyRevenue: z.union([z.string(), z.number()]).optional(),
    accountsReceivableBalance: z.union([z.string(), z.number()]).optional(),
    fixedAssetsValue: z.union([z.string(), z.number()]).optional(),
    equipmentValue: z.union([z.string(), z.number()]).optional(),
    selectedCategory: z.string().optional(),
    // … add remaining canonical keys as they're standardized
});
/** Legacy acceptance (two common client shapes) */
export const LegacyBySteps = z.object({
    step1: z.record(z.any()).optional(),
    step3: z.record(z.any()).optional(),
    step4: z.record(z.any()).optional(),
    // …
}).strict();
export const LegacyGrouped = z.object({
    applicantInformation: z.record(z.any()).optional(),
    businessInformation: z.record(z.any()).optional(),
    finance: z.record(z.any()).optional(),
    // …
}).strict();
/** Union of accepted payloads */
export const ApplicationAny = z.union([ApplicationV1, LegacyBySteps, LegacyGrouped]);
