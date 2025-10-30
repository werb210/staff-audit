import axios from "axios";

const STAFF_API = import.meta.env.VITE_STAFF_API || "";

/**
 * Upload a document to the Staff server which will proxy to S3
 * This implements the Client → Staff → S3 proxy upload flow
 */
export async function uploadDocument(
  file: File,
  opts?: {
    documentType?: string;
    lenderProductId?: number;
    applicationId?: string;
    externalId?: string;
  },
) {
  const formData = new FormData();
  formData.append("file", file);

  if (opts?.documentType) formData.append("documentType", opts.documentType);
  if (opts?.lenderProductId)
    formData.append("lenderProductId", String(opts.lenderProductId));
  if (opts?.applicationId) formData.append("applicationId", opts.applicationId);
  if (opts?.externalId) formData.append("externalId", opts.externalId);

  const { data } = await axios.post(
    `${STAFF_API}/api/documents/upload`,
    formData,
    {
      withCredentials: true,
      headers: {
        "X-Upload-Token": localStorage.getItem("uploadToken") || "",
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data as {
    ok: true;
    externalId: string;
    applicationId?: string;
    url?: string;
    document: any;
  };
}

/**
 * Link uploaded documents to an application
 */
export async function linkDocumentsToApplication(
  applicationId: string,
  opts: {
    documentIds?: string[];
    uploadToken?: string;
  },
) {
  const { data } = await axios.post(
    `${STAFF_API}/api/documents/link-to-application`,
    {
      applicationId,
      documentIds: opts.documentIds,
      uploadToken: opts.uploadToken,
    },
    {
      withCredentials: true,
    },
  );

  return data as {
    ok: true;
    linkedDocuments: number;
    applicationId: string;
  };
}

/**
 * Get documents for an application
 */
export async function getDocuments(applicationId: string) {
  const { data } = await axios.get(
    `${STAFF_API}/api/documents?applicationId=${encodeURIComponent(applicationId)}`,
    {
      withCredentials: true,
    },
  );

  return data as {
    ok: true;
    documents: Array<{
      id: string;
      externalId: string;
      type: string;
      filename: string;
      size: number;
      createdAt: string;
      url?: string;
    }>;
    count: number;
  };
}

/**
 * Generate or get the upload token for this session
 */
export function getOrCreateUploadToken(): string {
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
export function clearUploadToken(): void {
  localStorage.removeItem("uploadToken");
}
