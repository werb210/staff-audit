import React from "react";
import { useRoles } from "../../../context/RolesCtx";
export default function AdminViewAs(){
  const { roles, viewAs, setViewAs, has } = useRoles();
  if(!has("admin")) return null;
  return (
    <div className="toolbar" style={{marginBottom:12}}>
      <div><b>Admin</b> — View as role</div>
      <div className="row">
        <select className="lm-input" value={viewAs||""} onChange={e=>setViewAs((e.target.value||null) as any)}>
          <option value="">(Your roles: {roles.join(", ")})</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="marketing">Marketing</option>
          <option value="lender">Lender</option>
          <option value="referrer">Referrer</option>
        </select>
        <button className="lm-btn" onClick={()=>setViewAs(null)}>Reset</button>
      </div>
    </div>
  );
}