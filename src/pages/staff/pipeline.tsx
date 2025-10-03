import React, { useEffect, useMemo, useRef, useState } from "react";
// ApplicationDrawer import removed - using relative path from client
// import ApplicationDrawer from "../../client/src/components/ApplicationDrawer";

console.log("✅ RENDERING PipelinePage MAIN ROUTE (src/pages/staff/pipeline.tsx)");

type StageId = "new" | "requires_docs" | "in_review" | "sent_to_lender" | "closed";
type Card = { id: string; title: string; amount: number; contact: string; stage: StageId };
type Column = { id: StageId; label: string; items: Card[] };

const STAGES: { id: StageId; label: string }[] = [
  { id: "new",            label: "New" },
  { id: "requires_docs",  label: "Requires Docs" },
  { id: "in_review",      label: "In Review" },
  { id: "sent_to_lender", label: "Sent to Lender" },
  { id: "closed",         label: "Closed" },
];

function transformToColumns(applications: any[]): Column[] {
  const columns: Column[] = STAGES.map(stage => ({ 
    id: stage.id, 
    label: stage.label, 
    items: [] 
  }));
  
  applications.forEach(app => {
    const stage = app.stage || "new";
    const column = columns.find(c => c.id === stage);
    if (column) {
      column.items.push({
        id: app.id || app._id || app.applicationId,
        title: app.title || app.businessName || `Application ${app.id}`,
        amount: app.amount || app.requestedAmount || 0,
        contact: app.contact || app.contactName || app.contactEmail || "Unknown",
        stage: stage
      });
    }
  });
  
  return columns;
}

export default function PipelinePage() {
  const [cols, setCols] = useState<Column[]|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [moving, setMoving] = useState<string|null>(null);
  const [openId, setOpenId] = useState<string|null>(null);
  const [details, setDetails] = useState<any|null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const draggingId = useRef<string|null>(null);

  async function load() {
    try {
      // Get auth token from localStorage or wherever it's stored
      const token = localStorage.getItem('token') || sessionStorage.getItem('bf_auth');
      const headers: HeadersInit = { "Accept": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const res = await fetch("/api/pipeline/cards", { headers });
      if (!res.ok) {
        const txt = await res.text().catch(()=> "");
        throw new Error(`HTTP ${res.status} ${txt?.slice(0,200)}`);
      }
      const data = await res.json();
      // Transform array response to columns format
      const columnData = Array.isArray(data) ? transformToColumns(data) : data.columns;
      setCols(columnData as Column[]);
    } catch (e:any) {
      setErr(e?.message || "Failed to load pipeline");
    }
  }

  async function loadDetails(id: string) {
    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/pipeline/cards/${id}`, { headers: { "Accept":"application/json" }});
      if (!res.ok) {
        const txt = await res.text().catch(()=> "");
        throw new Error(`HTTP ${res.status} ${txt?.slice(0,200)}`);
      }
      setDetails(await res.json());
    } catch (e:any) {
      setDetails({ error: e?.message || "Failed to load" });
    } finally {
      setLoadingDetails(false);
    }
  }

  async function move(applicationId: string, to: StageId) {
    setMoving(applicationId);
    try {
      const res = await fetch("/api/staff/pipeline/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, toStage: to })
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=> "");
        throw new Error(`HTTP ${res.status} ${txt?.slice(0,200)}`);
      }
      await load();
      if (openId === applicationId) await loadDetails(applicationId);
    } catch (e:any) {
      alert(e?.message || "Move failed.");
    } finally {
      setMoving(prev => (prev === applicationId ? null : prev));
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpenId(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const zipHref = useMemo(() => openId ? `/api/public/applications/${openId}/documents.zip` : "#", [openId]);

  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!cols) return <div className="p-4">Loading pipeline...</div>;

  function onDragStart(e: React.DragEvent, id: string) {
    draggingId.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(stage: StageId) {
    const id = draggingId.current;
    if (id) move(id, stage);
    draggingId.current = null;
  }

  return (
    <div className="relative p-4 grid grid-cols-5 gap-4">
      {STAGES.map(stage => {
        const col = cols.find(c => c.id === stage.id) || { id: stage.id, label: stage.label, items: [] };
        return (
          <div
            key={stage.id}
            className="bg-white border rounded-2xl p-3"
            onDragOver={onDragOver}
            onDrop={() => onDrop(stage.id)}
          >
            <div className="font-semibold mb-2">{stage.label} <span className="text-xs opacity-60">({col.items.length})</span></div>
            <div className="space-y-3 min-h-[80px]">
              {col.items.length === 0 && <div className="text-sm text-gray-400">Drop cards here.</div>}
              {col.items.map(card => (
                <div
                  key={card.id}
                  className="rounded-xl border p-3 hover:shadow cursor-pointer"
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e)=>onDragStart(e, card.id)}
                  onClick={async () => { setOpenId(card.id); await loadDetails(card.id); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenId(card.id);
                      loadDetails(card.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{card.title}</div>
                    <div className="text-xs rounded bg-gray-100 px-2 py-0.5">{card.stage.replace("_"," ")}</div>
                  </div>
                  <div className="text-xs opacity-75 mt-0.5">{card.contact}</div>
                  <div className="text-xs mt-1">Amount: ${card.amount?.toLocaleString?.() ?? card.amount}</div>
                  <div className="mt-2 text-[11px] text-gray-500">Click to open • Drag to move</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* ApplicationDrawer temporarily removed - import path issue */}
      {openId && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-4 rounded max-w-md">
          <h3>Application Details</h3>
          <p>App ID: {openId}</p>
          <button data-card-button onClick={$1} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">Close</button>
        </div>
      </div>}
    </div>
  );
}