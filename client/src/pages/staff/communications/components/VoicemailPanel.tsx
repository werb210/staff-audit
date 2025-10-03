import React, { useEffect, useState } from "react";

export default function VoicemailPanel() {
  const [state, setState] = useState<{ loading:boolean; error?:string; items:any[] }>({ loading:true, items:[] });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/comms/voice/mailbox/messages");
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || r.statusText);
        setState({ loading:false, items: Array.isArray(j.messages) ? j.messages : [] });
      } catch (e:any) {
        setState({ loading:false, items:[], error: e.message || "Failed to load voicemail" });
      }
    })();
  }, []);

  if (state.loading) return <div className="text-sm text-gray-500">Loading voicemail…</div>;
  if (state.error) return (
    <div className="p-6 text-center">
      <div className="text-rose-600 mb-2">Failed to load voicemail: {state.error}</div>
      <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200" onClick={() => location.reload()}>
        Try Again
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      {state.items.length === 0 && <div className="text-sm text-gray-500">No messages.</div>}
      {state.items.map((m, i) => (
        <div key={m.id || i} className="rounded border p-3">
          <div className="text-sm font-medium">{m.from || "Unknown"}</div>
          <div className="text-xs text-gray-500">{m.receivedAt || ""}</div>
          {m.transcript && <div className="mt-2 text-sm">{m.transcript}</div>}
        </div>
      ))}
    </div>
  );
}