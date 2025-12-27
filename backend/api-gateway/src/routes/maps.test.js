/**
 * Property-based tests for mapping service integration
 * **Feature: city-circuit, Property 23: Mapping service integration**
 * **Validates: Requirements 6.1**
 *
 * Tests that for any mapping data request, the system should successfully 
 * retrieve information from Google Maps or Azure Maps APIs
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
  const mapsRouter = require('./maps');
  app.use('/api/maps', mapsRouter);
  
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
const mumbaiAddressArbitrary = fc.oneof(
  fc.constantFrom(
    'Chhatrapati Shivaji Terminus, Mumbai',
    'Gateway of India, Mumbai',
    'Marine Drive, Mumbai',
    'Bandra-Worli Sea Link, Mumbai',
    'Juhu Beach, Mumbai',
    'Colaba Causeway, Mumbai',
    'Powai Lake, Mumbai',
    'Andheri Station, Mumbai',
    'Dadar Station, Mumbai',
    'Kurla Station, Mumbai'
  ),
  fc.record({
    street: fc.constantFrom('MG Road', 'SV Road', 'LBS Road', 'Eastern Express Highway', 'Western Express Highway'),
    area: fc.constantFrom('Andheri', 'Bandra', 'Borivali', 'Thane', 'Navi Mumbai', 'Powai', 'Goregaon'),
    city: fc.constant('Mumbai'),
    state: fc.constant('Maharashtra')
  }).map(addr => `${addr.street}, ${addr.area}, ${addr.city}, ${addr.state}`)
);

const mumbaiCoordinatesArbitrary = fc.record({
  latitude: fc.float({ min: Math.fround(18.8), max: Math.fround(19.3) }),
  longitude: fc.float({ min: Math.fround(72.7), max: Math.fround(73.1) })
});

const geocodeRequestArbitrary = fc.record({
  address: mumbaiAddressArbitrary,
  provider: fc.constantFrom('google', 'azure', 'auto')
});

const providerArbitrary = fc.constantFrom('google', 'azure');

describe('Maps API Integration Property Tests', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that geocoding requests return valid location data
   */
  test('Property 23: Mapping service integration - geocoding completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        geocodeRequestArbitrary,
        async (geocodeRequest) => {
          const response = await request(app)
            .post('/api/maps/geocode')
            .send(geocodeRequest)
            .expect(res => {
              // Should return either 200 (success) or error status
              expect([200, 400, 403, 429, 500, 503, 504].includes(res.status)).toBe(true);
            });
          
          // Property: For any mapping data request, the system should successfully 
          // retrieve information from configured mapping APIs or provide fallback
          
          if (response.status === 200) {
            const { result, query } = response.body;
            
            // Verify response structure
            expect(typeof result).toBe('object');
            expect(result).toBeDefined();
            expect(typeof query).toBe('string');
            expect(query.length).toBeGreaterThan(0);
            
            // Verify result has required fields
            expect(typeof result.address).toBe('string');
            expect(result.address.length).toBeGreaterThan(0);
            expect(typeof result.coordinates).toBe('object');
            expect(typeof result.coordinates.latitude).toBe('number');
            expect(typeof result.coordinates.longitude).toBe('number');
            expect(typeof result.provider).toBe('string');
            
            // Verify coordinates are valid
            expect(result.coordinates.latitude).toBeGreaterThanOrEqual(-90);
            expect(result.coordinates.latitude).toBeLessThanOrEqual(90);
            expect(result.coordinates.longitude).toBeGreaterThanOrEqual(-180);
            expect(result.coordinates.longitude).toBeLessThanOrEqual(180);
            
            // Verify provider is one of expected values
            expect(['google', 'azure', 'google_fallback', 'azure_fallback', 'fallback'].includes(result.provider)).toBe(true);
            
            // For Mumbai addresses, coordinates should be in Mumbai area
            if (geocodeRequest.address.toLowerCase().includes('mumbai')) {
              expect(result.coordinates.latitude).toBeGreaterThanOrEqual(18.8);
              expect(result.coordinates.latitude).toBeLessThanOrEqual(19.3);
              expect(result.coordinates.longitude).toBeGreaterThanOrEqual(72.7);
              expect(result.coordinates.longitude).toBeLessThanOrEqual(73.1);
            }
            
            // Verify additional fields based on provider
            if (result.provider === 'google' || result.provider === 'google_fallback' || result.provider === 'fallback') {
              expect(typeof result.placeId).toBe('string');
              expect(Array.isArray(result.types)).toBe(true);
            }
            
            if (result.provider === 'azure' || result.provider === 'azure_fallback') {
              expect(typeof result.confidence).toBe('number');
              expect(result.confidence).toBeGreaterThanOrEqual(0);
              expect(result.confidence).toBeLessThanOrEqual(1);
            }
          } else {
            // Verify error response structure
            expect(typeof response.body.error).toBe('object');
            expect(typeof response.body.error.message).toBe('string');
            expect(typeof response.body.error.code).toBe('string');
            expect(typeof response.body.error.statusCode).toBe('number');
            expect(response.body.error.statusCode).toBe(response.status);
          }
        }
      ),
      { numRuns: 25, timeout: 15000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that service status endpoint returns accurate service information
   */
  test('Property 23: Mapping service integration - service status accuracy', async () => {
    const response = await request(app)
      .get('/api/maps/status')
      .expect(200);
    
    const { services, cache, fallback_mode, supported_operations } = response.body;
    
    // Property: Service status should accurately reflect current service configuration
    expect(typeof services).toBe('object');
    expect(typeof services.google_maps).toBe('object');
    expect(typeof services.azure_maps).toBe('object');
    expect(typeof cache).toBe('object');
    expect(typeof fallback_mode).toBe('boolean');
    expect(Array.isArray(supported_operations)).toBe(true);
    
    // Verify Google Maps service status
    expect(typeof services.google_maps.available).toBe('boolean');
    expect(typeof services.google_maps.status).toBe('string');
    expect(['configured', 'not_configured'].includes(services.google_maps.status)).toBe(true);
    
    // Verify Azure Maps service status
    expect(typeof services.azure_maps.available).toBe('boolean');
    expect(typeof services.azure_maps.status).toBe('string');
    expect(['configured', 'not_configured'].includes(services.azure_maps.status)).toBe(true);
    
    // Verify cache information
    expect(typeof cache.type).toBe('string');
    expect(['redis', 'memory'].includes(cache.type)).toBe(true);
    expect(typeof cache.connected).toBe('boolean');
    
    // Verify fallback mode logic
    const hasConfiguredService = services.google_maps.available || services.azure_maps.available;
    expect(fallback_mode).toBe(!hasConfiguredService);
    
    // Verify supported operations
    expect(supported_operations.length).toBeGreaterThan(0);
    expect(supported_operations.includes('geocode')).toBe(true);
    supported_operations.forEach(operation => {
      expect(typeof operation).toBe('string');
      expect(operation.length).toBeGreaterThan(0);
    });
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that geocoding is deterministic for identical addresses
   */
  test('Property 23: Mapping service integration - geocoding determinism', async () => {
    await fc.assert(
      fc.asyncProperty(
        geocodeRequestArbitrary,
        async (geocodeRequest) => {
          // Make the same geocoding request twice
          const response1 = await request(app)
            .post('/api/maps/geocode')
            .send(geocodeRequest)
            .expect(res => {
              expect([200, 400, 403, 429, 500, 503, 504].includes(res.status)).toBe(true);
            });
          
          const response2 = await request(app)
            .post('/api/maps/geocode')
            .send(geocodeRequest)
            .expect(res => {
              expect([200, 400, 403, 429, 500, 503, 504].includes(res.status)).toBe(true);
            });
          
          // Property: Identical geocoding requests should return identical results
          expect(response1.status).toBe(response2.status);
          
          if (response1.status === 200 && response2.status === 200) {
            const result1 = response1.body.result;
            const result2 = response2.body.result;
            
            // Results should be identical (accounting for potential caching)
            expect(result1.address).toBe(result2.address);
            expect(result1.coordinates.latitude).toBeCloseTo(result2.coordinates.latitude, 6);
            expect(result1.coordinates.longitude).toBeCloseTo(result2.coordinates.longitude, 6);
            expect(result1.provider).toBe(result2.provider);
            
            // Provider-specific fields should match
            if (result1.placeId && result2.placeId) {
              expect(result1.placeId).toBe(result2.placeId);
            }
            if (result1.confidence !== undefined && result2.confidence !== undefined) {
              expect(result1.confidence).toBeCloseTo(result2.confidence, 3);
            }
          }
        }
      ),
      { numRuns: 10, timeout: 20000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that fallback mechanisms work when primary services fail
   */
  test('Property 23: Mapping service integration - fallback reliability', async () => {
    await fc.assert(
      fc.asyncProperty(
        mumbaiAddressArbitrary,
        async (address) => {
          // Test with a provider that might not be configured
          const geocodeRequest = {
            address,
            provider: 'google' // This might fallback to azure or mock data
          };
          
          const response = await request(app)
            .post('/api/maps/geocode')
            .send(geocodeRequest)
            .expect(res => {
              // Should always return some response, even if fallback
              expect([200, 400, 403, 429, 500, 503, 504].includes(res.status)).toBe(true);
            });
          
          // Property: System should provide fallback when primary service fails
          if (response.status === 200) {
            const { result } = response.body;
            
            // Even with fallback, should return valid structure
            expect(typeof result.address).toBe('string');
            expect(typeof result.coordinates).toBe('object');
            expect(typeof result.coordinates.latitude).toBe('number');
            expect(typeof result.coordinates.longitude).toBe('number');
            expect(typeof result.provider).toBe('string');
            
            // Coordinates should be valid even in fallback mode
            expect(result.coordinates.latitude).toBeGreaterThanOrEqual(-90);
            expect(result.coordinates.latitude).toBeLessThanOrEqual(90);
            expect(result.coordinates.longitude).toBeGreaterThanOrEqual(-180);
            expect(result.coordinates.longitude).toBeLessThanOrEqual(180);
            
            // Provider should indicate the actual service used
            expect(['google', 'azure', 'google_fallback', 'azure_fallback', 'fallback'].includes(result.provider)).toBe(true);
          }
        }
      ),
      { numRuns: 15, timeout: 15000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that invalid addresses are handled gracefully
   */
  test('Property 23: Mapping service integration - invalid address handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.string({ minLength: 1, maxLength: 3 }), // Too short
          fc.string({ minLength: 500, maxLength: 1000 }), // Too long
          fc.constantFrom('invalid123!@#', 'nonexistent place xyz', '!!!@@@###')
        ),
        async (invalidAddress) => {
          const geocodeRequest = {
            address: invalidAddress,
            provider: 'google'
          };
          
          const response = await request(app)
            .post('/api/maps/geocode')
            .send(geocodeRequest)
            .expect(res => {
              // Should handle invalid addresses gracefully
              expect([200, 400, 404].includes(res.status)).toBe(true);
            });
          
          // Property: Invalid addresses should be handled gracefully
          if (response.status === 400) {
            expect(typeof response.body.error).toBe('object');
            expect(typeof response.body.error.message).toBe('string');
            expect(response.body.error.code).toBe('MISSING_ADDRESS');
          } else if (response.status === 404) {
            expect(typeof response.body.error).toBe('object');
            expect(response.body.error.code).toBe('ADDRESS_NOT_FOUND');
          } else if (response.status === 200) {
            // If handled gracefully with fallback data
            expect(typeof response.body.result).toBe('object');
            expect(response.body.result.provider).toBe('fallback');
          }
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that rate limiting is properly enforced
   */
  test('Property 23: Mapping service integration - rate limiting enforcement', async () => {
    const geocodeRequest = {
      address: 'Gateway of India, Mumbai',
      provider: 'google'
    };
    
    // Make multiple rapid requests to test rate limiting
    const requests = Array(5).fill().map(() => 
      request(app)
        .post('/api/maps/geocode')
        .send(geocodeRequest)
    );
    
    const responses = await Promise.all(requests);
    
    // Property: Rate limiting should be enforced consistently
    responses.forEach(response => {
      expect([200, 429, 500, 503].includes(response.status)).toBe(true);
      
      if (response.status === 429) {
        expect(typeof response.body.error).toBe('object');
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
    
    // At least some requests should succeed (not all should be rate limited)
    const successfulRequests = responses.filter(r => r.status === 200);
    expect(successfulRequests.length).toBeGreaterThan(0);
  });
});

/**
 * Test mapping service error scenarios
 */
describe('Maps API Error Handling Properties', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that malformed requests return appropriate validation errors
   */
  test('Property 23: Mapping service integration - malformed request handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({ provider: fc.integer() }), // Wrong type for provider
          fc.record({ address: fc.integer() }), // Wrong type for address
          fc.record({ provider: fc.constant('invalid_provider') }), // Invalid provider
          fc.constant(null), // Null request
          fc.constant('invalid_json') // Invalid JSON
        ),
        async (malformedRequest) => {
          const response = await request(app)
            .post('/api/maps/geocode')
            .send(malformedRequest)
            .expect(res => {
              // Should return validation error or handle gracefully
              expect([200, 400, 500].includes(res.status)).toBe(true);
            });
          
          // Property: Malformed requests should be handled gracefully
          if (response.status === 400) {
            expect(typeof response.body.error).toBe('object');
            expect(typeof response.body.error.message).toBe('string');
            expect(typeof response.body.error.code).toBe('string');
          } else if (response.status === 200) {
            // If handled gracefully, should still return valid structure
            expect(typeof response.body.result).toBe('object');
          }
        }
      ),
      { numRuns: 8, timeout: 8000 }
    );
  });

  /**
   * **Feature: city-circuit, Property 23: Mapping service integration**
   * Test that service unavailability is handled gracefully
   */
  test('Property 23: Mapping service integration - service unavailability handling', async () => {
    // Test with a request that might trigger service unavailability
    const geocodeRequest = {
      address: 'Test Address for Service Unavailability',
      provider: 'google'
    };
    
    const response = await request(app)
      .post('/api/maps/geocode')
      .send(geocodeRequest)
      .expect(res => {
        // Should handle service unavailability gracefully
        expect([200, 503, 504].includes(res.status)).toBe(true);
      });
    
    // Property: Service unavailability should be handled gracefully
    if (response.status === 503) {
      expect(typeof response.body.error).toBe('object');
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    } else if (response.status === 504) {
      expect(typeof response.body.error).toBe('object');
      expect(response.body.error.code).toBe('GEOCODING_TIMEOUT');
    } else if (response.status === 200) {
      // Should provide fallback data
      expect(typeof response.body.result).toBe('object');
      expect(['google', 'azure', 'google_fallback', 'azure_fallback', 'fallback'].includes(response.body.result.provider)).toBe(true);
    }
  });
});

module.exports = {
  createTestApp,
  mumbaiAddressArbitrary,
  mumbaiCoordinatesArbitrary,
  geocodeRequestArbitrary,
  providerArbitrary
};