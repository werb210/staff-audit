/**
 * Multi-Platform Push Notification Service
 * Unified push notifications for Web Push, FCM (Android), APNs (iOS), and Windows
 */

import express from 'express';
import { db } from '../db';
import { deviceRegistrations, users } from '../../shared/schema';
import { insertDeviceRegistrationSchema } from '../../shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import webpush from 'web-push';

const router = express.Router();

// Configure web-push with VAPID keys  
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BL1sZq2ofT-1_ZqZCUq7k1ADpFlFsxjsSbe7H267C7o6LewpNDbuisGsDcfLgiSwBZBhsAxpFLtpx0EH_f7ej9M',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'mmkg9vJDNwhQ5Twj5f6pPWeusqVN-RgHsnLQId_DC60'
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@boreal.financial',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('✅ [PUSH-MULTI] Web Push configured with VAPID keys');
} else {
  console.log('⚠️ [PUSH-MULTI] VAPID keys not configured - web push disabled');
}

/**
 * POST /api/push/register
 * Register device for push notifications
 */
router.post('/register', async (req: any, res: any) => {
  try {
    console.log('📱 [PUSH-MULTI] Registering device for push notifications');
    
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate request body
    const validationResult = insertDeviceRegistrationSchema.safeParse({
      ...req.body,
      userId
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid registration data',
        details: validationResult.error.issues
      });
    }

    const registrationData = validationResult.data;

    // Upsert device registration (update if exists, insert if new)
    const existingDevice = await db.select()
      .from(deviceRegistrations)
      .where(
        and(
          eq(deviceRegistrations.userId, userId),
          eq(deviceRegistrations.platform, registrationData.platform),
          eq(deviceRegistrations.token, registrationData.token)
        )
      )
      .limit(1);

    let deviceReg;
    
    if (existingDevice.length > 0) {
      // Update existing registration
      deviceReg = await db.update(deviceRegistrations)
        .set({
          silo: registrationData.silo,
          userAgent: registrationData.userAgent,
          deviceInfo: registrationData.deviceInfo,
          isActive: true,
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(deviceRegistrations.id, existingDevice[0].id))
        .returning();
      
      console.log('✅ [PUSH-MULTI] Updated existing device registration:', deviceReg[0].id);
    } else {
      // Insert new registration
      deviceReg = await db.insert(deviceRegistrations)
        .values(registrationData)
        .returning();
      
      console.log('✅ [PUSH-MULTI] Created new device registration:', deviceReg[0].id);
    }

    res.json({
      success: true,
      message: 'Device registered successfully',
      registration: {
        id: deviceReg[0].id,
        platform: deviceReg[0].platform,
        silo: deviceReg[0].silo,
        isActive: deviceReg[0].isActive
      }
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] Error registering device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register device for push notifications'
    });
  }
});

/**
 * POST /api/push/unregister
 * Unregister device from push notifications
 */
router.post('/unregister', async (req: any, res: any) => {
  try {
    console.log('📱 [PUSH-MULTI] Unregistering device from push notifications');
    
    const { platform, token } = req.body;
    const userId = req.user?.id || req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!platform || !token) {
      return res.status(400).json({
        success: false,
        error: 'platform and token are required'
      });
    }

    // Deactivate the registration
    const result = await db.update(deviceRegistrations)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(deviceRegistrations.userId, userId),
          eq(deviceRegistrations.platform, platform),
          eq(deviceRegistrations.token, token)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device registration not found'
      });
    }

    console.log('✅ [PUSH-MULTI] Device unregistered successfully:', result[0].id);
    res.json({
      success: true,
      message: 'Device unregistered successfully'
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] Error unregistering device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister device'
    });
  }
});

/**
 * POST /api/push/broadcast
 * Send push notification to multiple devices
 */
