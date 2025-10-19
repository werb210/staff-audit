import { API_BASE } from "../config";
import { createPortal } from "react-dom";
import { loadTwilioSdk } from "./loadTwilioSdk";

export default function DialerFab() {
  const openDialer = async () => {
    console.log("[Dialer] FAB clicked");
    try {
      await loadTwilioSdk();
      const response = await fetch(`${API_BASE}/twilio/token");
      const data = await response.json();
      const token = data.token || data;
      new (window as any).Twilio.Device(token, { codecPreferences: ["opus","pcmu"] });
      console.log("[Dialer] Twilio Device initialized");
      window.dispatchEvent(new CustomEvent("dialer:open"));
    } catch (e) {
      console.error("[Dialer] init failed", e);
      // Show user-friendly error without exposing technical details
      alert("Dialer temporarily unavailable. Please try again.");
    }
  };

  const btn = (
    <button
      data-testid="dialer-fab"
      onClick={openDialer}
      aria-label="Open Dialer"
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        zIndex: 2147483647,     // above everything
        pointerEvents: "auto",
        width: 56, height: 56, borderRadius: 9999
      }}
      className="bg-green-500 text-white shadow-lg hover:bg-green-600 active:bg-green-700 transition-colors"
    >
      📞
    </button>
  );
  
  if (typeof document === "undefined") return null;
  return createPortal(btn, document.body);
}