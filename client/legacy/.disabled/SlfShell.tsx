import { Routes, Route, NavLink, Navigate } from "react-router-dom";
// Legacy import removed - using canonical navSpec only
import SlfContacts from "./SlfContacts";
import SlfPipeline from "./SlfPipeline";
import SlfComms from "./SlfComms";
import { useEffect } from "react";
export default function SlfShell(){
  // Using canonical navSpec navigation system  
  const tabs=[{to:"pipeline",label:"Pipeline"},{to:"contacts",label:"Contacts"},{to:"comms",label:"Comms"}];
  useEffect(()=>{
    document.body.classList.add("silo-slf");
    return ()=>{ document.body.classList.remove("silo-slf"); };
  },[]);
  return (
    <div>
      <div className="card pad" style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div className="badge badge--silo" style={{padding:"6px 10px",borderRadius:"999px",fontWeight:800}}>SLF MODE</div>
        <div className="subtle">You're viewing Site Level Financial data only.</div>
      </div>
      <div className="card pad" style={{marginBottom:16}}>
        <nav style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {tabs.map(t=><NavLink key={t.to} to={t.to} className={({isActive})=>"lm-tab"+(isActive?" active":"")}>{t.label}</NavLink>)}
        </nav>
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="pipeline" replace/>}/>
        {/* Using canonical navigation system */}
        <Route path="pipeline" element={<SlfPipeline/>}/>
        <Route path="contacts" element={<SlfContacts/>}/>
        <Route path="comms" element={<SlfComms/>}/>
      </Routes>
    </div>
  );
}