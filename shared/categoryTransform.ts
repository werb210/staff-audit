// shared/categoryTransform.ts - Transform helpers (normalize all inputs)
import { CATEGORY } from "./categories";

const mapLabelToSlug: Record<string, string> = {
  "working capital": CATEGORY.WORKING_CAPITAL.slug,
  "term loan": CATEGORY.TERM_LOAN.slug,
  "line of credit": CATEGORY.LINE_OF_CREDIT.slug,
  "equipment financing": CATEGORY.EQUIPMENT_FINANCING.slug,
  "sba loan": CATEGORY.SBA_LOAN.slug,
  "invoice factoring": CATEGORY.INVOICE_FACTORING.slug,
  "factoring": CATEGORY.INVOICE_FACTORING.slug,
  "merchant cash advance": CATEGORY.MERCHANT_CASH_ADVANCE.slug,
  "commercial real estate": CATEGORY.COMMERCIAL_REAL_ESTATE.slug,
  "purchase order financing": CATEGORY.PURCHASE_ORDER_FINANCING.slug, // NEW
};

export function toCategorySlug(input: string): string {
  if (!input) return CATEGORY.WORKING_CAPITAL.slug;
  const key = String(input).trim().toLowerCase();
  if (mapLabelToSlug[key]) return mapLabelToSlug[key];
  // accept existing slugs
  const hit = Object.values(CATEGORY).find(c => c.slug === key);
  return hit ? hit.slug : CATEGORY.WORKING_CAPITAL.slug;
}

export function toCategoryLabel(slug: string): string {
  const hit = Object.values(CATEGORY).find(c => c.slug === slug);
  return hit ? hit.label : CATEGORY.WORKING_CAPITAL.label;
}