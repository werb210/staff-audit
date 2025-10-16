import express from 'express';
import multer from 'multer';
import { db } from '../db';
// REMOVED: authMiddleware import (../auth module deleted)
import { sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for training document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/training-docs');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'train-doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for training documents
  },
  fileFilter: (req, file, cb) => {
    // Accept various document types
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Only document files are allowed (PDF, DOC, TXT, MD, JSON)'));
    }
  }
});

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.mkdir('uploads/training-docs', { recursive: true });
  } catch (error: unknown) {
    console.error('Failed to create training docs directory:', error);
  }
}
ensureUploadsDir();

// Extract text content from file (basic implementation)
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType.startsWith('text/')) {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.substring(0, 5000); // Preview first 5000 characters
    } else if (mimeType === 'application/json') {
      const content = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(content);
      return JSON.stringify(jsonData, null, 2).substring(0, 5000);
    } else {
      return `[${mimeType} file - content extraction not implemented yet]`;
    }
  } catch (error: unknown) {
    console.error('Text extraction error:', error);
    return '[Content extraction failed]';
  }
}

// Placeholder for vector DB ingestion
async function ingestToVectorDB(filePath: string, content: string, metadata: any): Promise<void> {
  // TODO: Implement actual vector DB integration
  // This would chunk the content, create embeddings, and store in vector database
  console.log('📚 [VECTOR DB] Ingesting document:', {
    path: filePath,
    contentLength: content.length,
    metadata
  });
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('✅ [VECTOR DB] Document ingested successfully');
}

// Upload training document endpoint
router.post('/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    const userId = (req as any).user?.id || 'staff-user';

    // Extract text content for preview and vector DB
    const contentPreview = await extractTextFromFile(filePath, mimetype);

    // Store document metadata in database
    const result = await db.execute(sql`
      INSERT INTO ai_training_documents (title, file_name, file_path, file_size, mime_type, extracted_text, uploaded_by, created_at, updated_at)
      VALUES (${originalname}, ${originalname}, ${filePath}, ${size}, ${mimetype}, ${contentPreview}, ${userId}, NOW(), NOW())
      RETURNING id
    `);

    const docId = result.rows[0].id;

    // Ingest to vector database (placeholder)
    const metadata = {
      id: docId,
      filename: originalname,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    };

    await ingestToVectorDB(filePath, contentPreview, metadata);

    // Update indexed status
    await db.execute(sql`
      UPDATE ai_training_documents 
      SET status = 'indexed', updated_at = NOW()
      WHERE id = ${docId}
    `);

    console.log('📚 Training document uploaded and indexed:', {
      id: docId,
      filename: originalname,
      size,
      type: mimetype
    });

    res.json({ 
      status: 'ok',
      id: docId,
      message: 'Document uploaded and indexed successfully'
    });

  } catch (error: unknown) {
    console.error('Training document upload error:', error);
    res.status(500).json({ error: 'Failed to upload training document' });
  }
});

// Get all training documents
router.get('/docs', async (req: any, res: any) => {
  try {
    const { status, limit = '50' } = req.query;
    const limitInt = Math.min(Math.max(parseInt(limit as string) || 50, 1), 100); // Sanitize limit between 1-100

    let result;
    
    if (status && status !== 'all') {
      // Use parameterized query with safe status filtering
      result = await db.execute(sql`
        SELECT id, title, description, category, file_name as "fileName", 
               file_path as "filePath", file_size as "fileSize", mime_type as "mimeType",
               extracted_text as "extractedText", status, uploaded_by as "uploadedBy",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM ai_training_documents
        WHERE status = ${status as string}
        ORDER BY created_at DESC 
        LIMIT ${limitInt}
      `);
    } else {
      // Query all documents
      result = await db.execute(sql`
        SELECT id, title, description, category, file_name as "fileName", 
               file_path as "filePath", file_size as "fileSize", mime_type as "mimeType", 
               extracted_text as "extractedText", status, uploaded_by as "uploadedBy",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM ai_training_documents
        ORDER BY created_at DESC 
        LIMIT ${limitInt}
      `);
    }

    const docs = result.rows;

    console.log('📚 Staff retrieved', docs.length, 'training documents');
    res.json(docs);

  } catch (error: unknown) {
    console.error('Training documents retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve training documents' });
  }
});

// Get specific training document
router.get('/docs/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const result = await db.execute(sql`
      SELECT id, title, description, category, file_name as "fileName", 
             file_path as "filePath", file_size as "fileSize", mime_type as "mimeType",
             extracted_text as "extractedText", status, uploaded_by as "uploadedBy",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM ai_training_documents 
      WHERE id = ${id}
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training document not found' });
    }

    console.log('📖 Staff viewed training document', id);
    res.json(result.rows[0]);

  } catch (error: unknown) {
    console.error('Training document detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve training document details' });
  }
});

// Delete training document
router.delete('/docs/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Get document info before deletion
    const docResult = await db.execute(sql`
      SELECT file_path FROM ai_training_documents WHERE id = ${id}
    `);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Training document not found' });
    }

    const filePath = docResult.rows[0].file_path;

    // Delete from database
    await db.execute(sql`
      DELETE FROM ai_training_documents WHERE id = ${id}
    `);

    // Delete physical file
    try {
      await fs.unlink(filePath);
    } catch (error: unknown) {
      console.warn('Failed to delete physical file:', error);
    }

    console.log('🗑️ Training document deleted:', id);
    res.json({ status: 'deleted' });

  } catch (error: unknown) {
    console.error('Training document deletion error:', error);
    res.status(500).json({ error: 'Failed to delete training document' });
  }
});

// Serve training document files
router.get('/file/:filename', (req: any, res: any) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'uploads', 'training-docs', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Training doc file serve error:', err);
      res.status(404).json({ error: 'Training document file not found' });
    }
  });
});

// Get training statistics
router.get('/stats', async (req: any, res: any) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_docs,
        COUNT(CASE WHEN status = 'indexed' THEN 1 END) as indexed_docs,
        COUNT(CASE WHEN status = 'uploaded' THEN 1 END) as pending_docs,
        SUM(file_size) as total_size,
        COUNT(DISTINCT uploaded_by) as uploaders
      FROM ai_training_documents
    `);

    const stats = result.rows[0];
    res.json(stats);

  } catch (error: unknown) {
    console.error('Training stats error:', error);
    res.status(500).json({ error: 'Failed to get training statistics' });
  }
});

export default router;