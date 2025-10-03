import React, { useState } from "react";

export default function SmsPanel({ defaultTo }: { defaultTo?: string }) {
  const [to, setTo] = useState(defaultTo || "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function send() {
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/comms/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, body }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      setStatus(`✅ Sent (id: ${j.id})`);
      setBody("");
    } catch (e: any) {
      setStatus(`❌ ${e.message || "Send failed"}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500">Quick SMS</div>
      <input 
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
        placeholder="Recipient phone +1..." 
        value={to} 
        onChange={e => setTo(e.target.value)} 
      />
      <textarea 
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]" 
        placeholder="Type your message..." 
        value={body} 
        onChange={e => setBody(e.target.value)} 
      />
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
        onClick={send} 
        disabled={!to || !body || busy}
      >
        {busy ? "Sending..." : "Send SMS"}
      </button>
      {status && <div className="text-sm">{status}</div>}
    </div>
  );
}