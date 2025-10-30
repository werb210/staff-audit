// V1 API for application document uploads - AUTHORITATIVE ENDPOINT (PUBLIC ACCESS)
import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
// S3 Configuration - Best Practices
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ca-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    // Best practice: Force path style for compatibility
    forcePathStyle: false,
    // Best practice: Retry configuration
    maxAttempts: 3
});
// S3 Bucket - Following established environment variable hierarchy
const BUCKET_NAME = process.env.CORRECT_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'boreal-documents';
// AUTHORITATIVE ENDPOINT: POST /api/v1/applications/:id/docs
router.post("/api/v1/applications/:id/docs", upload.single("file"), async (req, res) => {
    try {
        const applicationId = req.params.id;
        const documentType = req.body.document_type || 'other';
        const file = req.file;
        console.log(`📝 [V1-DOCS] Document upload request for application ${applicationId}`);
        if (!file) {
            return res.status(400).json({
                success: false,
                error: "No file provided"
            });
        }
        // Validate document type enum
        const validDocTypes = [
            'bank_statements', 'financial_statements', 'tax_returns',
            'business_license', 'articles_of_incorporation',
            'account_prepared_financials', 'pnl_statement', 'other'
        ];
        if (!validDocTypes.includes(documentType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}`
            });
        }
        // Generate unique S3 key
        const documentId = crypto.randomUUID();
        const timestamp = new Date().toISOString().slice(0, 10);
        const s3Key = `applications/${applicationId}/documents/${timestamp}/${documentId}-${file.originalname}`;
        // Upload to S3 - Best Practices
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
            // Best practice: Server-side encryption
            ServerSideEncryption: 'AES256',
            // Best practice: Cache control for documents
            CacheControl: 'max-age=31536000', // 1 year cache
            Metadata: {
                'application-id': applicationId,
                'document-type': documentType,
                'original-name': file.originalname,
                'created-at': new Date().toISOString()
            }
        };
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        // Log to documents table (using raw SQL for compatibility)
        const { Pool } = await import("pg");
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query(`
      INSERT INTO documents (
        id, applicationId, document_type, name, file_path, 
        size, mime_type, status, uploaded_by, createdAt
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'v1-api', NOW())
    `, [
            documentId, applicationId, documentType, file.originalname,
            s3Key, file.size, file.mimetype
        ]);
        console.log(`✅ [V1-DOCS] Document ${documentId} uploaded successfully to S3: ${s3Key}`);
        res.status(201).json({
            success: true,
            document: {
                id: documentId,
                applicationId: applicationId,
                document_type: documentType,
                name: file.originalname,
                size: file.size,
                s3_key: s3Key,
                status: 'pending',
                createdAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error(`❌ [V1-DOCS] Document upload error:`, error);
        res.status(500).json({
            success: false,
            error: "Document upload failed",
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
    }
});
// GET /api/v1/applications/:id/docs - List documents for application
router.get("/api/v1/applications/:id/docs", async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { Pool } = await import("pg");
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const result = await pool.query(`
      SELECT id, document_type, name, size, status, createdAt as uploaded_at 
      FROM documents 
      WHERE applicationId = $1 
      ORDER BY createdAt DESC
    `, [applicationId]);
        res.json({
            success: true,
            documents: result.rows
        });
    }
    catch (error) {
        console.error(`❌ [V1-DOCS] Document list error:`, error);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve documents"
        });
    }
});
// Generate presigned upload URL (alternative method)
router.post("/api/v1/applications/:id/docs/presigned", async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { fileName, documentType, contentType } = req.body;
        if (!fileName || !documentType) {
            return res.status(400).json({
                success: false,
                error: "fileName and documentType are required"
            });
        }
        const documentId = crypto.randomUUID();
        const timestamp = new Date().toISOString().slice(0, 10);
        const s3Key = `applications/${applicationId}/documents/${timestamp}/${documentId}-${fileName}`;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            ContentType: contentType,
            Metadata: {
                'application-id': applicationId,
                'document-type': documentType
            }
        });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({
            success: true,
            presignedUrl,
            s3Key,
            documentId
        });
    }
    catch (error) {
        console.error(`❌ [V1-DOCS] Presigned URL error:`, error);
        res.status(500).json({
            success: false,
            error: "Failed to generate presigned URL"
        });
    }
});
export default router;
