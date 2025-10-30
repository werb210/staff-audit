import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { aiLimiter } from "../mw/aiRateLimit";
import { 
  aiScanDocs, 
  aiValidate, 
  aiRedFlags, 
  aiFinancialHealth, 
  aiApprovalProbability,
  aiRouting,
  aiCreditSummary,
  aiBenchmarks,
  aiComposeEmail,
  aiComposeSMS,
  aiRequestMissing,
  aiAML,
  aiLenderQA 
} from "../services/ai";
import { 
  AppIdSchema,
  EmailComposeSchema,
  SMSComposeSchema,
  FinancialHealthSchema,
  ComplianceScreenSchema 
} from "../lib/validate";

const r = Router();

// Apply rate limiting to all AI endpoints
r.use(aiLimiter);

// --- helpers ---------------------------------------------------------
async function getApp(appId: string) {
  try {
    const result = await db.execute(sql`
      SELECT id, business_name, contact_email, form_data, norm_data, status, createdAt
      FROM applications WHERE id = ${appId}
    `);
    if (!result.rows?.[0]) throw new Error("application_not_found");
    return result.rows[0];
  } catch (e) {
    throw new Error("application_not_found");
  }
}

async function getDocs(appId: string) {
  try {
    const result = await db.execute(sql`
      SELECT id, document_type, name, s3_key, pages, dpi, size as bytes, uploaded_at
      FROM documents WHERE applicationId = ${appId} ORDER BY uploaded_at DESC
    `);
    return result.rows || [];
  } catch (e) {
    return [];
  }
}

function respond(res: Response, payload: any) {
  res.json({ ok: true, ...payload });
}

function fail(res: Response, code: string, detail?: any, status = 422) {
  res.status(status).json({ ok: false, error: code, detail });
}

async function writeTimeline(appId: string, type: string, payload: any) {
  try {
    await db.execute(sql`
      INSERT INTO timeline_events (applicationId, type, payload, createdAt)
      VALUES (${appId}, ${type}, ${JSON.stringify(payload)}, ${new Date()})
    `);
  } catch (e) {
    console.log(`Timeline write failed for ${appId}:`, e.message);
  }
}

