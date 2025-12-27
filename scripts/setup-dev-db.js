#!/usr/bin/env node

/**
 * Development Database Setup Script
 * Creates sample data for local development and testing
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up CityCircuit development database...');

// Load sample data
const sampleRoutes = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/sample-routes.json'), 'utf8'));
const sampleUsers = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/sample-users.json'), 'utf8'));
const sampleAnalytics = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/sample-analytics.json'), 'utf8'));

// Create mock database structure
const mockDatabase = {
  routes: sampleRoutes,
  users: sampleUsers,
  analytics: sampleAnalytics,
  busStops: [],
  optimizationResults: [],
  chatSessions: [],
  systemLogs: []
};

// Extract all unique bus stops from routes
sampleRoutes.forEach(route => {
  route.stops.forEach(stop => {
    const existingStop = mockDatabase.busStops.find(s => s.id === stop.id);
    if (!existingStop) {
      mockDatabase.busStops.push({
        ...stop,
        routes: [route.id],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      if (!existingStop.routes.includes(route.id)) {
        existingStop.routes.push(route.id);
      }
    }
  });
});

// Generate sample optimization results
for (let i = 0; i < 50; i++) {
  const routeId = sampleRoutes[Math.floor(Math.random() * sampleRoutes.length)].id;
  const route = sampleRoutes.find(r => r.id === routeId);
  
  mockDatabase.optimizationResults.push({
    id: `opt-${String(i + 1).padStart(3, '0')}`,
    routeId: routeId,
    originalRoute: route.stops,
    optimizedRoute: [...route.stops].sort(() => Math.random() - 0.5), // Random shuffle for demo
    efficiency: Math.random() * 0.3 + 0.7, // 70-100% efficiency
    estimatedTime: Math.floor(Math.random() * 1800 + 600), // 10-40 minutes
    recommendations: [
      'Consider adding express stops during peak hours',
      'Route efficiency is good',
      'Minor adjustments recommended for traffic optimization'
    ],
    metadata: {
      algorithm: Math.random() > 0.5 ? 'advanced-ml' : 'basic-optimization',
      confidence: Math.random() * 0.3 + 0.7,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  });
}

// Generate sample chat sessions
const chatTopics = [
  'How do I find the best route to the airport?',
  'What time does the first bus arrive?',
  'Are there wheelchair accessible buses?',
  'How much does it cost to travel downtown?',
  'Is there WiFi on the buses?'
];

for (let i = 0; i < 20; i++) {
  const userId = sampleUsers[Math.floor(Math.random() * sampleUsers.length)].id;
  const topic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
  
  mockDatabase.chatSessions.push({
    id: `chat-${String(i + 1).padStart(3, '0')}`,
    userId: userId,
    messages: [
      {
        role: 'user',
        content: topic,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        role: 'assistant',
        content: `I'd be happy to help you with that! Based on your question about "${topic.toLowerCase()}", here's what I can tell you...`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 + 30000).toISOString()
      }
    ],
    language: sampleUsers.find(u => u.id === userId)?.preferences?.language || 'en',
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  });
}

// Save mock database
const dbPath = path.join(__dirname, '../public/data/mock-database.json');
fs.writeFileSync(dbPath, JSON.stringify(mockDatabase, null, 2));

console.log('✅ Development database setup complete!');
console.log(`📊 Created ${mockDatabase.routes.length} routes`);
console.log(`👥 Created ${mockDatabase.users.length} users`);
console.log(`🚏 Created ${mockDatabase.busStops.length} bus stops`);
console.log(`⚡ Created ${mockDatabase.optimizationResults.length} optimization results`);
console.log(`💬 Created ${mockDatabase.chatSessions.length} chat sessions`);
console.log(`💾 Database saved to: ${dbPath}`);

console.log('\n🎯 Next steps:');
console.log('1. Run: npm run dev (to start the Next.js frontend)');
console.log('2. Run: npm run start:backend (to start the ML backend - if implemented)');
console.log('3. Open: http://localhost:3000');
console.log('\n📝 Test credentials:');
console.log('Admin: admin@citycircuit.com');
console.log('Operator: operator@citycircuit.com');
console.log('Passenger: passenger1@example.com');