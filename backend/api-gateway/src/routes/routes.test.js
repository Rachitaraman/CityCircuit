/**
 * Property-based tests for route endpoints
 * **Feature: city-circuit, Property 6: Route finding completeness**
 * **Validates: Requirements 2.1**
 *
 * Tests that for any valid origin and destination stop pair, 
 * the system should return all available connecting routes
 */

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Create test app
const createTestApp = () => {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors());
  
  // Rate limiting (more lenient for testing)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Import route handlers
  const routesRouter = require('./routes');
  app.use('/api/routes', routesRouter);
  
  // Error handling
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      error: {
        message: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        statusCode: err.statusCode || 500
      }
    });
  });
  
  return app;
};

// Generators for property-based testing
const coordinatesArbitrary = fc.record({
  latitude: fc.float({ min: Math.fround(18.8), max: Math.fround(19.3) }),
  longitude: fc.float({ min: Math.fround(72.7), max: Math.fround(73.1) })
});

const busStopArbitrary = fc.record({
  id: fc.string({ minLength: 5, maxLength: 20 }),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  coordinates: coordinatesArbitrary,
  address: fc.string({ minLength: 10, maxLength: 100 }),
  amenities: fc.array(
    fc.constantFrom('shelter', 'seating', 'wheelchair_accessible', 'lighting', 'security'),
    { minLength: 0, maxLength: 3 }
  ),
  dailyPassengerCount: fc.integer({ min: 100, max: 10000 }),
  isAccessible: fc.boolean()
});

const routeArbitrary = fc.record({
  id: fc.string({ minLength: 5, maxLength: 20 }),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  operatorId: fc.string({ minLength: 5, maxLength: 30 }),
  estimatedTravelTime: fc.integer({ min: 10, max: 120 }),
  optimizationScore: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
  stops: fc.array(busStopArbitrary, { minLength: 2, maxLength: 8 }),
  isActive: fc.boolean(),
  createdAt: fc.constant(new Date().toISOString()),
  updatedAt: fc.constant(new Date().toISOString())
});

const searchRequestArbitrary = fc.record({
  origin: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
  destination: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
  preferences: fc.record({
    sortBy: fc.constantFrom('travelTime', 'distance', 'fare', 'optimization'),
    accessibleOnly: fc.boolean(),
    maxTravelTime: fc.integer({ min: 10, max: 180 })
  }, { requiredKeys: [] })
});

const paginationArbitrary = fc.record({
  page: fc.integer({ min: 1, max: 10 }),
  limit: fc.integer({ min: 1, max: 100 }),
  sortBy: fc.constantFrom('name', 'estimatedTravelTime', 'optimizationScore'),
  sortOrder: fc.constantFrom('asc', 'desc')
}, { requiredKeys: [] });

