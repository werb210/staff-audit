/**
 * Lender 2FA Authentication Routes
 * API endpoints for lender two-factor authentication using mobile phones
 */

import { Router } from 'express';
import { Lender2FAService } from '../services/lender2FA';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Send 2FA code to lender's mobile phone
router.post('/send-2fa/:lenderId', async (req: any, res: any) => {
  try {
    const { lenderId } = req.params;

    if (!lenderId) {
      return res.status(400).json({
        success: false,
        error: 'Lender ID is required'
      });
    }

    const result = await Lender2FAService.sendLender2FA(lenderId);

    if (result.success) {
      res.json({
        success: true,
        message: '2FA code sent successfully',
        sid: result.sid
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Send lender 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send 2FA code'
    });
  }
});

// Verify lender 2FA code
router.post('/verify-2fa/:lenderId', async (req: any, res: any) => {
  try {
    const { lenderId } = req.params;
    const { code } = req.body;

    if (!lenderId || !code) {
      return res.status(400).json({
        success: false,
        error: 'Lender ID and verification code are required'
      });
    }

    const result = await Lender2FAService.verifyLender2FA(lenderId, code);

    if (result.success) {
      res.json({
        success: true,
        message: '2FA verification successful',
        status: result.status
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Verify lender 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify 2FA code'
    });
  }
});

// Check if lender has 2FA enabled
router.get('/status/:lenderId', async (req: any, res: any) => {
  try {
    const { lenderId } = req.params;

    if (!lenderId) {
      return res.status(400).json({
        success: false,
        error: 'Lender ID is required'
      });
    }

    const status = await Lender2FAService.isLender2FAEnabled(lenderId);

    res.json({
      success: true,
      enabled: status.enabled,
      mobilePhone: status.mobilePhone ? status.mobilePhone.replace(/(\+\d{1,3})\d+(\d{4})/, '$1***$2') : null // Mask phone number
    });
  } catch (error: any) {
    console.error('Check lender 2FA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check 2FA status'
    });
  }
});

// Update lender mobile phone for 2FA
router.patch('/mobile-phone/:lenderId', async (req: any, res: any) => {
  try {
    const { lenderId } = req.params;
    const { mobilePhone } = req.body;

    if (!lenderId || !mobilePhone) {
      return res.status(400).json({
        success: false,
        error: 'Lender ID and mobile phone are required'
      });
    }

    const result = await Lender2FAService.updateLenderMobilePhone(lenderId, mobilePhone);

    if (result.success) {
      res.json({
        success: true,
        message: 'Mobile phone updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Update lender mobile phone error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mobile phone'
    });
  }
});

export default router;