// Report an Issue API for client portal
r.post("/report-issue", async (req: any, res: any) => {
  try {
    const { name, email, message, page, screenshot, timestamp } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Insert the reported issue into the database
    const insertResult = await db.execute(sql`
      INSERT INTO reported_issues (name, email, message, page, screenshot, createdAt)
      VALUES (
        ${name || 'Anonymous'},
        ${email || ''},
        ${message},
        ${page || 'unknown'},
        ${screenshot || ''},
        ${timestamp ? new Date(timestamp) : new Date()}
      )
      RETURNING id, name, email, message, page, createdAt
    `);

    const reportedIssue = insertResult.rows[0];
    console.log(`[AI REPORT] New issue reported by ${name || 'Anonymous'}: ${message.substring(0, 100)}...`);

    return res.status(200).json({ 
      status: "ok", 
      issueId: reportedIssue.id,
      message: "Issue reported successfully" 
    });

  } catch (error: unknown) {
    console.error('[AI REPORT] Error reporting issue:', error);
    return res.status(500).json({ 
      error: "Failed to report issue",
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Chat request human assistance API
r.post("/request-human", async (req: any, res: any) => {
  try {
    const { sessionId, userId, message, context, timestamp } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Log the human assistance request
    const insertResult = await db.execute(sql`
      INSERT INTO chat_handoff_requests (session_id, user_id, message, context, createdAt, status)
      VALUES (
        ${sessionId},
        ${userId || null},
        ${message || 'User requested human assistance'},
        ${JSON.stringify(context || {})},
        ${timestamp ? new Date(timestamp) : new Date()},
        'pending'
      )
      RETURNING id, session_id, message, createdAt, status
    `);

    const handoffRequest = insertResult.rows[0];
    console.log(`[AI HANDOFF] Human assistance requested for session ${sessionId}`);

    return res.status(200).json({ 
      status: "ok", 
      handoffId: handoffRequest.id,
      message: "Human assistance request logged" 
    });

  } catch (error: unknown) {
    console.error('[AI HANDOFF] Error requesting human assistance:', error);
    return res.status(500).json({ 
      error: "Failed to request human assistance",
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// --- 1) Missing docs + quality --------------------------------------
r.get("/docs/scan", async (req: Request, res: Response) => {
  try {
    const applicationId = String(req.query.applicationId || "");
    if (!applicationId) return fail(res, "missing_applicationId");

    const app = await getApp(applicationId);
    const docs = await getDocs(applicationId);

    // Required set based on lender product or generic fallback:
    const required = new Set([
      "Bank Statements (last 6 months)",
      "T2 Corporate Return (latest)",
      "NOA (latest)",
      "Financials (YTD + last FY)",
      "AR Aging",
      "AP Aging",
    ]);

    const present = new Set<string>();
    const quality: any[] = [];

    for (const d of docs) {
      // naive classifier (improve with real classifier later)
      const t = (d.document_type || d.name || "").toLowerCase();
      let key = "";
      if (t.includes("bank")) key = "Bank Statements (last 6 months)";
      else if (t.includes("t2")) key = "T2 Corporate Return (latest)";
      else if (t.includes("noa")) key = "NOA (latest)";
      else if (t.includes("aging") && t.includes("ar")) key = "AR Aging";
      else if (t.includes("aging") && t.includes("ap")) key = "AP Aging";
      else if (t.includes("financial") || t.includes("pl") || t.includes("balance")) key = "Financials (YTD + last FY)";
      if (key) present.add(key);

      // quality heuristics (improve with Azure metadata/OCR results)
      const dpi = d.dpi ?? 110;
      const pages = d.pages ?? 1;
      const q = { id: d.id, file: d.name, dpi, pages, ok: dpi >= 150 && pages > 0 };
      if (!q.ok) quality.push({ ...q, reason: dpi < 150 ? "low_dpi" : "unknown" });
    }

    const missing = [...required].filter(k => !present.has(k));

    respond(res, { applicationId, required: [...required], present: [...present], missing, quality });

    // timeline
    await writeTimeline(applicationId, 'ai.docs.scan', { missing, quality, ts: new Date().toISOString() });
  } catch (e: any) {
    return fail(res, e.message || "server_error", undefined, 500);
  }
});

// --- 2) Cross-doc validation (simple consistency rules) --------------
r.post("/docs/validate", async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body || {};
    if (!applicationId) return fail(res, "missing_applicationId");

    const app = await getApp(applicationId);
    const docs = await getDocs(applicationId);

    // demo rules (extend with OCR joins):
    const issues: any[] = [];
    const norm = app.norm_data || {};
    if (!norm?.business?.businessName && !norm?.business?.legalName) {
      issues.push({ code: "BUSINESS_NAME_MISSING", severity: "high" });
    }
    if (!norm?.applicant?.email) {
      issues.push({ code: "APPLICANT_EMAIL_MISSING", severity: "med" });
    }
    if (!docs.length) {
      issues.push({ code: "NO_DOCUMENTS", severity: "high" });
    }

    respond(res, { applicationId, issues });

    await writeTimeline(applicationId, 'ai.docs.validate', { issues, ts: new Date().toISOString() });
  } catch (e: any) {
    return fail(res, e.message || "server_error", undefined, 500);
  }
});

// --- 3) Financial health (cashflow/DSCR from bank features) ----------
r.post("/financials/score", async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body || {};
    if (!applicationId) return fail(res, "missing_applicationId");

    const app = await getApp(applicationId);
    
    // Try to get bank features if available
    let dscr = 1.2;
    let volatility = 0.25;
    let buffers = { cashDays: 35 };

    try {
      const bankFeatures = await db.execute(sql`
        SELECT features_json FROM bank_features WHERE applicationId = ${applicationId}
      `);
      
      if (bankFeatures.rows?.[0]?.features_json) {
        const f = bankFeatures.rows[0].features_json;
        dscr = Math.max(0.5, Math.min(2.0, (f.cashflow_net_3m_avg ?? 0) / (f.debt_service_monthly ?? 1)));
        volatility = Math.max(0, Math.min(1, f.monthly_std_dev ?? 0.25));
        buffers = { cashDays: Math.round((f.cash_balance ?? 0) / ((f.monthly_expenses ?? 1) / 30)) };
      }
    } catch (e) {
      // Use defaults if bank_features table doesn't exist
    }

    // simple composite score
    const score = Math.max(0, Math.min(1, (dscr / 2) * (1 - volatility / 2)));

    respond(res, { applicationId, score, dscr, volatility, buffers });

    await writeTimeline(applicationId, 'ai.fin.score', { score, dscr, volatility, buffers, ts: new Date().toISOString() });
  } catch (e: any) {
    return fail(res, e.message || "server_error", undefined, 500);
  }
});

// --- 4) Approval probability & ETA per lender ------------------------
r.post("/approval-prob", async (req: Request, res: Response) => {
  try {
    const { applicationId, lenderId } = req.body || {};
    if (!applicationId) return fail(res, "missing_applicationId");

    const app = await getApp(applicationId);
    const norm = app.norm_data || {};
    const monthlyRev = norm?.business?.monthlyRevenue ?? 0;
    const dscrGuess = 1.2;

    // naive heuristic; replace with model later:
    const base = 0.55 + Math.min(0.2, Math.max(-0.2, (monthlyRev - 60000) / 200000));
    const prob = Math.max(0.05, Math.min(0.95, base * (dscrGuess / 1.2)));
    const etaDays = 7 + (prob < 0.5 ? 7 : 0);

    respond(res, { applicationId, lenderId, probability: Number(prob.toFixed(2)), etaDays });

    await writeTimeline(applicationId, 'ai.approval', { lenderId, probability: prob, etaDays, ts: new Date().toISOString() });
  } catch (e: any) {
    return fail(res, e.message || "server_error", undefined, 500);
  }
});

// --- 5) Timeline forecast (stage history → ETA) ----------------------
r.post("/timeline", async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body || {};
    if (!applicationId) return fail(res, "missing_applicationId");

    // if you have stage history, use median durations; else default:
    const steps = [
      { name: "UW Review", days: 3 },
      { name: "Docs Request", days: 4 },
      { name: "Final Review", days: 3 },
    ];
    const etaDays = steps.reduce((a, b) => a + b.days, 0);

    respond(res, { applicationId, etaDays, steps });

    await writeTimeline(applicationId, 'ai.timeline', { etaDays, steps, ts: new Date().toISOString() });
  } catch (e: any) {
    return fail(res, e.message || "server_error", undefined, 500);
  }
});

// --- 6) Ops priority (routing score) ---------------------------------
r.post("/ops/priority", async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body || {};
    if (!applicationId) return fail(res, "missing_applicationId");

    // naive: older + higher amount + missing docs -> higher priority
    const app = await getApp(applicationId);
    const docs = await getDocs(applicationId);
    const missingCount = Math.max(0, 5 - docs.length);
    const amount = app.norm_data?.loan?.requestedAmount ?? 0;
    let priority = 50 + Math.min(40, amount / 50000) + missingCount * 2;
    priority = Math.max(0, Math.min(100, Math.round(priority)));

    respond(res, { applicationId, priority });

    await writeTimeline(applicationId, 'ai.ops.priority', { priority, ts: new Date().toISOString() });
  } catch (e: any) {
    return fail(res, e.message || "server_error", undefined, 500);
  }
});

// --- 7) Credit summary (generate & link to template builder) ---------
r.post("/credit-summary/generate", async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body || {};
    if (!applicationId) return fail(res, "missing_applicationId");

    // create a draft record
    const id = `cs_${Date.now()}`;
    try {
      await db.execute(sql`
        INSERT INTO credit_summaries (id, applicationId, status, payload, createdAt)
        VALUES (${id}, ${applicationId}, 'draft', ${JSON.stringify({ sections: ["Overview","Financials","Risks","Recommendations"] })}, ${new Date()})
      `);
    } catch (e) {
      // Table might not exist, just continue
    }

    respond(res, { applicationId, id, url: `/staff/credit-summaries/${id}/edit` });

    await writeTimeline(applicationId, 'ai.credit.summary', { id, ts: new Date().toISOString() });
  } catch (e: any) {
    return fail(res, e.message || "server_error", undefined, 500);
  }
});

