export async function gadsStatus() {
  const r = await fetch("/api/ads/google/status", {});
  return r.json();
}