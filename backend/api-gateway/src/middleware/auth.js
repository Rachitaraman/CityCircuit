/**
 * Authentication middleware for CityCircuit API Gateway
 * Handles JWT token validation and user authentication
 */

const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'citycircuit-api',
    audience: 'citycircuit-users'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = async (token) => {
  try {
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Authentication middleware - validates JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = await verifyToken(token);
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
};

/**
 * Optional authentication middleware - validates token if present
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp
      };
    }

    next();
  } catch (error) {
    // For optional auth, continue even if token is invalid
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {string|Array} allowedRoles - Role(s) allowed to access the route
 * @returns {Function} Express middleware function
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Admin-only authorization middleware
 */
const requireAdmin = authorize('admin');

/**
 * Operator authorization middleware (admin or operator)
 */
const requireOperator = authorize(['admin', 'operator']);

/**
 * Refresh token middleware - generates new token if current one is close to expiry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const refreshTokenIfNeeded = (req, res, next) => {
  if (req.user) {
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = req.user.exp - now;
    
    // If token expires in less than 1 hour, add new token to response headers
    if (timeUntilExpiry < 3600) {
      const newToken = generateToken({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
      
      res.setHeader('X-New-Token', newToken);
    }
  }
  
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  requireOperator,
  refreshTokenIfNeeded
};