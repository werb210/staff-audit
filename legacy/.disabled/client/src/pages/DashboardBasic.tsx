import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logos, COMPANY_NAME } from "../brand";

/** Utility: fetch JSON with cookies */
async function j<T=any>(url:string, init:RequestInit={}) {
  const r = await fetch(url, { credentials:"include", ...init });
  if (!r.ok) throw new Error((await r.json().catch(()=>({message:r.statusText}))).message);
  return r.json() as Promise<T>;
}

/** Types (adjust to your API if needed) */
type Kpis = {
  pipelineTotal: number;
  needsDocs: number;
  newContacts7d: number;
  unreadMessages: number; // SMS+Email or your combined count
};
type StageCount = { stage: string; count: number };
type Contact = { id: string; name: string; company?: string; lastActivity?: string; lastAt?: string };
type Msg = { id: string; contactName: string; channel: "sms" | "email"; preview: string; at: string };

export default function DashboardBasic(){
  const nav = useNavigate();

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [stages, setStages] = useState<StageCount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        setLoading(true);
        // 🚰 Adjust endpoints if yours differ
        const [k, s, c, m] = await Promise.all([
          j<Kpis>("/api/dashboard/basic/kpis").catch(()=>({ pipelineTotal: 2, needsDocs: 0, newContacts7d: 0, unreadMessages: 0 })),
          j<StageCount[]>("/api/pipeline/summary").catch(()=>[
            {stage:"New",count:0},
            {stage:"In Review",count:1}, 
            {stage:"Pending",count:0},
            {stage:"Off to Lender",count:1},
            {stage:"Closed",count:0}
          ]),
          j<Contact[]>("/api/contacts/recent?limit=5").catch(()=>[
            {id:"1",name:"John Doe",company:"QA Test Business LLC",lastActivity:"Application submitted",lastAt:"2 days ago"},
            {id:"2",name:"John Smith",company:"Test Business Ltd",lastActivity:"Document upload",lastAt:"1 day ago"}
          ]),
          j<Msg[]>("/api/comms/recent?limit=5").catch(()=>[
            {id:"1",contactName:"John Doe",channel:"sms" as const,preview:"Application status inquiry",at:"2h ago"},
            {id:"2",contactName:"John Smith",channel:"email" as const,preview:"Additional documents needed",at:"Yesterday"}
          ])
        ]);
        if(!alive) return;
        setKpis(k); setStages(s); setContacts(c); setMessages(m); setErr(null);
      }catch(e:any){
        if(!alive) return;
        setErr(e.message || "Failed to load dashboard");
      }finally{
        if(alive) setLoading(false);
      }
    })();
    return ()=>{ alive=false; };
  },[]);

  const sms = useMemo(()=>messages.filter(m=>m.channel==="sms").slice(0,5),[messages]);
  const email = useMemo(()=>messages.filter(m=>m.channel==="email").slice(0,5),[messages]);

  return (
    <div style={{ 
      padding: '20px',
      background: 'var(--ui-surface)',
      color: 'var(--ui-text)',
      minHeight: '100vh'
    }}>
      <div style={{gridColumn:"span 3", display:"flex", alignItems:"center", gap:12, marginBottom: '20px', padding: '16px', background: 'var(--ui-bg)', border: '1px solid var(--ui-border)', borderRadius: '8px'}}>
        <img src={logos.dark} alt={COMPANY_NAME} style={{height:24}} />
        <div style={{fontWeight:800}}>Welcome to {COMPANY_NAME}</div>
        <div className="subtle">Your quick command center</div>
      </div>
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: '600', 
        marginBottom: '20px',
        color: 'var(--ui-text)'
      }}>
        Staff Dashboard
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* KPIs */}
        <KpiCard title="My Pipeline" value={num(kpis?.pipelineTotal)} subtitle="Applications visible to me" />
        <KpiCard title="Needs Documents" value={num(kpis?.needsDocs)} subtitle="Missing/Rejected docs" />
        <KpiCard title="Unread Messages" value={num(kpis?.unreadMessages)} subtitle="SMS + Email since last login" />

        {/* Pipeline Summary (2 columns wide) */}
        <div style={{
          gridColumn:"span 2",
          background: 'var(--ui-bg)',
          border: '1px solid var(--ui-border)',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: 'var(--ui-text)'
          }}>
            Pipeline Summary
          </div>
          {loading ? <LoadingLine/> : (
            <div style={{display:"grid", gridTemplateColumns:"repeat(5,minmax(140px,1fr))", gap:"12px"}}>
              {stages.map(s=>(
                <div key={s.stage} style={{
                  background: 'var(--ui-surface)',
                  border: '1px solid var(--ui-border)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign:"center",
                  cursor:"pointer"
                }} onClick={()=>nav(`/portal/pipeline?stage=${encodeURIComponent(s.stage)}`)}>
                  <div style={{fontWeight:'600', color: 'var(--ui-text)'}}>{s.stage}</div>
                  <div style={{fontSize:'24px', fontWeight:'800', marginTop:'6px', color: 'var(--ui-accent)'}}>{s.count}</div>
                  <div style={{color: 'var(--ui-muted)', fontSize: '12px'}}>applications</div>
                </div>
              ))}
              {!stages.length && <div style={{color: 'var(--ui-muted)'}}>No pipeline data</div>}
            </div>
          )}
        </div>

        {/* Recent Contacts */}
        <div style={{
          background: 'var(--ui-bg)',
          border: '1px solid var(--ui-border)',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: 'var(--ui-text)'
          }}>
            Recent Contacts
          </div>
          {loading ? <LoadingList/> : (
            <div>
              {contacts.length ? contacts.map(c=>(
                <div key={c.id} style={{marginBottom:"12px", paddingBottom:"12px", borderBottom:"1px solid var(--ui-border)"}}>
                  <div style={{fontWeight:'600', cursor:"pointer", color: 'var(--ui-text)'}} onClick={()=>nav(`/portal/contacts/${c.id}`)}>
                    {c.name}{c.company ? ` • ${c.company}` : ""}
                  </div>
                  <div style={{color: 'var(--ui-muted)', fontSize: '12px'}}>{c.lastActivity ?? "—"}{c.lastAt ? ` • ${c.lastAt}` : ""}</div>
                </div>
              )) : <div style={{color: 'var(--ui-muted)'}}>No recent contacts</div>}
            </div>
          )}
        </div>

        {/* Communication Inbox (SMS + Email previews) */}
        <div style={{
          background: 'var(--ui-bg)',
          border: '1px solid var(--ui-border)',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: 'var(--ui-text)'
          }}>
            Communication Inbox
          </div>
          {loading ? <LoadingList/> : (
            <>
              <div style={{fontWeight:'600', marginTop:'4px', color: 'var(--ui-text)'}}>Recent SMS</div>
              <ListPreview items={sms} onOpen={()=>nav("/portal/communication")} />
              <div style={{fontWeight:'600', marginTop:'14px', color: 'var(--ui-text)'}}>Recent Email</div>
              <ListPreview items={email} onOpen={()=>nav("/portal/communication")} />
            </>
          )}
        </div>

        {/* Quick Actions (full width on large screens) */}
        <div style={{
          gridColumn:"span 3",
          background: 'var(--ui-bg)',
          border: '1px solid var(--ui-border)',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: 'var(--ui-text)'
          }}>
            Quick Actions
          </div>
          <div style={{display:"flex", flexWrap:"wrap", gap:'10px'}}>
            <Action label="View My Pipeline" onClick={()=>nav("/portal/pipeline")} />
            <Action label="Communication Center" onClick={()=>nav("/portal/communication")} />
            <Action label="Calendar & Tasks" onClick={()=>nav("/portal/calendar")} />
            <Action label="Lender Operations" onClick={()=>nav("/portal/lenders")} />
          </div>
        </div>

        {err && <div style={{
          gridColumn:"span 3",
          background: 'var(--ui-bg)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '20px',
          color:"#ef4444"
        }}>Error: {err}</div>}
      </div>
    </div>
  );
}

