/**
 * Demonstration of CityCircuit data models and validation
 * This file shows how to use the TypeScript interfaces and Zod schemas
 */

import {
  UserSchema,
  BusStopSchema,
  RouteSchema,
  validateUser,
  validateBusStop,
  validateRoute,
  type User,
  type BusStop,
  type Route,
} from '@/types';

import {
  isValidMumbaiCoordinates,
  calculateDistance,
  estimateTravelTime,
} from '@/utils/validation';

import {
  createMockUser,
  createMockBusStop,
  createMockRoute,
} from '@/utils/mockData';

// =============================================================================
// DEMONSTRATION FUNCTIONS
// =============================================================================

/**
 * Demonstrates creating and validating a user
 */
export function demonstrateUserValidation() {
  console.log('=== User Validation Demo ===');
  
  // Create a valid user
  const validUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'operator@best.gov.in',
    role: 'operator',
    profile: {
      name: 'Mumbai Bus Operator',
      organization: 'BEST (Brihanmumbai Electric Supply and Transport)',
      preferences: {
        language: 'en',
        theme: 'light',
        notifications: true,
        mapStyle: 'default',
      },
    },
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date(),
  };

  // Validate the user
  const userValidation = validateUser(validUser);
  console.log('Valid user validation:', userValidation.success);

  // Try invalid user
  const invalidUser = { ...validUser, email: 'invalid-email' };
  const invalidValidation = validateUser(invalidUser);
  console.log('Invalid user validation:', invalidValidation.success);
  
  return { validUser, userValidation, invalidValidation };
}

/**
 * Demonstrates creating and validating bus stops
 */
export function demonstrateBusStopValidation() {
  console.log('=== Bus Stop Validation Demo ===');
  
  // Create Mumbai bus stops
  const cstStation: BusStop = {
    name: 'CHHATRAPATI SHIVAJI MAHARAJ TERMINUS (GPO)',
    styleUrl: 0,
    longitude: 72.8352,
    latitude: 18.9401,
    ward: 'NW-19',
  };

  const gatewayOfIndia: BusStop = {
    name: 'GATEWAY OF INDIA',
    styleUrl: 0,
    longitude: 72.8347,
    latitude: 18.9220,
    ward: 'NW-19',
  };

  // Validate bus stops
  const cstValidation = validateBusStop(cstStation);
  const gatewayValidation = validateBusStop(gatewayOfIndia);
  
  console.log('CST validation:', cstValidation.success);
  console.log('Gateway validation:', gatewayValidation.success);

  // Check Mumbai coordinates
  console.log('CST in Mumbai bounds:', isValidMumbaiCoordinates(cstStation.latitude, cstStation.longitude));
  console.log('Gateway in Mumbai bounds:', isValidMumbaiCoordinates(gatewayOfIndia.latitude, gatewayOfIndia.longitude));

  // Calculate distance between stops
  const distance = calculateDistance(
    { latitude: cstStation.latitude, longitude: cstStation.longitude },
    { latitude: gatewayOfIndia.latitude, longitude: gatewayOfIndia.longitude }
  );
  console.log(`Distance between CST and Gateway: ${distance.toFixed(2)} km`);

  return { cstStation, gatewayOfIndia, distance };
}

/**
 * Demonstrates creating and validating routes
 */
export function demonstrateRouteValidation() {
  console.log('=== Route Validation Demo ===');
  
  const { cstStation, gatewayOfIndia } = demonstrateBusStopValidation();
  
  // Create additional stops for a complete route
  const marineDrive: BusStop = {
    name: 'MARINE DRIVE',
    styleUrl: 0,
    longitude: 72.8234,
    latitude: 18.9439,
    ward: 'NW-19',
  };

  // Create a route
  const route1: Route = {
    id: '123e4567-e89b-12d3-a456-426614174004',
    name: 'Route 1 - South Mumbai Circuit',
    description: 'Connects major tourist and business areas in South Mumbai',
    stops: [cstStation, gatewayOfIndia, marineDrive],
    operatorId: '123e4567-e89b-12d3-a456-426614174005',
    isActive: true,
    optimizationScore: 85,
    estimatedTravelTime: 45,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  };

  // Validate the route
  const routeValidation = validateRoute(route1);
  console.log('Route validation:', routeValidation.success);

  // Calculate route metrics
  let totalDistance = 0;
  for (let i = 0; i < route1.stops.length - 1; i++) {
    const segmentDistance = calculateDistance(
      { latitude: route1.stops[i].latitude, longitude: route1.stops[i].longitude },
      { latitude: route1.stops[i + 1].latitude, longitude: route1.stops[i + 1].longitude }
    );
    totalDistance += segmentDistance;
    console.log(`Segment ${i + 1}: ${segmentDistance.toFixed(2)} km`);
  }
  
  console.log(`Total route distance: ${totalDistance.toFixed(2)} km`);
  
  const estimatedTime = estimateTravelTime(totalDistance);
  console.log(`Estimated travel time: ${estimatedTime} minutes`);

  return { route1, totalDistance, estimatedTime };
}

/**
 * Demonstrates mock data generation
 */
export function demonstrateMockDataGeneration() {
  console.log('=== Mock Data Generation Demo ===');
  
  // Generate mock data
  const mockUser = createMockUser();
  const mockBusStop = createMockBusStop();
  const mockRoute = createMockRoute();

  console.log('Generated mock user:', mockUser.profile.name);
  console.log('Generated mock bus stop:', mockBusStop.name);
  console.log('Generated mock route:', mockRoute.name);
  console.log('Mock route stops count:', mockRoute.stops.length);

  // Validate mock data
  const mockUserValidation = validateUser(mockUser);
  const mockStopValidation = validateBusStop(mockBusStop);
  const mockRouteValidation = validateRoute(mockRoute);

  console.log('Mock user valid:', mockUserValidation.success);
  console.log('Mock stop valid:', mockStopValidation.success);
  console.log('Mock route valid:', mockRouteValidation.success);

  return {
    mockUser,
    mockBusStop,
    mockRoute,
    validations: {
      user: mockUserValidation.success,
      stop: mockStopValidation.success,
      route: mockRouteValidation.success,
    },
  };
}

/**
 * Runs all demonstrations
 */
export function runAllDemonstrations() {
  console.log('🚌 CityCircuit Data Models Demonstration 🚌\n');
  
  const userDemo = demonstrateUserValidation();
  console.log('');
  
  const busStopDemo = demonstrateBusStopValidation();
  console.log('');
  
  const routeDemo = demonstrateRouteValidation();
  console.log('');
  
  const mockDemo = demonstrateMockDataGeneration();
  console.log('');
  
  console.log('✅ All demonstrations completed successfully!');
  
  return {
    user: userDemo,
    busStop: busStopDemo,
    route: routeDemo,
    mock: mockDemo,
  };
}

// Export for use in other files
export {
  UserSchema,
  BusStopSchema,
  RouteSchema,
  validateUser,
  validateBusStop,
  validateRoute,
};