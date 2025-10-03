import express from 'express';
import webpush from 'web-push';
import { db } from '../db';
import { scheduledNotifications, users, applications } from '../../shared/schema';
import { eq, lte, and, sql } from 'drizzle-orm';

const router = express.Router();

// Configure web-push with VAPID keys  
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BL1sZq2ofT-1_ZqZCUq7k1ADpFlFsxjsSbe7H267C7o6LewpNDbuisGsDcfLgiSwBZBhsAxpFLtpx0EH_f7ej9M',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'mmkg9vJDNwhQ5Twj5f6pPWeusqVN-RgHsnLQId_DC60'
};

console.log('🔧 [PUSH] VAPID Public Key from env:', process.env.VAPID_PUBLIC_KEY ? 'Found' : 'Missing');
console.log('🔧 [PUSH] VAPID Private Key from env:', process.env.VAPID_PRIVATE_KEY ? 'Found' : 'Missing');

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@boreal.financial',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('✅ [PUSH] Web Push configured with VAPID keys (fallback to hardcoded)');
} else {
  console.log('⚠️ [PUSH] VAPID keys not configured - push notifications disabled');
}

// Subscribe user to push notifications
router.post('/subscribe', async (req: any, res: any) => {
  try {
    console.log('📱 [PUSH] Subscribing user to push notifications');
    
    const { subscription } = req.body;
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: 'Subscription data required'
      });
    }

    // Save subscription to user record
    await db.update(users)
      .set({ pushSubscription: subscription })
      .where(eq(users.id, userId));

    console.log('✅ [PUSH] User subscribed to push notifications successfully');
    res.json({
      success: true,
      message: 'Push notification subscription saved'
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH] Error subscribing to push notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to push notifications'
    });
  }
});

// Test push notification endpoint
router.post('/test', async (req: any, res: any) => {
  try {
    console.log('🧪 [PUSH] Testing push notification system');
    
    const { title = 'Test Notification', body = 'This is a test push notification', type = 'test' } = req.body;
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get user's push subscription
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || !user[0].pushSubscription) {
      return res.status(400).json({
        success: false,
        error: 'User not subscribed to push notifications. Please enable notifications first.'
      });
    }

    const subscription = user[0].pushSubscription;
    
    // Check if VAPID keys are configured
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      return res.status(500).json({
        success: false,
        error: 'Push notifications not configured - VAPID keys missing'
      });
    }

    // Send push notification
    const payload = JSON.stringify({
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      data: {
        url: '/bf/dashboard'
      }
    });

    await webpush.sendNotification(subscription, payload);
    
    console.log('✅ [PUSH] Test notification sent successfully');
    res.json({
      success: true,
      message: 'Test push notification sent successfully',
      title,
      body
    });

  } catch (error: any) {
    console.error('❌ [PUSH] Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Send push notification to specific user(s)
router.post('/send', async (req: any, res: any) => {
  try {
    console.log('📤 [PUSH] Sending targeted push notification');
    
    const { userId, userIds, title, body, type = 'notification', url, data = {}, tags } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'title and body are required'
      });
    }

    // Check if VAPID keys are configured
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      return res.status(500).json({
        success: false,
        error: 'Push notifications not configured - VAPID keys missing'
      });
    }

    let targetUsers = [];
    let results = [];

    // Handle different targeting methods
    if (userId) {
      // Single user
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      targetUsers = user;
    } else if (userIds && Array.isArray(userIds)) {
      // Multiple specific users
      targetUsers = await db.select()
        .from(users)
        .where(sql`id = ANY(${userIds})`);
    } else if (tags && Array.isArray(tags)) {
      // Tag-based targeting (e.g., role-based, business unit, etc.)
      if (tags.includes('all-staff')) {
        targetUsers = await db.select()
          .from(users)
          .where(sql`role IN ('staff', 'admin')`);
      } else if (tags.includes('all-clients')) {
        targetUsers = await db.select()
          .from(users)
          .where(eq(users.role, 'client'));
      } else if (tags.includes('funding-applicants')) {
        // Users with pending applications
        targetUsers = await db.select({
          id: users.id,
          email: users.email,
          pushSubscription: users.pushSubscription
        })
        .from(users)
        .innerJoin(applications, eq(applications.userId, users.id))
        .where(sql`applications.status IN ('pending', 'processing')`);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Must specify userId, userIds array, or tags array for targeting'
      });
    }

    if (targetUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No target users found'
      });
    }

    console.log(`📤 [PUSH] Targeting ${targetUsers.length} users for notification`);

    // Send notifications to all target users
    for (const user of targetUsers) {
      try {
        if (!user.pushSubscription) {
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: 'No push subscription'
          });
          continue;
        }

        // Prepare notification payload
        const payload = JSON.stringify({
          title,
          body,
          type,
          timestamp: new Date().toISOString(),
          data: {
            url: url || '/bf/dashboard',
            ...data
          }
        });

        await webpush.sendNotification(user.pushSubscription, payload);
        
        results.push({
          userId: user.id,
          email: user.email,
          success: true
        });
        
        console.log(`✅ [PUSH] Notification sent to ${user.email}`);

      } catch (error: any) {
        console.error(`❌ [PUSH] Failed to send to ${user.email}:`, error instanceof Error ? error.message : String(error));
        
        // Handle expired subscriptions
        if (error.statusCode === 410) {
          console.log(`🧹 [PUSH] Removing expired subscription for ${user.email}`);
          await db.update(users)
            .set({ pushSubscription: null })
            .where(eq(users.id, user.id));
        }
        
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`📊 [PUSH] Notification summary: ${successCount} sent, ${failCount} failed`);

    res.json({
      success: true,
      message: `Push notifications processed for ${targetUsers.length} users`,
      results: {
        total: targetUsers.length,
        sent: successCount,
        failed: failCount,
        details: results
      },
      notification: { title, body, type, url }
    });

  } catch (error: any) {
    console.error('❌ [PUSH] Error sending targeted notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send targeted notification',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get VAPID public key for frontend subscription
router.get('/vapid-key', (req: any, res: any) => {
  try {
    if (!vapidKeys.publicKey) {
      return res.status(500).json({
        success: false,
        error: 'VAPID public key not configured'
      });
    }

    res.json({
      success: true,
      publicKey: vapidKeys.publicKey
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH] Error getting VAPID key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get VAPID key'
    });
  }
});

// Schedule a notification
router.post('/schedule', async (req: any, res: any) => {
  try {
    console.log('📅 [PUSH] Scheduling notification');
    
    const { applicationId, type, payload, delayMinutes } = req.body;
    
    if (!applicationId || !type || !payload) {
      return res.status(400).json({
        success: false,
        error: 'applicationId, type, and payload are required'
      });
    }

    const scheduledAt = new Date(Date.now() + (delayMinutes || 0) * 60 * 1000);

    const notification = await db.insert(scheduledNotifications)
      .values({
        applicationId,
        type,
        payload,
        scheduledAt
      })
      .returning();

    console.log('✅ [PUSH] Notification scheduled successfully');
    res.json({
      success: true,
      notification: notification[0]
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH] Error scheduling notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule notification'
    });
  }
});

