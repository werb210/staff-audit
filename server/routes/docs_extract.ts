import { Router } from "express";
import { db } from "../db/drizzle.js";
import { parseMoney, parseYear, parseYearMonth, parseDate, encryptPII } from "../lib/normalize.js";

const r = Router();

/**
 * POST /api/ai/docs/extract
 * body: { applicationId?, contactId?, docType, payload }
 * payload is raw OCR JSON. We normalize to extracted_json and stash any PII in pii_encrypted.
 */
r.post("/ai/docs/extract", async (req: any, res: any) => {
  const { applicationId, contactId, docType, payload } = req.body || {};
  if (!docType || !payload) {
    return res.status(400).json({ ok: false, error: "missing_docType_or_payload" });
  }

  // Normalize per docType (examples)
  let extracted: any = { docType, fields: {}, arrays: {} };
  let pii: any = {};

  if (docType === "tax_return") {
    extracted.fields.business_legal_name = payload.business_legal_name || payload.legal_name || null;
    // tax id is PII
    if (payload.taxpayer_id) pii.taxpayer_id = String(payload.taxpayer_id);
    const years = Array.isArray(payload.years) ? payload.years : [];
    extracted.arrays.years = years.map((y: any) => ({
      year: parseYear(y.year) || parseYear(y.tax_year),
      gross_income: parseMoney(y.gross_income ?? y.gross).cents,
      net_income: parseMoney(y.net_income ?? y.net).cents,
      tax_payable: parseMoney(y.tax_payable ?? y.tax_owing).cents
    })).filter((r: any) => r.year);
  }

  if (docType === "financial_statements") {
    extracted.fields.business_legal_name = payload.business_legal_name || null;
    const years = Array.isArray(payload.years) ? payload.years : [];
    extracted.arrays.years = years.map((y: any) => ({
      year: parseYear(y.year),
      revenue: parseMoney(y.revenue).cents,
      ebitda: parseMoney(y.ebitda).cents,
      assets_total: parseMoney(y.assets_total).cents,
      liabilities_total: parseMoney(y.liabilities_total).cents
    })).filter((r: any) => r.year);
  }

  if (docType === "bank_statement") {
    extracted.fields.bank_name = payload.bank_name || null;
    if (payload.account_number) pii.account_number = String(payload.account_number);
    const months = Array.isArray(payload.months) ? payload.months : [];
    extracted.arrays.months = months.map((m: any) => ({
      month: parseYearMonth(m.month || m.period),
      avg_daily_balance: parseMoney(m.avg_daily_balance).cents,
      deposits_total: parseMoney(m.deposits_total).cents,
      nsf_count: Number(m.nsf_count ?? 0)
    })).filter((r: any) => r.month);
    
    const tx = Array.isArray(payload.transactions) ? payload.transactions : [];
    extracted.arrays.transactions = tx.slice(0, 5000).map((t: any) => ({
      date: parseDate(t.date),
      description: t.description || "",
      amount: parseMoney(t.amount).cents
    })).filter((t: any) => t.date && typeof t.amount === "number");
  }

  const piiBlob = Object.keys(pii).length ? encryptPII(pii) : null;

  const rec = await db.docExtract.create({
    data: {
      applicationId: applicationId || null,
      contactId: contactId || null,
      docType,
      extracted_json: extracted,
      pii_encrypted: piiBlob
    }
  });

  res.json({ ok: true, id: rec.id, normalized: extracted, piiStored: !!piiBlob });
});

/**
 * GET /api/docs/coverage?applicationId=... 
 * Returns which periods are present for bank_statement and which years for tax_return/financials.
 */
r.get("/docs/coverage", async (req: any, res: any) => {
  const { applicationId } = req.query as any;
  if (!applicationId) {
    return res.status(400).json({ ok: false, error: "applicationId_required" });
  }

  const rows = await db.docExtract.findMany({ 
    where: { applicationId: String(applicationId) } 
  });
  
  const cov: any = { 
    bank_statement: new Set<string>(), 
    tax_return: new Set<string>(), 
    financial_statements: new Set<string>() 
  };

  rows.forEach(r => {
    const ex: any = r.extracted_json || {};
    if (r.docType === "bank_statement") {
      (ex.arrays?.months || []).forEach((m: any) => {
        const ym = String(m.month || "").slice(0, 7);
        if (ym) cov.bank_statement.add(ym);
      });
    }
    if (r.docType === "tax_return") {
      (ex.arrays?.years || []).forEach((y: any) => cov.tax_return.add(String(y.year).slice(0, 4)));
    }
    if (r.docType === "financial_statements") {
      (ex.arrays?.years || []).forEach((y: any) => cov.financial_statements.add(String(y.year).slice(0, 4)));
    }
  });

  const ret = Object.fromEntries(
    Object.entries(cov).map(([k, v]) => [k, Array.from(v as Set<string>).sort().reverse()])
  );
  
  res.json({ ok: true, coverage: ret });
});

export default r;