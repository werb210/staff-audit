import React from "react";
export default function ScheduleLinksPage(){
  const [items,setItems]=React.useState<any[]>([]);
  const [duration,setDuration]=React.useState(30);
  const [slug,setSlug]=React.useState("");
  React.useEffect(()=>{ load(); },[]);
  async function load(){ const j = await (await fetch("/api/schedule/links",{ headers:auth() })).json(); setItems(j.items||[]); }
  async function create(){ const body={ slug:slug||undefined, ownerIds:[], duration:duration }; await fetch("/api/schedule/links",{ method:"POST", headers:{ "Content-Type":"application/json", ...auth() }, body: JSON.stringify(body) }); setSlug(""); load(); }
  function publicUrl(slug:string){ return `/public/s/${slug}`; }
  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Booking Links</div>
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2" placeholder="Custom slug (optional)" value={slug} onChange={e=>setSlug(e.target.value)} />
        <input className="border rounded px-3 py-2 w-32" type="number" value={duration} onChange={e=>setDuration(+e.target.value)} />
        <button className="border rounded px-3 py-2" onClick={create}>Create</button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((l:any)=>(
          <div key={l.id} className="border rounded p-3">
            <div className="font-medium">/{l.slug}</div>
            <div className="text-xs text-gray-500">{l.duration_minutes} min • TZ {l.tz}</div>
            <a className="text-xs underline" href={publicUrl(l.slug)} target="_blank" rel="noreferrer">{location.origin}{publicUrl(l.slug)}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
function auth(){ return { "Authorization": `Bearer ${localStorage.getItem("jwt")||""}` }; }