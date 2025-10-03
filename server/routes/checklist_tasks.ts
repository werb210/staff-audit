import { Router } from "express";
import { db } from "../db/drizzle.js";
import { logActivity } from "../lib/activities.js";
import { monthsBack, taxYearsBack } from "../lib/doc_windows.js";
import fetch from "node-fetch";

const DOC_DISPLAY: Record<string, string> = {
  bank_statement_3m: "Last 3 months of bank statements",
  bank_statement_6m: "Last 6 months of bank statements",
  void_cheque: "Void cheque",
  NOA: "Notice of Assessment",
  COI: "Certificate of Incorporation",
  drivers_id: "Government-issued photo ID",
  financials_ytd: "YTD Financial Statements",
  // extend as needed
};

const r = Router();

/** Create a task per required doc. Internal-only. Never messages the client. */
r.post("/applications/:id/tasks/from-requirements", async (req: any, res: any) => {
  const { id } = req.params;
  const app = await db.applications.findUnique({ 
    where: { id }
  });
  if (!app) return res.status(404).json({ ok: false, error: "application_not_found" });

  // Collect required docs (union across lender products if you want)
  const prods = await db.lender_products.findMany({ 
    where: { lender_id: app.lender_id ?? "" } 
  });
  const reqs = new Set<string>();
  prods.forEach(p => {
    const docs = (p.description as any)?.requiredDocs || [];
    docs.forEach((d: string) => reqs.add(d));
  });

  const ownerId = app.underwriter_user_id ?? null;
  const dueAt = new Date(); 
  dueAt.setDate(dueAt.getDate() + 2); // default 2-day due date

  const created = [];
  for (const code of Array.from(reqs)) {
    const title = `Collect: ${DOC_DISPLAY[code] || code}`;
    const t = await db.task.create({
      data: {
        tenant: app.tenant_id ?? "bf",
        title, 
        status: "open",
        contactId: app.contact_id ?? null,
        applicationId: app.id,
        ownerId,
        dueAt,
        tags: ["checklist", "docs", code],
      }
    });
    created.push(t);
  }

  // Enhanced period-specific task creation
  await createPeriodSpecificTasks(app, reqs);

  await logActivity({
    type: "task_created",
    contactId: app.contact_id ?? undefined,
    applicationId: app.id,
    tags: ["docs", "checklist"],
    meta: { count: created.length, taskIds: created.map(t => t.id) }
  });

  res.json({ ok: true, created: created.length, tasks: created });
});

async function createPeriodSpecificTasks(app: any, reqs: Set<string>) {
  // Fetch coverage
  const cov = await fetch(`http://localhost:5000/api/docs/coverage?applicationId=${app.id}`)
    .then(r => r.json())
    .catch(() => ({ coverage: {} }));

  const makeTask = async (title: string, tags: string[]) => {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 2);
    return db.task.create({
      data: {
        tenant: app.tenant_id ?? "bf",
        title,
        status: "open",
        contactId: app.contact_id ?? null,
        applicationId: app.id,
        ownerId: app.underwriter_user_id ?? null,
        dueAt,
        tags,
      }
    });
  };

  // Bank statements (last 3 months)
  if (reqs.has("bank_statement_3m")) {
    const need = monthsBack(3);
    const have = new Set((cov.coverage?.bank_statement || []));
    for (const ym of need) {
      if (!have.has(ym)) {
        await makeTask(`Collect: Bank statement for ${ym}`, ["docs", "bank_statement", "ym:" + ym]);
      }
    }
  }

  // Tax returns (last 2 completed years)
  if (reqs.has("tax_return_2y")) {
    const needY = taxYearsBack(2);
    const haveY = new Set((cov.coverage?.tax_return || []));
    for (const y of needY) {
      if (!haveY.has(y)) {
        await makeTask(`Collect: Tax return ${y}`, ["docs", "tax_return", "y:" + y]);
      }
    }
  }

  // Financials (last 2 completed years + YTD)
  if (reqs.has("financials_2y_ytd")) {
    const needY = taxYearsBack(2);
    const haveY = new Set((cov.coverage?.financial_statements || []));
    for (const y of needY) {
      if (!haveY.has(y)) {
        await makeTask(`Collect: Accountant financials ${y}`, ["docs", "financials", "y:" + y]);
      }
    }
    await makeTask(`Collect: Accountant financials YTD`, ["docs", "financials", "ytd"]);
  }
}

export default r;