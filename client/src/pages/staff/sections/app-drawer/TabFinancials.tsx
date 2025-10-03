import { useEffect, useState } from "react";
import type { Card } from "../../../../features/pipeline/types";
export default function TabFinancials({card}:{card:Card}){
  const [data,setData]=useState<any>(null);
  useEffect(()=>{(async()=>{
    const tries=[ `/api/ocr-insights/financials?applicationId=${encodeURIComponent(card.id)}`, `/api/ocr-insights?applicationId=${encodeURIComponent(card.id)}` ];
    for(const u of tries){ const res = await fetch(u).catch(()=>null); if(res?.ok){ const json = await res.json().catch(()=>null); if(json) { setData(json); return; } } }
    setData({revenue:"—", profit:"—", debt_service:"—"});
  })()},[card.id]);
  return (
    <div className="lm-card" style={{padding:12}}>
      <div className="lm-title" style={{marginBottom:8}}>Financials (OCR)</div>
      <div className="kv">
        <div className="lm-subtle">Annual Revenue</div><div>{data?.revenue ?? "—"}</div>
        <div className="lm-subtle">Net Profit</div><div>{data?.profit ?? "—"}</div>
        <div className="lm-subtle">Debt Service Coverage</div><div>{data?.debt_service ?? "—"}</div>
      </div>
    </div>
  );
}