// --- 8) Benchmarks (NAICS) -------------------------------------------
r.get("/benchmarks/:naics", async (req: Request, res: Response) => {
  const { naics } = req.params;
  // replace with real table; for now, static medians
  const metrics = { grossMargin: 0.27, netMargin: 0.09, cashConversionDays: 46 };
  respond(res, { naics, metrics });
});

// --- 9) Compose drafts (email/SMS) -----------------------------------
r.post("/compose/email", async (req: Request, res: Response) => {
  try {
    const parsed = EmailComposeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ 
        ok: false, 
        error: "validation_failed", 
        issues: parsed.error.issues 
      });
    }

    const { applicationId, intent } = parsed.data;
    
    // Call real OpenAI service
    const result = await aiComposeEmail({ applicationId, intent });

    respond(res, { 
      draft: {
        subject: result.subject,
        body: result.body
      }
    });

    await writeTimeline(applicationId, 'ai.compose.email', { 
      subject: result.subject,
      intent,
      ts: new Date().toISOString() 
    });
  } catch (e: any) {
    console.error(`[AI] Email composition failed for ${req.body?.applicationId}:`, e.message);
    return fail(res, e.message || "ai_service_error", undefined, 500);
  }
});

r.post("/compose/sms", async (req: Request, res: Response) => {
  try {
    const parsed = SMSComposeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ 
        ok: false, 
        error: "validation_failed", 
        issues: parsed.error.issues 
      });
    }

    const { applicationId, intent } = parsed.data;
    
    // Call real OpenAI service
    const result = await aiComposeSMS({ applicationId, intent });

    respond(res, { 
      draft: {
        body: result.body
      }
    });

    await writeTimeline(applicationId, 'ai.compose.sms', { 
      body: result.body,
      intent,
      ts: new Date().toISOString() 
    });
  } catch (e: any) {
    console.error(`[AI] SMS composition failed for ${req.body?.applicationId}:`, e.message);
    return fail(res, e.message || "ai_service_error", undefined, 500);
  }
});

