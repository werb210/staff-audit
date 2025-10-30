import { z } from "zod";

// Application submission payload schema (matches client requirements)
export const ApplicationPayloadSchema = z.object({
  product_id: z.string().min(1),
  country: z.enum(["CA", "US"]),
  amount: z.number().int().positive(),

  // REQUIRED by business rules:
  years_in_business: z.number().int().nonnegative(),
  monthly_revenue: z.number().int().nonnegative(),

  // Contact / business profile
  business_legal_name: z.string().min(1),
  industry: z.string().min(1),
  contact_name: z.string().min(1),
  contact_email: z.string().email(),
  contact_phone: z.string().min(7),

  // Optional documents
  documents: z
    .array(
      z.object({
        type: z.string(),
        url: z.string().url().optional(),
      })
    )
    .default([]),

  client_session_id: z.string().optional(),
});

export type ApplicationPayload = z.infer<typeof ApplicationPayloadSchema>;

// Business rules validation (mirror client-side validation)
export function validateBusinessRules(payload: ApplicationPayload): string[] {
  const errors: string[] = [];
  
  if (payload.years_in_business < 12) {
    errors.push("Minimum 12 months in business required.");
  }
  
  if (payload.monthly_revenue < 15000) {
    errors.push("Minimum $15000 monthly revenue required.");
  }
  
  return errors;
}

// Application record schema for database storage
export const ApplicationRecordSchema = ApplicationPayloadSchema.extend({
  id: z.string(),
  status: z.enum(["RECEIVED", "PROCESSING", "APPROVED", "REJECTED"]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;