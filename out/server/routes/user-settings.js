import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const router = Router();
// GET /api/user/settings - Get current user settings
router.get('/', async (req, res) => {
    try {
        console.log('⚙️ [USER-SETTINGS] Fetching user settings...');
        // Get first available user for development - replace with actual auth
        const [userSettings] = await db
            .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            mobilePhone: users.mobilePhone,
            role: users.role,
            department: users.department,
            accessBf: users.accessBf,
            accessSlf: users.accessSlf,
            isActive: users.isActive,
            passwordIsTemporary: users.passwordIsTemporary,
            createdAt: users.createdAt,
            lastLogin: users.lastLogin
        })
            .from(users)
            .limit(1);
        if (!userSettings) {
            // Return default settings for development
            return res.json({
                success: true,
                data: {
                    id: 'u-bf-admin',
                    email: 'admin@boreal.financial',
                    firstName: 'Admin',
                    lastName: 'User',
                    mobilePhone: '+1 (555) 123-4567',
                    role: 'admin',
                    department: 'management',
                    accessBf: true,
                    accessSlf: false,
                    isActive: true,
                    passwordIsTemporary: false,
                    twoFactorEnabled: true,
                    notifications: {
                        email: true,
                        sms: true,
                        browser: true
                    },
                    preferences: {
                        theme: 'light',
                        language: 'en-US',
                        timezone: 'America/New_York'
                    },
                    lastLogin: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                }
            });
        }
        res.json({
            success: true,
            data: {
                ...userSettings,
                twoFactorEnabled: !!userSettings.mobilePhone,
                notifications: {
                    email: true,
                    sms: true,
                    browser: true
                },
                preferences: {
                    theme: 'light',
                    language: 'en-US',
                    timezone: 'America/New_York'
                }
            }
        });
    }
    catch (error) {
        console.error('❌ [USER-SETTINGS] Error fetching user settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user settings',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// PUT /api/user/settings - Update current user settings  
router.put('/', async (req, res) => {
    try {
        console.log('⚙️ [USER-SETTINGS] Updating user settings...');
        const { notifications, preferences, profile } = req.body;
        // Get first available user for development  
        const [currentUser] = await db.select({ id: users.id }).from(users).limit(1);
        if (!currentUser) {
            return res.status(404).json({ success: false, error: 'No users found' });
        }
        if (profile) {
            // Update user profile fields
            await db
                .update(users)
                .set({
                firstName: profile.firstName,
                lastName: profile.lastName,
                mobilePhone: profile.mobilePhone,
                department: profile.department
            })
                .where(eq(users.id, currentUser.id));
        }
        // For now, just return success - in production, store notifications/preferences in user table or separate settings table
        console.log('✅ [USER-SETTINGS] Settings updated successfully');
        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    }
    catch (error) {
        console.error('❌ [USER-SETTINGS] Error updating settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settings',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