router.post('/broadcast', async (req: any, res: any) => {
  try {
    console.log('📤 [PUSH-MULTI] Broadcasting push notification');
    
    const { 
      title, 
      body, 
      silo = 'bf',
      userIds = [],
      url = '/portal',
      data = {},
      platforms = ['webpush', 'fcm', 'apns', 'windows']
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'title and body are required'
      });
    }

    let targetDevices = [];

    if (userIds.length > 0) {
      // Target specific users
      targetDevices = await db.select({
        id: deviceRegistrations.id,
        userId: deviceRegistrations.userId,
        platform: deviceRegistrations.platform,
        token: deviceRegistrations.token,
        silo: deviceRegistrations.silo,
        userEmail: users.email
      })
      .from(deviceRegistrations)
      .innerJoin(users, eq(users.id, deviceRegistrations.userId))
      .where(
        and(
          inArray(deviceRegistrations.userId, userIds),
          eq(deviceRegistrations.silo, silo),
          eq(deviceRegistrations.isActive, true),
          inArray(deviceRegistrations.platform, platforms)
        )
      );
    } else {
      // Target all staff in silo
      targetDevices = await db.select({
        id: deviceRegistrations.id,
        userId: deviceRegistrations.userId,
        platform: deviceRegistrations.platform,
        token: deviceRegistrations.token,
        silo: deviceRegistrations.silo,
        userEmail: users.email
      })
      .from(deviceRegistrations)
      .innerJoin(users, eq(users.id, deviceRegistrations.userId))
      .where(
        and(
          eq(deviceRegistrations.silo, silo),
          eq(deviceRegistrations.isActive, true),
          inArray(deviceRegistrations.platform, platforms),
          sql`${users.role} IN ('staff', 'admin')`
        )
      );
    }

    if (targetDevices.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active devices found for the specified criteria'
      });
    }

    console.log(`📤 [PUSH-MULTI] Targeting ${targetDevices.length} devices across ${platforms.join(', ')}`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each device
    for (const device of targetDevices) {
      try {
        let sent = false;
        
        switch (device.platform) {
          case 'webpush':
            sent = await sendWebPushNotification(device.token, {
              title,
              body,
              data: { url, ...data },
              timestamp: Date.now()
            });
            break;
          
          case 'fcm':
            sent = await sendFCMNotification(device.token, {
              title,
              body,
              data: { url, ...data }
            });
            break;
          
          case 'apns':
            sent = await sendAPNsNotification(device.token, {
              title,
              body,
              data: { url, ...data }
            });
            break;
          
          case 'windows':
            sent = await sendWindowsNotification(device.token, {
              title,
              body,
              data: { url, ...data }
            });
            break;
        }

        if (sent) {
          successCount++;
          // Update last used timestamp
          await db.update(deviceRegistrations)
            .set({ lastUsed: new Date() })
            .where(eq(deviceRegistrations.id, device.id));
        } else {
          failureCount++;
        }

        results.push({
          userId: device.userId,
          email: device.userEmail,
          platform: device.platform,
          success: sent
        });

      } catch (error: unknown) {
        console.error(`❌ [PUSH-MULTI] Failed to send to ${device.platform} device:`, error);
        failureCount++;
        results.push({
          userId: device.userId,
          email: device.userEmail,
          platform: device.platform,
          success: false,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
      }
    }

    console.log(`📊 [PUSH-MULTI] Broadcast summary: ${successCount} sent, ${failureCount} failed`);

    res.json({
      success: true,
      message: `Push notification broadcast completed`,
      results: {
        total: targetDevices.length,
        sent: successCount,
        failed: failureCount,
        details: results
      },
      notification: { title, body, silo, url }
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] Error broadcasting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast push notification'
    });
  }
});

/**
 * GET /api/push/devices
 * Get user's registered devices
 */
router.get('/devices', async (req: any, res: any) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const devices = await db.select({
      id: deviceRegistrations.id,
      platform: deviceRegistrations.platform,
      silo: deviceRegistrations.silo,
      userAgent: deviceRegistrations.userAgent,
      deviceInfo: deviceRegistrations.deviceInfo,
      isActive: deviceRegistrations.isActive,
      lastUsed: deviceRegistrations.lastUsed,
      createdAt: deviceRegistrations.createdAt
    })
    .from(deviceRegistrations)
    .where(eq(deviceRegistrations.userId, userId))
    .orderBy(deviceRegistrations.createdAt);

    res.json({
      success: true,
      devices
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registered devices'
    });
  }
});

/**
 * GET /api/push/vapid-key
 * Get VAPID public key for web push registration
 */
router.get('/vapid-key', (req: any, res: any) => {
  res.json({
    success: true,
    publicKey: vapidKeys.publicKey
  });
});

// Platform-specific notification senders

async function sendWebPushNotification(subscription: any, payload: any): Promise<boolean> {
  try {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.log('⚠️ [PUSH-MULTI] VAPID keys not configured for Web Push');
      return false;
    }

    const subscriptionObj = typeof subscription === 'string' 
      ? JSON.parse(subscription) 
      : subscription;

    await webpush.sendNotification(subscriptionObj, JSON.stringify(payload));
    return true;
  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] Web Push error:', error);
    return false;
  }
}

async function sendFCMNotification(token: string, payload: any): Promise<boolean> {
  try {
    // TODO: Implement FCM sending using firebase-admin
    console.log('📱 [PUSH-MULTI] FCM notification (mock):', token, payload.title);
    
    // Mock implementation - replace with actual FCM code:
    /*
    const message = {
      token: token,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: payload.data,
      android: {
        notification: {
          click_action: 'OPEN_ACTIVITY_1'
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    return !!response;
    */
    
    return true; // Mock success
  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] FCM error:', error);
    return false;
  }
}

async function sendAPNsNotification(token: string, payload: any): Promise<boolean> {
  try {
    // TODO: Implement APNs sending
    console.log('🍎 [PUSH-MULTI] APNs notification (mock):', token, payload.title);
    
    // Mock implementation - replace with actual APNs code using 'apn' package or similar:
    /*
    const notification = new apn.Notification();
    notification.alert = {
      title: payload.title,
      body: payload.body
    };
    notification.topic = 'com.boreal.staff'; // Your app bundle ID
    notification.payload = payload.data;
    
    const result = await provider.send(notification, token);
    return result.sent.length > 0;
    */
    
    return true; // Mock success
  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] APNs error:', error);
    return false;
  }
}

async function sendWindowsNotification(token: string, payload: any): Promise<boolean> {
  try {
    // TODO: Implement Windows Toast notifications
    console.log('🪟 [PUSH-MULTI] Windows notification (mock):', token, payload.title);
    
    // Mock implementation - replace with actual Windows notification code
    return true; // Mock success
  } catch (error: unknown) {
    console.error('❌ [PUSH-MULTI] Windows error:', error);
    return false;
  }
}

export default router;