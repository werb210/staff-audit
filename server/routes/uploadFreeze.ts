/**
 * 🚨 PHASE 1: UPLOAD FREEZE SYSTEM
 * Emergency system to temporarily disable uploads during incidents
 */

import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

interface FreezeState {
  frozen: boolean;
  reason?: string;
  timestamp?: string;
  message?: string;
}

const FREEZE_FILE = 'logs/upload-freeze.json';

async function getFreezeState(): Promise<FreezeState> {
  try {
    const data = await fs.readFile(FREEZE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { frozen: false };
  }
}

async function setFreezeState(state: FreezeState): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FREEZE_FILE), { recursive: true });
    await fs.writeFile(FREEZE_FILE, JSON.stringify(state, null, 2));
  } catch (error: unknown) {
    console.error('❌ [FREEZE] Failed to save freeze state:', error);
  }
}

// Get current freeze status
router.get('/freeze-status', async (req: any, res: any) => {
  try {
    const state = await getFreezeState();
    res.json(state);
  } catch (error: unknown) {
    console.error('❌ [FREEZE] Error getting freeze status:', error);
    res.status(500).json({ error: 'Failed to get freeze status' });
  }
});

// Freeze uploads
router.post('/freeze', async (req: any, res: any) => {
  try {
    const { reason } = req.body;
    
    const freezeState: FreezeState = {
      frozen: true,
      reason: reason || 'Emergency upload freeze activated',
      timestamp: new Date().toISOString(),
      message: '🚨 UPLOADS TEMPORARILY DISABLED: All uploads are frozen pending system verification'
    };
    
    await setFreezeState(freezeState);
    
    console.log(`🚨 [FREEZE] Upload system frozen: ${reason}`);
    
    res.json({
      success: true,
      ...freezeState
    });
    
  } catch (error: unknown) {
    console.error('❌ [FREEZE] Error freezing uploads:', error);
    res.status(500).json({ error: 'Failed to freeze uploads' });
  }
});

// Unfreeze uploads
router.post('/unfreeze', async (req: any, res: any) => {
  try {
    const { reason } = req.body;
    
    const unfreezeState: FreezeState = {
      frozen: false,
      reason: reason || 'Upload system re-enabled',
      timestamp: new Date().toISOString(),
      message: 'Upload system re-enabled'
    };
    
    await setFreezeState(unfreezeState);
    
    console.log(`✅ [FREEZE] Upload system unfrozen: ${reason}`);
    
    res.json({
      success: true,
      ...unfreezeState
    });
    
  } catch (error: unknown) {
    console.error('❌ [FREEZE] Error unfreezing uploads:', error);
    res.status(500).json({ error: 'Failed to unfreeze uploads' });
  }
});

// Check if uploads are frozen (middleware function)
export async function checkUploadFreeze(): Promise<boolean> {
  const state = await getFreezeState();
  return state.frozen || false;
}

export default router;