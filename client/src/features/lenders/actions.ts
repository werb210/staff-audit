import { api } from "../../lib/queryClient";
// Note: ApiError moved to avoid circular imports

/** Normalize any common API shapes into an array */
function toArray<T = any>(r: any, keys = ["items", "data", "lenders", "products", "rows", "result"]) {
  for (const k of keys) if (Array.isArray(r?.[k])) return r[k] as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

/** Enhanced API call with proper authentication */
async function apiCall(url: string, options: any = {}) {
  const defaultOptions = {as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  const response = await fetch(url, defaultOptions);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

/** Build query string, omitting defaults to prevent over-filtering */
import { asArray, uniqBy } from "../lib/dedupe";

const qs = (obj: Record<string, any>) =>
  Object.entries(obj)
    .filter(([,v]) => v !== undefined && v !== null && v !== "" && v !== "all")
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

const arr = (r: any, keys = ["items", "data", "lenders", "products", "rows"]) => {
  for (const k of keys) if (Array.isArray(r?.[k])) return r[k];
  return asArray(r);
};

/* ---------- LENDERS ---------- */

export type LenderPayload = {
  name: string;
  website?: string;
  email?: string;
  phone?: string;
  status?: "active" | "inactive" | string;
  // add other optional fields as needed
};

export async function listLenders(params?: { q?: string; status?: string; country?: string; silo?: string; page?: number; limit?: number }) {
  const query = qs({ 
    q: params?.q, 
    status: params?.status, 
    country: params?.country, 
    silo: params?.silo, 
    page: params?.page ?? 1, 
    limit: params?.limit ?? 50 
  });
  const r = await api<any>(`/api/lenders${query ? `?${query}` : ""}`);
  return arr(r, ["lenders", "items", "data"]);
}

export async function createLender(payload: LenderPayload) {
  return api("/api/lenders", {
    method: "POST",
    body: payload,
  });
}

export async function updateLender(id: string, payload: Partial<LenderPayload>) {
  return api(`/api/lenders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
}

/* ---------- LENDER PRODUCTS ---------- */

export type LenderProductPayload = {
  lenderId: string;                 // required to associate
  name: string;
  rate?: number;
  termMonths?: number;
  status?: "active" | "inactive" | string;
  // add optional fields as needed
};

/**
 * Some deployments expose products at:
 *   A) /api/lenders/:lenderId/products (nested)
 *   B) /api/lender-products          (flat, pass lenderId)
 * We try A first; if 404/405, fall back to B safely.
 */
export async function createLenderProduct(payload: LenderProductPayload) {
  try {
    return await api(`/api/lenders/${encodeURIComponent(payload.lenderId)}/products`, {
      method: "POST",
      body: payload,
    });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      return api("/api/lender-products", {
        method: "POST",
        body: payload,
      });
    }
    throw e;
  }
}

export async function updateLenderProduct(id: string, payload: Partial<LenderProductPayload>) {
  return api(`/api/lender-products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
}

/* ---------- LENDER PRODUCTS LIST ---------- */

export async function listLenderProducts(params?: { q?: string; status?: string; lenderId?: string; country?: string; category?: string; silo?: string; page?: number; limit?: number }) {
  const query = qs({ 
    q: params?.q, 
    status: params?.status, 
    lenderId: params?.lenderId, 
    country: params?.country, 
    category: params?.category, 
    silo: params?.silo, 
    page: params?.page ?? 1, 
    limit: params?.limit ?? 50 
  });
  try {
    const r = await api<any>(`/api/lender-products${query ? `?${query}` : ""}`);
    return arr(r, ["products", "items", "data"]);
  } catch (e: any) {
    if ((e.status === 404 || e.status === 405) && params?.lenderId) {
      const r2 = await api<any>(`/api/lenders/${encodeURIComponent(params.lenderId)}/products`);
      return arr(r2, ["products", "items", "data"]);
    }
    throw e;
  }
}