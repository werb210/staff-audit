import { useEffect, useState } from "react";
import type { Card } from "../../../../features/pipeline/types";
import { useFeaturePanel, FeatureActionButton } from '@/features/featureWiring';

export default function TabBanking({card}:{card:Card}){
  useFeaturePanel("banking-analysis", { appId: card.id });
  const [data,setData]=useState<any>(null);
  useEffect(()=>{(async()=>{
    const tries=[ `/api/banking/summary?applicationId=${encodeURIComponent(card.id)}`, `/api/ocr-insights/banking?applicationId=${encodeURIComponent(card.id)}` ];
    for(const u of tries){ const res = await fetch(u).catch(()=>null); if(res?.ok){ const json = await res.json().catch(()=>null); if(json) { setData(json); return; } } }
    setData({avg_balance: "—", inflow: "—", outflow:"—", nsf_count: "—"});
  })()},[card.id]);
  return (
    <div className="lm-card" style={{padding:12}}>
      <div className="lm-title" style={{marginBottom:8}}>Banking Analysis</div>
      <div style={{marginBottom:12}}>
        <FeatureActionButton 
          featureId="banking-analysis" 
          className="border rounded px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => {
            // Re-fetch banking data
            setData(null);
            const fetchBanking = async () => {
              const tries = [`/api/banking/summary?applicationId=${encodeURIComponent(card.id)}`, `/api/ocr-insights/banking?applicationId=${encodeURIComponent(card.id)}`];
              for(const u of tries) {
                const res = await fetch(u).catch(() => null);
                if(res?.ok) {
                  const json = await res.json().catch(() => null);
                  if(json) {
                    setData(json);
                    return;
                  }
                }
              }
              setData({avg_balance: "—", inflow: "—", outflow:"—", nsf_count: "—"});
            };
            fetchBanking();
          }}
        >
          Run Banking Analysis
        </FeatureActionButton>
      </div>
      <div className="kv">
        <div className="lm-subtle">Average Balance</div><div>{data?.avg_balance ?? "—"}</div>
        <div className="lm-subtle">Monthly Inflow</div><div>{data?.inflow ?? "—"}</div>
        <div className="lm-subtle">Monthly Outflow</div><div>{data?.outflow ?? "—"}</div>
        <div className="lm-subtle">NSF Count (90d)</div><div>{data?.nsf_count ?? "—"}</div>
      </div>
    </div>
  );
}