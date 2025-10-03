import React from "react";

export default function BuildRibbon() {
  const [v, setV] = React.useState<string>("");
  
  React.useEffect(() => {
    fetch("/__version", { cache: "no-store" })
      .then(r => r.json()).then(j => setV(`${j.app}@${j.build}`))
      .catch(() => setV("unknown"));
  }, []);
  
  return (
    <div style={{
      position: "fixed",
      left: 8, bottom: 8, zIndex: 2000,
      background: "#111827", color: "#fff",
      fontSize: 12, padding: "4px 8px",
      borderRadius: 6, opacity: 0.85
    }}>
      {v || "…loading version"}
    </div>
  );
}