import React from "react";
import "../../../styles/app.css";
import { Card } from "@/lib/api/pipeline";

export default function DashboardHome(){
  return (
    <div className="grid" style={{gap:16}}>
      <h2 className="section-title">Welcome</h2>
      <div className="grid" style={{gridTemplateColumns:"repeat(3,1fr)", gap:12}}>
        <div className="card"><div className="kb">Today</div><div style={{fontSize:28,fontWeight:700}}>0</div></div>
        <div className="card"><div className="kb">Active Apps</div><div style={{fontSize:28,fontWeight:700}}>—</div></div>
        <div className="card"><div className="kb">Docs Pending</div><div style={{fontSize:28,fontWeight:700}}>—</div></div>
      </div>
    </div>
  );
}