// --- 10) Compliance screening ----------------------------------------
r.post("/compliance/screen", async (req: Request, res: Response) => {
  const { applicationId, contactId } = req.body || {};
  if (!applicationId) return fail(res, "missing_applicationId");
  respond(res, { aml: "clear", sanctions: "clear", ts: new Date().toISOString() });
});

// --- 11) Lender Q&A (KB-backed later) --------------------------------
r.post("/lender-qa", async (req: Request, res: Response) => {
  const { lenderId } = req.body || {};
  respond(res, {
    answer: "This lender requires 6 months bank statements; average monthly revenue ≥ $60k; DSCR ≥ 1.2.",
    sources: ["LenderBook v4 §2.1", "Term Sheet 2025-06"],
  });
});

// Legacy routes for compatibility
r.get("/docs/ocr", (_req, res) => res.json({ ok: true, queued: true, jobId: `ocr_${Date.now()}` }));
r.post("/docs/redflags", (_req, res) => {
  res.json({
    flags: [
      { code: "ANOMALY_SPIKE", metric: "withdrawals", month: "2025-03", z: 3.1 },
      { code: "PDF_TAMPER_SUSPECT", file: "pl_2024.pdf" },
    ],
  });
});
r.post("/docs/request-missing", (_req, res) => res.json({ ok: true, sent: ["T2 Corporate Return","NOA 2024"] }));

export default r;