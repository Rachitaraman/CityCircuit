/**
 * Security middleware for CityCircuit API Gateway
 * Implements various security measures and protections
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { APIError } = require('./errorHandler');

/**
 * Configure rate limiting for different endpoints
 */
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          statusCode: 429
        },
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * General API rate limiting
 */
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later'
);

/**
 * Strict rate limiting for authentication endpoints
 */
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts, please try again later'
);

/**
 * Rate limiting for route optimization (resource intensive)
 */
const optimizationRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 optimization requests per hour
  'Too many optimization requests, please try again later'
);

/**
 * Rate limiting for chat/AI endpoints
 */
const chatRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  20, // 20 messages per minute
  'Too many chat messages, please slow down'
);

/**
 * Rate limiting for export endpoints
 */
const exportRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  5, // 5 exports per hour
  'Too many export requests, please try again later'
);

/**
 * Security headers configuration
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.citycircuit.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS || '').split(',')
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new APIError('Not allowed by CORS', 403, 'CORS_ERROR'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-New-Token', 'X-Request-ID', 'X-Rate-Limit-Remaining']
};

/**
 * API key validation middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = (process.env.API_KEYS || '').split(',').filter(key => key.length > 0);
  
  // Skip API key validation in development if no keys are configured
  if (process.env.NODE_ENV === 'development' && validApiKeys.length === 0) {
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      error: {
        message: 'API key is required',
        code: 'MISSING_API_KEY',
        statusCode: 401
      }
    });
  }
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        code: 'INVALID_API_KEY',
        statusCode: 401
      }
    });
  }
  
  next();
};

/**
 * Request ID middleware for tracing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
};

/**
 * IP whitelist middleware
 * @param {Array} allowedIPs - Array of allowed IP addresses
 * @returns {Function} Express middleware function
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: {
          message: 'Access denied from this IP address',
          code: 'IP_NOT_ALLOWED',
          statusCode: 403
        }
      });
    }
    
    next();
  };
};

/**
 * Request size limiter
 * @param {string} limit - Size limit (e.g., '10mb', '1kb')
 * @returns {Function} Express middleware function
 */
const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = parseSize(limit);
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: {
          message: `Request entity too large. Maximum size is ${limit}`,
          code: 'REQUEST_TOO_LARGE',
          statusCode: 413
        }
      });
    }
    
    next();
  };
};

/**
 * Parse size string to bytes
 * @param {string} size - Size string (e.g., '10mb', '1kb')
 * @returns {number} Size in bytes
 */
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) return 0;
  
  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
};

/**
 * Security audit middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const securityAudit = (req, res, next) => {
  // Log security-relevant events
  const securityEvents = [];
  
  // Check for suspicious patterns
  if (req.url.includes('../') || req.url.includes('..\\')) {
    securityEvents.push('PATH_TRAVERSAL_ATTEMPT');
  }
  
  if (req.headers['user-agent'] && req.headers['user-agent'].includes('bot')) {
    securityEvents.push('BOT_ACCESS');
  }
  
  if (req.body && typeof req.body === 'string' && 
      (req.body.includes('<script>') || req.body.includes('javascript:'))) {
    securityEvents.push('XSS_ATTEMPT');
  }
  
  if (securityEvents.length > 0) {
    req.securityEvents = securityEvents;
    // Log security events (implement logging as needed)
    console.warn('Security events detected:', {
      ip: req.ip,
      url: req.url,
      events: securityEvents,
      userAgent: req.headers['user-agent']
    });
  }
  
  next();
};

module.exports = {
  generalRateLimit,
  authRateLimit,
  optimizationRateLimit,
  chatRateLimit,
  exportRateLimit,
  securityHeaders,
  corsOptions,
  validateApiKey,
  requestId,
  ipWhitelist,
  requestSizeLimit,
  securityAudit
};