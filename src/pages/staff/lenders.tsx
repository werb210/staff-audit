import { useEffect, useState } from "react";

type Lender = { id: string|number; name: string; status?: string|null; country?: string|null; categories?: string[]|null };

export default function LendersPage() {
  const [items, setItems] = useState<Lender[]|null>(null);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Get auth token for authenticated API call
        const token = localStorage.getItem('token') || sessionStorage.getItem('bf_auth');
        const headers: HeadersInit = { "Accept": "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch("/api/lenders", { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setItems(data);
      } catch (e:any) {
        setErr(e?.message || "Failed to load lenders");
      }
    })();
    return () => { alive = false; };
  }, []);

  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!items) return <div className="p-4">Loading lenders...</div>;
  if (items.length === 0) return <div className="p-4">No lenders found.</div>;

  return (
    <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(l => (
        <div key={String(l.id)} className="rounded-xl border p-4">
          <div className="font-semibold">{l.name}</div>
          <div className="text-sm text-gray-500">{l.country || "—"}</div>
          {Array.isArray(l.categories) && l.categories.length > 0 && (
            <div className="mt-2 text-xs opacity-75">Categories: {l.categories.join(", ")}</div>
          )}
          <div className="text-xs mt-1">Status: {l.status ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}