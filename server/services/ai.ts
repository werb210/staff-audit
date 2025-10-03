// server/services/ai.ts
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const TIMEOUT = Number(process.env.AI_TIMEOUT_MS || 20000);

function msTimeout<T>(p: Promise<T>, ms = TIMEOUT): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("ai_timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

async function runJSON<T>(prompt: string, schema: z.ZodType<T>, modelEnvKey: string) {
  const model = process.env[modelEnvKey] || "gpt-4o-mini";
  const start = Date.now();

  try {
    const response = await msTimeout(
      openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    );

    const text = response.choices[0]?.message?.content || "{}";
    let parsed: T;
    try { 
      parsed = schema.parse(JSON.parse(text)); 
    } catch (e: any) { 
      throw new Error("ai_schema_validation_failed"); 
    }

    // basic metrics (stdout); wire to your logger if you have one
    const dur = Date.now() - start;
    const usage = response.usage || {};
    console.log("[ai]", JSON.stringify({ model, dur_ms: dur, tokens: usage.total_tokens, ok: true }));

    return parsed;
  } catch (error: any) {
    const dur = Date.now() - start;
    console.log("[ai]", JSON.stringify({ model, dur_ms: dur, error: error.message, ok: false }));
    throw error;
  }
}

/* ---------------- SCHEMAS ---------------- */
const ScanSchema = z.object({
  fields: z.object({
    revenue: z.number().optional(),
    cash: z.number().optional(),
    ebitda: z.number().optional()
  }),
  citations: z.array(z.object({ doc: z.string(), page: z.number().int().positive() })).default([])
});

const ValidateSchema = z.object({
  missing: z.array(z.string()).default([]),
  conflicts: z.array(z.object({ field: z.string(), expected: z.any(), found: z.any() })).default([])
});

const RedFlagsSchema = z.object({
  flags: z.array(z.object({ code: z.string(), severity: z.enum(["low","medium","high"]), detail: z.string() }))
});

const FinHealthSchema = z.object({
  score: z.number().min(0).max(100),
  drivers: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([])
});

const ApprovalSchema = z.object({
  probability: z.number().min(0).max(1),
  rationale: z.string()
});

const RoutingSchema = z.object({
  lenders: z.array(z.object({ id: z.string(), reason: z.string() }))
});

const CreditSummarySchema = z.object({
  summary: z.string(),
  risks: z.array(z.string()).default([]),
  mitigations: z.array(z.string()).default([])
});

const BenchmarksSchema = z.object({
  peers: z.array(z.object({ metric: z.string(), your: z.number(), median: z.number() })),
  notes: z.string().optional()
});

const ComposeEmailSchema = z.object({
  subject: z.string(),
  body: z.string()
});

const ComposeSMSSchema = z.object({
  body: z.string()
});

const RequestMissingSchema = z.object({
  checklist: z.array(z.string())
});

const AMLSchema = z.object({
  result: z.enum(["clear","review","match"]),
  matches: z.array(z.object({ source: z.string(), entity: z.string(), score: z.number() })).default([])
});

const LenderQASchema = z.object({
  answer: z.string()
});

/* ---------------- PROMPTS ---------------- */
function sysDocScan(applicationId: string) {
  return `Role: underwriting assistant.
Return response as JSON only matching the supplied schema. Use only provided application data and prior docs.
Cite source doc name and page for any numeric field.
ApplicationId: ${applicationId}`;
}

/* ---------------- EXPORTS (real calls) ---------------- */
export async function aiScanDocs(input: { applicationId: string; docHash?: string }) {
  const prompt = `${sysDocScan(input.applicationId)}
Data: (The server should assemble key figures from DB + latest OCR snippets for app ${input.applicationId}.)`;
  return runJSON(prompt, ScanSchema, "AI_MODEL_DOCS");
}

export async function aiValidate(input: { applicationId: string }) {
  const prompt = `You validate a small-business loan file. Output missing docs and conflicts only as JSON.
Use strict field names; do NOT invent values. AppId=${input.applicationId}`;
  return runJSON(prompt, ValidateSchema, "AI_MODEL_DOCS");
}

export async function aiRedFlags(input: { applicationId: string }) {
  const prompt = `List potential red flags from financials and documents for AppId=${input.applicationId}. 
Return JSON response with factual data only; include severity levels.`;
  return runJSON(prompt, RedFlagsSchema, "AI_MODEL_DOCS");
}

export async function aiFinancialHealth(input: { applicationId: string }) {
  const prompt = `Compute a 0–100 financial health score for AppId=${input.applicationId}.
Use profitability, leverage, liquidity, and stability. Provide top drivers and risks.`;
  return runJSON(prompt, FinHealthSchema, "AI_MODEL_SUMMARY");
}

export async function aiApprovalProbability(input: { applicationId: string }) {
  const prompt = `Estimate probability of approval for AppId=${input.applicationId} based on policy-like rules.
Do not exceed 2 decimals. Provide short rationale.`;
  return runJSON(prompt, ApprovalSchema, "AI_MODEL_SUMMARY");
}

export async function aiRouting(input: { applicationId: string }) {
  const prompt = `Recommend 1–3 lenders for AppId=${input.applicationId} based on product fit and limits.
Include a brief reason per lender id.`;
  return runJSON(prompt, RoutingSchema, "AI_MODEL_SUMMARY");
}

export async function aiCreditSummary(input: { applicationId: string }) {
  const prompt = `Draft a concise credit summary for AppId=${input.applicationId}. No hallucinations. Summarize facts only.`;
  return runJSON(prompt, CreditSummarySchema, "AI_MODEL_SUMMARY");
}

export async function aiBenchmarks(input: { applicationId: string }) {
  const prompt = `Compare key metrics for AppId=${input.applicationId} vs industry median. Provide 1–3 metrics.`;
  return runJSON(prompt, BenchmarksSchema, "AI_MODEL_SUMMARY");
}

export async function aiComposeEmail(input: { applicationId: string; intent: string }) {
  const prompt = `Write a professional email for AppId=${input.applicationId}. Intent: ${input.intent}. 
Keep under 150 words. Return response as JSON with subject and body fields.`;
  return runJSON(prompt, ComposeEmailSchema, "AI_MODEL_QA");
}

export async function aiComposeSMS(input: { applicationId: string; intent: string }) {
  const prompt = `Write an SMS (<= 300 chars) for AppId=${input.applicationId}. Intent: ${input.intent}.
Return response as JSON with body field containing the SMS text.`;
  return runJSON(prompt, ComposeSMSSchema, "AI_MODEL_QA");
}

export async function aiRequestMissing(input: { applicationId: string }) {
  const prompt = `From what is already on file for AppId=${input.applicationId}, produce a short checklist of missing items.`;
  return runJSON(prompt, RequestMissingSchema, "AI_MODEL_DOCS");
}

export async function aiAML(input: { applicationId: string }) {
  const prompt = `You simulate a KYC/AML screen for AppId=${input.applicationId}. Only return "clear", "review", or "match" with any matches.`;
  return runJSON(prompt, AMLSchema, "AI_MODEL_QA");
}

export async function aiLenderQA(input: { applicationId: string; question: string }) {
  const prompt = `Answer lender policy question for AppId=${input.applicationId} using known product schema only: ${input.question}.
If unknown, say you don't know.`;
  return runJSON(prompt, LenderQASchema, "AI_MODEL_QA");
}

/* ---------------- DROP-IN BUNDLE ADDITIONS ---------------- */
import fetch from "node-fetch";
const API = "https://api.openai.com/v1/chat/completions";
const KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_MODEL || "gpt-5-thinking";

export async function chatJson(system: string, user: string) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }]
    })
  });
  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  const txt = j.choices?.[0]?.message?.content || "{}";
  return JSON.parse(txt);
}

// multimodal (image + text) — pass base64 or URL
export async function visionJson(prompt: string, imageUrl: string) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }]
    })
  });
  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  return JSON.parse(j.choices?.[0]?.message?.content || "{}");
}