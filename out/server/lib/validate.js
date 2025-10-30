import { z } from "zod";
export const IdSchema = z.object({ id: z.string().min(1) });
export const AppIdSchema = z.object({ applicationId: z.string().min(1) });
export const PresignSchema = z.object({
    applicationId: z.string().min(1),
    fileName: z.string().min(1),
    mime: z.string().min(1),
    bytes: z.number().positive().max(Number(process.env.S3_MAX_BYTES || 10_485_760))
});
export const EmailComposeSchema = z.object({
    applicationId: z.string().min(1),
    intent: z.string().optional().default("update")
});
export const SMSComposeSchema = z.object({
    applicationId: z.string().min(1),
    intent: z.string().optional().default("reminder")
});
export const FinancialHealthSchema = z.object({
    applicationId: z.string().min(1)
});
export const ComplianceScreenSchema = z.object({
    applicationId: z.string().min(1),
    contactId: z.string().optional()
});
