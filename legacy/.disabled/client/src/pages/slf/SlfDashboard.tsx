import { useEffect, useState } from "react";
import { SLF } from "../../api/endpoints";
export default function SlfDashboard(){
  const [summary,setSummary]=useState<Record<string,number>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(()=>{ 
    fetch(SLF.dashboard,{credentials:"include"})
      .then(r=>r.json())
      .then(data => {
        setSummary(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("SLF Dashboard fetch error:", err);
        setLoading(false);
      });
  },[]);
  
  if (loading) return <div className="card pad">Loading SLF dashboard...</div>;
  
  return (<div className="grid cols-3">
    <div className="card pad" style={{gridColumn:"span 3"}}>
      <div className="section-title" style={{color: "var(--slf-green)"}}>SLF Dashboard</div>
      <div className="subtle">Pipeline summary by stage</div>
      {Object.keys(summary).length > 0 ? (
        <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
          {Object.entries(summary).map(([k,v])=>(
            <div key={k} className="card pad" style={{borderLeft: "4px solid var(--slf-green)"}}>
              <div style={{fontWeight:700,fontSize:"14px"}}>{k}</div>
              <div style={{fontSize:"24px", color: "var(--slf-green)",fontWeight:800}}>{v}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="subtle" style={{marginTop:16}}>No pipeline data available</div>
      )}
    </div>
  </div>);
}