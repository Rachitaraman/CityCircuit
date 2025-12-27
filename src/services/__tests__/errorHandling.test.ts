/**
 * Property-based tests for API error handling and retry mechanisms
 * Property 28: API error handling
 * Validates: Requirements 7.5 - Error handling and recovery mechanisms
 */

import * as fc from 'fast-check';
import {
  ApiClient,
  ApiError,
  CircuitBreakerOpenError,
  CircuitState,
  RetryConfig,
  CircuitBreakerConfig,
  RouteOptimizationApiClient,
  ExternalMapsApiClient,
  GlobalErrorHandler,
  withErrorHandling,
} from '../errorHandling';

// Mock fetch for testing
const originalFetch = global.fetch;

beforeEach(() => {
  // Reset global error handler
  (GlobalErrorHandler as any).instance = undefined;
  jest.clearAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Property 28: API error handling', () => {
  /**
   * Property: Retry mechanism should respect configuration limits
   * Tests that retry attempts never exceed the configured maximum
   */
  test('retry attempts never exceed configured maximum', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }), // maxRetries
        fc.integer({ min: 100, max: 5000 }), // baseDelay
        fc.integer({ min: 500, max: 1000 }), // statusCode (server errors)
        async (maxRetries, baseDelay, statusCode) => {
          let attemptCount = 0;
          
          // Mock fetch to always fail
          global.fetch = jest.fn().mockImplementation(() => {
            attemptCount++;
            return Promise.resolve({
              ok: false,
              status: statusCode,
              statusText: 'Server Error',
              headers: new Map([['content-type', 'application/json']]),
              json: () => Promise.resolve({ message: 'Test error' }),
            });
          });

          const client = new ApiClient('https://api.test.com');
          const retryConfig: RetryConfig = {
            maxRetries,
            baseDelay,
            maxDelay: 30000,
            backoffMultiplier: 2,
            jitter: false, // Disable jitter for predictable testing
          };

          try {
            await client.request('/test', {
              retryConfig,
              skipCircuitBreaker: true,
            });
          } catch (error) {
            // Expected to fail
          }

          // Should attempt exactly maxRetries + 1 times (initial + retries)
          expect(attemptCount).toBe(maxRetries + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Circuit breaker should open after failure threshold
   * Tests that circuit breaker transitions to OPEN state after configured failures
   */
  test('circuit breaker opens after failure threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // failureThreshold
        fc.integer({ min: 500, max: 600 }), // statusCode (server errors)
        async (failureThreshold, statusCode) => {
          let attemptCount = 0;
          
          // Mock fetch to always fail
          global.fetch = jest.fn().mockImplementation(() => {
            attemptCount++;
            return Promise.resolve({
              ok: false,
              status: statusCode,
              statusText: 'Server Error',
              headers: new Map([['content-type', 'application/json']]),
              json: () => Promise.resolve({ message: 'Test error' }),
            });
          });

          const client = new ApiClient('https://api.test.com');
          const circuitBreakerConfig: CircuitBreakerConfig = {
            failureThreshold,
            recoveryTimeout: 60000,
            monitoringPeriod: 300000,
          };

          // Make requests until circuit breaker should open
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await client.request('/test', {
                circuitBreakerConfig,
                skipRetry: true, // Skip retry to test circuit breaker only
              });
            } catch (error) {
              // Expected to fail
            }
          }

          // Next request should fail with circuit breaker error
          try {
            await client.request('/test', {
              circuitBreakerConfig,
              skipRetry: true,
            });
            throw new Error('Expected circuit breaker to be open');
          } catch (error) {
            expect(error).toBeInstanceOf(CircuitBreakerOpenError);
          }

          // Verify circuit breaker status
          const status = client.getCircuitBreakerStatus('/test', 'GET');
          expect(status?.state).toBe(CircuitState.OPEN);
          expect(status?.failureCount).toBe(failureThreshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Exponential backoff increases delay between retries
   * Tests that retry delays follow exponential backoff pattern
   */
  test('exponential backoff increases delay between retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 1000 }), // baseDelay
        fc.float({ min: 1.5, max: 3.0 }), // backoffMultiplier
        fc.integer({ min: 2, max: 5 }), // maxRetries
        async (baseDelay, backoffMultiplier, maxRetries) => {
          const delays: number[] = [];
          let attemptCount = 0;
          
          // Mock fetch to always fail
          global.fetch = jest.fn().mockImplementation(() => {
            attemptCount++;
            return Promise.resolve({
              ok: false,
              status: 500,
              statusText: 'Server Error',
              headers: new Map([['content-type', 'application/json']]),
              json: () => Promise.resolve({ message: 'Test error' }),
            });
          });

          // Mock sleep to capture delays
          const originalSleep = (ApiClient.prototype as any).sleep;
          (ApiClient.prototype as any).sleep = jest.fn().mockImplementation((ms: number) => {
            delays.push(ms);
            return Promise.resolve();
          });

          const client = new ApiClient('https://api.test.com');
          const retryConfig: RetryConfig = {
            maxRetries,
            baseDelay,
            maxDelay: 60000,
            backoffMultiplier,
            jitter: false, // Disable jitter for predictable testing
          };

          try {
            await client.request('/test', {
              retryConfig,
              skipCircuitBreaker: true,
            });
          } catch (error) {
            // Expected to fail
          }

          // Restore original sleep
          (ApiClient.prototype as any).sleep = originalSleep;

          // Verify exponential backoff pattern
          for (let i = 1; i < delays.length; i++) {
            const expectedDelay = baseDelay * Math.pow(backoffMultiplier, i - 1);
            expect(delays[i - 1]).toBeCloseTo(expectedDelay, 0);
          }

          // Should have maxRetries delays (one less than attempts)
          expect(delays.length).toBe(maxRetries);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-retryable errors should not be retried
   * Tests that client errors (4xx) are not retried
   */
  test('non-retryable errors are not retried', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 499 }), // Client error status codes
        fc.integer({ min: 1, max: 5 }), // maxRetries
        async (statusCode, maxRetries) => {
          // Skip 408 (Request Timeout) and 429 (Too Many Requests) as they are retryable
          if (statusCode === 408 || statusCode === 429) {
            return;
          }

          let attemptCount = 0;
          
          // Mock fetch to return client error
          global.fetch = jest.fn().mockImplementation(() => {
            attemptCount++;
            return Promise.resolve({
              ok: false,
              status: statusCode,
              statusText: 'Client Error',
              headers: new Map([['content-type', 'application/json']]),
              json: () => Promise.resolve({ message: 'Client error' }),
            });
          });

          const client = new ApiClient('https://api.test.com');
          const retryConfig: RetryConfig = {
            maxRetries,
            baseDelay: 100,
            maxDelay: 1000,
            backoffMultiplier: 2,
            jitter: false,
          };

          try {
            await client.request('/test', {
              retryConfig,
              skipCircuitBreaker: true,
            });
          } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).retryable).toBe(false);
          }

          // Should only attempt once (no retries for non-retryable errors)
          expect(attemptCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Circuit breaker recovery after timeout
   * Tests that circuit breaker transitions to HALF_OPEN after recovery timeout
   */
  test('circuit breaker recovers after timeout', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // failureThreshold
        fc.integer({ min: 100, max: 1000 }), // recoveryTimeout
        async (failureThreshold, recoveryTimeout) => {
          let attemptCount = 0;
          let shouldSucceed = false;
          
          // Mock fetch to fail initially, then succeed
          global.fetch = jest.fn().mockImplementation(() => {
            attemptCount++;
            if (shouldSucceed) {
              return Promise.resolve({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ success: true }),
              });
            } else {
              return Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ message: 'Test error' }),
              });
            }
          });

          const client = new ApiClient('https://api.test.com');
          const circuitBreakerConfig: CircuitBreakerConfig = {
            failureThreshold,
            recoveryTimeout,
            monitoringPeriod: 300000,
          };

          // Trigger circuit breaker to open
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await client.request('/test', {
                circuitBreakerConfig,
                skipRetry: true,
              });
            } catch (error) {
              // Expected to fail
            }
          }

          // Verify circuit is open
          let status = client.getCircuitBreakerStatus('/test', 'GET');
          expect(status?.state).toBe(CircuitState.OPEN);

          // Wait for recovery timeout
          await new Promise(resolve => setTimeout(resolve, recoveryTimeout + 10));

          // Next request should transition to HALF_OPEN and succeed
          shouldSucceed = true;
          const result = await client.request('/test', {
            circuitBreakerConfig,
            skipRetry: true,
          });

          expect(result).toEqual({ success: true });

          // Circuit should eventually close after successful requests
          status = client.getCircuitBreakerStatus('/test', 'GET');
          expect([CircuitState.HALF_OPEN, CircuitState.CLOSED]).toContain(status?.state);
        }
      ),
      { numRuns: 50 } // Fewer runs due to timeout delays
    );
  });

  /**
   * Property: Global error handler receives all API errors
   * Tests that all API errors are properly reported to the global handler
   */
  test('global error handler receives all API errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }), // Any error status code
        fc.string({ minLength: 1, maxLength: 50 }), // endpoint
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'), // HTTP method
        async (statusCode, endpoint, method) => {
          const errorCallbacks: any[] = [];
          
          // Mock fetch to return error
          global.fetch = jest.fn().mockImplementation(() => {
            return Promise.resolve({
              ok: false,
              status: statusCode,
              statusText: 'Error',
              headers: new Map([['content-type', 'application/json']]),
              json: () => Promise.resolve({ message: 'Test error' }),
            });
          });

          const globalHandler = GlobalErrorHandler.getInstance();
          globalHandler.onError((error: ApiError) => {
            errorCallbacks.push(error);
          });

          try {
            await withErrorHandling(
              () => fetch(`https://api.test.com${endpoint}`, { method }),
              { endpoint, method }
            );
          } catch (error) {
            // Expected to fail
          }

          // Verify error was reported to global handler
          expect(errorCallbacks.length).toBe(1);
          expect(errorCallbacks[0]).toBeInstanceOf(ApiError);
          expect(errorCallbacks[0].endpoint).toBe(endpoint);
          expect(errorCallbacks[0].method).toBe(method);
          expect(errorCallbacks[0].statusCode).toBe(statusCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Specialized API clients inherit error handling
   * Tests that RouteOptimizationApiClient and ExternalMapsApiClient properly handle errors
   */
  test('specialized API clients inherit error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 500, max: 599 }), // Server error status codes
        fc.integer({ min: 1, max: 3 }), // maxRetries
        async (statusCode, maxRetries) => {
          let attemptCount = 0;
          
          // Mock fetch to always fail
          global.fetch = jest.fn().mockImplementation(() => {
            attemptCount++;
            return Promise.resolve({
              ok: false,
              status: statusCode,
              statusText: 'Server Error',
              headers: new Map([['content-type', 'application/json']]),
              json: () => Promise.resolve({ message: 'Test error' }),
            });
          });

          const routeClient = new RouteOptimizationApiClient('https://api.test.com', 'test-key');
          const mapsClient = new ExternalMapsApiClient('https://maps.test.com', 'maps-key');

          // Test route optimization client
          try {
            await routeClient.getRoutes({ limit: 10 });
          } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
          }

          // Should have retried according to configuration
          expect(attemptCount).toBeGreaterThan(1);
          expect(attemptCount).toBeLessThanOrEqual(maxRetries + 1);

          // Reset attempt count
          attemptCount = 0;

          // Test maps client
          try {
            await mapsClient.geocode('123 Test St');
          } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
          }

          // Should have retried according to configuration
          expect(attemptCount).toBeGreaterThan(1);
          expect(attemptCount).toBeLessThanOrEqual(maxRetries + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Jitter adds randomness to retry delays
   * Tests that jitter introduces variability in retry delays
   */
  test('jitter adds randomness to retry delays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 2000 }), // baseDelay
        fc.integer({ min: 3, max: 5 }), // maxRetries
        async (baseDelay, maxRetries) => {
          const delays: number[] = [];
          let attemptCount = 0;
          
          // Mock fetch to always fail
          global.fetch = jest.fn().mockImplementation(() => {
            attemptCount++;
            return Promise.resolve({
              ok: false,
              status: 500,
              statusText: 'Server Error',
              headers: new Map([['content-type', 'application/json']]),
              json: () => Promise.resolve({ message: 'Test error' }),
            });
          });

          // Mock sleep to capture delays
          const originalSleep = (ApiClient.prototype as any).sleep;
          (ApiClient.prototype as any).sleep = jest.fn().mockImplementation((ms: number) => {
            delays.push(ms);
            return Promise.resolve();
          });

          const client = new ApiClient('https://api.test.com');
          const retryConfig: RetryConfig = {
            maxRetries,
            baseDelay,
            maxDelay: 60000,
            backoffMultiplier: 2,
            jitter: true, // Enable jitter
          };

          try {
            await client.request('/test', {
              retryConfig,
              skipCircuitBreaker: true,
            });
          } catch (error) {
            // Expected to fail
          }

          // Restore original sleep
          (ApiClient.prototype as any).sleep = originalSleep;

          // Verify jitter was applied (delays should vary from exact exponential backoff)
          let hasVariation = false;
          for (let i = 0; i < delays.length; i++) {
            const expectedDelay = baseDelay * Math.pow(2, i);
            const actualDelay = delays[i];
            
            // Jitter should create ±25% variation
            const minExpected = expectedDelay * 0.75;
            const maxExpected = expectedDelay * 1.25;
            
            expect(actualDelay).toBeGreaterThanOrEqual(0);
            expect(actualDelay).toBeLessThanOrEqual(maxExpected);
            
            // Check if there's variation from exact exponential backoff
            if (Math.abs(actualDelay - expectedDelay) > 1) {
              hasVariation = true;
            }
          }

          // At least some delays should show variation due to jitter
          // (This might occasionally fail due to randomness, but should pass most of the time)
          expect(hasVariation).toBe(true);
        }
      ),
      { numRuns: 50 } // Fewer runs due to randomness
    );
  });
});

describe('Error handling edge cases', () => {
  test('handles network errors gracefully', async () => {
    // Mock fetch to throw network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const client = new ApiClient('https://api.test.com');

    try {
      await client.request('/test', { skipRetry: true, skipCircuitBreaker: true });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error');
    }
  });

  test('handles malformed JSON responses', async () => {
    // Mock fetch to return invalid JSON
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.reject(new Error('Invalid JSON')),
      text: () => Promise.resolve('Server Error'),
    });

    const client = new ApiClient('https://api.test.com');

    try {
      await client.request('/test', { skipRetry: true, skipCircuitBreaker: true });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Server Error');
    }
  });

  test('handles missing content-type headers', async () => {
    // Mock fetch to return response without content-type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      blob: () => Promise.resolve(new Blob(['test data'])),
    });

    const client = new ApiClient('https://api.test.com');
    const result = await client.request('/test', { skipRetry: true, skipCircuitBreaker: true });

    expect(result).toBeInstanceOf(Blob);
  });
});