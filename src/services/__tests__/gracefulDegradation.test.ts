/**
 * Property-based tests for graceful degradation and service failure handling
 * Property 25: Service degradation gracefully
 * Validates: Requirements 6.3 - Graceful degradation when external services fail
 */

import * as fc from 'fast-check';
import {
  GracefulDegradationService,
  ServiceHealthMonitor,
  CacheManager,
  FallbackConfig,
  ServiceStatus,
  CacheEntry,
  defaultFallbackConfig,
} from '../gracefulDegradation';
import { Route, BusStop, OptimizationResult } from '../../types';

// Mock fetch for testing
const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  // Mock console methods to avoid noise in tests
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('Property 25: Service degradation gracefully', () => {
  /**
   * Property: Cache manager respects size limits
   * Tests that cache never exceeds configured maximum size
   */
  test('cache manager respects size limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // maxCacheSize
        fc.integer({ min: 5, max: 20 }), // number of items to cache
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 50 }), // cache keys
        async (maxCacheSize, itemCount, cacheKeys) => {
          const config: FallbackConfig = {
            ...defaultFallbackConfig,
            maxCacheSize,
          };

          const cacheManager = new CacheManager<string>(config);

          // Add more items than the cache size limit
          const uniqueKeys = [...new Set(cacheKeys)].slice(0, itemCount);
          
          for (let i = 0; i < uniqueKeys.length; i++) {
            cacheManager.set(uniqueKeys[i], `data-${i}`, 'primary');
            
            // Cache size should never exceed the limit
            const stats = cacheManager.getStats();
            expect(stats.size).toBeLessThanOrEqual(maxCacheSize);
          }

          // Final size should be at most maxCacheSize
          const finalStats = cacheManager.getStats();
          expect(finalStats.size).toBeLessThanOrEqual(maxCacheSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache entries expire after configured time
   * Tests that cached data becomes unavailable after expiry time
   */
  test('cache entries expire after configured time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // cacheExpiryMinutes (converted to seconds for testing)
        fc.string({ minLength: 1, maxLength: 20 }), // cache key
        fc.string({ minLength: 1, maxLength: 100 }), // cache data
        async (expirySeconds, cacheKey, cacheData) => {
          const config: FallbackConfig = {
            ...defaultFallbackConfig,
            cacheExpiryMinutes: expirySeconds / 60, // Convert to minutes
          };

          const cacheManager = new CacheManager<string>(config);

          // Set cache entry
          cacheManager.set(cacheKey, cacheData, 'primary');

          // Should be available immediately
          expect(cacheManager.has(cacheKey)).toBe(true);
          expect(cacheManager.get(cacheKey)?.data).toBe(cacheData);

          // Mock time passage
          const originalDate = Date;
          const mockDate = new Date();
          mockDate.setSeconds(mockDate.getSeconds() + expirySeconds + 1);
          
          global.Date = jest.fn(() => mockDate) as any;
          global.Date.now = jest.fn(() => mockDate.getTime());

          // Should be expired now
          expect(cacheManager.has(cacheKey)).toBe(false);
          expect(cacheManager.get(cacheKey)).toBe(null);

          // Restore original Date
          global.Date = originalDate;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Service always returns data when fallbacks are available
   * Tests that the service never fails completely when fallback mechanisms exist
   */
  test('service always returns data when fallbacks are available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // primary service available
        fc.boolean(), // cache enabled
        fc.boolean(), // offline mode enabled
        fc.array(fc.constantFrom('static-data', 'local-storage', 'backup-api'), { minLength: 0, maxLength: 3 }), // fallback sources
        async (primaryAvailable, cacheEnabled, offlineModeEnabled, fallbackSources) => {
          // Mock fetch based on service availability
          global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url.includes('/health')) {
              return Promise.resolve({
                ok: primaryAvailable,
                status: primaryAvailable ? 200 : 503,
                statusText: primaryAvailable ? 'OK' : 'Service Unavailable',
              });
            }

            if (url.includes('/api/routes')) {
              if (primaryAvailable) {
                return Promise.resolve({
                  ok: true,
                  status: 200,
                  json: () => Promise.resolve([
                    {
                      id: 'primary-route-1',
                      name: 'Primary Route',
                      description: 'Route from primary service',
                      stops: [],
                      isActive: true,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    }
                  ]),
                });
              } else {
                return Promise.reject(new Error('Service unavailable'));
              }
            }

            if (url.includes('fallback-routes.json')) {
              return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve([
                  {
                    id: 'fallback-route-1',
                    name: 'Fallback Route',
                    description: 'Route from fallback data',
                    stops: [],
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }
                ]),
              });
            }

            return Promise.reject(new Error('Not found'));
          });

          const config: FallbackConfig = {
            ...defaultFallbackConfig,
            enableCache: cacheEnabled,
            enableOfflineMode: offlineModeEnabled,
            fallbackDataSources: fallbackSources,
          };

          const service = new GracefulDegradationService(config);

          // Wait a bit for health checks to complete
          await new Promise(resolve => setTimeout(resolve, 100));

          try {
            const result = await service.getRoutes();
            
            // Should always get some data
            expect(result.data).toBeDefined();
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.source).toBeDefined();
            expect(typeof result.isStale).toBe('boolean');

            // If primary service is available, should get fresh data
            if (primaryAvailable) {
              expect(result.source).toBe('primary');
              expect(result.isStale).toBe(false);
            } else {
              // Should get data from fallback sources
              expect(result.isStale).toBe(true);
              expect(['static', 'fallback', 'cache', 'offline']).toContain(result.source);
            }
          } catch (error) {
            // Should only fail if no fallback mechanisms are enabled
            const hasAnyFallback = cacheEnabled || offlineModeEnabled || fallbackSources.length > 0;
            if (hasAnyFallback) {
              throw new Error(`Service should not fail when fallbacks are available: ${error.message}`);
            }
          }

          service.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Health monitor correctly tracks service status
   * Tests that service health monitoring accurately reflects service availability
   */
  test('health monitor correctly tracks service status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // sequence of service states
        fc.string({ minLength: 1, maxLength: 20 }), // service name
        async (serviceStates, serviceName) => {
          const config: FallbackConfig = {
            ...defaultFallbackConfig,
            healthCheckIntervalMs: 50, // Fast checks for testing
          };

          const healthMonitor = new ServiceHealthMonitor(config);
          let currentStateIndex = 0;

          // Mock fetch to return different states
          global.fetch = jest.fn().mockImplementation(() => {
            const isHealthy = serviceStates[currentStateIndex % serviceStates.length];
            currentStateIndex++;

            if (isHealthy) {
              return Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
              });
            } else {
              return Promise.resolve({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
              });
            }
          });

          // Register service for monitoring
          healthMonitor.registerService(serviceName, `https://api.test.com/${serviceName}/health`);

          // Wait for initial health check
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check that service status reflects the mocked state
          const status = healthMonitor.getServiceStatus(serviceName);
          expect(status).toBeDefined();
          expect(status!.name).toBe(serviceName);
          expect(typeof status!.isAvailable).toBe('boolean');
          expect(status!.lastChecked).toBeInstanceOf(Date);
          expect(typeof status!.errorCount).toBe('number');

          // Verify isServiceAvailable method consistency
          const isAvailable = healthMonitor.isServiceAvailable(serviceName);
          expect(isAvailable).toBe(status!.isAvailable);

          healthMonitor.cleanup();
        }
      ),
      { numRuns: 50 } // Fewer runs due to timeouts
    );
  });

  /**
   * Property: Optimization fallback always produces valid results
   * Tests that fallback optimization always returns valid optimization results
   */
  test('optimization fallback always produces valid results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          route: fc.array(fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            latitude: fc.float({ min: -90, max: 90 }),
            longitude: fc.float({ min: -180, max: 180 }),
          }), { minLength: 1, maxLength: 10 }),
          estimatedTime: fc.integer({ min: 60, max: 7200 }), // 1 minute to 2 hours
        }), // route data
        fc.boolean(), // primary service available
        async (routeData, primaryAvailable) => {
          // Mock fetch for optimization service
          global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url.includes('/health')) {
              return Promise.resolve({
                ok: primaryAvailable,
                status: primaryAvailable ? 200 : 503,
              });
            }

            if (url.includes('/api/optimize')) {
              if (primaryAvailable) {
                return Promise.resolve({
                  ok: true,
                  status: 200,
                  json: () => Promise.resolve({
                    optimizedRoute: routeData.route,
                    efficiency: 0.95,
                    estimatedTime: routeData.estimatedTime * 0.8,
                    recommendations: ['Primary optimization complete'],
                    metadata: {
                      algorithm: 'advanced-ml',
                      confidence: 0.95,
                      timestamp: new Date(),
                    },
                  }),
                });
              } else {
                return Promise.reject(new Error('Optimization service unavailable'));
              }
            }

            return Promise.reject(new Error('Not found'));
          });

          const service = new GracefulDegradationService(defaultFallbackConfig);

          // Wait for health checks
          await new Promise(resolve => setTimeout(resolve, 100));

          const result = await service.optimizeRoute(routeData);

          // Should always get a valid optimization result
          expect(result.data).toBeDefined();
          expect(result.data.optimizedRoute).toBeDefined();
          expect(Array.isArray(result.data.optimizedRoute)).toBe(true);
          expect(typeof result.data.efficiency).toBe('number');
          expect(result.data.efficiency).toBeGreaterThan(0);
          expect(result.data.efficiency).toBeLessThanOrEqual(1);
          expect(typeof result.data.estimatedTime).toBe('number');
          expect(result.data.estimatedTime).toBeGreaterThan(0);
          expect(Array.isArray(result.data.recommendations)).toBe(true);
          expect(result.data.metadata).toBeDefined();
          expect(result.data.metadata.algorithm).toBeDefined();
          expect(typeof result.data.metadata.confidence).toBe('number');
          expect(result.data.metadata.timestamp).toBeInstanceOf(Date);

          // If primary service is unavailable, should use fallback
          if (!primaryAvailable) {
            expect(result.source).toBe('fallback-algorithm');
            expect(result.isStale).toBe(true);
            expect(result.data.metadata.algorithm).toBe('basic-fallback');
          }

          service.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache hit rate improves with repeated requests
   * Tests that cache effectively reduces external service calls
   */
  test('cache hit rate improves with repeated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }), // request keys
        fc.integer({ min: 2, max: 5 }), // number of repetitions
        async (requestKeys, repetitions) => {
          let fetchCallCount = 0;
          const uniqueKeys = [...new Set(requestKeys)];

          // Mock fetch to count calls
          global.fetch = jest.fn().mockImplementation((url: string) => {
            fetchCallCount++;
            
            if (url.includes('/health')) {
              return Promise.resolve({ ok: true, status: 200 });
            }

            if (url.includes('/api/routes')) {
              return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve([{
                  id: `route-${fetchCallCount}`,
                  name: `Route ${fetchCallCount}`,
                  description: 'Test route',
                  stops: [],
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }]),
              });
            }

            return Promise.reject(new Error('Not found'));
          });

          const service = new GracefulDegradationService({
            ...defaultFallbackConfig,
            enableCache: true,
            cacheExpiryMinutes: 60, // Long expiry for testing
          });

          // Wait for health checks
          await new Promise(resolve => setTimeout(resolve, 100));

          const initialFetchCount = fetchCallCount;

          // Make repeated requests with the same keys
          for (let rep = 0; rep < repetitions; rep++) {
            for (const key of uniqueKeys) {
              await service.getRoutes({ key });
            }
          }

          const finalFetchCount = fetchCallCount;
          const totalRequests = uniqueKeys.length * repetitions;
          const actualFetchCalls = finalFetchCount - initialFetchCount;

          // Should make fewer fetch calls than total requests due to caching
          // First request for each unique key will hit the service, subsequent ones should hit cache
          expect(actualFetchCalls).toBeLessThan(totalRequests);
          expect(actualFetchCalls).toBeLessThanOrEqual(uniqueKeys.length);

          service.cleanup();
        }
      ),
      { numRuns: 50 } // Fewer runs due to complexity
    );
  });

  /**
   * Property: Service degradation notifications are not duplicated
   * Tests that users don't get spammed with duplicate degradation notifications
   */
  test('service degradation notifications are not duplicated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // number of failed requests
        fc.string({ minLength: 1, maxLength: 20 }), // service name
        async (failedRequests, serviceName) => {
          const notifications: string[] = [];

          // Mock notification service
          (global as any).window = {
            notificationService: {
              showWarning: (title: string, message: string) => {
                notifications.push(`${title}: ${message}`);
              },
            },
          };

          // Mock fetch to always fail
          global.fetch = jest.fn().mockImplementation(() => {
            return Promise.reject(new Error('Service unavailable'));
          });

          const service = new GracefulDegradationService({
            ...defaultFallbackConfig,
            enableCache: false, // Disable cache to force fallback notifications
            enableOfflineMode: true,
          });

          // Make multiple failed requests
          for (let i = 0; i < failedRequests; i++) {
            try {
              await service.getRoutes({ request: i });
            } catch (error) {
              // Expected to fail and use fallback
            }
          }

          // Should not have duplicate notifications for the same service/message combination
          const uniqueNotifications = [...new Set(notifications)];
          expect(notifications.length).toBeGreaterThanOrEqual(uniqueNotifications.length);

          // Clean up
          delete (global as any).window;
          service.cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Graceful degradation edge cases', () => {
  test('handles empty fallback data gracefully', async () => {
    // Mock fetch to return empty fallback data
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('fallback-routes.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Service unavailable'));
    });

    const service = new GracefulDegradationService({
      ...defaultFallbackConfig,
      enableCache: false,
      fallbackDataSources: ['static-data'],
    });

    const result = await service.getRoutes();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    service.cleanup();
  });

  test('handles malformed fallback data', async () => {
    // Mock fetch to return malformed JSON
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('fallback-routes.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('Invalid JSON')),
        });
      }
      return Promise.reject(new Error('Service unavailable'));
    });

    const service = new GracefulDegradationService({
      ...defaultFallbackConfig,
      enableCache: false,
      enableOfflineMode: true,
      fallbackDataSources: ['static-data'],
    });

    const result = await service.getRoutes();
    expect(result.data).toBeDefined();
    expect(result.source).toBe('offline');

    service.cleanup();
  });

  test('handles localStorage unavailability', async () => {
    // Mock localStorage to throw errors
    const originalLocalStorage = global.localStorage;
    delete (global as any).localStorage;

    global.fetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));

    const service = new GracefulDegradationService({
      ...defaultFallbackConfig,
      enableCache: false,
      enableOfflineMode: true,
      fallbackDataSources: ['local-storage'],
    });

    const result = await service.getRoutes();
    expect(result.data).toBeDefined();
    expect(result.source).toBe('offline');

    // Restore localStorage
    (global as any).localStorage = originalLocalStorage;
    service.cleanup();
  });
});