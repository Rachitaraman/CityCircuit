/**
 * Mock data generators for testing and development
 * Provides realistic sample data for CityCircuit entities
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  BusStop,
  Route,
  OptimizationResult,
  PopulationDensityData,
  DensityPoint,
  ChatSession,
  ChatMessage,
} from '@/types';

// =============================================================================
// MUMBAI-SPECIFIC DATA
// =============================================================================

const MUMBAI_LANDMARKS = [
  { name: 'Chhatrapati Shivaji Terminus', lat: 18.9401, lng: 72.8352 },
  { name: 'Gateway of India', lat: 18.9220, lng: 72.8347 },
  { name: 'Marine Drive', lat: 18.9439, lng: 72.8234 },
  { name: 'Bandra-Worli Sea Link', lat: 19.0330, lng: 72.8197 },
  { name: 'Juhu Beach', lat: 19.0968, lng: 72.8265 },
  { name: 'Andheri Station', lat: 19.1197, lng: 72.8464 },
  { name: 'Powai Lake', lat: 19.1176, lng: 72.9060 },
  { name: 'Colaba Causeway', lat: 18.9067, lng: 72.8147 },
  { name: 'Worli Sea Face', lat: 19.0176, lng: 72.8162 },
  { name: 'Linking Road', lat: 19.0544, lng: 72.8301 },
];

const MUMBAI_AREAS = [
  'Andheri', 'Bandra', 'Borivali', 'Colaba', 'Dadar', 'Fort', 'Goregaon',
  'Juhu', 'Kandivali', 'Kurla', 'Malad', 'Powai', 'Santa Cruz', 'Thane',
  'Vashi', 'Vikhroli', 'Worli', 'Churchgate', 'Lower Parel', 'Mahim'
];

const BUS_AMENITIES = [
  'wheelchair_accessible',
  'air_conditioning',
  'wifi',
  'cctv',
  'gps_tracking',
  'low_floor',
  'shelter',
  'seating',
  'digital_display',
  'ticket_counter'
];

// =============================================================================
// USER MOCK DATA
// =============================================================================

export function createMockUser(overrides: Partial<User> = {}): User {
  const roles: Array<'operator' | 'passenger' | 'admin'> = ['operator', 'passenger', 'admin'];
  const themes: Array<'light' | 'dark'> = ['light', 'dark'];
  const mapStyles: Array<'default' | 'satellite' | 'terrain'> = ['default', 'satellite', 'terrain'];
  
  return {
    id: uuidv4(),
    email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    phoneNumber: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    name: `Test User ${Math.floor(Math.random() * 100)}`,
    role: roles[Math.floor(Math.random() * roles.length)],
    isAdmin: Math.random() > 0.8, // 20% chance of being admin
    isActive: Math.random() > 0.1, // 90% chance of being active
    profile: {
      name: `Test User ${Math.floor(Math.random() * 100)}`,
      organization: Math.random() > 0.5 ? `Organization ${Math.floor(Math.random() * 10)}` : undefined,
      preferences: {
        language: Math.random() > 0.7 ? 'hi' : 'en',
        theme: themes[Math.floor(Math.random() * themes.length)],
        notifications: Math.random() > 0.3,
        mapStyle: mapStyles[Math.floor(Math.random() * mapStyles.length)],
        preferredRoutes: [],
        accessibilityNeeds: [],
      },
    },
    preferences: {
      language: Math.random() > 0.7 ? 'hi' : 'en',
      theme: themes[Math.floor(Math.random() * themes.length)],
      notifications: Math.random() > 0.3,
      mapStyle: mapStyles[Math.floor(Math.random() * mapStyles.length)],
      preferredRoutes: [],
      accessibilityNeeds: [],
    },
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    lastLoginAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

export function createMockUsers(count: number): User[] {
  return Array.from({ length: count }, () => createMockUser());
}

// =============================================================================
// BUS STOP MOCK DATA
// =============================================================================

export function createMockBusStop(overrides: Partial<BusStop> = {}): BusStop {
  const landmark = MUMBAI_LANDMARKS[Math.floor(Math.random() * MUMBAI_LANDMARKS.length)];
  const area = MUMBAI_AREAS[Math.floor(Math.random() * MUMBAI_AREAS.length)];
  
  // Add some random variation to coordinates
  const latVariation = (Math.random() - 0.5) * 0.01; // ±0.005 degrees
  const lngVariation = (Math.random() - 0.5) * 0.01;
  
  // Generate ward names similar to Mumbai format
  const wardPrefixes = ['NW', 'SW', 'SE', 'NE', 'C', 'E', 'W'];
  const wardPrefix = wardPrefixes[Math.floor(Math.random() * wardPrefixes.length)];
  const wardNumber = Math.floor(Math.random() * 30) + 1;
  
  return {
    id: uuidv4(),
    name: `${landmark.name.toUpperCase()} - ${area.toUpperCase()}`,
    coordinates: {
      latitude: landmark.lat + latVariation,
      longitude: landmark.lng + lngVariation,
    },
    isAccessible: Math.random() > 0.7, // 30% accessible
    amenities: ['Shelter', 'Seating'].filter(() => Math.random() > 0.5),
    styleUrl: 0,
    ward: `${wardPrefix}-${wardNumber}`,
    ...overrides,
  };
}

export function createMockBusStops(count: number): BusStop[] {
  return Array.from({ length: count }, () => createMockBusStop());
}

// =============================================================================
// ROUTE MOCK DATA
// =============================================================================

export function createMockRoute(overrides: Partial<Route> = {}): Route {
  const stopCount = Math.floor(Math.random() * 8) + 3; // 3-10 stops
  const stops = createMockBusStops(stopCount);
  
  return {
    id: uuidv4(),
    name: `Route ${Math.floor(Math.random() * 500) + 1}`,
    description: `Bus route connecting ${stops[0].name} to ${stops[stops.length - 1].name}`,
    stops,
    operatorId: uuidv4(),
    isActive: Math.random() > 0.1,
    optimizationScore: Math.floor(Math.random() * 100),
    estimatedTravelTime: Math.floor(Math.random() * 120) + 15, // 15-135 minutes
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

export function createMockRoutes(count: number): Route[] {
  return Array.from({ length: count }, () => createMockRoute());
}

// =============================================================================
// POPULATION DENSITY MOCK DATA
// =============================================================================

export function createMockDensityPoint(): DensityPoint {
  const baseCoord = MUMBAI_LANDMARKS[Math.floor(Math.random() * MUMBAI_LANDMARKS.length)];
  
  return {
    coordinates: {
      latitude: baseCoord.lat + (Math.random() - 0.5) * 0.02,
      longitude: baseCoord.lng + (Math.random() - 0.5) * 0.02,
    },
    population: Math.floor(Math.random() * 5000) + 100,
    demographicData: {
      ageGroups: {
        '0-18': Math.floor(Math.random() * 30) + 10,
        '19-35': Math.floor(Math.random() * 40) + 20,
        '36-60': Math.floor(Math.random() * 30) + 15,
        '60+': Math.floor(Math.random() * 20) + 5,
      },
      economicIndicators: {
        averageIncome: Math.floor(Math.random() * 50000) + 20000,
        employmentRate: Math.random() * 0.4 + 0.6,
        educationLevel: Math.random() * 0.5 + 0.3,
      },
    },
  };
}

export function createMockPopulationData(overrides: Partial<PopulationDensityData> = {}): PopulationDensityData {
  const pointCount = Math.floor(Math.random() * 50) + 10; // 10-60 points
  
  return {
    id: uuidv4(),
    region: MUMBAI_AREAS[Math.floor(Math.random() * MUMBAI_AREAS.length)],
    coordinates: {
      north: 19.3,
      south: 18.8,
      east: 73.1,
      west: 72.7,
    },
    densityPoints: Array.from({ length: pointCount }, () => createMockDensityPoint()),
    dataSource: 'Census 2021 - Mock Data',
    collectedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

// =============================================================================
// OPTIMIZATION RESULT MOCK DATA
// =============================================================================

export function createMockOptimizationResult(overrides: Partial<OptimizationResult> = {}): OptimizationResult {
  const originalRoute = createMockRoute();
  const optimizedRoute = createMockRoute({ 
    id: uuidv4(),
    name: `${originalRoute.name} (Optimized)`,
    optimizationScore: Math.min(100, originalRoute.optimizationScore + Math.floor(Math.random() * 20) + 5),
  });
  
  return {
    id: uuidv4(),
    originalRouteId: originalRoute.id,
    optimizedRoute,
    metrics: {
      timeImprovement: Math.random() * 30 + 5, // 5-35% improvement
      distanceReduction: Math.random() * 20 + 2, // 2-22% reduction
      passengerCoverageIncrease: Math.random() * 25 + 3, // 3-28% increase
      costSavings: Math.floor(Math.random() * 100000) + 10000, // ₹10,000-₹110,000
    },
    populationData: createMockPopulationData(),
    generatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

// =============================================================================
// CHAT MOCK DATA
// =============================================================================

export function createMockChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  const userMessages = [
    'How do I find the best route to Andheri?',
    'What are the bus timings for Route 25?',
    'Is there a direct bus from Colaba to Powai?',
    'Can you help me optimize my daily commute?',
    'What amenities are available at CST station?',
  ];
  
  const assistantMessages = [
    'I can help you find the best route to Andheri. Let me check the available options.',
    'Route 25 operates from 6:00 AM to 11:00 PM with buses every 15 minutes during peak hours.',
    'Yes, there are several direct routes from Colaba to Powai. Would you like me to show them?',
    'I\'d be happy to help optimize your commute. Could you tell me your starting and ending points?',
    'CST station has wheelchair accessibility, digital displays, and covered waiting areas.',
  ];
  
  const isUser = Math.random() > 0.5;
  const messages = isUser ? userMessages : assistantMessages;
  
  return {
    id: uuidv4(),
    content: messages[Math.floor(Math.random() * messages.length)],
    role: isUser ? 'user' : 'assistant',
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    context: isUser ? undefined : { 
      confidence: Math.random(),
      sources: ['route_database', 'real_time_data'],
    },
    ...overrides,
  };
}

export function createMockChatSession(overrides: Partial<ChatSession> = {}): ChatSession {
  const messageCount = Math.floor(Math.random() * 10) + 2; // 2-12 messages
  const messages = Array.from({ length: messageCount }, (_, index) => 
    createMockChatMessage({ 
      role: index % 2 === 0 ? 'user' : 'assistant',
      timestamp: new Date(Date.now() - (messageCount - index) * 60 * 1000),
    })
  );
  
  return {
    id: uuidv4(),
    userId: uuidv4(),
    messages,
    language: Math.random() > 0.7 ? 'hi' : 'en',
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    ...overrides,
  };
}

// =============================================================================
// BATCH GENERATORS
// =============================================================================

export function generateMockDataset() {
  return {
    users: createMockUsers(50),
    busStops: createMockBusStops(200),
    routes: createMockRoutes(30),
    optimizationResults: Array.from({ length: 15 }, () => createMockOptimizationResult()),
    populationData: Array.from({ length: 10 }, () => createMockPopulationData()),
    chatSessions: Array.from({ length: 25 }, () => createMockChatSession()),
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generates a random Mumbai coordinate within city bounds
 */
export function randomMumbaiCoordinate() {
  return {
    latitude: 18.8 + Math.random() * 0.5, // 18.8 to 19.3
    longitude: 72.7 + Math.random() * 0.4, // 72.7 to 73.1
  };
}

/**
 * Generates a realistic route name
 */
export function generateRouteNumber(): string {
  const prefixes = ['', 'A', 'C', 'AS'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 500) + 1;
  return `${prefix}${number}`;
}