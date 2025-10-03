import express from "express";
import multer from "multer";
import { uploadToS3 } from "../utils/s3Upload";
import { db } from "../db";
import { documents } from "../../shared/schema";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload/:applicationId", upload.single("document"), async (req: any, res: any) => {
  const { applicationId } = req.params;
  const documentType = req.body.documentType;
  const file = req.file;

  if (!file || !documentType || !applicationId) {
    return res.status(400).json({ success: false, message: "Missing file, type, or applicationId" });
  }

  try {
    console.log("🔄 [RETRY UPLOAD] S3 upload starting...");
    const s3Result = await uploadToS3(applicationId, file); // must throw if S3 fails
    console.log("✅ [RETRY UPLOAD] S3 upload successful:", s3Result);

    // Validate S3 result completeness
    if (!s3Result || !s3Result.storageKey || !s3Result.checksum) {
      throw new Error("❌ S3 upload failed — result is incomplete or fallback still triggered");
    }

    // Save document metadata to database 
    const documentId = uuidv4();
    console.log("💾 [RETRY UPLOAD] Saving to database...");
    
    // Use working database approach from existing routes
    await db.insert(documents).values({
      id: documentId,
      applicationId,
      documentType: documentType as any,
      fileName: file.originalname,
      fileSize: file.size,
      checksum: s3Result.checksum,
      storageKey: s3Result.storageKey,
      uploadedBy: 'public-api',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("✅ [S3 UPLOAD SUCCESS] Document uploaded and saved:", documentId);
    
    return res.json({
      success: true,
      fallback: false,
      documentId,
      filename: file.originalname,
      storageKey: s3Result.storageKey,
      checksum: s3Result.checksum,
      storage: "s3",
      status: "success",
    });
  } catch (err) {
    console.error("❌ [S3 UPLOAD FAILED] - Error:", (err as Error).message);
    // NO FALLBACK - fail completely
    return res.status(500).json({ 
      success: false, 
      fallback: false, // NEVER return fallback: true
      message: "S3 upload failed — aborting with no fallback",
      error: (err as Error).message
    });
  }
});

export default router;