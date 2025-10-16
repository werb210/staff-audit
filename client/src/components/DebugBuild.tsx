import { useEffect, useState } from "react";

export default function DebugBuild(){
  const [s,setS] = useState<any>(null);
  useEffect(()=>{ 
    fetch("/api/_int/build", {})
      .then(r=>r.json())
      .then(setS)
      .catch(()=>{}); 
  },[]);
  
  return (
    <div style={{
      position:"fixed",
      bottom:4,
      right:8,
      opacity:0.7,
      fontSize:11,
      background:"#000",
      color:"#fff",
      padding:"4px 6px",
      borderRadius:6,
      zIndex:9999
    }}>
      srv:{s?.git||"?"} @{s?.startedAt?.slice(11,19)||"??"} · pid:{s?.pid||"?"} · host:{location.host}
    </div>
  );
}