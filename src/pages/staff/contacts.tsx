import { useEffect, useMemo, useState } from "react";

type Contact = {
  id: string|number;
  firstName: string;
  lastName: string;
  email: string|null;
  phone: string|null;
  applicationsCount: number;
  tenant: string;
};

export default function ContactsPage() {
  const [items, setItems] = useState<Contact[]|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = q ? `/api/staff/contacts?tenant=BF&query=${encodeURIComponent(q)}` : `/api/staff/contacts?tenant=BF`;
        const res = await fetch(url, { headers: { "Accept":"application/json" }});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setItems(data);
      } catch (e:any) {
        setErr(e?.message || "Failed to load contacts");
      }
    })();
    return () => { alive = false; };
  }, [q]);

  const first = useMemo(() => (Array.isArray(items) && items.length ? items[0] : null), [items]);

  return (
    <div className="p-4 grid grid-cols-12 gap-4">
      <div className="col-span-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name, email, phone"
          className="w-full border rounded-lg px-3 py-2"
        />
        {err && <div className="mt-2 text-red-600 text-sm">Error: {err}</div>}
        {!items ? (
          <div className="mt-4">Loading contacts...</div>
        ) : items.length === 0 ? (
          <div className="mt-4">No contacts found.</div>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map(c => (
              <li key={String(c.id)} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="font-medium">{c.firstName} {c.lastName}</div>
                <div className="text-xs opacity-75">{c.email || "—"} · {c.phone || "—"}</div>
                <div className="text-xs mt-1">Apps: {c.applicationsCount} · Tenant: {c.tenant}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="col-span-8">
        {!first ? (
          <div className="text-gray-500">Select a contact</div>
        ) : (
          <div className="border rounded-xl p-4">
            <div className="text-xl font-semibold">{first.firstName} {first.lastName}</div>
            <div className="text-sm opacity-75">{first.email || "—"} · {first.phone || "—"}</div>
            <div className="mt-4 text-sm">Applications: {first.applicationsCount}</div>
          </div>
        )}
      </div>
    </div>
  );
}