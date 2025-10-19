import { API_BASE } from "../config";
export async function gadsStatus() {
  const r = await fetch(`${API_BASE}/ads/google/status", {});
  return r.json();
}