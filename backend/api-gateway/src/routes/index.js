/**
 * Main router for CityCircuit API Gateway
 * Combines all route modules and applies middleware
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

// Import route modules
const authRoutes = require('./auth');
const routeRoutes = require('./routes');
const userRoutes = require('./users');
const mapRoutes = require('./maps');
const chatRoutes = require('./chat');
const adminRoutes = require('./admin');

const router = express.Router();

/**
 * API status endpoint
 */
router.get('/status', asyncHandler(async (req, res) => {
  res.json({
    status: 'ready',
    message: 'CityCircuit API Gateway is operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      routes: '/api/routes',
      users: '/api/users',
      maps: '/api/maps',
      chat: '/api/chat',
      admin: '/api/admin'
    },
    services: {
      ml_service: process.env.ML_SERVICE_URL || 'http://localhost:5000',
      database: 'connected',
      cache: 'connected'
    }
  });
}));

/**
 * API health check endpoint
 */
router.get('/health', asyncHandler(async (req, res) => {
  // Perform basic health checks
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      api_gateway: 'healthy',
      ml_service: 'unknown', // Will be checked by actual service calls
      database: 'unknown',   // Will be checked by actual database calls
      cache: 'unknown'       // Will be checked by actual cache calls
    }
  };

  res.json(healthStatus);
}));

// Mount route modules
router.use('/auth', authRoutes);
router.use('/routes', routeRoutes);
router.use('/users', userRoutes);
router.use('/maps', mapRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);

module.exports = router;