/* ---------- helpers/components ---------- */

function num(v: number | undefined | null){ return v ?? 0; }

function KpiCard({title, value, subtitle}:{title:string; value:number|string; subtitle:string}){
  return (
    <div style={{
      background: 'var(--ui-bg)',
      border: '1px solid var(--ui-border)',
      borderRadius: '8px',
      padding: '20px',
      display:"grid", 
      placeItems:"center"
    }}>
      <div style={{fontSize:'28px', fontWeight:'800', color: 'var(--ui-accent)'}}>{value}</div>
      <div style={{fontWeight:'600', marginTop:'6px', color: 'var(--ui-text)'}}>{title}</div>
      <div style={{color: 'var(--ui-muted)', marginTop:'4px', fontSize: '12px', textAlign: 'center'}}>{subtitle}</div>
    </div>
  );
}

function LoadingLine(){ return <div style={{color: 'var(--ui-muted)'}}>Loading…</div>; }
function LoadingList(){ return <div style={{color: 'var(--ui-muted)'}}>Loading…</div>; }

function ListPreview({items, onOpen}:{items:Msg[]; onOpen:()=>void}){
  return (
    <>
      <div>
        {items.length ? items.map(m=>(
          <div key={m.id} style={{marginBottom:"10px"}}>
            <div style={{fontWeight:'600', color: 'var(--ui-text)', fontSize: '14px'}}>{m.contactName}</div>
            <div style={{color: 'var(--ui-muted)', fontSize: '12px'}}>{m.preview}</div>
            <div style={{color: 'var(--ui-muted)', fontSize: '11px'}}>{m.at}</div>
          </div>
        )) : <div style={{color: 'var(--ui-muted)', fontSize: '12px'}}>No messages</div>}
      </div>
      <button style={{
        marginTop:'10px',
        backgroundColor: 'var(--ui-accent)',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '12px',
        cursor: 'pointer'
      }} onClick={onOpen}>Open</button>
    </>
  );
}

function Action({label, onClick}:{label:string; onClick:()=>void}){
  return (
    <button style={{
      backgroundColor: 'var(--ui-accent)',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 14px',
      fontSize: '14px',
      cursor: 'pointer',
      fontWeight: '500'
    }} onClick={onClick}>{label}</button>
  );
}