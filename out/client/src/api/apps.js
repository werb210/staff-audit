// client/src/api/apps.ts
import { apiRequest as api } from "@/lib/queryClient";
export async function getApp(id) {
    return api(`/api/apps/${id}`);
}
export async function deleteApp(id) {
    return api(`/api/apps/${id}`, { method: "DELETE" });
}
export const getBanking = (id) => api(`/api/apps/${id}/bank/metrics`);
export const getFinancials = (id) => api(`/api/apps/${id}/financials`);
export const getDocs = (id) => api(`/api/apps/${id}/documents`);
export const acceptDoc = (id, docId) => api(`/api/apps/${id}/documents/${docId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "accepted" }),
});
export const rejectDoc = (id, docId, reason = "") => api(`/api/apps/${id}/documents/${docId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "rejected", reason }),
});
export const uploadDoc = (id, file, category) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    return api(`/api/apps/${id}/documents`, {
        method: "POST",
        body: fd,
        headers: {},
    });
};
export const downloadAll = (id) => window.location.assign(`/api/apps/${id}/documents.zip`);
export const lookupPhone = (phone) => api(`/api/lookup/phone?phone=${encodeURIComponent(phone)}`);
export const getMatches = (id) => api(`/api/apps/${id}/lender/match`);
export const sendToLender = (id, lenderId, channel) => api(`/api/apps/${id}/lender/send`, {
    method: "POST",
    body: JSON.stringify({
        lenderId,
        method: channel === "o365" ? "email" : "api",
    }),
});
