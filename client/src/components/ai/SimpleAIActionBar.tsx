import React, { useMemo, useState } from "react";

type Ctx = {
  entityType?: "application" | "contact" | "lead";
  entityId?: string;
  name?: string;
  email?: string;
  amount?: number;
  stage?: string;
};

type Props = { ctx?: Ctx };

function Pill({ children, onClick, title }: any) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid #E5E7EB",
        background: "#F9FAFB",
        color: "#111827",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export default function SimpleAIActionBar({ ctx }: Props) {
  const [msg, setMsg] = useState<string | null>(null);

  const ready = useMemo(() => {
    // Bar is ON if env or localStorage enables it
    const envOn = (import.meta as any).env?.VITE_STAFF_AI_BAR === "on";
    const ls = typeof window !== "undefined" ? localStorage.getItem("bf.aiBar") : null;
    return envOn || ls === "on" || true; // default ON
  }, []);

  if (!ready) return null;

  async function safe(action: string, fn: () => Promise<any> | any) {
    try {
      setMsg(`Running: ${action}…`);
      const r = await fn();
      setMsg(typeof r === "string" ? r : `${action}: done`);
    } catch (e: any) {
      setMsg(`${action}: ${e?.message || "failed"}`);
    } finally {
      setTimeout(() => setMsg(null), 3000);
    }
  }

  // NOTE: wire these to your real endpoints when ready.
  const api = {
    lenderMatch: async () => "Top lenders ready in sidebar.",
    summarizeDocs: async () => "Doc IQ summary queued.",
    scoreRisk: async () => "Risk flags computed.",
    smartReply: async () => "Drafted reply in composer.",
    nextSteps: async () => "Checklist added to Notes.",
  };

  return (
    <div style={{
      position:"sticky", top:0, zIndex: 50,
      background:"#0B1324", color:"#fff",
      padding:"10px 14px", borderBottom:"1px solid #0F1B36",
      display:"flex", alignItems:"center", gap:12, overflowX:"auto"
    }}>
      <strong style={{fontSize:13, letterSpacing:.3}}>🤖 AI Actions</strong>
      <div style={{display:"flex", gap:8}}>
        <Pill title="Recommend lenders based on profile" onClick={() => safe("Lender Match", api.lenderMatch)}>Lender Match</Pill>
        <Pill title="OCR + summary of attached docs" onClick={() => safe("Summarize Docs", api.summarizeDocs)}>Doc IQ</Pill>
        <Pill title="Risk scoring & red flags" onClick={() => safe("Risk Score", api.scoreRisk)}>Risk Score</Pill>
        <Pill title="Draft an email/SMS reply" onClick={() => safe("Smart Reply", api.smartReply)}>Smart Reply</Pill>
        <Pill title="Suggest next steps & checklist" onClick={() => safe("Next Steps", api.nextSteps)}>Next Steps</Pill>
      </div>
      <div style={{marginLeft:"auto", fontSize:12, opacity:.9}}>
        {ctx?.name ? `${ctx.name}${ctx.amount ? ` • $${ctx.amount.toLocaleString()}` : ""}` : "No context"}
      </div>
      {msg && (
        <div style={{
          position:"absolute", right:14, bottom:-22, background:"#111827",
          color:"#fff", padding:"4px 8px", borderRadius:6, fontSize:11
        }}>{msg}</div>
      )}
    </div>
  );
}