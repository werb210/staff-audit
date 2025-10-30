import React, { useEffect, useState } from "react";

export default function DialerDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("open-dialer", onOpen);
    window.addEventListener("close-dialer", onClose);
    return () => {
      window.removeEventListener("open-dialer", onOpen);
      window.removeEventListener("close-dialer", onClose);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "380px",
        transform: `translateX(${open ? 0 : 420}px)`,
        transition: "transform .25s ease",
        background: "#fff",
        borderLeft: "1px solid #e5e7eb",
        boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        zIndex: 2147483646,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <strong>Dialer</strong>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("close-dialer"))}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: 12, gap: 8, display: "grid" }}>
        <input placeholder="Number e.g. +15551234567" className="input" />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary">Call</button>
          <button className="btn">Mute</button>
          <button className="btn">Hold</button>
        </div>
        <div className="text-xs text-gray-500">
          * Wire this to your existing call API/Twilio client; UI is mounted &
          visible.
        </div>
      </div>
    </div>
  );
}
