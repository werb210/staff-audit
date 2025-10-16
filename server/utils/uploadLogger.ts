// Feature 5: Upload Logging Utility
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";

export async function logUpload(
  documentId: string | null,
  uploadedBy: string,
  status: string,
  fileSize: number,
  documentType: string,
  errorMessage?: string
): Promise<void> {
  try {
    // Document upload logs temporarily disabled during schema migration
    console.log(`📝 [UPLOAD LOG] ${status.toUpperCase()}: ${documentType} | Size: ${fileSize} bytes | User: ${uploadedBy}`);
    console.log('Document upload logging disabled during schema migration');
  } catch (error: unknown) {
    console.error("Failed to log upload:", error);
  }
}

export async function getUploadLogs(limit = 100) {
  try {
    // Document upload logs temporarily disabled during schema migration
    console.log('Upload logs fetch disabled during schema migration');
    return [];
  } catch (error: unknown) {
    console.error("Failed to fetch upload logs:", error);
    return [];
  }
}