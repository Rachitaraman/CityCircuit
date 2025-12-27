#!/usr/bin/env node
/**
 * CityCircuit API Gateway
 * Express.js server for handling API routing and orchestration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Import route handlers
const routesRouter = require('./routes/routes');
const usersRouter = require('./routes/users');
const mapsRouter = require('./routes/maps');
const chatRouter = require('./routes/chat');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CityCircuit API Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ready',
    message: 'API Gateway is ready to handle requests',
    endpoints: {
      routes: '/api/routes',
      users: '/api/users', 
      maps: '/api/maps',
      chat: '/api/chat',
      auth: '/api/auth',
      admin: '/api/admin'
    }
  });
});

// Route handlers
app.use('/api/routes', routesRouter);
app.use('/api/users', usersRouter);
app.use('/api/maps', mapsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CityCircuit API Gateway running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API status: http://localhost:${PORT}/api/status`);
});

module.exports = app;