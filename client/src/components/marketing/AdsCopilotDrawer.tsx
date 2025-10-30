import React, { useEffect, useState } from "react";

export default function AdsCopilotDrawer({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: any;
}) {
  const [tab, setTab] = useState<
    "explain" | "copy" | "negatives" | "assets" | "rebalance"
  >("explain");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(path: string, body?: any, method = "POST") {
    setBusy(true);
    setOut("");
    const res = await fetch(`/api/ads-analytics${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await res.json();
    setBusy(false);
    setOut(j?.text || JSON.stringify(j, null, 2));
  }
  useEffect(() => {
    if (open) {
      setTab("explain");
      setOut("");
    }
  }, [open]);

  return !open ? null : (
    <div className="fixed inset-0 z-[1200]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 inset-y-0 w-[640px] max-w-[95vw] bg-white border-l shadow-xl flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">🤖 Ads Copilot</div>
          <button
            onClick={onClose}
            className="px-2 py-1 border rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
        <div className="px-3 pt-2 flex gap-2 text-sm">
          {["explain", "copy", "negatives", "assets", "rebalance"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t as any);
                setOut("");
              }}
              className={
                "px-2 py-1 rounded " +
                (tab === t
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-gray-50")
              }
            >
              {String(t).toUpperCase()}
            </button>
          ))}
        </div>
        <div className="p-4 overflow-auto grow text-sm">
          {tab === "explain" && (
            <div>
              <p className="mb-2 text-gray-600">
                Explain recent changes and suggest actions.
              </p>
              <button
                onClick={() => run("/ai/explain", context)}
                disabled={busy}
                className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {busy ? "Analyzing..." : "🧠 Analyze Performance"}
              </button>
              {out && (
                <div className="mt-3 p-3 bg-gray-50 rounded whitespace-pre-wrap">
                  {out}
                </div>
              )}
            </div>
          )}
          {tab === "copy" && (
            <div>
              <p className="mb-2 text-gray-600">Generate ad copy with AI.</p>
              <div className="space-y-2 mb-3">
                <input
                  id="product"
                  placeholder="Product (e.g., business loans)"
                  className="w-full p-2 border rounded"
                />
                <input
                  id="audience"
                  placeholder="Target audience"
                  className="w-full p-2 border rounded"
                />
                <input
                  id="tone"
                  placeholder="Tone (optional)"
                  className="w-full p-2 border rounded"
                />
                <input
                  id="lp"
                  placeholder="Landing page URL (optional)"
                  className="w-full p-2 border rounded"
                />
              </div>
              <button
                onClick={() => {
                  const product =
                    (document.getElementById("product") as HTMLInputElement)
                      ?.value || "business financing";
                  const audience =
                    (document.getElementById("audience") as HTMLInputElement)
                      ?.value || "small business owners";
                  const tone =
                    (document.getElementById("tone") as HTMLInputElement)
                      ?.value || "professional, trustworthy";
                  const lp =
                    (document.getElementById("lp") as HTMLInputElement)
                      ?.value || "";
                  run("/ai/copy", { product, audience, tone, lp });
                }}
                disabled={busy}
                className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {busy ? "Writing..." : "✍️ Generate Copy"}
              </button>
              {out && (
                <div className="mt-3 p-3 bg-gray-50 rounded whitespace-pre-wrap font-mono text-xs">
                  {out}
                </div>
              )}
            </div>
          )}
          {tab === "negatives" && (
            <div>
              <p className="mb-2 text-gray-600">
                Find smart negative keywords.
              </p>
              <button
                onClick={() => run("/negatives", {}, "GET")}
                disabled={busy}
                className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
              >
                {busy ? "Analyzing..." : "🚫 Find Negatives"}
              </button>
              {out && (
                <div className="mt-3 p-3 bg-gray-50 rounded whitespace-pre-wrap text-xs">
                  {out}
                </div>
              )}
            </div>
          )}
          {tab === "assets" && (
            <div>
              <p className="mb-2 text-gray-600">
                Check for asset gaps in PMax campaigns.
              </p>
              <button
                onClick={() =>
                  run("/ai/assets", { assets: context?.assets || [] })
                }
                disabled={busy}
                className="px-3 py-1 bg-purple-600 text-white rounded disabled:opacity-50"
              >
                {busy ? "Checking..." : "🖼️ Check Assets"}
              </button>
              {out && (
                <div className="mt-3 p-3 bg-gray-50 rounded whitespace-pre-wrap">
                  {out}
                </div>
              )}
            </div>
          )}
          {tab === "rebalance" && (
            <div>
              <p className="mb-2 text-gray-600">Suggest budget rebalancing.</p>
              <input
                id="target"
                type="number"
                placeholder="Monthly target ($)"
                className="w-full p-2 border rounded mb-2"
              />
              <button
                onClick={() => {
                  const target =
                    Number(
                      (document.getElementById("target") as HTMLInputElement)
                        ?.value,
                    ) || 10000;
                  run("/rebalance", {
                    campaigns: context?.campaigns || [],
                    monthlyTarget: target,
                  });
                }}
                disabled={busy}
                className="px-3 py-1 bg-orange-600 text-white rounded disabled:opacity-50"
              >
                {busy ? "Computing..." : "💰 Rebalance Budget"}
              </button>
              {out && (
                <div className="mt-3 p-3 bg-gray-50 rounded whitespace-pre-wrap text-xs">
                  {out}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
