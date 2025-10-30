import { getTwilioDevice } from "@/lib/twilioDevice";

export function DialerFab() {
  const onClick = async () => {
    console.log("[Dialer] FAB clicked");

    // Show immediate feedback
    const loadingToast = document.createElement("div");
    loadingToast.textContent = "📞 Initializing dialer...";
    loadingToast.style.cssText =
      "position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 12px; border-radius: 8px; z-index: 1000;";
    document.body.appendChild(loadingToast);

    try {
      console.log("[Dialer] Initializing device...");

      const device = await getTwilioDevice();

      // Set up device event handlers
      device.on("ready", () => {
        console.log("[Dialer] Device ready for calls");
        loadingToast.textContent = "✅ Dialer ready!";
        setTimeout(() => document.body.removeChild(loadingToast), 2000);
      });

      device.on("error", (error: any) => {
        console.error("[Dialer] Device error:", error);
        const errorMsg = error?.message || error?.toString() || "Unknown error";
        loadingToast.textContent = `❌ Device error: ${errorMsg}`;
        loadingToast.style.background = "#ef4444";
        setTimeout(() => document.body.removeChild(loadingToast), 5000);
      });

      device.on("connect", () => {
        console.log("[Dialer] Call connected");
      });

      device.on("disconnect", () => {
        console.log("[Dialer] Call disconnected");
      });

      console.log("[Dialer] Device initialized successfully");
    } catch (e) {
      console.error("[Dialer] Initialization failed:", e);
      const errorMsg = (e as any)?.message || String(e) || "Unknown error";
      loadingToast.textContent = `❌ Dialer failed: ${errorMsg}`;
      loadingToast.style.background = "#ef4444";

      // Provide troubleshooting info
      if (errorMsg.includes("timeout")) {
        loadingToast.textContent += " (Check network connection)";
      } else if (errorMsg.includes("WebSocket")) {
        loadingToast.textContent += " (WebSocket blocked by firewall)";
      }

      setTimeout(() => {
        if (document.body.contains(loadingToast)) {
          document.body.removeChild(loadingToast);
        }
      }, 8000);
    }
  };
  return (
    <div style={{ position: "fixed", right: 24, bottom: 24 }}>
      <button
        onClick={onClick}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 8px 20px rgba(0,0,0,.2)",
          backgroundColor: "#10b981",
          color: "white",
          fontSize: "24px",
        }}
        aria-label="Open dialer"
      >
        📞
      </button>
      <p id="dialer-status" className="mt-2 text-sm text-gray-500 text-center">
        Idle
      </p>
    </div>
  );
}
