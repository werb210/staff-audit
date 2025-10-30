import express from 'express';
import multer from 'multer';
import { db } from '../db';
import { users } from '../../shared/schema';
// REMOVED: authMiddleware import (../auth module deleted)
import { eq, desc, sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/screenshots');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'screenshot-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.mkdir('uploads/screenshots', { recursive: true });
  } catch (error: unknown) {
    console.error('Failed to create uploads directory:', error);
  }
}
ensureUploadsDir();

// Client endpoint - Submit feedback with optional screenshot
router.post('/', upload.single('screenshot'), async (req: any, res: any) => {
  try {
    const { userId, text, conversation } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const screenshotPath = req.file ? req.file.path : null;
    
    // Direct SQL insert to avoid schema conflicts
    const result = await db.execute(sql`
      INSERT INTO feedback (user_id, text, conversation, metadata, status, createdAt, updatedAt)
      VALUES (${userId || null}, ${text}, ${conversation || null}, ${screenshotPath ? JSON.stringify({ screenshotPath }) : null}, 'new', NOW(), NOW())
      RETURNING id
    `);
    
    const newFeedback = [{ id: result.rows[0].id }];

    console.log('📝 Feedback received:', {
      id: newFeedback[0].id,
      userId,
      hasScreenshot: !!screenshotPath,
      textLength: text.length
    });

    res.json({ 
      status: 'ok',
      id: newFeedback[0].id
    });

  } catch (error: unknown) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Staff endpoint - Get all feedback reports (NO AUTH - Auth system removed)
router.get('/', async (req: any, res: any) => {
  try {
    const { status, limit = '50' } = req.query;
    
    // Use Drizzle query builder for type safety and SQL injection protection
    let query = db
      .select({
        id: feedback.id,
        userId: feedback.userId,
        text: feedback.text,
        conversation: feedback.conversation,
        status: feedback.status,
        category: feedback.category,
        priority: feedback.priority,
        assignedTo: feedback.assignedTo,
        resolution: feedback.resolution,
        tags: feedback.tags,
        metadata: feedback.metadata,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        resolvedAt: feedback.resolvedAt
      })
      .from(feedback);
    
    if (status && status !== 'all') {
      query = query.where(eq(feedback.status, status as string));
    }
    
    const limitNum = parseInt(limit as string);
    query = query.orderBy(desc(feedback.createdAt)).limit(limitNum);
    
    const reports = await query;

    console.log('📊 Staff retrieved', reports.length, 'feedback reports');
    res.json(reports);

  } catch (error: unknown) {
    console.error('Feedback retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback reports' });
  }
});

// Staff endpoint - Get specific feedback report (NO AUTH - Auth system removed)
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const result = await db.execute(sql`
      SELECT id, user_id as "userId", text, conversation, status, category, priority,
             assigned_to as "assignedTo", resolution, tags, metadata,
             createdAt as "createdAt", updatedAt as "updatedAt", resolved_at as "resolvedAt"
      FROM feedback 
      WHERE id = ${parseInt(id)}
      LIMIT 1
    `);
    const reports = result.rows;

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reports[0];
    
    // Parse metadata to get screenshot path
    let screenshotPath = null;
    if (report.metadata) {
      try {
        const metadata = JSON.parse(report.metadata);
        screenshotPath = metadata.screenshotPath;
      } catch (e) {
        console.warn('Failed to parse metadata:', e);
      }
    }

    console.log('📖 Staff viewed feedback report', id);
    
    res.json({
      ...report,
      screenshotPath
    });

  } catch (error: unknown) {
    console.error('Feedback detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback details' });
  }
});

// Serve screenshot images
router.get('/screenshot/:filename', (req: any, res: any) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'uploads', 'screenshots', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Screenshot serve error:', err);
      res.status(404).json({ error: 'Screenshot not found' });
    }
  });
});

// Staff endpoint - Update feedback status (NO AUTH - Auth system removed)
router.patch('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, resolution, assignedTo, priority, category, tags } = req.body;

    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    // Use Drizzle's type-safe update query builder
    await db.update(feedback)
      .set(updateData)
      .where(eq(feedback.id, parseInt(id)));

    console.log('✅ Feedback updated:', id, 'Status:', status);
    res.json({ status: 'updated' });

  } catch (error: unknown) {
    console.error('Feedback update error:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

export default router;