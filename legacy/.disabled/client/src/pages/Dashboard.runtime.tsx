import React, { lazy, Suspense, useMemo } from "react";

// Discover *all* dashboard components at build-time
// Examples it will match: ./Dashboard.tsx, ./DashboardPro.tsx, ./dashboard/Dashboard.tsx, etc.
const MODS = import.meta.glob("./**/Dashboard*.tsx");

function pickKey(keys: string[], hintRaw: string | null): string | null {
  const hint = (hintRaw || "").toLowerCase().trim();
  // 1) direct match by substring of the path
  if (hint) {
    const k = keys.find(k => k.toLowerCase().includes(hint));
    if (k) return k;
  }
  // 2) heuristics for "full" dashboards
  const prefs = ["pro", "full", "main", "advanced"];
  for (const p of prefs) {
    const k = keys.find(k => k.toLowerCase().includes(p));
    if (k) return k;
  }
  // 3) fallback to the longest file (often the most complete)
  return keys.sort((a, b) => b.length - a.length)[0] || null;
}

export default function DashboardRuntime(){
  const keys = useMemo(()=>Object.keys(MODS),[]);
  const params = new URLSearchParams(location.search);
  // order of precedence: ?dash=… → localStorage → heuristic
  const qp = params.get("dash");
  const saved = (typeof window !== "undefined" && window.localStorage)
    ? localStorage.getItem("DASHBOARD_IMPL") || "" : "";
  const pick = useMemo(()=> pickKey(keys, qp || saved), [keys, qp, saved]);

  // If nothing found, show chooser hint
  if (!keys.length) {
    return <div className="p-6">
      <h1 className="text-lg font-semibold">No dashboards found</h1>
      <p className="text-sm text-gray-600 mt-2">Create a dashboard page matching <code>Dashboard*.tsx</code>.</p>
    </div>;
  }
  if (!pick) {
    return <div className="p-6">
      <h1 className="text-lg font-semibold">Multiple dashboards detected</h1>
      <p className="text-sm text-gray-600 mt-2">
        Open <a className="underline" href="/dashboards">/dashboards</a> to pick one, or add <code>?dash=name</code> to the URL.
      </p>
      <ul className="mt-3 text-sm list-disc pl-6">
        {keys.map(k => <li key={k}>{k}</li>)}
      </ul>
    </div>;
  }

  const Lazy = lazy(MODS[pick] as any);
  // eslint-disable-next-line no-console
  console.log("[dashboard] selected:", pick);
  return (
    <Suspense fallback={<div className="p-6">Loading dashboard…</div>}>
      <Lazy />
    </Suspense>
  );
}
