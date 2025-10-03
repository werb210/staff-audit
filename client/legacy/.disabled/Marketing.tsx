import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import Templates from "../../modules/marketing/sendgrid/Templates";
import Campaigns from "../../modules/marketing/sendgrid/Campaigns";
import Audience from "../../modules/marketing/sendgrid/Audience";
// Using Reports instead
import BulkEmail from "../../modules/marketing/sendgrid/BulkEmail";

const sub = [
  {to:"templates", label:"Email Templates"},
  {to:"campaigns", label:"Campaigns"},
  {to:"audience", label:"Audience & Lists"},
  {to:"bulk", label:"Bulk Email"},
  {to:"reports", label:"Reports"},
];

export default function Marketing(){
  return (
    <div>
      <div className="card pad" style={{marginBottom:16}}>
        <nav style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {sub.map(s=>(
            <NavLink key={s.to} to={s.to} className={({isActive})=>"lm-tab"+(isActive?" active":"")}>
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="templates" replace />} />
        <Route path="templates" element={<Templates />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="audience" element={<Audience />} />
        <Route path="bulk" element={<BulkEmail />} />
        <Route path="reports" element={<div>Reports coming soon</div>} />
      </Routes>
    </div>
  );
}