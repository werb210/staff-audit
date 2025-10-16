import React from "react";
import EmailDrawer from "./drawers/EmailDrawer";
import TaskDrawer from "./drawers/TaskDrawer";
import NoteDrawer from "./drawers/NoteDrawer";
import MeetingDrawer from "./drawers/MeetingDrawer";
import { Phone, Mail, CheckSquare, StickyNote, Video } from "lucide-react";

export default function ContactCRMHubspot(){
  const [contacts,setContacts]=React.useState<any[]>([]);
  const [sel,setSel]=React.useState<any|null>(null);
  const [tab,setTab]=React.useState<"Activity"|"Notes"|"Emails"|"Calls"|"Tasks"|"Meetings">("Activity");
  const [drawer,setDrawer]=React.useState<null|"email"|"task"|"note"|"meeting">(null);
  const [timeline,setTimeline]=React.useState<any[]>([]);
  React.useEffect(()=>{ loadContacts(); },[]);
  React.useEffect(()=>{ if(sel) loadTimeline(); },[sel,tab]);

  async function loadContacts(){ const j = await (await fetch("/api/contacts")).json(); setContacts(j.items||j||[]); }
  async function loadTimeline(){
    const map:any = { Activity:"", Notes:"note", Emails:"email", Calls:"call", Tasks:"task", Meetings:"meeting" };
    const kinds = map[tab]; const q = kinds?`?kinds=${kinds}`:"";
    const j = await (await fetch(`/api/inbox/thread/${sel.id}${q}`)).json(); setTimeline(j.items||[]);
  }

  return (
    <div className="h-full w-full grid grid-cols-[320px,1fr,360px] gap-4 p-4">
      {/* LEFT: list */}
      <div className="border rounded bg-white overflow-hidden flex flex-col">
        <div className="px-3 py-2 text-sm font-semibold border-b">Contacts</div>
        <div className="p-2"><input className="w-full border rounded px-2 py-1" placeholder="Search"/></div>
        <div className="overflow-auto p-2 space-y-2">
          {contacts.map((c:any)=>(
            <div key={c.id} className="card" onClick={()=>setSel(c)} data-testid="contacts-card">
              <div className="card-content">
                <div className="card-title">{c.full_name||c.first_name||`${c.first||""} ${c.last||""}`}</div>
                <div className="card-subtitle">{c.email||"—"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: details + activities */}
      <div className="border rounded bg-white flex flex-col">
        <div className="px-4 py-3 border-b">
          <div className="text-lg font-semibold">{sel? (sel.full_name||`${sel.first||""} ${sel.last||""}`) : "Select a contact"}</div>
          {sel && <div className="text-sm text-gray-500">{sel.company||"—"} · {sel.title||"—"}</div>}
        </div>

        {sel && (
          <div className="px-4 py-2 border-b flex items-center gap-2">
            {["Activity","Notes","Emails","Calls","Tasks","Meetings"].map(t=>(
              <button key={t} onClick={()=>setTab(t as any)}
                className={`px-3 py-1 rounded ${tab===t?'bg-gray-900 text-white':'hover:bg-gray-100'}`}>{t}</button>
            ))}
            <div className="ml-auto flex gap-2">
              <button className="border rounded px-2 py-1 flex items-center gap-1" onClick={()=>setDrawer("meeting")}><Video size={16}/> Meeting</button>
              <button className="border rounded px-2 py-1 flex items-center gap-1" onClick={()=>setDrawer("task")}><CheckSquare size={16}/> Task</button>
              <button className="border rounded px-2 py-1 flex items-center gap-1" onClick={()=>setDrawer("note")}><StickyNote size={16}/> Note</button>
              <button className="border rounded px-2 py-1 flex items-center gap-1" onClick={()=>setDrawer("email")}><Mail size={16}/> Email</button>
              <button className="border rounded px-2 py-1 flex items-center gap-1" onClick={()=>window.dispatchEvent(new CustomEvent("dialer:open",{ detail:{ number: sel.phone||"" } }))}><Phone size={16}/> Call</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {!sel && <div className="text-sm text-gray-500">Pick someone on the left to view their activity.</div>}
          {sel && timeline.map((m:any,i:number)=>(
            <div key={i} className="border rounded p-3 mb-3">
              <div className="text-xs text-gray-500 mb-1">{(m.kind||"activity").toUpperCase()} · {new Date(m.createdAt||Date.now()).toLocaleString()}</div>
              <div className="whitespace-pre-wrap text-sm">{m.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: company / deals / attachments */}
      <div className="border rounded bg-white overflow-auto">
        <section className="p-4 border-b">
          <div className="text-sm font-semibold mb-1">Company</div>
          <div className="text-sm">{sel?.company||"—"}</div>
        </section>
        <DealsSection contactId={sel?.id} />
        <section className="p-4">
          <div className="text-sm font-semibold mb-1">Attachments</div>
          <AttachmentList contactId={sel?.id}/>
        </section>
      </div>

      {/* Drawers */}
      {drawer==="email"   && sel && <EmailDrawer   contact={sel} onClose={()=>{setDrawer(null);}}/>}
      {drawer==="task"    && sel && <TaskDrawer    contact={sel} onClose={()=>{setDrawer(null);}}/>}
      {drawer==="note"    && sel && <NoteDrawer    contact={sel} onClose={()=>{setDrawer(null); loadTimeline();}}/>}
      {drawer==="meeting" && sel && <MeetingDrawer contact={sel} onClose={()=>{setDrawer(null);}}/>}
    </div>
  );
}

function AttachmentList({contactId}:{contactId?:string}){
  const [items,setItems]=React.useState<any[]>([]);
  React.useEffect(()=>{ if(contactId) fetch(`/api/documents?contactId=${contactId}`).then(r=>r.json()).then(j=>setItems(j.items||[])); },[contactId]);
  if(!contactId) return <div className="text-xs text-gray-500">—</div>;
  return (
    <div className="space-y-2">
      {items.length===0 && <div className="text-xs text-gray-500">No files.</div>}
      {items.map((d:any)=>(
        <a key={d.id} href={d.downloadUrl} className="block text-sm underline break-all">{d.name}</a>
      ))}
    </div>
  );
}

function DealsSection({ contactId }: { contactId?: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  
  async function load() {
    if (!contactId) return;
    try {
      const j = await (await fetch(`/api/contacts/${contactId}/deals`)).json();
      setItems(j.items || []);
    } catch (e) {
      console.error('Failed to load deals:', e);
    }
  }
  
  React.useEffect(() => {
    load();
  }, [contactId]);
  
  async function create() {
    if (!contactId) return;
    try {
      await fetch(`/api/contacts/${contactId}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount })
      });
      setName("");
      setAmount(0);
      load();
    } catch (e) {
      console.error('Failed to create deal:', e);
    }
  }
  
  return (
    <section className="p-4 border-b">
      <div className="text-sm font-semibold mb-2">Deals</div>
      {(!items || items.length === 0) && <div className="text-xs text-gray-500 mb-2">No deals linked.</div>}
      <div className="space-y-2">
        {items.map((d: any) => (
          <div key={d.id} className="border rounded p-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{d.name || 'Deal'}</div>
              <div className="text-xs text-gray-500">{d.stage || '—'} · ${Number(d.amount || 0).toLocaleString()}</div>
            </div>
            <a className="text-xs underline" href={`/portal?tab=pipeline&app=${d.id}`}>Open</a>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <input 
          className="border rounded px-2 py-1 col-span-2" 
          placeholder="Deal name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
        />
        <input 
          className="border rounded px-2 py-1" 
          type="number" 
          placeholder="Amount" 
          value={amount} 
          onChange={e => setAmount(+e.target.value || 0)} 
        />
        <button className="bg-blue-600 text-white rounded px-2 py-1 col-span-3" onClick={create}>
          Create deal
        </button>
      </div>
    </section>
  );
}