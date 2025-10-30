import { Router } from "express";
import fs from "fs";
import path from "path";
const flatten = (obj, pre = [], out = {}) => {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (Array.isArray(obj)) {
        obj.forEach((v, i) => flatten(v, [...pre, String(i)], out));
        return out;
    }
    if (isObj(obj)) {
        Object.entries(obj).forEach(([k, v]) => flatten(v, [...pre, k], out));
        return out;
    }
    out[pre.join(".")] = obj;
    return out;
};
const ensureDir = (p) => { try {
    fs.mkdirSync(p, { recursive: true });
}
catch { } };
let LAST_DIR = "";
const router = Router();
/**
 * POST /api/test/intake
 * Accepts client payload (with optional _trace) and produces:
 *  - incoming.json (raw)
 *  - normalized.json (simple identity normalization; place to adapt schema mapping if needed)
 *  - card.json (simulated pipeline card view model)
 *  - pdf.json (data used by pdf generator)
 *  - lender.json (export payload)
 *  - coverage.json (field coverage across each surface)
 */
router.post("/intake", (req, res) => {
    const tid = (req.header("X-Trace-Id") || (req.body?._trace?.id) || ("trace-" + Date.now()));
    const base = path.join(process.cwd(), "reports", "staff-e2e-live", tid);
    ensureDir(base);
    try {
        fs.writeFileSync(path.join(base, "incoming.json"), JSON.stringify(req.body, null, 2));
    }
    catch { }
    LAST_DIR = base;
    // 1) Inbound fields (flattened)
    const inboundFlat = flatten(req.body?.answers ?? req.body?.form ?? req.body ?? {});
    const inboundKeys = Object.keys(inboundFlat);
    // 2) Normalization step (identity + selected canonical props)
    const normalized = {
        applicationDate: req.body.applicationDate || req.body.answers?.applicationDate || new Date().toISOString().slice(0, 10),
        applicant: {
            legalName: req.body.applicant?.legalName || req.body.answers?.legalName || req.body.legalName || "Unknown Co"
        },
        answers: req.body.answers ?? req.body.form ?? req.body
    };
    try {
        fs.writeFileSync(path.join(base, "normalized.json"), JSON.stringify(normalized, null, 2));
    }
    catch { }
    const normFlat = flatten(normalized);
    const normKeys = Object.keys(normFlat);
    // 3) Simulated pipeline card mapping (select representative fields)
    const card = {
        id: tid,
        title: normalized.applicant.legalName,
        subtitle: `Applied ${normalized.applicationDate}`,
        metrics: {
            loanAmount: normalized.answers.loanAmount ?? normalized.answers.amountRequested ?? null,
            country: normalized.answers.country ?? null,
            province: normalized.answers.province ?? normalized.answers.state ?? null,
            revenue: normalized.answers.revenue ?? null,
            timeInBusiness: normalized.answers.timeInBusiness ?? null
        },
        answersPreview: Object.fromEntries(Object.entries(normalized.answers || {}).slice(0, 12))
    };
    try {
        fs.writeFileSync(path.join(base, "card.json"), JSON.stringify(card, null, 2));
    }
    catch { }
    const cardFlat = flatten(card);
    const cardKeys = Object.keys(cardFlat);
    // 4) PDF generator data (simulated shape)
    const pdf = {
        applicant: normalized.applicant,
        applicationDate: normalized.applicationDate,
        sections: [
            { name: "Business", fields: ["legalName", "industry", "timeInBusiness", "revenue", "employees"].map(k => ({ key: k, value: normalized.answers?.[k] ?? null })) },
            { name: "Loan", fields: ["loanAmount", "useOfFunds", "term", "rate", "security"].map(k => ({ key: k, value: normalized.answers?.[k] ?? null })) },
            { name: "Contact", fields: ["email", "phone", "address", "city", "province", "postalCode", "country"].map(k => ({ key: k, value: normalized.answers?.[k] ?? null })) },
        ]
    };
    try {
        fs.writeFileSync(path.join(base, "pdf.json"), JSON.stringify(pdf, null, 2));
    }
    catch { }
    const pdfFlat = flatten(pdf);
    const pdfKeys = Object.keys(pdfFlat);
    // 5) Lender export payload (generic)
    const lender = {
        applicantName: card.title,
        applicationDate: normalized.applicationDate,
        amount: card.metrics.loanAmount,
        geography: { country: card.metrics.country, province: card.metrics.province },
        financials: { revenue: card.metrics.revenue, timeInBusiness: card.metrics.timeInBusiness },
        raw: normalized.answers
    };
    try {
        fs.writeFileSync(path.join(base, "lender.json"), JSON.stringify(lender, null, 2));
    }
    catch { }
    const lenderFlat = flatten(lender);
    const lenderKeys = Object.keys(lenderFlat);
    // 6) Coverage analysis: which inbound fields make it into each surface
    const inboundSet = new Set(inboundKeys);
    const hitRate = (keys) => keys.filter(k => inboundSet.has(k) || inboundSet.has(k.split(".").pop() || "")).length / Math.max(1, inboundKeys.length);
    const missing = (keys) => Array.from(inboundSet).filter(k => !keys.includes(k) && !keys.includes(k.split(".").pop() || ""));
    const coverage = {
        inbound_total: inboundKeys.length,
        normalized_total: normKeys.length,
        card_total: cardKeys.length,
        pdf_total: pdfKeys.length,
        lender_total: lenderKeys.length,
        normalized_hit_rate: Number(hitRate(normKeys).toFixed(3)),
        card_hit_rate: Number(hitRate(cardKeys).toFixed(3)),
        pdf_hit_rate: Number(hitRate(pdfKeys).toFixed(3)),
        lender_hit_rate: Number(hitRate(lenderKeys).toFixed(3)),
        missing_in_normalized: missing(normKeys).slice(0, 50),
        missing_in_card: missing(cardKeys).slice(0, 50),
        missing_in_pdf: missing(pdfKeys).slice(0, 50),
        missing_in_lender: missing(lenderKeys).slice(0, 50),
    };
    try {
        fs.writeFileSync(path.join(base, "coverage.json"), JSON.stringify(coverage, null, 2));
    }
    catch { }
    res.json({ ok: true, traceId: tid, coverage, files: {
            incoming: path.relative(process.cwd(), path.join(base, "incoming.json")),
            normalized: path.relative(process.cwd(), path.join(base, "normalized.json")),
            card: path.relative(process.cwd(), path.join(base, "card.json")),
            pdf: path.relative(process.cwd(), path.join(base, "pdf.json")),
            lender: path.relative(process.cwd(), path.join(base, "lender.json")),
            coverageFile: path.relative(process.cwd(), path.join(base, "coverage.json")),
        } });
});
// Helpers
router.get("/intake/last", (_req, res) => {
    if (!LAST_DIR) {
        return res.status(404).json({ ok: false, error: "no_submissions" });
    }
    const read = (f) => { try {
        return JSON.parse(fs.readFileSync(path.join(LAST_DIR, f), 'utf8'));
    }
    catch {
        return null;
    } };
    res.json({ ok: true, last: {
            dir: LAST_DIR, incoming: read("incoming.json"), normalized: read("normalized.json"),
            card: read("card.json"), pdf: read("pdf.json"), lender: read("lender.json"),
            coverage: read("coverage.json")
        } });
});
export default router;
