import React from "react";
export default function QueuesDashboard(){
  const [data,setData]=React.useState<any>({});
  React.useEffect(()=>{ load(); const t=setInterval(load,4000); return ()=>clearInterval(t); },[]);
  async function load(){ const j = await (await fetch("/api/ops/queues")).json(); setData(j.queues||{}); }
  const names = Object.keys(data||{});
  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Queues Health</div>
      <div className="grid md:grid-cols-2 gap-3">
        {names.map(n=>(<div key={n} className="border rounded p-3">
          <div className="font-medium">{n}</div>
          <div className="text-sm text-gray-600">{JSON.stringify(data[n])}</div>
        </div>))}
      </div>
    </div>
  );
}