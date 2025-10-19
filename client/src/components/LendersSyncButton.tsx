import { API_BASE } from "../config";
import { useState } from "react";

export default function LendersSyncButton() {
  const [loading,setLoading] = useState(false);
  const [msg,setMsg] = useState<string| null>(null);

  async function doSync(){
    setLoading(true); setMsg(null);
    try{
      const r = await fetch(`${API_BASE}/_admin/push-products", { method:"POST" });
      const j = await r.json();
      if(!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const ca = (j.by_country||[]).find(x=>x.k==="CA")?.n||0;
      const us = (j.by_country||[]).find(x=>x.k==="US")?.n||0;
      setMsg(`Pushed ${j.pushed} products (CA:${ca}, US:${us})`);
    }catch(e:any){
      setMsg(`Push failed: ${e?.message||String(e)}`);
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={doSync} disabled={loading} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
        {loading ? "Pushing..." : "Sync to Client"}
      </button>
      {msg && <span className="text-sm">{msg}</span>}
    </div>
  );
}