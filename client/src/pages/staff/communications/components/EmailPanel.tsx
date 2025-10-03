import React, { useState } from "react";

export default function EmailPanel({ defaultTo }: { defaultTo?: string }) {
  const [to, setTo] = useState(defaultTo || "");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function send() {
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/comms/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      setStatus(`✅ Sent (id: ${j.id})`);
      setSubject(""); setText("");
    } catch (e: any) {
      setStatus(`❌ ${e.message || "Send failed"}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500">Quick Email</div>
      <input 
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
        placeholder="Recipient email" 
        value={to} 
        onChange={e => setTo(e.target.value)} 
      />
      <input 
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
        placeholder="Subject" 
        value={subject} 
        onChange={e => setSubject(e.target.value)} 
      />
      <textarea 
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]" 
        placeholder="Message..." 
        value={text} 
        onChange={e => setText(e.target.value)} 
      />
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
        onClick={send} 
        disabled={!to || !subject || !text || busy}
      >
        {busy ? "Sending..." : "Send Email"}
      </button>
      {status && <div className="text-sm">{status}</div>}
    </div>
  );
}