import React from "react";
import { Link, useRoute } from "wouter";
const Item = ({href,label}:{href:string;label:string})=>{
  const [active]=useRoute(href);
  return <Link href={href}><span style={{
    display:"block",padding:"8px 12px",
    borderRadius:6,background:active?"#334155":"transparent",
    color:active?"#38bdf8":"#f8fafc",cursor:"pointer"
  }}>{label}</span></Link>;
};
export const Layout:React.FC<{children:React.ReactNode}> = ({children})=>(
  <div style={{display:"flex",height:"100vh",fontFamily:"Inter,sans-serif"}}>
    <nav style={{width:220,background:"#0f172a",color:"#f8fafc",padding:"1rem"}}>
      <h2 style={{color:"#38bdf8"}}>Boreal Staff</h2>
      <div style={{marginTop:"1rem",display:"flex",flexDirection:"column",gap:"6px"}}>
        <Item href="/staff-audit/" label="Dashboard"/>
        <Item href="/staff-audit/pipeline" label="Sales Pipeline"/>
        <Item href="/staff-audit/crm" label="CRM"/>
        <Item href="/staff-audit/communication" label="Communication"/>
        <Item href="/staff-audit/reports" label="Reports"/>
        <Item href="/staff-audit/lenders" label="Lenders"/>
        <Item href="/staff-audit/referrals" label="Referrals"/>
        <Item href="/staff-audit/marketing" label="Marketing"/>
        <Item href="/staff-audit/settings" label="Settings"/>
      </div>
    </nav>
    <div style={{flex:1,display:"flex",flexDirection:"column"}}>
      <header style={{background:"#1e293b",color:"#f1f5f9",padding:"10px 16px",
        display:"flex",justifyContent:"space-between"}}>
        <h1>Boreal Financial — Staff Portal</h1><span>User ▾</span>
      </header>
      <main style={{padding:"1.5rem",overflowY:"auto",flex:1}}>{children}</main>
    </div>
  </div>
);
