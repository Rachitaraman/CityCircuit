/**
 * Tests for data validation schemas and utilities
 */

import * as fc from 'fast-check';
import {
  UserSchema,
  BusStopSchema,
  RouteSchema,
  OptimizationResultSchema,
  CoordinatesSchema,
  validateUser,
  validateBusStop,
  validateRoute,
  type User,
  type BusStop,
  type Route,
} from '../index';

import {
  isValidMumbaiCoordinates,
  hasValidStopSequence,
  hasReasonableGeographicPath,
  calculateDistance,
  calculateRouteDistance,
  estimateTravelTime,
  formatValidationErrors,
} from '../../utils/validation';

describe('Data Model Validation', () => {
  describe('CoordinatesSchema', () => {
    it('should validate correct coordinates', () => {
      const validCoords = { latitude: 19.0760, longitude: 72.8777 }; // Mumbai
      const result = CoordinatesSchema.safeParse(validCoords);
      expect(result.success).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const invalidCoords = { latitude: 91, longitude: 72.8777 };
      const result = CoordinatesSchema.safeParse(invalidCoords);
      expect(result.success).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const invalidCoords = { latitude: 19.0760, longitude: 181 };
      const result = CoordinatesSchema.safeParse(invalidCoords);
      expect(result.success).toBe(false);
    });
  });

  describe('UserSchema', () => {
    const validUser: User = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'passenger',
      profile: {
        name: 'Test User',
        preferences: {
          language: 'en',
          theme: 'light',
          notifications: true,
          mapStyle: 'default',
        },
      },
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    it('should validate correct user data', () => {
      const result = validateUser(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidUser = { ...validUser, email: 'invalid-email' };
      const result = validateUser(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalidUser = { ...validUser, role: 'invalid-role' as any };
      const result = validateUser(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const invalidUser = { ...validUser, id: 'not-a-uuid' };
      const result = validateUser(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('BusStopSchema', () => {
    const validBusStop: BusStop = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Chhatrapati Shivaji Terminus',
      coordinates: { latitude: 18.9401, longitude: 72.8352 },
      address: 'Fort, Mumbai, Maharashtra 400001',
      amenities: ['wheelchair_accessible', 'shelter'],
      dailyPassengerCount: 50000,
      isAccessible: true,
    };

    it('should validate correct bus stop data', () => {
      const result = validateBusStop(validBusStop);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidStop = { ...validBusStop, name: '' };
      const result = validateBusStop(invalidStop);
      expect(result.success).toBe(false);
    });

    it('should reject negative passenger count', () => {
      const invalidStop = { ...validBusStop, dailyPassengerCount: -100 };
      const result = validateBusStop(invalidStop);
      expect(result.success).toBe(false);
    });
  });

  describe('RouteSchema', () => {
    const validRoute: Route = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Route 1',
      description: 'Test route',
      stops: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Stop 1',
          coordinates: { latitude: 19.0760, longitude: 72.8777 },
          address: 'Address 1',
          amenities: [],
          dailyPassengerCount: 1000,
          isAccessible: true,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Stop 2',
          coordinates: { latitude: 19.0860, longitude: 72.8877 },
          address: 'Address 2',
          amenities: [],
          dailyPassengerCount: 1500,
          isAccessible: false,
        },
      ],
      operatorId: '123e4567-e89b-12d3-a456-426614174003',
      isActive: true,
      optimizationScore: 85,
      estimatedTravelTime: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate correct route data', () => {
      const result = validateRoute(validRoute);
      expect(result.success).toBe(true);
    });

    it('should reject route with less than 2 stops', () => {
      const invalidRoute = { ...validRoute, stops: [validRoute.stops[0]] };
      const result = validateRoute(invalidRoute);
      expect(result.success).toBe(false);
    });

    it('should reject invalid optimization score', () => {
      const invalidRoute = { ...validRoute, optimizationScore: 150 };
      const result = validateRoute(invalidRoute);
      expect(result.success).toBe(false);
    });
  });
});

describe('Validation Utilities', () => {
  describe('Mumbai coordinates validation', () => {
    it('should accept valid Mumbai coordinates', () => {
      const mumbaiCoords = { latitude: 19.0760, longitude: 72.8777 };
      expect(isValidMumbaiCoordinates(mumbaiCoords)).toBe(true);
    });

    it('should reject coordinates outside Mumbai', () => {
      const delhiCoords = { latitude: 28.6139, longitude: 77.2090 };
      expect(isValidMumbaiCoordinates(delhiCoords)).toBe(false);
    });
  });

  describe('Route validation utilities', () => {
    const stops: BusStop[] = [
      {
        id: '1',
        name: 'Stop 1',
        coordinates: { latitude: 19.0760, longitude: 72.8777 },
        address: 'Address 1',
        amenities: [],
        dailyPassengerCount: 1000,
        isAccessible: true,
      },
      {
        id: '2',
        name: 'Stop 2',
        coordinates: { latitude: 19.0860, longitude: 72.8877 },
        address: 'Address 2',
        amenities: [],
        dailyPassengerCount: 1500,
        isAccessible: false,
      },
    ];

    it('should validate unique stop sequence', () => {
      expect(hasValidStopSequence(stops)).toBe(true);
    });

    it('should reject duplicate stops', () => {
      const duplicateStops = [stops[0], stops[0]];
      expect(hasValidStopSequence(duplicateStops)).toBe(false);
    });

    it('should validate reasonable geographic path', () => {
      expect(hasReasonableGeographicPath(stops)).toBe(true);
    });
  });

  describe('Distance calculations', () => {
    it('should calculate distance between coordinates', () => {
      const coord1 = { latitude: 19.0760, longitude: 72.8777 };
      const coord2 = { latitude: 19.0860, longitude: 72.8877 };
      const distance = calculateDistance(coord1, coord2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Should be less than 20km for nearby points
    });

    it('should calculate total route distance', () => {
      const stops: BusStop[] = [
        {
          id: '1',
          name: 'Stop 1',
          coordinates: { latitude: 19.0760, longitude: 72.8777 },
          address: 'Address 1',
          amenities: [],
          dailyPassengerCount: 1000,
          isAccessible: true,
        },
        {
          id: '2',
          name: 'Stop 2',
          coordinates: { latitude: 19.0860, longitude: 72.8877 },
          address: 'Address 2',
          amenities: [],
          dailyPassengerCount: 1500,
          isAccessible: false,
        },
      ];

      const totalDistance = calculateRouteDistance(stops);
      expect(totalDistance).toBeGreaterThan(0);
    });

    it('should estimate travel time correctly', () => {
      const distance = 10; // 10 km
      const speed = 25; // 25 km/h
      const expectedTime = 24; // 24 minutes
      
      expect(estimateTravelTime(distance, speed)).toBe(expectedTime);
    });
  });

  describe('Error formatting', () => {
    it('should format validation errors correctly', () => {
      const invalidData = { email: 'invalid', role: 'invalid' };
      const result = UserSchema.safeParse(invalidData);
      
      if (!result.success) {
        const formattedErrors = formatValidationErrors(result.error);
        expect(typeof formattedErrors).toBe('object');
        expect(Object.keys(formattedErrors).length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// PROPERTY-BASED TESTS
// =============================================================================

describe('Property-Based Tests', () => {
  /**
   * **Feature: city-circuit, Property 19: Route data validation**
   * **Validates: Requirements 5.1**
   * 
   * Property: For any route data update, the system should validate it against 
   * transportation standards before acceptance
   */
  describe('Property 19: Route data validation', () => {
    // Generator for valid Mumbai coordinates with some spread to avoid identical coordinates
    const mumbaiCoordinatesArb = fc.record({
      latitude: fc.double({ min: 18.85, max: 19.25, noNaN: true }),
      longitude: fc.double({ min: 72.75, max: 73.05, noNaN: true }),
    });

    // Generator for valid bus stops with unique IDs and realistic coordinates
    const busStopArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      coordinates: mumbaiCoordinatesArb,
      address: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
      amenities: fc.array(fc.string()),
      dailyPassengerCount: fc.integer({ min: 0, max: 100000 }),
      isAccessible: fc.boolean(),
    });

    // Generator for arrays of unique bus stops with reasonable geographic distribution
    const uniqueStopsArb = fc.array(busStopArb, { minLength: 2, maxLength: 10 })
      .map(stops => {
        // Ensure unique IDs and reasonable geographic distribution
        return stops.map((stop, index) => ({
          ...stop,
          id: `${stop.id.slice(0, -4)}${index.toString().padStart(4, '0')}`,
          coordinates: {
            // Add small offsets to ensure stops aren't at identical coordinates
            latitude: 18.9 + (index * 0.01) + (Math.random() * 0.1),
            longitude: 72.8 + (index * 0.01) + (Math.random() * 0.1),
          },
        }));
      });

    // Generator for valid routes with transportation standards compliance
    const validRouteArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      description: fc.string({ maxLength: 1000 }),
      stops: uniqueStopsArb,
      operatorId: fc.uuid(),
      isActive: fc.boolean(),
      optimizationScore: fc.integer({ min: 0, max: 100 }), // Transportation standard: 0-100 score
      estimatedTravelTime: fc.integer({ min: 1, max: 1440 }), // Transportation standard: 1-1440 minutes (24 hours max)
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

    it('should validate any valid route data against transportation standards', () => {
      fc.assert(
        fc.property(validRouteArb, (routeData) => {
          const result = validateRoute(routeData);
          
          // Property: Valid route data should always pass validation
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Transportation standards validation
            expect(result.data.stops.length).toBeGreaterThanOrEqual(2); // Min 2 stops
            expect(result.data.stops.length).toBeLessThanOrEqual(50); // Max 50 stops for practical routes
            expect(result.data.optimizationScore).toBeGreaterThanOrEqual(0);
            expect(result.data.optimizationScore).toBeLessThanOrEqual(100);
            expect(result.data.estimatedTravelTime).toBeGreaterThan(0);
            expect(result.data.estimatedTravelTime).toBeLessThanOrEqual(1440); // Max 24 hours
            expect(result.data.name.trim().length).toBeGreaterThan(0);
            expect(result.data.name.length).toBeLessThanOrEqual(200);
            
            // All stops should have valid Mumbai coordinates (transportation standard for Mumbai routes)
            result.data.stops.forEach(stop => {
              expect(isValidMumbaiCoordinates(stop.latitude, stop.longitude)).toBe(true);
            });
            
            // Route should have unique stops (no duplicate stops - transportation standard)
            expect(hasValidStopSequence(result.data.stops)).toBe(true);
            
            // Route should have reasonable geographic path (transportation standard)
            expect(hasReasonableGeographicPath(result.data.stops)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    // Generator for invalid route data that violates transportation standards
    const invalidRouteArb = fc.oneof(
      // Route with only 1 stop (violates min 2 stops standard)
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        description: fc.string({ maxLength: 1000 }),
        stops: fc.array(busStopArb, { minLength: 1, maxLength: 1 }),
        operatorId: fc.uuid(),
        isActive: fc.boolean(),
        optimizationScore: fc.integer({ min: 0, max: 100 }),
        estimatedTravelTime: fc.integer({ min: 1, max: 1440 }),
        createdAt: fc.date(),
        updatedAt: fc.date(),
      }),
      // Route with invalid optimization score (violates 0-100 standard)
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        description: fc.string({ maxLength: 1000 }),
        stops: uniqueStopsArb,
        operatorId: fc.uuid(),
        isActive: fc.boolean(),
        optimizationScore: fc.integer({ min: 101, max: 1000 }),
        estimatedTravelTime: fc.integer({ min: 1, max: 1440 }),
        createdAt: fc.date(),
        updatedAt: fc.date(),
      }),
      // Route with invalid travel time (violates max 24 hours standard)
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        description: fc.string({ maxLength: 1000 }),
        stops: uniqueStopsArb,
        operatorId: fc.uuid(),
        isActive: fc.boolean(),
        optimizationScore: fc.integer({ min: 0, max: 100 }),
        estimatedTravelTime: fc.integer({ min: 1441, max: 10000 }),
        createdAt: fc.date(),
        updatedAt: fc.date(),
      }),
      // Route with zero travel time (violates min 1 minute standard)
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        description: fc.string({ maxLength: 1000 }),
        stops: uniqueStopsArb,
        operatorId: fc.uuid(),
        isActive: fc.boolean(),
        optimizationScore: fc.integer({ min: 0, max: 100 }),
        estimatedTravelTime: fc.constant(0),
        createdAt: fc.date(),
        updatedAt: fc.date(),
      }),
      // Route with empty name (violates naming standard)
      fc.record({
        id: fc.uuid(),
        name: fc.constant(''),
        description: fc.string({ maxLength: 1000 }),
        stops: uniqueStopsArb,
        operatorId: fc.uuid(),
        isActive: fc.boolean(),
        optimizationScore: fc.integer({ min: 0, max: 100 }),
        estimatedTravelTime: fc.integer({ min: 1, max: 1440 }),
        createdAt: fc.date(),
        updatedAt: fc.date(),
      })
    );

    it('should reject any route data that violates transportation standards', () => {
      fc.assert(
        fc.property(invalidRouteArb, (invalidRouteData) => {
          const result = validateRoute(invalidRouteData);
          
          // Property: Invalid route data should always fail validation
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    // Test route updates specifically (the core of requirement 5.1)
    it('should validate route updates against transportation standards', () => {
      fc.assert(
        fc.property(
          validRouteArb,
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ maxLength: 1000 }),
            optimizationScore: fc.integer({ min: 0, max: 100 }),
            estimatedTravelTime: fc.integer({ min: 1, max: 1440 }),
          }),
          (originalRoute, updateData) => {
            // Simulate a route update by merging original route with update data
            const updatedRoute = {
              ...originalRoute,
              ...updateData,
              updatedAt: new Date(),
            };
            
            const result = validateRoute(updatedRoute);
            
            // Property: Any valid route update should pass validation
            expect(result.success).toBe(true);
            
            if (result.success) {
              // Ensure transportation standards are still met after update
              expect(result.data.stops.length).toBeGreaterThanOrEqual(2);
              expect(result.data.optimizationScore).toBeGreaterThanOrEqual(0);
              expect(result.data.optimizationScore).toBeLessThanOrEqual(100);
              expect(result.data.estimatedTravelTime).toBeGreaterThan(0);
              expect(result.data.estimatedTravelTime).toBeLessThanOrEqual(1440);
              expect(result.data.name.trim().length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});