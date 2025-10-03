import { useEffect, useState } from "react";

type Prod = { id: string|number; name: string; category?: string|null; status?: string|null; min_amount?: number; max_amount?: number };

export default function LenderProductsPage() {
  const [items, setItems] = useState<Prod[]|null>(null);
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
        const res = await fetch("/api/lender-products", { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setItems(data);
      } catch (e:any) {
        setErr(e?.message || "Failed to load lender products");
      }
    })();
    return () => { alive = false; };
  }, []);

  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!items) return <div className="p-4">Loading products...</div>;
  if (items.length === 0) return <div className="p-4">No products found.</div>;

  return (
    <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(p => (
        <div key={String(p.id)} className="rounded-xl border p-4">
          <div className="font-semibold">{p.name}</div>
          <div className="text-sm text-gray-500">{p.category || "—"}</div>
          <div className="text-xs opacity-75 mt-2">
            {(typeof p.min_amount === "number" || typeof p.max_amount === "number")
              ? <>Range: {p.min_amount ?? 0} – {p.max_amount ?? 0}</>
              : "—"}
          </div>
          <div className="text-xs mt-1">Status: {p.status ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}