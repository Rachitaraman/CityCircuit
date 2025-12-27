/**
 * Request validation middleware for CityCircuit API Gateway
 * Handles input validation and sanitization using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .isIn(['passenger', 'operator', 'admin'])
    .withMessage('Role must be one of: passenger, operator, admin'),
  
  body('profile.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('profile.organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name must not exceed 200 characters'),
  
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validation rules for route creation/update
 */
const validateRoute = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Route name must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Route description must be between 10 and 500 characters'),
  
  body('operatorId')
    .trim()
    .notEmpty()
    .withMessage('Operator ID is required'),
  
  body('estimatedTravelTime')
    .isInt({ min: 1, max: 300 })
    .withMessage('Estimated travel time must be between 1 and 300 minutes'),
  
  body('stops')
    .isArray({ min: 2 })
    .withMessage('Route must have at least 2 stops'),
  
  body('stops.*.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Stop name must be between 2 and 100 characters'),
  
  body('stops.*.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('stops.*.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('stops.*.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Stop address must be between 5 and 200 characters'),
  
  body('stops.*.dailyPassengerCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Daily passenger count must be a non-negative integer'),
  
  body('stops.*.isAccessible')
    .optional()
    .isBoolean()
    .withMessage('Accessibility flag must be a boolean'),
  
  handleValidationErrors
];

/**
 * Validation rules for route search/filtering
 */
const validateRouteSearch = [
  query('origin')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Origin must be at least 2 characters'),
  
  query('destination')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Destination must be at least 2 characters'),
  
  query('operatorId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Operator ID cannot be empty'),
  
  query('maxTravelTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max travel time must be a positive integer'),
  
  query('accessibleOnly')
    .optional()
    .isBoolean()
    .withMessage('Accessible only flag must be a boolean'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Validation rules for route optimization request
 */
const validateOptimizationRequest = [
  body('routeId')
    .trim()
    .notEmpty()
    .withMessage('Route ID is required'),
  
  body('populationData')
    .optional()
    .isObject()
    .withMessage('Population data must be an object'),
  
  body('optimizationCriteria')
    .optional()
    .isIn(['time_efficiency', 'cost_effectiveness', 'passenger_coverage', 'accessibility', 'environmental_impact'])
    .withMessage('Invalid optimization criteria'),
  
  body('constraints')
    .optional()
    .isObject()
    .withMessage('Constraints must be an object'),
  
  handleValidationErrors
];

/**
 * Validation rules for chat messages
 */
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  
  body('language')
    .optional()
    .isIn(['en', 'hi', 'mr', 'gu'])
    .withMessage('Language must be one of: en, hi, mr, gu'),
  
  handleValidationErrors
];

/**
 * Validation rules for coordinates
 */
const validateCoordinates = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  handleValidationErrors
];

/**
 * Validation rules for pagination parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Sort field cannot be empty'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

/**
 * Validation rules for ID parameters
 */
const validateId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('ID parameter is required')
    .isLength({ min: 1 })
    .withMessage('ID cannot be empty'),
  
  handleValidationErrors
];

/**
 * Validation rules for export requests
 */
const validateExportRequest = [
  body('format')
    .isIn(['json', 'csv', 'xml', 'gtfs', 'geojson'])
    .withMessage('Format must be one of: json, csv, xml, gtfs, geojson'),
  
  body('includeMetadata')
    .optional()
    .isBoolean()
    .withMessage('Include metadata flag must be a boolean'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  handleValidationErrors
];

/**
 * Sanitize request body to prevent XSS and injection attacks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sanitizeInput = (req, res, next) => {
  // Basic sanitization - remove potentially dangerous characters
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateRoute,
  validateRouteSearch,
  validateOptimizationRequest,
  validateChatMessage,
  validateCoordinates,
  validatePagination,
  validateId,
  validateExportRequest,
  sanitizeInput
};