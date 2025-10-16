import { Router } from 'express';
import { z } from 'zod';
import { 
  generateTokens, 
  verifyRefreshToken, 
  hashPassword, 
  comparePassword,
  authenticate 
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticationError, ValidationError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'staff', 'lender', 'referrer', 'client']).default('client'),
  tenantId: z.string().uuid('Invalid tenant ID')
});

// POST /auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  // TODO: Replace with actual database query
  // This is a placeholder - in real implementation, query users table
  const mockUser = {
    id: '1',
    email: 'staff@acme.com',
    passwordHash: await hashPassword('password'),
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'staff' as const,
    tenantId: '1f58298b-cf64-4883-8eb4-48f958999934'
  };

  // Verify user exists and password is correct
  if (mockUser.email !== email) {
    throw new AuthenticationError('Invalid credentials');
  }

  const isValidPassword = await comparePassword(password, mockUser.passwordHash);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens({
    id: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
    tenantId: mockUser.tenantId,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName
  });

  res.json({
    token: accessToken,
    refreshToken,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: mockUser.role,
      tenantId: mockUser.tenantId
    }
  });
}));

// POST /auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);

  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded);

    res.json({
      token: accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
}));

// POST /auth/register (for staff to create new users)
router.post('/register', authenticate, asyncHandler(async (req, res) => {
  const userData = registerSchema.parse(req.body);

  // Only admin and staff can create new users
  if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions');
  }

  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // TODO: Replace with actual database insertion
  const newUser = {
    id: Math.random().toString(36).substr(2, 9),
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    tenantId: userData.tenantId,
    isActive: true,
    createdAt: new Date()
  };

  res.status(201).json({
    message: 'User created successfully',
    user: newUser
  });
}));

// GET /auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AuthenticationError();
  }

  res.json({
    user: req.user
  });
}));

// POST /auth/logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // or store logout information in the database
  
  res.json({
    message: 'Logged out successfully'
  });
}));

export { router as authRoutes };