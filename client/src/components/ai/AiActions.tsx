import React from "react";
import { v4 as uuidv4 } from "uuid";
import AIResultPanel from "./AIResultPanel";
import { useQueryClient } from "@tanstack/react-query";

type Ctx = {
  applicationId?: string;
  contactId?: string;
  lenderId?: string;
  naics?: string;
};
type Action =
  | "scan_docs"
  | "ocr"
  | "validate"
  | "redflags"
  | "finhealth"
  | "approval"
  | "timeline"
  | "routing"
  | "credit_summary"
  | "benchmarks"
  | "compose_email"
  | "compose_sms"
  | "request_missing"
  | "aml"
  | "lender_qa";

const labels: Record<Action, string> = {
  scan_docs: "Scan Docs",
  ocr: "Re-run OCR",
  validate: "Cross-doc Validation",
  redflags: "Red Flags",
  finhealth: "Financial Health",
  approval: "Approval Probability",
  timeline: "Timeline Forecast",
  routing: "Smart Route / Priority",
  credit_summary: "Generate Credit Summary",
  benchmarks: "Benchmarks",
  compose_email: "Compose Email Draft",
  compose_sms: "Compose SMS Draft",
  request_missing: "Request Missing Docs",
  aml: "AML / Sanctions",
  lender_qa: "Lender Q&A",
};

const endpoints: Record<
  Action,
  {
    url: (ctx: Ctx) => string;
    method?: "GET" | "POST";
    body?: (ctx: Ctx) => any;
  }
> = {
  scan_docs: {
    url: (c) => `/api/ai/docs/scan?applicationId=${c.applicationId}`,
  },
  ocr: { url: (c) => `/api/ai/docs/ocr?applicationId=${c.applicationId}` },
  validate: {
    url: (c) => `/api/ai/docs/validate?applicationId=${c.applicationId}`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId }),
  },
  redflags: {
    url: (c) => `/api/ai/docs/redflags?applicationId=${c.applicationId}`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId }),
  },
  finhealth: {
    url: (c) => `/api/ai/financials/score`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId }),
  },
  approval: {
    url: (c) => `/api/ai/approval-prob`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId, lenderId: c.lenderId }),
  },
  timeline: {
    url: (c) => `/api/ai/timeline`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId }),
  },
  routing: {
    url: (c) => `/api/ai/ops/priority`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId }),
  },
  credit_summary: {
    url: (c) => `/api/ai/credit-summary/generate`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId }),
  },
  benchmarks: { url: (c) => `/api/ai/benchmarks/${c.naics || ""}` },
  compose_email: {
    url: (c) => `/api/ai/compose/email`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId, contactId: c.contactId }),
  },
  compose_sms: {
    url: (c) => `/api/ai/compose/sms`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId, contactId: c.contactId }),
  },
  request_missing: {
    url: (c) => `/api/ai/docs/request-missing`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId }),
  },
  aml: {
    url: (c) => `/api/ai/compliance/screen`,
    method: "POST",
    body: (c) => ({ applicationId: c.applicationId, contactId: c.contactId }),
  },
  lender_qa: {
    url: (c) => `/api/ai/lender-qa`,
    method: "POST",
    body: (c) => ({
      applicationId: c.applicationId,
      lenderId: c.lenderId,
      question: "What docs are mandatory?",
    }),
  },
};

export default function AiActions({
  ctx,
  actions,
  dense,
}: {
  ctx: Ctx;
  actions: Action[];
  dense?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  async function run(action: Action) {
    const reqId = uuidv4();
    setRequestId(reqId);
    setOpen(true);
    setTitle(labels[action]);
    setLoading(true);
    setError(null);
    setData(null);
    setJobId(null);

    const ep = endpoints[action];
    const method = ep.method || "GET";

    try {
      // Add requestId to body for idempotency
      const body =
        method === "POST"
          ? {
              ...ep.body?.(ctx),
              requestId: reqId,
            }
          : undefined;

      const res = await fetch(ep.url(ctx), {
        method,
        headers:
          method === "POST"
            ? { "Content-Type": "application/json" }
            : undefined,
        body: method === "POST" ? JSON.stringify(body) : undefined,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || json?.message || res.statusText);
      }

      // Handle job-based responses
      if (json.jobId) {
        setJobId(json.jobId);
        pollJob(json.jobId);
      } else {
        setData(json);
        setLoading(false);
      }

      // Write timeline event
      await writeTimelineEvent(action, {
        ok: true,
        requestId: reqId,
        jobId: json.jobId,
      });
    } catch (e: any) {
      setError(e?.message || "Request failed");
      setLoading(false);

      // Write timeline error event
      await writeTimelineEvent(action, {
        ok: false,
        error: e?.message,
        requestId: reqId,
      });
    }
  }

  async function pollJob(jobId: string) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError("Job timed out");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/ai/jobs/${jobId}`, {});
        const job = await res.json();

        if (job.status === "completed") {
          setData(job.result);
          setLoading(false);
        } else if (job.status === "failed") {
          setError(job.error || "Job failed");
          setLoading(false);
        } else {
          // Still running, poll again
          attempts++;
          setTimeout(poll, 5000);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to check job status");
        setLoading(false);
      }
    };

    poll();
  }

  async function writeTimelineEvent(action: Action, result: any) {
    try {
      await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: ctx.applicationId,
          contactId: ctx.contactId,
          type: `ai.${action}`,
          payload: {
            action,
            result,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      // Invalidate timeline queries to refresh UI
      if (ctx.applicationId) {
        queryClient.invalidateQueries({
          queryKey: ["timeline", ctx.applicationId],
        });
      }
      if (ctx.contactId) {
        queryClient.invalidateQueries({
          queryKey: ["contact-timeline", ctx.contactId],
        });
      }
    } catch (e) {
      console.warn("Failed to write timeline event:", e);
    }
  }

  async function cancelJob() {
    if (jobId) {
      try {
        await fetch(`/api/ai/jobs/${jobId}/cancel`, {
          method: "POST",
        });
        setLoading(false);
        setError("Job cancelled");
      } catch (e: any) {
        setError(e?.message || "Failed to cancel job");
      }
    }
  }

  async function retryAction() {
    if (title) {
      const action = Object.entries(labels).find(
        ([_, label]) => label === title,
      )?.[0] as Action;
      if (action) {
        run(action);
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap gap-2 ${dense ? "text-sm" : ""}`}>
        {actions.map((a) => (
          <button
            key={a}
            data-testid={`btn-ai-${a.replace(/_/g, "-")}`}
            onClick={() => run(a)}
            className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            title={labels[a]}
          >
            {labels[a]}
          </button>
        ))}
      </div>

      {open && (
        <AIResultPanel
          title={title}
          data={data}
          loading={loading}
          error={error}
          onRetry={retryAction}
          onCancel={loading && jobId ? cancelJob : undefined}
          onClose={() => setOpen(false)}
          className="mt-3"
        />
      )}
    </div>
  );
}
