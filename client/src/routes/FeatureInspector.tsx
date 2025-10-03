import React, { useEffect, useState } from "react";
type FeatureId =
  | "pipeline"
  | "banking-analysis"
  | "credit-summary"
  | "lenders"
  | "voice-dialer"
  | "ads-analytics"
  | "pdf-generator"
  | "presence-monitoring";

type FeatureRow = {
  id: FeatureId;
  label: string;
  routes: string[];
  apis: string[];
  expectsAction: boolean;
  expectsOutput: boolean;
  options?: Record<string, unknown>;
  connected: boolean;
  gaps: { actionMissing: boolean; outputMissing: boolean; };
  wiring?: { lastMountAt?: number; hasActionButton?: boolean; hasVisibleOutput?: boolean; };
};

export default function FeatureInspector() {
  const [rows, setRows] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/features");
      const json = await res.json();
      setRows(json.features || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Feature Inspector</h1>
      <p className="text-sm text-gray-500 mb-6">
        Shows which features are installed, whether they expose actions (buttons) and outputs (panels),
        and what server APIs/routes they expect.
      </p>

      {loading ? <div>Loading…</div> : (
        <table className="w-full text-sm border rounded overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Feature</th>
              <th className="text-left p-2">Client Routes</th>
              <th className="text-left p-2">Server APIs</th>
              <th className="text-center p-2">Action</th>
              <th className="text-center p-2">Output</th>
              <th className="text-center p-2">Status</th>
              <th className="text-left p-2">Options</th>
              <th className="text-left p-2">Last Mount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const last = r.wiring?.lastMountAt ? new Date(r.wiring.lastMountAt).toLocaleString() : "—";
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">{r.label}<div className="text-xs text-gray-500">{r.id}</div></td>
                  <td className="p-2">{r.routes.join(", ") || "—"}</td>
                  <td className="p-2">{r.apis.join(", ") || "—"}</td>
                  <td className="p-2 text-center">
                    {r.expectsAction ? (r.wiring?.hasActionButton ? "✅" : "❌") : "—"}
                  </td>
                  <td className="p-2 text-center">
                    {r.expectsOutput ? (r.wiring?.hasVisibleOutput ? "✅" : "❌") : "—"}
                  </td>
                  <td className="p-2 text-center">
                    {r.connected ? "🟢 Connected" : "🟠 Needs wiring"}
                  </td>
                  <td className="p-2">
                    {r.id === "banking-analysis" ? (
                      <BankingVerbosity id={r.id} current={(r.options?.verbosity as string) || "normal"} />
                    ) : "—"}
                  </td>
                  <td className="p-2">{last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="mt-6 text-xs text-gray-500">
        Tip: mark buttons with <code>reportFeatureMount(id, {`{ hasActionButton: true }`})</code> and render panels with <code>hasVisibleOutput: true</code>.
      </div>
    </div>
  );
}

function BankingVerbosity(props: { id: FeatureId; current: string }) {
  const [value, setValue] = React.useState(props.current);
  async function save() {
    await fetch("/api/features/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: props.id, key: "verbosity", value })
    });
  }
  return (
    <div className="flex items-center gap-2">
      <select className="border rounded px-2 py-1" value={value} onChange={e => setValue(e.target.value)}>
        <option value="normal">normal</option>
        <option value="verbose">verbose</option>
      </select>
      <button className="border rounded px-2 py-1" onClick={save}>Save</button>
    </div>
  );
}