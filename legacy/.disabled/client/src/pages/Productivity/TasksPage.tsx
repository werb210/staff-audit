import React from "react";

export default function TasksPage(){
  const [items,setItems]=React.useState<any[]>([]);
  const [title,setTitle]=React.useState(""); 
  const [due,setDue]=React.useState("");
  
  async function load(){ 
    const j=await (await fetch("/api/o365/todo")).json(); 
    setItems(j.items||[]); 
  }
  
  React.useEffect(()=>{ load(); },[]);
  
  async function create(){ 
    await fetch("/api/o365/todo",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ title, dueDateTime: due })
    }); 
    setTitle(""); 
    setDue(""); 
    load(); 
  }
  
  return (
    <div className="p-4 space-y-3">
      <div className="text-lg font-semibold">Tasks (Microsoft To Do)</div>
      <div className="flex gap-2">
        <input 
          className="border rounded px-2 py-1 flex-1" 
          placeholder="Task title" 
          value={title} 
          onChange={e=>setTitle(e.target.value)}
        />
        <input 
          className="border rounded px-2 py-1" 
          type="datetime-local" 
          value={due} 
          onChange={e=>setDue(e.target.value)}
        />
        <button 
          className="border rounded px-3 py-1 text-sm bg-blue-500 text-white" 
          onClick={create} 
          disabled={!title}
        >
          Add
        </button>
      </div>
      <div className="border rounded">
        {items.map((t:any)=>(
          <div key={t.id} className="p-3 border-b text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-gray-500">
                {t.status} 
                {t.dueDateTime?.dateTime ? ` • due ${new Date(t.dueDateTime.dateTime).toLocaleString()}` : ""}
              </div>
            </div>
            <button 
              className="text-xs underline text-blue-600 hover:text-blue-800" 
              onClick={async ()=>{
                await fetch(`/api/o365/todo/${t.id}`,{
                  method:"PATCH",
                  headers:{"Content-Type":"application/json"},
                  body:JSON.stringify({ status:"completed" })
                });
                load();
              }}
            >
              Mark done
            </button>
          </div>
        ))}
        {items.length===0 && <div className="p-3 text-sm text-gray-500">No tasks.</div>}
      </div>
    </div>
  );
}