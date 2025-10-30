// client/src/api/apps.ts
import { apiRequest as api } from "@/lib/queryClient";

export async function getApp(id: string) {
  return api(`/api/apps/${id}`);
}

export async function deleteApp(id: string) {
  return api(`/api/apps/${id}`, { method: "DELETE" });
}

export const getBanking = (id: string) => api(`/api/apps/${id}/bank/metrics`);
export const getFinancials = (id: string) => api(`/api/apps/${id}/financials`);
export const getDocs = (id: string) => api(`/api/apps/${id}/documents`);

export const acceptDoc = (id: string, docId: string) =>
  api(`/api/apps/${id}/documents/${docId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "accepted" }),
  });

export const rejectDoc = (id: string, docId: string, reason = "") =>
  api(`/api/apps/${id}/documents/${docId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "rejected", reason }),
  });

export const uploadDoc = (id: string, file: File, category: string) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("category", category);
  return api(`/api/apps/${id}/documents`, {
    method: "POST",
    body: fd,
    headers: {},
  });
};

export const downloadAll = (id: string) =>
  window.location.assign(`/api/apps/${id}/documents.zip`);

export const lookupPhone = (phone: string) =>
  api(`/api/lookup/phone?phone=${encodeURIComponent(phone)}`);

export const getMatches = (id: string) => api(`/api/apps/${id}/lender/match`);

export const sendToLender = (
  id: string,
  lenderId: string,
  channel: "o365" | "api",
) =>
  api(`/api/apps/${id}/lender/send`, {
    method: "POST",
    body: JSON.stringify({
      lenderId,
      method: channel === "o365" ? "email" : "api",
    }),
  });
