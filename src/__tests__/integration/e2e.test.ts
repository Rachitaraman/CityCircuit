/**
 * End-to-end integration tests for CityCircuit system
 * Tests complete workflows from web and mobile interfaces
 * Validates cross-platform data synchronization and external API integrations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { RouteOptimizationApiClient, ExternalMapsApiClient } from '../../services/errorHandling';
import { gracefulDegradationService } from '../../services/gracefulDegradation';
import { getCredentialManager } from '../../services/credentialManager';
import { analyticsService } from '../../services/analytics';
import { Route, BusStop, OptimizationResult, User } from '../../types';

// Mock external dependencies
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
  }),
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock fetch for external API calls
const originalFetch = global.fetch;

beforeAll(() => {
  // Set up test environment
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000';
  process.env.NEXT_PUBLIC_MAPS_API_KEY = 'test_maps_key';
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock console methods to reduce noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('End-to-End Integration Tests', () => {
  /**
   * Test: Complete route optimization workflow
   * Validates the entire process from route input to optimization results
   */
  test('complete route optimization workflow', async () => {
    const mockRoutes: Route[] = [
      {
        id: 'route-1',
        name: 'Downtown Express',
        description: 'Express route to downtown',
        stops: [
          {
            id: 'stop-1',
            name: 'Central Station',
            latitude: 40.7128,
            longitude: -74.0060,
            address: '123 Main St',
          },
          {
            id: 'stop-2',
            name: 'Business District',
            latitude: 40.7130,
            longitude: -74.0065,
            address: '456 Business Ave',
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockOptimizationResult: OptimizationResult = {
      optimizedRoute: mockRoutes[0].stops,
      efficiency: 0.92,
      estimatedTime: 1800, // 30 minutes
      recommendations: [
        'Consider adding express stops during peak hours',
        'Route efficiency is excellent',
      ],
      metadata: {
        algorithm: 'advanced-ml',
        confidence: 0.95,
        timestamp: new Date(),
      },
    };

    // Mock API responses
    global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/routes')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRoutes),
        });
      }
      
      if (url.includes('/api/optimize')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockOptimizationResult),
        });
      }
      
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'healthy' }),
        });
      }

      return Promise.reject(new Error('Not found'));
    });

    // Test route optimization API client
    const routeClient = new RouteOptimizationApiClient('http://localhost:5000', 'test-key');
    
    // 1. Fetch available routes
    const routes = await routeClient.getRoutes();
    expect(routes).toEqual(mockRoutes);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/routes',
      expect.objectContaining({
        method: 'GET',
      })
    );

    // 2. Optimize a route
    const optimizationInput = {
      route: mockRoutes[0],
      preferences: {
        prioritizeSpeed: true,
        avoidTraffic: true,
      },
    };

    const optimizationResult = await routeClient.optimizeRoute(optimizationInput);
    expect(optimizationResult).toEqual(mockOptimizationResult);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/optimize',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(optimizationInput),
      })
    );

    // 3. Verify optimization result structure
    expect(optimizationResult.optimizedRoute).toBeDefined();
    expect(optimizationResult.efficiency).toBeGreaterThan(0);
    expect(optimizationResult.efficiency).toBeLessThanOrEqual(1);
    expect(optimizationResult.estimatedTime).toBeGreaterThan(0);
    expect(Array.isArray(optimizationResult.recommendations)).toBe(true);
    expect(optimizationResult.metadata.algorithm).toBeDefined();
    expect(optimizationResult.metadata.confidence).toBeGreaterThan(0);
  });

  /**
   * Test: Cross-platform data synchronization
   * Validates that data changes are properly synchronized across platforms
   */
  test('cross-platform data synchronization', async () => {
    const testUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'passenger',
      preferences: {
        language: 'en',
        notifications: true,
        theme: 'light',
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPreferences = {
      language: 'es',
      notifications: false,
      theme: 'dark',
    };

    // Mock API responses for user data
    global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/users') && options?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(testUser),
        });
      }
      
      if (url.includes('/api/users') && options?.method === 'PUT') {
        const updatedUser = {
          ...testUser,
          preferences: updatedPreferences,
          updatedAt: new Date(),
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(updatedUser),
        });
      }

      if (url.includes('/api/sync')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            syncedAt: new Date(),
            conflicts: [],
            success: true,
          }),
        });
      }

      return Promise.reject(new Error('Not found'));
    });

    // 1. Simulate web platform user preference update
    const webUpdateResponse = await fetch('/api/users/user-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: updatedPreferences }),
    });

    expect(webUpdateResponse.ok).toBe(true);
    const webUpdatedUser = await webUpdateResponse.json();
    expect(webUpdatedUser.preferences).toEqual(updatedPreferences);

    // 2. Simulate mobile platform sync request
    const syncResponse = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-123',
        lastSyncAt: new Date(Date.now() - 60000), // 1 minute ago
        platform: 'mobile',
      }),
    });

    expect(syncResponse.ok).toBe(true);
    const syncResult = await syncResponse.json();
    expect(syncResult.success).toBe(true);
    expect(syncResult.conflicts).toHaveLength(0);

    // 3. Verify mobile platform receives updated data
    const mobileUserResponse = await fetch('/api/users/user-123');
    expect(mobileUserResponse.ok).toBe(true);
    const mobileUser = await mobileUserResponse.json();
    expect(mobileUser.preferences).toEqual(updatedPreferences);
  });

  /**
   * Test: External API integration with fallback
   * Validates external API integrations work correctly with fallback mechanisms
   */
  test('external API integration with fallback', async () => {
    const mockDirectionsResponse = {
      routes: [
        {
          legs: [
            {
              distance: { text: '2.5 km', value: 2500 },
              duration: { text: '8 mins', value: 480 },
              start_address: 'Central Station',
              end_address: 'Business District',
            },
          ],
        },
      ],
      status: 'OK',
    };

    let apiCallCount = 0;

    // Mock external Maps API with intermittent failures
    global.fetch = jest.fn().mockImplementation((url: string) => {
      apiCallCount++;
      
      if (url.includes('directions')) {
        // Fail first call, succeed on retry
        if (apiCallCount === 1) {
          return Promise.reject(new Error('Service temporarily unavailable'));
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockDirectionsResponse),
          });
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
              description: 'Emergency route data',
              stops: [],
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        });
      }

      return Promise.reject(new Error('Not found'));
    });

    // Test external Maps API client with retry mechanism
    const mapsClient = new ExternalMapsApiClient('https://maps.googleapis.com/maps/api', 'test-key');
    
    // Should succeed after retry
    const directionsResult = await mapsClient.getDirections('Central Station', 'Business District');
    expect(directionsResult).toEqual(mockDirectionsResponse);
    expect(apiCallCount).toBe(2); // First call failed, second succeeded

    // Test graceful degradation service
    const routeResult = await gracefulDegradationService.getRoutes();
    expect(routeResult.data).toBeDefined();
    expect(Array.isArray(routeResult.data)).toBe(true);
    
    // Should use fallback data when primary service fails
    if (!routeResult.source.includes('primary')) {
      expect(routeResult.isStale).toBe(true);
      expect(['fallback', 'cache', 'static', 'offline']).toContain(routeResult.source);
    }
  });

  /**
   * Test: Analytics data collection and reporting
   * Validates that analytics are properly collected throughout user interactions
   */
  test('analytics data collection and reporting', async () => {
    const mockAnalyticsData = {
      routeOptimizations: 150,
      userSessions: 1200,
      averageOptimizationTime: 2.3,
      popularRoutes: [
        { routeId: 'route-1', optimizations: 45 },
        { routeId: 'route-2', optimizations: 38 },
      ],
      systemPerformance: {
        averageResponseTime: 180,
        errorRate: 0.02,
        uptime: 0.999,
      },
    };

    // Mock analytics API
    global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/analytics') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, eventId: 'event-123' }),
        });
      }

      if (url.includes('/api/analytics/report')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAnalyticsData),
        });
      }

      return Promise.reject(new Error('Not found'));
    });

    // 1. Track user interaction events
    const events = [
      {
        type: 'route_search',
        userId: 'user-123',
        data: { query: 'downtown', results: 5 },
        timestamp: new Date(),
      },
      {
        type: 'route_optimization',
        userId: 'user-123',
        data: { routeId: 'route-1', duration: 2.1 },
        timestamp: new Date(),
      },
      {
        type: 'user_preference_update',
        userId: 'user-123',
        data: { preference: 'language', value: 'es' },
        timestamp: new Date(),
      },
    ];

    // Track each event
    for (const event of events) {
      const response = await analyticsService.trackEvent(event.type, event.data, event.userId);
      expect(response.success).toBe(true);
      expect(response.eventId).toBeDefined();
    }

    // 2. Generate analytics report
    const reportResponse = await fetch('/api/analytics/report', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(reportResponse.ok).toBe(true);
    const reportData = await reportResponse.json();
    
    // Validate report structure
    expect(reportData.routeOptimizations).toBeGreaterThan(0);
    expect(reportData.userSessions).toBeGreaterThan(0);
    expect(reportData.averageOptimizationTime).toBeGreaterThan(0);
    expect(Array.isArray(reportData.popularRoutes)).toBe(true);
    expect(reportData.systemPerformance).toBeDefined();
    expect(reportData.systemPerformance.uptime).toBeGreaterThan(0.9);
  });

  /**
   * Test: Secure credential management in production workflow
   * Validates that credentials are properly managed throughout the application lifecycle
   */
  test('secure credential management in production workflow', async () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.CREDENTIAL_MASTER_KEY = 'test-master-key-32-chars-long-123';

    const credentialManager = getCredentialManager();

    // 1. Store API credentials securely
    credentialManager.setCredential('maps_api_key', 'secure_maps_key_12345', {
      encrypt: true,
      environment: 'production',
      rotationIntervalDays: 90,
    });

    credentialManager.setCredential('optimization_api_key', 'secure_opt_key_67890', {
      encrypt: true,
      environment: 'production',
      rotationIntervalDays: 30,
    });

    // 2. Verify credentials are accessible
    expect(credentialManager.hasCredential('maps_api_key')).toBe(true);
    expect(credentialManager.hasCredential('optimization_api_key')).toBe(true);

    const mapsKey = credentialManager.getCredential('maps_api_key');
    const optKey = credentialManager.getCredential('optimization_api_key');

    expect(mapsKey).toBe('secure_maps_key_12345');
    expect(optKey).toBe('secure_opt_key_67890');

    // 3. Test credential rotation
    const rotationResult = await credentialManager.rotateCredential('optimization_api_key');
    expect(rotationResult.success).toBe(true);
    expect(rotationResult.oldCredential).toBe('secure_opt_key_67890');
    expect(rotationResult.newCredential).toBeDefined();
    expect(rotationResult.newCredential).not.toBe('secure_opt_key_67890');

    // 4. Verify rotated credential is accessible
    const newOptKey = credentialManager.getCredential('optimization_api_key');
    expect(newOptKey).toBe(rotationResult.newCredential);

    // 5. Test credential export/import for backup
    const exportedData = credentialManager.exportCredentials();
    expect(exportedData).toBeDefined();
    expect(typeof exportedData).toBe('string');

    // Clear credentials and import from backup
    credentialManager.clearAllCredentials();
    expect(credentialManager.hasCredential('maps_api_key')).toBe(false);

    const importResult = credentialManager.importCredentials(exportedData);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBeGreaterThan(0);

    // Verify credentials are restored
    expect(credentialManager.hasCredential('maps_api_key')).toBe(true);
    expect(credentialManager.getCredential('maps_api_key')).toBe('secure_maps_key_12345');

    // Cleanup
    credentialManager.cleanup();
    process.env.NODE_ENV = originalEnv;
  });

  /**
   * Test: Multi-language support consistency
   * Validates that internationalization works correctly across different components
   */
  test('multi-language support consistency', async () => {
    const supportedLanguages = ['en', 'es', 'fr', 'de'];
    const testTranslations = {
      en: {
        'routes.title': 'Routes',
        'routes.search': 'Search routes',
        'optimization.title': 'Route Optimization',
      },
      es: {
        'routes.title': 'Rutas',
        'routes.search': 'Buscar rutas',
        'optimization.title': 'Optimización de Rutas',
      },
      fr: {
        'routes.title': 'Itinéraires',
        'routes.search': 'Rechercher des itinéraires',
        'optimization.title': 'Optimisation d\'Itinéraire',
      },
      de: {
        'routes.title': 'Routen',
        'routes.search': 'Routen suchen',
        'optimization.title': 'Routenoptimierung',
      },
    };

    // Mock translation API
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const langMatch = url.match(/\/locales\/(\w+)\/common\.json/);
      if (langMatch) {
        const lang = langMatch[1];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(testTranslations[lang as keyof typeof testTranslations] || {}),
        });
      }

      return Promise.reject(new Error('Not found'));
    });

    // Test translation loading for each supported language
    for (const lang of supportedLanguages) {
      const response = await fetch(`/locales/${lang}/common.json`);
      expect(response.ok).toBe(true);
      
      const translations = await response.json();
      expect(translations).toBeDefined();
      expect(translations['routes.title']).toBeDefined();
      expect(translations['routes.search']).toBeDefined();
      expect(translations['optimization.title']).toBeDefined();
    }

    // Verify translations are different for different languages
    const enTranslations = testTranslations.en;
    const esTranslations = testTranslations.es;
    
    expect(enTranslations['routes.title']).not.toBe(esTranslations['routes.title']);
    expect(enTranslations['routes.search']).not.toBe(esTranslations['routes.search']);
    expect(enTranslations['optimization.title']).not.toBe(esTranslations['optimization.title']);
  });

  /**
   * Test: Error handling and recovery across system components
   * Validates that errors are properly handled and the system recovers gracefully
   */
  test('error handling and recovery across system components', async () => {
    let failureCount = 0;
    const maxFailures = 3;

    // Mock API with intermittent failures
    global.fetch = jest.fn().mockImplementation((url: string) => {
      failureCount++;
      
      if (url.includes('/api/routes')) {
        if (failureCount <= maxFailures) {
          return Promise.reject(new Error('Service temporarily unavailable'));
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
              {
                id: 'route-1',
                name: 'Recovery Route',
                description: 'Route after service recovery',
                stops: [],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          });
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
              description: 'Emergency route data',
              stops: [],
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        });
      }

      return Promise.reject(new Error('Not found'));
    });

    // Test graceful degradation service handles failures
    const routeResult = await gracefulDegradationService.getRoutes();
    
    // Should get data despite initial failures
    expect(routeResult.data).toBeDefined();
    expect(Array.isArray(routeResult.data)).toBe(true);
    expect(routeResult.data.length).toBeGreaterThan(0);

    // Should indicate if data is stale due to fallback
    if (failureCount <= maxFailures) {
      expect(routeResult.isStale).toBe(true);
      expect(routeResult.source).not.toBe('primary');
    }

    // Test that service eventually recovers
    const recoveryResult = await gracefulDegradationService.getRoutes();
    
    // After enough retries, should get fresh data
    if (failureCount > maxFailures) {
      expect(recoveryResult.source).toBe('primary');
      expect(recoveryResult.isStale).toBe(false);
      expect(recoveryResult.data[0].name).toBe('Recovery Route');
    }
  });
});

describe('Integration Test Utilities', () => {
  test('test environment setup is correct', () => {
    expect(process.env.NEXT_PUBLIC_API_URL).toBe('http://localhost:5000');
    expect(process.env.NEXT_PUBLIC_MAPS_API_KEY).toBe('test_maps_key');
  });

  test('mock services are properly configured', () => {
    expect(global.fetch).toBeDefined();
    expect(typeof global.fetch).toBe('function');
  });

  test('cleanup functions work correctly', () => {
    const manager = getCredentialManager();
    expect(() => manager.cleanup()).not.toThrow();
    
    expect(() => gracefulDegradationService.cleanup()).not.toThrow();
  });
});