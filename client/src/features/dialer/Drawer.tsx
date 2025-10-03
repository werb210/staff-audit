import { useEffect, useState } from "react";

export default function DialerDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("dialer:open", onOpen);
    return () => window.removeEventListener("dialer:open", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/dialer`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => console.log("[Dialer] WS connected");
      ws.onclose = (e) => console.log("[Dialer] WS closed", e.code);
      ws.onerror = (e) => console.log("[Dialer] WS error", e);
    } catch (e) {
      console.log("[Dialer] WS construct failed", e);
    }
    return () => ws?.close();
  }, [open]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-y-0 right-0 w-96 bg-gray-800 text-white p-4 shadow-xl z-50"
      style={{ zIndex: 1000 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Dialer</h2>
        <button 
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="text-gray-300">
        Dialer interface would go here
      </div>
    </div>
  );
}