import React from "react";

export default function LenderReports(){
  const [items,setItems]=React.useState<any[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [meta,setMeta]=React.useState<any>({page:1,size:20,total:0});

  async function load(p=1){
    setLoading(true);
    const r = await fetch(`/api/lender/reports?page=${p}&size=20`,{credentials:"include"});
    const j = await r.json(); setItems(j.items||[]); setMeta(j.meta||{}); setLoading(false);
  }
  React.useEffect(()=>{ load(); },[]);

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Reports</div>
        <div className="space-x-2">
          <a className="px-3 py-1 rounded border" href="/api/lender/reports/export.csv">Export CSV</a>
          <button className="px-3 py-1 rounded border print:hidden" onClick={()=>window.print()}>Print</button>
        </div>
      </div>

      {!items.length && <div className="text-gray-600">No reports assigned yet.</div>}

      {items.map((r:any)=>(
        <div key={r.id} className="border rounded p-3">
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-gray-500 mb-2">{r.type.toUpperCase()} • {new Date(r.createdAt).toLocaleString()}</div>

          {r.type==="iframe" && r.embedUrl && (
            <div className="aspect-video border rounded overflow-hidden">
              <iframe src={r.embedUrl} title={r.name} className="w-full h-full" />
            </div>
          )}

          {r.type==="link" && r.url && (
            <a href={r.url} target="_blank" rel="noreferrer" className="inline-block px-3 py-1 rounded bg-black text-white">Open report</a>
          )}

          {r.type==="pdf" && r.url && (
            <div className="aspect-[3/4] border rounded overflow-hidden">
              <iframe src={r.url} title={r.name} className="w-full h-full" />
            </div>
          )}

          {r.type==="csv" && r.url && (
            <a href={r.url} className="underline text-blue-600" target="_blank" rel="noreferrer">Download CSV</a>
          )}
        </div>
      ))}

      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded" disabled={meta.page<=1} onClick={()=>load(meta.page-1)}>Prev</button>
          <div className="text-sm">Page {meta.page} / {Math.max(1, Math.ceil((meta.total||0)/(meta.size||20)))}</div>
          <button className="px-2 py-1 border rounded" disabled={(meta.page*meta.size)>=meta.total} onClick={()=>load(meta.page+1)}>Next</button>
        </div>
      )}
    </div>
  );
}