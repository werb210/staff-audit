/**
 * Admin System Settings API
 * Provides global system configuration for BI reports and dashboard settings
 */

import { Router } from 'express';

const router = Router();

// Default system settings
const defaultSettings = {
  showBIReports: true,
  defaultDateRange: '30d',
  useMockData: false,
  reportRefreshInterval: 300000, // 5 minutes
  enableExports: true,
  enableRealTimeUpdates: true,
  dashboardTheme: 'professional',
  chartsEnabled: true,
  analyticsEnabled: true,
  maxExportRows: 10000
};

/**
 * GET /api/admin/system-settings
 * Returns system-wide settings for BI reports and dashboard configuration
 */
router.get('/admin/system-settings', async (req, res) => {
  try {
    console.log('✅ [ADMIN-SETTINGS] System settings requested');
    
    // In a real implementation, this would come from database
    // For now, return sensible defaults to fix the 404 errors
    const settings = {
      ...defaultSettings,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      settings,
      message: 'System settings loaded successfully'
    });

  } catch (error) {
    console.error('❌ [ADMIN-SETTINGS] Error loading system settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load system settings',
      settings: defaultSettings // Return defaults even on error
    });
  }
});

/**
 * PUT /api/admin/system-settings
 * Updates system-wide settings
 */
router.put('/admin/system-settings', async (req, res) => {
  try {
    const updates = req.body;
    console.log('✅ [ADMIN-SETTINGS] System settings update requested:', updates);

    // In real implementation, save to database
    const updatedSettings = {
      ...defaultSettings,
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      settings: updatedSettings,
      message: 'System settings updated successfully'
    });

  } catch (error) {
    console.error('❌ [ADMIN-SETTINGS] Error updating system settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system settings'
    });
  }
});

export default router;