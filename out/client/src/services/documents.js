import axios from "axios";
const STAFF_API = import.meta.env.VITE_STAFF_API || "";
/**
 * Upload a document to the Staff server which will proxy to S3
 * This implements the Client → Staff → S3 proxy upload flow
 */
export async function uploadDocument(file, opts) {
    const formData = new FormData();
    formData.append("file", file);
    if (opts?.documentType)
        formData.append("documentType", opts.documentType);
    if (opts?.lenderProductId)
        formData.append("lenderProductId", String(opts.lenderProductId));
    if (opts?.applicationId)
        formData.append("applicationId", opts.applicationId);
    if (opts?.externalId)
        formData.append("externalId", opts.externalId);
    const { data } = await axios.post(`${STAFF_API}/api/documents/upload`, formData, {
        withCredentials: true,
        headers: {
            "X-Upload-Token": localStorage.getItem("uploadToken") || "",
            "Content-Type": "multipart/form-data",
        },
    });
    return data;
}
/**
 * Link uploaded documents to an application
 */
export async function linkDocumentsToApplication(applicationId, opts) {
    const { data } = await axios.post(`${STAFF_API}/api/documents/link-to-application`, {
        applicationId,
        documentIds: opts.documentIds,
        uploadToken: opts.uploadToken,
    }, {
        withCredentials: true,
    });
    return data;
}
/**
 * Get documents for an application
 */
export async function getDocuments(applicationId) {
    const { data } = await axios.get(`${STAFF_API}/api/documents?applicationId=${encodeURIComponent(applicationId)}`, {
        withCredentials: true,
    });
    return data;
}
/**
 * Generate or get the upload token for this session
 */
export function getOrCreateUploadToken() {
    let token = localStorage.getItem("uploadToken");
    if (!token) {
        token = `tok-${crypto.randomUUID()}`;
        localStorage.setItem("uploadToken", token);
    }
    return token;
}
/**
 * Clear the upload token (usually after successful application submission)
 */
export function clearUploadToken() {
    localStorage.removeItem("uploadToken");
}
