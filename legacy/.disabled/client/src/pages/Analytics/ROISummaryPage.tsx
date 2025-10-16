import React from "react";
export default function ROISummaryPage(){
  const [rows,setRows]=React.useState<any[]>([]);
  async function load(){ const j=await (await fetch("/api/analytics/roi/summary")).json(); setRows(j.rows||[]); }
  React.useEffect(()=>{ load(); },[]);
  async function run(){ await fetch("/api/analytics/roi/map/run",{method:"POST"}); load(); }
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">ROI Summary (last 60 days)</div>
        <button className="border rounded px-3 py-1 text-sm" onClick={run}>Run mapping</button>
      </div>
      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Campaign</th>
              <th className="text-right px-3 py-2">Spend</th>
              <th className="text-right px-3 py-2">Conversions</th>
              <th className="text-right px-3 py-2">Revenue</th>
              <th className="text-right px-3 py-2">CAC</th>
              <th className="text-right px-3 py-2">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r:any)=>(
              <tr key={r.campaign_id} className="border-t">
                <td className="px-3 py-2">{r.campaign_id||"unknown"}</td>
                <td className="px-3 py-2 text-right">${r.cost?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{r.conversions}</td>
                <td className="px-3 py-2 text-right">${r.revenue?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{r.cac!=null?`$${r.cac.toFixed(2)}`:"—"}</td>
                <td className="px-3 py-2 text-right">{r.roas!=null?r.roas.toFixed(2):"—"}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="px-3 py-4 text-sm text-gray-500" colSpan={6}>No data yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500">Mapping uses campaign_id/gclid and funded deals for revenue.</div>
    </div>
  );
}