import React from "react";
const MODS = import.meta.glob("./**/Dashboard*.tsx");

export default function DashboardGallery(){
  console.log("[DashboardGallery] Component loaded, found modules:", Object.keys(MODS));
  const keys = Object.keys(MODS).sort((a,b)=>a.localeCompare(b));
  const setDefault = (k:string) => {
    localStorage.setItem("DASHBOARD_IMPL", k);
    location.href = "/dashboard";
  };
  const openOnce = (k:string) => {
    const name = k.split("/").pop()?.replace(/\.tsx?$/,"") || k;
    location.href = "/dashboard?dash=" + encodeURIComponent(name);
  };
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Select a Dashboard Variant</h1>
      <p className="text-sm text-gray-600 mt-2">Pick which implementation to use as default, or open one-time.</p>
      <div className="mt-4 space-y-2">
        {keys.map(k => (
          <div key={k} className="flex items-center justify-between border rounded p-3">
            <code className="text-xs">{k}</code>
            <div className="space-x-2">
              <button className="btn btn-secondary" onClick={()=>openOnce(k)}>Open once</button>
              <button className="btn btn-primary" onClick={()=>setDefault(k)}>Set as default</button>
            </div>
          </div>
        ))}
      </div>
      {!keys.length && <div className="text-sm mt-4 text-red-600">No Dashboard*.tsx files found under /pages.</div>}
    </div>
  );
}