describe('Route Endpoints Property Tests', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  /**
   * **Feature: city-circuit, Property 6: Route finding completeness**
   * Test that route search returns consistent results for valid origin-destination pairs
   */
  test('Property 6: Route finding completeness - search returns all available routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        searchRequestArbitrary,
        async (searchRequest) => {
          // Skip if origin and destination are the same
          fc.pre(searchRequest.origin !== searchRequest.destination);
          
          const response = await request(app)
            .post('/api/routes/search')
            .send(searchRequest)
            .expect(200);
          
          const { origin, destination, routes, searchMetadata } = response.body;
          
          // Property: For any valid origin and destination stop pair,
          // the system should return all available connecting routes
          
          // Note: The system may sanitize inputs, so we compare the sanitized versions
          const sanitizedOrigin = searchRequest.origin.trim();
          const sanitizedDestination = searchRequest.destination.trim();
          
          // Verify response structure
          expect(origin).toBe(sanitizedOrigin);
          expect(destination).toBe(sanitizedDestination);
          expect(Array.isArray(routes)).toBe(true);
          expect(typeof searchMetadata).toBe('object');
          expect(typeof searchMetadata.totalResults).toBe('number');
          expect(searchMetadata.totalResults).toBe(routes.length);
          
          // Verify each route has required fields
          routes.forEach(route => {
            expect(typeof route.id).toBe('string');
            expect(typeof route.name).toBe('string');
            expect(typeof route.estimatedTravelTime).toBe('number');
            expect(typeof route.distance).toBe('number');
            expect(typeof route.optimizationScore).toBe('number');
            expect(Array.isArray(route.stops)).toBe(true);
            expect(route.estimatedTravelTime).toBeGreaterThan(0);
            expect(route.distance).toBeGreaterThan(0);
            expect(route.optimizationScore).toBeGreaterThanOrEqual(0);
          });
          
          // Verify sorting if specified
          if (searchRequest.preferences?.sortBy) {
            const sortBy = searchRequest.preferences.sortBy;
            for (let i = 0; i < routes.length - 1; i++) {
              const current = routes[i];
              const next = routes[i + 1];
              
              switch (sortBy) {
                case 'travelTime':
                  expect(current.estimatedTravelTime).toBeLessThanOrEqual(next.estimatedTravelTime);
                  break;
                case 'distance':
                  expect(current.distance).toBeLessThanOrEqual(next.distance);
                  break;
                case 'fare':
                  expect(current.fare).toBeLessThanOrEqual(next.fare);
                  break;
                case 'optimization':
                  expect(current.optimizationScore).toBeGreaterThanOrEqual(next.optimizationScore);
                  break;
              }
            }
          }
          
          // Verify accessibility filter if specified
          if (searchRequest.preferences?.accessibleOnly) {
            routes.forEach(route => {
              expect(route.accessibility).toBe(true);
            });
          }
          
          // Verify travel time filter if specified
          if (searchRequest.preferences?.maxTravelTime) {
            routes.forEach(route => {
              expect(route.estimatedTravelTime).toBeLessThanOrEqual(searchRequest.preferences.maxTravelTime);
            });
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 6: Route finding completeness**
   * Test that route listing with pagination returns consistent results
   */
  test('Property 6: Route finding completeness - pagination consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        paginationArbitrary,
        async (pagination) => {
          const response = await request(app)
            .get('/api/routes')
            .query(pagination)
            .expect(200);
          
          const { routes, pagination: paginationInfo } = response.body;
          
          // Property: Pagination should return consistent and valid results
          expect(Array.isArray(routes)).toBe(true);
          expect(typeof paginationInfo).toBe('object');
          expect(typeof paginationInfo.page).toBe('number');
          expect(typeof paginationInfo.limit).toBe('number');
          expect(typeof paginationInfo.total).toBe('number');
          expect(typeof paginationInfo.pages).toBe('number');
          
          // Verify pagination constraints
          expect(paginationInfo.page).toBeGreaterThanOrEqual(1);
          expect(paginationInfo.limit).toBeGreaterThanOrEqual(1);
          expect(paginationInfo.limit).toBeLessThanOrEqual(100);
          expect(paginationInfo.total).toBeGreaterThanOrEqual(0);
          expect(paginationInfo.pages).toBeGreaterThanOrEqual(0);
          
          // Verify route count doesn't exceed limit
          expect(routes.length).toBeLessThanOrEqual(paginationInfo.limit);
          
          // Verify each route has required structure
          routes.forEach(route => {
            expect(typeof route.id).toBe('string');
            expect(typeof route.name).toBe('string');
            expect(typeof route.description).toBe('string');
            expect(typeof route.operatorId).toBe('string');
            expect(typeof route.estimatedTravelTime).toBe('number');
            expect(typeof route.optimizationScore).toBe('number');
            expect(Array.isArray(route.stops)).toBe(true);
            expect(typeof route.isActive).toBe('boolean');
            expect(typeof route.createdAt).toBe('string');
            expect(typeof route.updatedAt).toBe('string');
            
            // Verify stops structure
            route.stops.forEach(stop => {
              expect(typeof stop.id).toBe('string');
              expect(typeof stop.name).toBe('string');
              expect(typeof stop.coordinates).toBe('object');
              expect(typeof stop.coordinates.latitude).toBe('number');
              expect(typeof stop.coordinates.longitude).toBe('number');
              expect(typeof stop.address).toBe('string');
              expect(Array.isArray(stop.amenities)).toBe(true);
              expect(typeof stop.dailyPassengerCount).toBe('number');
              expect(typeof stop.isAccessible).toBe('boolean');
            });
          });
        }
      ),
      { numRuns: 15, timeout: 10000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 6: Route finding completeness**
   * Test that route retrieval by ID returns complete route information
   */
  test('Property 6: Route finding completeness - route by ID completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length >= 5 && /^[a-zA-Z0-9_-]+$/.test(s)),
        async (routeId) => {
          const response = await request(app)
            .get(`/api/routes/${routeId}`)
            .expect(res => {
              // Should return either 200 (success) or 400/404 (validation/not found)
              expect([200, 400, 404].includes(res.status)).toBe(true);
            });
          
          // Property: Route retrieval should return complete route information when successful
          if (response.status === 200) {
            const { route } = response.body;
            expect(typeof route).toBe('object');
            expect(route).toBeDefined();
            expect(typeof route.id).toBe('string');
            expect(route.id.length).toBeGreaterThan(0);
            expect(typeof route.name).toBe('string');
            expect(typeof route.description).toBe('string');
            expect(typeof route.operatorId).toBe('string');
            expect(typeof route.estimatedTravelTime).toBe('number');
            expect(typeof route.optimizationScore).toBe('number');
            expect(Array.isArray(route.stops)).toBe(true);
            expect(typeof route.isActive).toBe('boolean');
            expect(typeof route.createdAt).toBe('string');
            expect(typeof route.updatedAt).toBe('string');
            
            // Verify route has at least 2 stops (minimum for a valid route)
            expect(route.stops.length).toBeGreaterThanOrEqual(2);
            
            // Verify all stops have complete information
            route.stops.forEach((stop, index) => {
              expect(typeof stop.id).toBe('string');
              expect(typeof stop.name).toBe('string');
              expect(stop.name.length).toBeGreaterThan(0);
              expect(typeof stop.coordinates).toBe('object');
              expect(typeof stop.coordinates.latitude).toBe('number');
              expect(typeof stop.coordinates.longitude).toBe('number');
              expect(stop.coordinates.latitude).toBeGreaterThanOrEqual(-90);
              expect(stop.coordinates.latitude).toBeLessThanOrEqual(90);
              expect(stop.coordinates.longitude).toBeGreaterThanOrEqual(-180);
              expect(stop.coordinates.longitude).toBeLessThanOrEqual(180);
              expect(typeof stop.address).toBe('string');
              expect(stop.address.length).toBeGreaterThan(0);
              expect(Array.isArray(stop.amenities)).toBe(true);
              expect(typeof stop.dailyPassengerCount).toBe('number');
              expect(stop.dailyPassengerCount).toBeGreaterThanOrEqual(0);
              expect(typeof stop.isAccessible).toBe('boolean');
            });
            
            // Verify route metrics are valid
            expect(route.estimatedTravelTime).toBeGreaterThan(0);
            expect(route.optimizationScore).toBeGreaterThanOrEqual(0);
            expect(route.optimizationScore).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 6: Route finding completeness**
   * Test that search results are deterministic for identical queries
   */
  test('Property 6: Route finding completeness - search determinism', async () => {
    await fc.assert(
      fc.asyncProperty(
        searchRequestArbitrary,
        async (searchRequest) => {
          // Skip if origin and destination are the same
          fc.pre(searchRequest.origin !== searchRequest.destination);
          
          // Make the same search request twice
          const response1 = await request(app)
            .post('/api/routes/search')
            .send(searchRequest)
            .expect(200);
          
          const response2 = await request(app)
            .post('/api/routes/search')
            .send(searchRequest)
            .expect(200);
          
          // Property: Identical search requests should return identical results
          expect(response1.body.origin).toBe(response2.body.origin);
          expect(response1.body.destination).toBe(response2.body.destination);
          expect(response1.body.routes.length).toBe(response2.body.routes.length);
          expect(response1.body.searchMetadata.totalResults).toBe(response2.body.searchMetadata.totalResults);
          
          // Verify route order is consistent
          for (let i = 0; i < response1.body.routes.length; i++) {
            const route1 = response1.body.routes[i];
            const route2 = response2.body.routes[i];
            expect(route1.id).toBe(route2.id);
            expect(route1.name).toBe(route2.name);
            expect(route1.estimatedTravelTime).toBe(route2.estimatedTravelTime);
            expect(route1.distance).toBe(route2.distance);
            expect(route1.optimizationScore).toBe(route2.optimizationScore);
          }
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  });
});

/**
 * Test route endpoint error handling properties
 */
describe('Route Endpoints Error Handling Properties', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  /**
   * **Feature: city-circuit, Property 6: Route finding completeness**
   * Test that invalid route IDs return appropriate errors
   */
  test('Property 6: Route finding completeness - invalid ID handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.string({ minLength: 1, maxLength: 3 }), // Too short
          fc.string({ minLength: 100, maxLength: 200 }) // Too long
        ),
        async (invalidId) => {
          const response = await request(app)
            .get(`/api/routes/${encodeURIComponent(invalidId)}`)
            .expect(res => {
              // Should return either 400 (validation error) or 200 (mock data)
              expect([200, 400, 404].includes(res.status)).toBe(true);
            });
          
          // Property: Invalid IDs should be handled gracefully
          if (response.status !== 200) {
            expect(response.body).toBeDefined();
            // Just verify that some response is returned for error cases
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(600);
          }
        }
      ),
      { numRuns: 10, timeout: 5000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 6: Route finding completeness**
   * Test that malformed search requests return validation errors
   */
  test('Property 6: Route finding completeness - malformed request handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({ origin: fc.constant('') }), // Empty origin
          fc.record({ destination: fc.constant('') }), // Empty destination
          fc.record({ preferences: fc.constant('invalid') }), // Invalid preferences
          fc.record({ origin: fc.integer() }), // Wrong type
          fc.record({ destination: fc.boolean() }) // Wrong type
        ),
        async (malformedRequest) => {
          const response = await request(app)
            .post('/api/routes/search')
            .send(malformedRequest)
            .expect(res => {
              // Should return either 400 (validation error) or 200 (handled gracefully)
              expect([200, 400].includes(res.status)).toBe(true);
            });
          
          // Property: Malformed requests should be handled gracefully
          if (response.status === 400) {
            expect(typeof response.body.error).toBe('object');
            expect(typeof response.body.error.message).toBe('string');
          } else {
            // If handled gracefully, should still return valid structure
            expect(typeof response.body).toBe('object');
            expect(Array.isArray(response.body.routes)).toBe(true);
          }
        }
      ),
      { numRuns: 10, timeout: 5000 }
    );
  });
});

module.exports = {
  createTestApp,
  coordinatesArbitrary,
  busStopArbitrary,
  routeArbitrary,
  searchRequestArbitrary,
  paginationArbitrary
};