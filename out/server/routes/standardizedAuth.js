// STANDARDIZED AUTHENTICATION SYSTEM
// This is the user-requested bulletproof authentication with NO bypasses
// Implements consistent userId-based JWT generation and dual-token support
import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const router = Router();
/**
 * POST /api/standardized-auth/login
 * Bulletproof standardized authentication with consistent JWT structure
 * NO bypasses, NO localStorage persistence, NO development shortcuts
 */
// [AUTH-CLEANUP] Disabled duplicate /login; canonical lives in routes/auth.ts
// router.post('/login', async (req: any, res: any) => {
//   console.log('🔑 [STANDARDIZED-AUTH] Login request received');
//   console.log('🔑 [STANDARDIZED-AUTH] Request details:', {
//     email: req.body.email,
//     headers: req.headers['user-agent'],
//     ip: req.ip
//   });
//   try {
//     const { email, password } = req.body;
//
//     // Input validation
//     if (!email || !password) {
//       console.log('❌ [STANDARDIZED-AUTH] Missing credentials');
//       return res.status(400).json({
//         success: false,
//         error: 'Email and password are required',
//         code: 'MISSING_CREDENTIALS'
//       });
//     }
//
//     // Find user in database
//     const [user] = await db
//       .select()
//       .from(users)
//       .where(eq(users.email, email.toLowerCase().trim()))
//       .limit(1);
//
//     if (!user) {
//       console.log('❌ [STANDARDIZED-AUTH] User not found:', email);
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid email or password',
//         code: 'INVALID_CREDENTIALS'
//       });
//     }
//
//     // Verify password
//     if (!user.passwordHash) {
//       console.log('❌ [STANDARDIZED-AUTH] No password hash for user:', email);
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid email or password',
//         code: 'INVALID_CREDENTIALS'
//       });
//     }
//     
//     const isValidPassword = await bcrypt.compare(password, user.passwordHash);
//     if (!isValidPassword) {
//       console.log('❌ [STANDARDIZED-AUTH] Invalid password for:', email);
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid email or password',
//         code: 'INVALID_CREDENTIALS'
//       });
//     }
//
//     // Check if user is active
//     if (!user.isActive) {
//       console.log('❌ [STANDARDIZED-AUTH] Inactive user:', email);
//       return res.status(401).json({
//         success: false,
//         error: 'Account is not active',
//         code: 'ACCOUNT_INACTIVE'
//       });
//     }
//
//     // Create standardized user object
//     const standardUser: StandardUser = {
//       id: user.id,
//       email: user.email,
//       role: user.role,
//       tenantId: user.tenantId || undefined,
//       firstName: user.firstName || undefined,
//       lastName: user.lastName || undefined
//     };
//
//     // Generate standardized authentication response
//     const authResponse = generateStandardAuthResponse(
//       standardUser,
//       '8h',
//       'Standardized authentication successful'
//     );
//
//     // Set secure httpOnly cookie
//     res.cookie('bf_auth', authResponse.token, getStandardCookieOptions());
//
//     // Update last login timestamp
//     await db
//       .update(users)
//       .set({ lastLogin: new Date() })
//       .where(eq(users.id, user.id));
//
//     console.log('✅ [STANDARDIZED-AUTH] Login successful for:', email);
//     console.log('✅ [STANDARDIZED-AUTH] JWT generated with userId field');
//
//     // Return standardized response
//     return res.status(200).json(authResponse);
//   } catch (error: any) {
//     console.error('💥 [STANDARDIZED-AUTH] Login error:', error);
//     return res.status(500).json({
//       success: false,
//       error: 'Internal server error',
//       code: 'SERVER_ERROR'
//     });
//   }
// });
/**
 * GET /api/standardized-auth/me
 * Get current user information using standardized authentication
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.bf_auth;
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }
        // Verify token using standardized utility
        const { verifyStandardToken } = await import('../utils/standardAuth');
        const payload = verifyStandardToken(token);
        // Get user from database
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payload.userId))
            .limit(1);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        return res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId
            }
        });
    }
    catch (error) {
        console.error('💥 [STANDARDIZED-AUTH] /me error:', error);
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
});
/**
 * POST /api/standardized-auth/logout
 * Secure logout with cookie clearing
 */
router.post('/logout', (req, res) => {
    console.log('🚪 [STANDARDIZED-AUTH] Logout request');
    // Clear authentication cookie
    res.clearCookie('bf_auth', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
    });
    return res.json({
        success: true,
        message: 'Logout successful'
    });
});
console.log('🔑 [STANDARDIZED-AUTH] Bulletproof authentication routes loaded');
console.log('🔑 [STANDARDIZED-AUTH] Available endpoints: /login, /me, /logout');
console.log('🔑 [STANDARDIZED-AUTH] JWT structure: standardized userId field');
console.log('🔑 [STANDARDIZED-AUTH] Security: httpOnly cookies + Bearer token support');
export { router as standardizedAuthRouter };
