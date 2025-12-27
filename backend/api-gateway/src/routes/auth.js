/**
 * Authentication routes for CityCircuit API Gateway
 * Handles user registration, login, logout, and token management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { 
  generateToken, 
  authenticate, 
  refreshTokenIfNeeded 
} = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin,
  sanitizeInput 
} = require('../middleware/validation');
const { authRateLimit } = require('../middleware/security');
const { asyncHandler, APIError } = require('../middleware/errorHandler');

const router = express.Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

/**
 * User registration endpoint
 * POST /api/auth/register
 */
router.post('/register', 
  sanitizeInput,
  validateUserRegistration,
  asyncHandler(async (req, res) => {
    const { email, password, role, profile } = req.body;

    // TODO: Check if user already exists in database
    // This will be implemented when database integration is added
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // TODO: Save user to database
    // For now, simulate user creation
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      role,
      profile: {
        name: profile.name,
        organization: profile.organization || null,
        preferences: {
          language: 'en',
          theme: 'light',
          notifications: true,
          mapStyle: 'default'
        }
      },
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        profile: newUser.profile
      },
      token,
      expiresIn: '24h'
    });
  })
);

/**
 * User login endpoint
 * POST /api/auth/login
 */
router.post('/login',
  sanitizeInput,
  validateUserLogin,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // TODO: Find user in database by email
    // For now, simulate user lookup
    const user = {
      id: 'user_demo_123',
      email,
      role: 'operator',
      profile: {
        name: 'Demo User',
        organization: 'Mumbai Transport Authority',
        preferences: {
          language: 'en',
          theme: 'light',
          notifications: true,
          mapStyle: 'default'
        }
      },
      hashedPassword: await bcrypt.hash('password123', 12), // Demo password
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-01-15T10:30:00.000Z'
    };

    if (!user) {
      throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // TODO: Update last login time in database

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile
      },
      token,
      expiresIn: '24h'
    });
  })
);

/**
 * User logout endpoint
 * POST /api/auth/logout
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    // TODO: Add token to blacklist in Redis/database
    // For now, just return success (client should remove token)
    
    res.json({
      message: 'Logout successful'
    });
  })
);

/**
 * Token refresh endpoint
 * POST /api/auth/refresh
 */
router.post('/refresh',
  authenticate,
  refreshTokenIfNeeded,
  asyncHandler(async (req, res) => {
    // Generate new token
    const newToken = generateToken({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      expiresIn: '24h'
    });
  })
);

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    // TODO: Fetch complete user profile from database
    // For now, return user info from token
    
    const user = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      profile: {
        name: 'Demo User',
        organization: 'Mumbai Transport Authority',
        preferences: {
          language: 'en',
          theme: 'light',
          notifications: true,
          mapStyle: 'default'
        }
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    };

    res.json({
      user
    });
  })
);

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile',
  authenticate,
  sanitizeInput,
  asyncHandler(async (req, res) => {
    const { profile } = req.body;
    
    // TODO: Update user profile in database
    // For now, simulate profile update
    
    const updatedProfile = {
      name: profile.name || 'Demo User',
      organization: profile.organization || null,
      preferences: {
        language: profile.preferences?.language || 'en',
        theme: profile.preferences?.theme || 'light',
        notifications: profile.preferences?.notifications !== false,
        mapStyle: profile.preferences?.mapStyle || 'default'
      }
    };

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  })
);

/**
 * Change password endpoint
 * PUT /api/auth/password
 */
router.put('/password',
  authenticate,
  sanitizeInput,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new APIError('Current password and new password are required', 400, 'MISSING_PASSWORDS');
    }

    if (newPassword.length < 8) {
      throw new APIError('New password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
    }

    // TODO: Verify current password and update in database
    // For now, simulate password change
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    res.json({
      message: 'Password changed successfully'
    });
  })
);

/**
 * Verify token endpoint (for other services)
 * POST /api/auth/verify
 */
router.post('/verify',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      throw new APIError('Token is required', 400, 'MISSING_TOKEN');
    }

    try {
      const { verifyToken } = require('../middleware/auth');
      const decoded = await verifyToken(token);
      
      res.json({
        valid: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        },
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (error) {
      res.json({
        valid: false,
        error: error.message
      });
    }
  })
);

module.exports = router;