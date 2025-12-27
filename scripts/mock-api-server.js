#!/usr/bin/env node

/**
 * Mock API Server for Development
 * Simulates the Flask ML backend for frontend development
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Load mock database
let mockDb;
try {
  mockDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/mock-database.json'), 'utf8'));
} catch (error) {
  console.error('❌ Mock database not found. Run: node scripts/setup-dev-db.js');
  process.exit(1);
}

// Helper function to simulate processing delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes API
app.get('/api/routes', async (req, res) => {
  await delay(200);
  const { limit, offset, search, type, origin, destination } = req.query;
  
  let routes = [...mockDb.routes];
  
  // Handle origin/destination search
  if (origin && destination) {
    // Generate routes based on origin and destination
    try {
      const mumbaiStops = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/mumbai-bus-stops.json'), 'utf8'));
      const originStop = mumbaiStops.find(stop => stop.name === origin);
      const destinationStop = mumbaiStops.find(stop => stop.name === destination);
      
      if (originStop && destinationStop) {
        // Generate realistic routes
        const generatedRoutes = generateRoutesForStops(originStop, destinationStop, mumbaiStops);
        return res.json({
          routes: generatedRoutes,
          total: generatedRoutes.length,
          offset: 0,
          limit: generatedRoutes.length,
          generated: true
        });
      }
    } catch (error) {
      console.error('Error generating routes:', error);
    }
  }
  
  // Apply filters
  if (search) {
    routes = routes.filter(route => 
      route.name.toLowerCase().includes(search.toLowerCase()) ||
      route.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (type) {
    routes = routes.filter(route => route.routeType === type);
  }
  
  // Apply pagination
  const start = parseInt(offset) || 0;
  const count = parseInt(limit) || routes.length;
  const paginatedRoutes = routes.slice(start, start + count);
  
  res.json({
    routes: paginatedRoutes,
    total: routes.length,
    offset: start,
    limit: count
  });
});

// Helper function to generate routes between two stops
function generateRoutesForStops(originStop, destinationStop, allStops) {
  const routes = [];
  const routeCount = Math.floor(Math.random() * 3) + 2; // 2-4 routes

  for (let i = 0; i < routeCount; i++) {
    // Generate intermediate stops
    const intermediateStops = generateIntermediateStops(allStops, originStop, destinationStop, i);
    
    // Calculate route metrics
    const totalStops = 2 + intermediateStops.length;
    const estimatedTime = calculateEstimatedTime(totalStops, originStop, destinationStop);
    const optimizationScore = Math.floor(Math.random() * 30) + 70; // 70-100%
    
    const route = {
      id: `route_${Date.now()}_${i}`,
      name: generateRouteName(originStop.name, destinationStop.name, i),
      description: generateRouteDescription(originStop.name, destinationStop.name, i),
      operatorId: 'mumbai-best-001',
      estimatedTravelTime: estimatedTime,
      optimizationScore: optimizationScore,
      stops: [
        {
          id: `stop_${originStop.name}`,
          name: originStop.name,
          coordinates: { latitude: originStop.latitude, longitude: originStop.longitude },
          isAccessible: Math.random() > 0.3,
        },
        ...intermediateStops.map((stop, idx) => ({
          id: `stop_${stop.name}_${idx}`,
          name: stop.name,
          coordinates: { latitude: stop.latitude, longitude: stop.longitude },
          isAccessible: Math.random() > 0.3,
        })),
        {
          id: `stop_${destinationStop.name}`,
          name: destinationStop.name,
          coordinates: { latitude: destinationStop.latitude, longitude: destinationStop.longitude },
          isAccessible: Math.random() > 0.3,
        },
      ],
      isActive: true,
      routeType: ['express', 'local', 'limited', 'fast'][i % 4],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    routes.push(route);
  }

  return routes;
}

// Helper function to generate intermediate stops
function generateIntermediateStops(allStops, origin, destination, routeIndex) {
  // Filter stops that are geographically between origin and destination
  const intermediateStops = allStops.filter(stop => {
    if (stop.name === origin.name || stop.name === destination.name) return false;
    
    // Simple geographic filtering - stops should be roughly between origin and destination
    const minLat = Math.min(origin.latitude, destination.latitude);
    const maxLat = Math.max(origin.latitude, destination.latitude);
    const minLng = Math.min(origin.longitude, destination.longitude);
    const maxLng = Math.max(origin.longitude, destination.longitude);
    
    return stop.latitude >= minLat - 0.01 && stop.latitude <= maxLat + 0.01 &&
           stop.longitude >= minLng - 0.01 && stop.longitude <= maxLng + 0.01;
  });

  // Select 1-4 random intermediate stops based on route index
  const stopCount = Math.min(routeIndex + 1, 4);
  const selectedStops = [];
  
  for (let i = 0; i < stopCount && i < intermediateStops.length; i++) {
    const randomIndex = Math.floor(Math.random() * intermediateStops.length);
    const stop = intermediateStops[randomIndex];
    if (!selectedStops.find(s => s.name === stop.name)) {
      selectedStops.push(stop);
    }
  }

  return selectedStops;
}

// Helper function to generate route names
function generateRouteName(origin, destination, index) {
  const routeTypes = ['Express', 'Local', 'Limited', 'Fast'];
  const originShort = origin.split(',')[0].split(' ').slice(0, 2).join(' ');
  const destShort = destination.split(',')[0].split(' ').slice(0, 2).join(' ');
  
  return `${originShort} to ${destShort} ${routeTypes[index % routeTypes.length]}`;
}

// Helper function to generate route descriptions
function generateRouteDescription(origin, destination, index) {
  const descriptions = [
    `Direct route connecting ${origin.split(',')[0]} to ${destination.split(',')[0]}`,
    `Fast connection between ${origin.split(',')[0]} and ${destination.split(',')[0]} with limited stops`,
    `Scenic route from ${origin.split(',')[0]} to ${destination.split(',')[0]} via major landmarks`,
    `Express service linking ${origin.split(',')[0]} and ${destination.split(',')[0]} business districts`,
  ];
  
  return descriptions[index % descriptions.length];
}

// Helper function to calculate estimated travel time
function calculateEstimatedTime(totalStops, origin, destination) {
  // Base time calculation
  const baseTime = 15; // 15 minutes base
  const stopTime = totalStops * 3; // 3 minutes per stop
  
  // Distance factor (rough calculation)
  const latDiff = Math.abs(destination.latitude - origin.latitude);
  const lngDiff = Math.abs(destination.longitude - origin.longitude);
  const distanceFactor = (latDiff + lngDiff) * 1000; // Convert to approximate minutes
  
  return Math.max(15, Math.floor(baseTime + stopTime + distanceFactor));
}

app.get('/api/routes/:id', async (req, res) => {
  await delay(100);
  const route = mockDb.routes.find(r => r.id === req.params.id);
  
  if (!route) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  res.json(route);
});

// Route optimization endpoint
app.post('/api/optimize', async (req, res) => {
  await delay(2000); // Simulate ML processing time
  
  const { route, preferences = {} } = req.body;
  
  if (!route) {
    return res.status(400).json({ error: 'Route data is required' });
  }
  
  // Simulate optimization
  const optimizedRoute = route.stops ? [...route.stops] : [];
  const efficiency = Math.random() * 0.3 + 0.7; // 70-100%
  const estimatedTime = route.estimatedTime ? route.estimatedTime * (2 - efficiency) : Math.floor(Math.random() * 1800 + 600);
  
  const result = {
    optimizedRoute,
    efficiency,
    estimatedTime,
    recommendations: [
      efficiency > 0.9 ? 'Excellent route efficiency!' : 'Route has good optimization potential',
      preferences.prioritizeSpeed ? 'Speed optimization applied' : 'Balanced optimization applied',
      'Consider real-time traffic data for better results'
    ],
    metadata: {
      algorithm: 'mock-ml-algorithm',
      confidence: efficiency,
      timestamp: new Date().toISOString(),
      processingTime: 2000
    }
  };
  
  // Save to optimization results
  const optimizationResult = {
    id: `opt-${Date.now()}`,
    routeId: route.id || 'unknown',
    originalRoute: route.stops || [],
    ...result,
    createdAt: new Date().toISOString()
  };
  
  mockDb.optimizationResults.push(optimizationResult);
  
  res.json(result);
});

// Mumbai bus stops endpoint (serves the comprehensive list)
app.get('/data/mumbai-bus-stops.json', async (req, res) => {
  try {
    const mumbaiStops = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/mumbai-bus-stops.json'), 'utf8'));
    res.json(mumbaiStops);
  } catch (error) {
    console.error('Error loading Mumbai bus stops:', error);
    res.status(500).json({ error: 'Failed to load bus stops data' });
  }
});

// Bus stops API - Updated to serve real Mumbai bus stops
app.get('/api/bus-stops', async (req, res) => {
  await delay(150);
  const { area, limit, search } = req.query;
  
  try {
    // Load real Mumbai bus stops instead of mock data
    const mumbaiStops = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/mumbai-bus-stops.json'), 'utf8'));
    let stops = mumbaiStops.map(stop => ({
      id: `stop_${stop.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      address: `${stop.name}, Ward: ${stop.ward}`,
      ward: stop.ward,
      styleUrl: stop.styleUrl,
      amenities: ['shelter', 'bench'], // Default amenities
      accessibility: {
        wheelchairAccessible: Math.random() > 0.3,
        audioAnnouncements: Math.random() > 0.5,
        brailleSignage: Math.random() > 0.7
      },
      routes: [], // Will be populated based on actual route data
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Add search functionality
    if (search) {
      const searchTerm = search.toLowerCase();
      stops = stops.filter(stop => 
        stop.name.toLowerCase().includes(searchTerm) ||
        stop.address.toLowerCase().includes(searchTerm) ||
        stop.ward.toLowerCase().includes(searchTerm)
      );
    }
    
    // Simple area filtering (in real app, this would use geospatial queries)
    if (area) {
      try {
        const areaData = JSON.parse(area);
        if (areaData.latitude && areaData.longitude && areaData.radius) {
          // Mock filtering - in reality would calculate distance
          stops = stops.slice(0, Math.floor(Math.random() * stops.length) + 1);
        }
      } catch (e) {
        // Invalid area data, return all stops
      }
    }
    
    if (limit) {
      stops = stops.slice(0, parseInt(limit));
    }
    
    console.log(`📍 Serving ${stops.length} Mumbai bus stops (total: ${mumbaiStops.length})`);
    res.json(stops);
  } catch (error) {
    console.error('Error loading Mumbai bus stops:', error);
    // Fallback to mock data if real data fails
    let stops = [...mockDb.busStops];
    
    if (search) {
      const searchTerm = search.toLowerCase();
      stops = stops.filter(stop => 
        stop.name.toLowerCase().includes(searchTerm) ||
        stop.address.toLowerCase().includes(searchTerm)
      );
    }
    
    if (limit) {
      stops = stops.slice(0, parseInt(limit));
    }
    
    res.json(stops);
  }
});

// Phone Authentication API
app.post('/api/auth/register', async (req, res) => {
  await delay(300);
  const { phoneNumber, name } = req.body;
  
  if (!phoneNumber || !name) {
    return res.status(400).json({ error: 'Phone number and name are required' });
  }
  
  // Check if phone number already exists
  const existingUser = mockDb.users.find(u => u.phoneNumber === phoneNumber);
  if (existingUser) {
    return res.status(409).json({ error: 'Phone number already registered' });
  }
  
  // Create new user
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    phoneNumber,
    role: 'passenger',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
  
  mockDb.users.push(newUser);
  
  // Generate mock JWT token
  const token = `mock-jwt-${Buffer.from(JSON.stringify({ userId: newUser.id, phoneNumber })).toString('base64')}`;
  
  res.json({
    success: true,
    user: newUser,
    token,
    message: 'Registration successful'
  });
});

app.post('/api/auth/login', async (req, res) => {
  await delay(300);
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  // Find user by phone number
  const user = mockDb.users.find(u => u.phoneNumber === phoneNumber);
  if (!user) {
    return res.status(404).json({ 
      error: 'Phone number not registered',
      message: 'Please register first with this phone number'
    });
  }
  
  // Update last login
  user.lastLoginAt = new Date().toISOString();
  
  // Generate mock JWT token
  const token = `mock-jwt-${Buffer.from(JSON.stringify({ userId: user.id, phoneNumber })).toString('base64')}`;
  
  res.json({
    success: true,
    user,
    token,
    message: 'Login successful'
  });
});

app.post('/api/auth/verify-token', async (req, res) => {
  await delay(100);
  const { token } = req.body;
  
  if (!token || !token.startsWith('mock-jwt-')) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  try {
    const payload = JSON.parse(Buffer.from(token.replace('mock-jwt-', ''), 'base64').toString());
    const user = mockDb.users.find(u => u.id === payload.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user,
      valid: true
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token format' });
  }
});

// Users API (simplified for demo)
app.get('/api/users/:id', async (req, res) => {
  await delay(100);
  const user = mockDb.users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

app.put('/api/users/:id', async (req, res) => {
  await delay(200);
  const userIndex = mockDb.users.findIndex(u => u.id === req.params.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Update user
  mockDb.users[userIndex] = {
    ...mockDb.users[userIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json(mockDb.users[userIndex]);
});

// Analytics API
app.get('/api/analytics/report', async (req, res) => {
  await delay(300);
  res.json(mockDb.analytics);
});

app.post('/api/analytics/event', async (req, res) => {
  await delay(50);
  const { type, data, userId } = req.body;
  
  // In a real app, this would store the event
  console.log(`📊 Analytics Event: ${type}`, { userId, data });
  
  res.json({ 
    success: true, 
    eventId: `event-${Date.now()}`,
    timestamp: new Date().toISOString()
  });
});

// Admin stats endpoint
app.get('/api/admin/stats', async (req, res) => {
  await delay(200);
  
  try {
    // Load real Mumbai bus stops for accurate count
    const mumbaiStops = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/mumbai-bus-stops.json'), 'utf8'));
    
    const stats = {
      totalRoutes: mockDb.routes.length,
      activeRoutes: mockDb.routes.filter(r => r.isActive).length,
      totalStops: mumbaiStops.length, // Use real count
      totalUsers: mockDb.users.length,
      activeUsers: mockDb.users.filter(u => u.isActive).length,
      systemHealth: 'healthy',
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`📊 Admin Stats: ${stats.totalRoutes} routes, ${stats.totalStops} stops, ${stats.totalUsers} users`);
    res.json(stats);
  } catch (error) {
    console.error('Error loading stats:', error);
    // Fallback to mock data
    const stats = {
      totalRoutes: mockDb.routes.length,
      activeRoutes: mockDb.routes.filter(r => r.isActive).length,
      totalStops: mockDb.busStops.length,
      totalUsers: mockDb.users.length,
      activeUsers: mockDb.users.filter(u => u.isActive).length,
      systemHealth: 'healthy',
      lastUpdated: new Date().toISOString()
    };
    
    res.json(stats);
  }
});

// Sync endpoint for cross-platform data synchronization
app.post('/api/sync', async (req, res) => {
  await delay(100);
  const { userId, lastSyncAt, platform } = req.body;
  
  res.json({
    syncedAt: new Date().toISOString(),
    conflicts: [],
    success: true,
    platform
  });
});

// Chat/AI endpoints
app.post('/api/chat', async (req, res) => {
  await delay(1000); // Simulate AI processing
  const { message, userId, language = 'en' } = req.body;
  
  // Simple mock responses
  const responses = {
    en: [
      "I'd be happy to help you with route information!",
      "Let me find the best route options for you.",
      "Based on current traffic conditions, here's what I recommend:",
      "I can help you with bus schedules and route planning."
    ],
    es: [
      "¡Estaré encantado de ayudarte con información de rutas!",
      "Déjame encontrar las mejores opciones de ruta para ti.",
      "Basado en las condiciones actuales del tráfico, esto es lo que recomiendo:",
      "Puedo ayudarte con horarios de autobuses y planificación de rutas."
    ],
    fr: [
      "Je serais ravi de vous aider avec les informations sur les itinéraires!",
      "Laissez-moi trouver les meilleures options d'itinéraire pour vous.",
      "Basé sur les conditions de circulation actuelles, voici ce que je recommande:",
      "Je peux vous aider avec les horaires de bus et la planification d'itinéraires."
    ]
  };
  
  const responseList = responses[language] || responses.en;
  const response = responseList[Math.floor(Math.random() * responseList.length)];
  
  res.json({
    response,
    language,
    timestamp: new Date().toISOString(),
    contextId: `ctx-${Date.now()}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`📊 Serving ${mockDb.routes.length} routes, ${mockDb.users.length} users, ${mockDb.busStops.length} stops`);
  console.log('🔗 Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/verify-token');
  console.log('  GET  /api/routes');
  console.log('  POST /api/optimize');
  console.log('  GET  /api/bus-stops');
  console.log('  GET  /api/analytics/report');
  console.log('  POST /api/chat');
  console.log('  GET  /api/admin/stats');
});