// Send push notification to user
async function sendPushNotification(userId: string, payload: any) {
  try {
    // Get user's push subscription
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0] || !user[0].pushSubscription) {
      console.log('⚠️ [PUSH] No push subscription found for user:', userId);
      return false;
    }

    const subscription = user[0].pushSubscription as any;
    
    // Send push notification
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('✅ [PUSH] Push notification sent successfully to user:', userId);
    return true;

  } catch (error: unknown) {
    console.error('❌ [PUSH] Error sending push notification:', error);
    return false;
  }
}

// Send immediate push notification
router.post('/send', async (req: any, res: any) => {
  try {
    console.log('📱 [PUSH] Sending immediate push notification');
    
    const { userId, title, body, data, actions } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'userId, title, and body are required'
      });
    }

    const payload = {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: data || {},
      actions: actions || [],
      timestamp: Date.now()
    };

    const sent = await sendPushNotification(userId, payload);

    if (sent) {
      res.json({
        success: true,
        message: 'Push notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send push notification'
      });
    }

  } catch (error: unknown) {
    console.error('❌ [PUSH] Error sending immediate notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification'
    });
  }
});

// Process scheduled notifications (called by cron job)
router.post('/process-scheduled', async (req: any, res: any) => {
  try {
    console.log('⏰ [PUSH] Processing scheduled notifications');
    
    // Get due notifications
    const dueNotifications = await db.select()
      .from(scheduledNotifications)
      .where(
        and(
          lte(scheduledNotifications.scheduledAt, new Date()),
          eq(scheduledNotifications.sent, false)
        )
      );

    console.log(`📱 [PUSH] Found ${dueNotifications.length} due notifications`);

    let processed = 0;
    let errors = 0;

    for (const notification of dueNotifications) {
      try {
        // Get application owner (assuming userId is in payload or can be derived)
        const userId = notification.payload.userId || notification.payload.assignedTo;
        
        if (userId) {
          const payload = {
            title: `${notification.type} Reminder`,
            body: notification.payload.message || 'You have a pending task',
            data: {
              applicationId: notification.applicationId,
              type: notification.type,
              notificationId: notification.id
            },
            actions: [
              {
                action: 'view',
                title: 'View Application'
              },
              {
                action: 'dismiss',
                title: 'Dismiss'
              }
            ]
          };

          const sent = await sendPushNotification(userId, payload);
          
          if (sent) {
            // Mark as sent
            await db.update(scheduledNotifications)
              .set({ 
                sent: true, 
                sentAt: new Date() 
              })
              .where(eq(scheduledNotifications.id, notification.id));
            
            processed++;
          } else {
            errors++;
          }
        }
      } catch (error: unknown) {
        console.error('❌ [PUSH] Error processing notification:', notification.id, error);
        errors++;
      }
    }

    console.log(`✅ [PUSH] Processed ${processed} notifications, ${errors} errors`);
    res.json({
      success: true,
      processed,
      errors
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH] Error processing scheduled notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process scheduled notifications'
    });
  }
});

// Get VAPID public key for client registration
router.get('/vapid-public-key', (req: any, res: any) => {
  res.json({
    success: true,
    publicKey: vapidKeys.publicKey
  });
});

// Get user's scheduled notifications
router.get('/scheduled/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    
    const notifications = await db.select()
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.applicationId, userId))
      .orderBy(scheduledNotifications.scheduledAt);

    res.json({
      success: true,
      notifications
    });

  } catch (error: unknown) {
    console.error('❌ [PUSH] Error fetching scheduled notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled notifications'
    });
  }
});

export { sendPushNotification };
export default router;