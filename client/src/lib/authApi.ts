import { API_BASE } from "../config";

export async function startLogin(email: string, password: string) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (r.status === 202) return r.json();
  if (!r.ok) throw new Error("login_start_failed");
  return r.json();
}

export async function verifyLogin(email: string, code: string) {
  const r = await fetch(`${API_BASE}/auth/login/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!r.ok) throw new Error("login_verify_failed");
  return r.json();
}
