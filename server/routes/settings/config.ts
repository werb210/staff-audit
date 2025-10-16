import express from 'express';
import { db } from '../../db';
import { systemSettings } from '../../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

const router = express.Router();

router.get('/load', async (_req, res) => {
  try {
    const keys = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'SENDGRID_API_KEY'];
    
    const settingsResult = await db
      .select({ key: systemSettings.key, value: systemSettings.value })
      .from(systemSettings)
      .where(inArray(systemSettings.key, keys));
    
    const response = Object.fromEntries(
      settingsResult.map(s => [s.key, s.value])
    );
    
    res.json(response);
  } catch (err) {
    console.error('Load config error:', err);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

router.post('/save', async (req: any, res: any) => {
  const entries = Object.entries(req.body);
  
  try {
    // Use database transaction for atomicity
    await db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        // Try to update first
        const result = await tx
          .update(systemSettings)
          .set({ 
            value: value as string,
            updatedAt: new Date()
          })
          .where(eq(systemSettings.key, key));
        
        // If no rows affected, insert new
        if (result.rowCount === 0) {
          await tx
            .insert(systemSettings)
            .values({ 
              key,
              value: value as string
            });
        }
      }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Save config error:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

export default router;