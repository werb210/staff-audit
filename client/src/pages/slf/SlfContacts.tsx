import { useEffect, useState } from "react";
import { SLF } from "../../api/endpoints";
type Contact={id:string; name:string; phone?:string; email?:string};
export default function SlfContacts(){
  const [rows,setRows]=useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(()=>{ 
    fetch(SLF.contacts,{})
      .then(r=>r.json())
      .then(data => {
        setRows(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("SLF Contacts fetch error:", err);
        setLoading(false);
      });
  },[]);
  
  if (loading) return <div className="card pad">Loading SLF contacts...</div>;
  
  return (<div className="card pad">
    <div className="section-title" style={{color: "var(--slf-green)"}}>SLF Contacts</div>
    <div className="subtle" style={{marginBottom: "16px"}}>Site Level Financial contact database</div>
    {rows.length > 0 ? (
      <table style={{width:"100%"}}>
        <thead>
          <tr style={{borderBottom: "2px solid var(--slf-green)"}}>
            <th style={{textAlign:"left", padding:"8px"}}>Name</th>
            <th style={{textAlign:"left", padding:"8px"}}>Phone</th>
            <th style={{textAlign:"left", padding:"8px"}}>Email</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c=>(
            <tr key={c.id} style={{borderBottom:"1px solid #eee"}}>
              <td style={{padding:"8px", fontWeight:600}}>{c.name}</td>
              <td style={{padding:"8px"}}>{c.phone||"-"}</td>
              <td style={{padding:"8px"}}>{c.email||"-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="subtle">No SLF contacts found</div>
    )}
  </div>);
}