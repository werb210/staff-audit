import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePipeline } from '@/features/pipeline/store';

export default function PipelineBoard() {
  const [location] = useLocation();
  const { lanes, cardsByLane, load, loading, error, open } = usePipeline();

  // Hard gate: only load when actually on /staff/pipeline
  useEffect(() => {
    if (location === '/staff/pipeline') load();
  }, [location, load]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-3">Sales Pipeline</h2>
      {error && <div className="text-red-600">Error: {error}</div>}
      <div className="grid grid-cols-3 gap-3">
        {lanes.map(l => (
          <div key={l.id} className="border rounded p-3">
            <div className="flex justify-between mb-2">
              <div className="font-medium">{l.name}</div>
              <div className="text-sm opacity-60">{(cardsByLane[l.id]||[]).length} cards</div>
            </div>
            <div className="space-y-2">
              {(cardsByLane[l.id]||[]).slice(0,12).map(c => (
                <button key={c.id} onClick={()=>open(c.id)} className="w-full text-left border rounded p-2 hover:bg-gray-50">
                  <div className="font-medium">{c.businessName}</div>
                  <div className="text-xs opacity-70">{c.status} · ${c.amount ?? 0}</div>
                </button>
              ))}
              {(!cardsByLane[l.id]||cardsByLane[l.id].length===0) && <div className="text-sm opacity-50">No cards</div>}
            </div>
          </div>
        ))}
      </div>
      {loading && <div className="mt-3 text-sm opacity-60">Loading…</div>}
    </div>
  );
}