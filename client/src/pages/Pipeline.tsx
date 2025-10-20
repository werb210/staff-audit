import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function Pipeline() {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/pipeline/cards`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div>
      <h2>Sales Pipeline</h2>
      <ul>
        {data.map((c) => (
          <li key={c.id}>
            {c.stage}: {c.businessName} (${c.amount})
          </li>
        ))}
      </ul>
    </div>
  );
}
