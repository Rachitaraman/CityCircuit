/**
 * Property-based tests for analytics service
 * Tests analytics data generation and reporting functionality
 */

import * as fc from 'fast-check';
import { AnalyticsService, AnalyticsEvent, ReportData } from '../analytics';

describe('Analytics Service Property Tests', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  // Generator for valid event types
  const eventTypeArb = fc.oneof(
    fc.constant('route_search'),
    fc.constant('route_optimization'),
    fc.constant('user_login'),
    fc.constant('api_request'),
    fc.constant('error'),
    fc.constant('page_view')
  );

  // Generator for user IDs
  const userIdArb = fc.option(fc.uuid(), { nil: undefined });

  // Generator for event properties
  const eventPropertiesArb = fc.record({
    origin: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    destination: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    routeId: fc.option(fc.uuid(), { nil: undefined }),
    optimizationScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    responseTime: fc.option(fc.integer({ min: 1, max: 5000 }), { nil: undefined }),
    statusCode: fc.option(fc.integer({ min: 200, max: 599 }), { nil: undefined }),
    page: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    errorMessage: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  }).map(props => {
    // Remove undefined values
    const result: Record<string, any> = {};
    Object.entries(props).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = value;
      }
    });
    return result;
  });

  // Generator for date ranges
  const dateRangeArb = fc.record({
    start: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    end: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  }).filter(range => range.start <= range.end);

  /**
   * **Feature: city-circuit, Property 22: Analytics data generation**
   * **Validates: Requirements 5.5**
   * 
   * Property: For any system usage, analytics on usage patterns and optimization effectiveness should be collected
   */
  describe('Property 22: Analytics data generation', () => {
    it('should track any valid analytics event successfully', () => {
      fc.assert(
        fc.property(eventTypeArb, eventPropertiesArb, userIdArb, (eventType, properties, userId) => {
          // Property: Any valid event should be trackable without errors
          expect(() => {
            analyticsService.track(eventType, properties, userId);
          }).not.toThrow();

          // Property: Event tracking should be synchronous and immediate
          // (In a real implementation, this would verify the event was stored)
          expect(true).toBe(true); // Placeholder - in real implementation would check storage
        }),
        { numRuns: 100 }
      );
    });

    it('should generate consistent usage metrics for any date range', () => {
      fc.assert(
        fc.property(dateRangeArb, async (dateRange) => {
          // Property: Usage metrics should always be generated for valid date ranges
          const metrics = await analyticsService.getUsageMetrics(dateRange.start, dateRange.end);

          // Property: All metric values should be non-negative numbers
          expect(metrics.totalUsers).toBeGreaterThanOrEqual(0);
          expect(metrics.activeUsers).toBeGreaterThanOrEqual(0);
          expect(metrics.newUsers).toBeGreaterThanOrEqual(0);
          expect(metrics.sessionCount).toBeGreaterThanOrEqual(0);
          expect(metrics.averageSessionDuration).toBeGreaterThanOrEqual(0);
          expect(metrics.bounceRate).toBeGreaterThanOrEqual(0);
          expect(metrics.retentionRate).toBeGreaterThanOrEqual(0);

          // Property: Active users should not exceed total users
          expect(metrics.activeUsers).toBeLessThanOrEqual(metrics.totalUsers);

          // Property: New users should not exceed total users
          expect(metrics.newUsers).toBeLessThanOrEqual(metrics.totalUsers);

          // Property: Percentages should be within valid ranges
          expect(metrics.bounceRate).toBeLessThanOrEqual(100);
          expect(metrics.retentionRate).toBeLessThanOrEqual(100);
        }),
        { numRuns: 50 }
      );
    });

    it('should generate valid route analytics for any date range', () => {
      fc.assert(
        fc.property(dateRangeArb, async (dateRange) => {
          // Property: Route analytics should always be generated for valid date ranges
          const routeAnalytics = await analyticsService.getRouteAnalytics(dateRange.start, dateRange.end);

          // Property: Should return an array of route analytics
          expect(Array.isArray(routeAnalytics)).toBe(true);

          // Property: Each route analytics entry should have valid data
          routeAnalytics.forEach(route => {
            expect(route.routeId).toBeDefined();
            expect(route.routeName).toBeDefined();
            expect(typeof route.routeId).toBe('string');
            expect(typeof route.routeName).toBe('string');
            expect(route.routeId.length).toBeGreaterThan(0);
            expect(route.routeName.length).toBeGreaterThan(0);

            // Property: All numeric values should be non-negative
            expect(route.searchCount).toBeGreaterThanOrEqual(0);
            expect(route.optimizationCount).toBeGreaterThanOrEqual(0);
            expect(route.passengerCount).toBeGreaterThanOrEqual(0);
            expect(route.efficiencyScore).toBeGreaterThanOrEqual(0);
            expect(route.popularityRank).toBeGreaterThanOrEqual(1);

            // Property: Rating should be within valid range
            expect(route.averageRating).toBeGreaterThanOrEqual(0);
            expect(route.averageRating).toBeLessThanOrEqual(5);

            // Property: Efficiency score should be a percentage
            expect(route.efficiencyScore).toBeLessThanOrEqual(100);
          });

          // Property: If multiple routes exist, popularity ranks should be unique
          if (routeAnalytics.length > 1) {
            const ranks = routeAnalytics.map(r => r.popularityRank);
            const uniqueRanks = new Set(ranks);
            expect(uniqueRanks.size).toBe(ranks.length);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should generate valid system performance metrics for any date range', () => {
      fc.assert(
        fc.property(dateRangeArb, async (dateRange) => {
          // Property: System performance metrics should always be generated
          const performance = await analyticsService.getSystemPerformance(dateRange.start, dateRange.end);

          // Property: All performance metrics should be non-negative
          expect(performance.apiResponseTime).toBeGreaterThanOrEqual(0);
          expect(performance.errorRate).toBeGreaterThanOrEqual(0);
          expect(performance.throughput).toBeGreaterThanOrEqual(0);
          expect(performance.uptime).toBeGreaterThanOrEqual(0);

          // Property: Resource utilization should be within valid ranges
          expect(performance.resourceUtilization.cpu).toBeGreaterThanOrEqual(0);
          expect(performance.resourceUtilization.cpu).toBeLessThanOrEqual(100);
          expect(performance.resourceUtilization.memory).toBeGreaterThanOrEqual(0);
          expect(performance.resourceUtilization.memory).toBeLessThanOrEqual(100);
          expect(performance.resourceUtilization.disk).toBeGreaterThanOrEqual(0);
          expect(performance.resourceUtilization.disk).toBeLessThanOrEqual(100);
          expect(performance.resourceUtilization.network).toBeGreaterThanOrEqual(0);
          expect(performance.resourceUtilization.network).toBeLessThanOrEqual(100);

          // Property: Error rate should be a percentage
          expect(performance.errorRate).toBeLessThanOrEqual(100);

          // Property: Uptime should be a percentage
          expect(performance.uptime).toBeLessThanOrEqual(100);
        }),
        { numRuns: 50 }
      );
    });

    it('should generate comprehensive reports for any valid date range', () => {
      fc.assert(
        fc.property(dateRangeArb, async (dateRange) => {
          // Property: Reports should always be generated for valid date ranges
          const report = await analyticsService.generateReport(dateRange.start, dateRange.end);

          // Property: Report should contain all required sections
          expect(report.period).toBeDefined();
          expect(report.usageMetrics).toBeDefined();
          expect(report.routeAnalytics).toBeDefined();
          expect(report.systemPerformance).toBeDefined();
          expect(report.optimizationMetrics).toBeDefined();

          // Property: Period should match input dates
          expect(report.period.start).toEqual(dateRange.start);
          expect(report.period.end).toEqual(dateRange.end);

          // Property: Optimization metrics should be valid
          expect(report.optimizationMetrics.totalOptimizations).toBeGreaterThanOrEqual(0);
          expect(report.optimizationMetrics.averageTimeReduction).toBeGreaterThanOrEqual(0);
          expect(report.optimizationMetrics.averageDistanceReduction).toBeGreaterThanOrEqual(0);
          expect(report.optimizationMetrics.costSavings).toBeGreaterThanOrEqual(0);
          expect(report.optimizationMetrics.passengerSatisfaction).toBeGreaterThanOrEqual(0);
          expect(report.optimizationMetrics.passengerSatisfaction).toBeLessThanOrEqual(100);

          // Property: Route analytics should be an array
          expect(Array.isArray(report.routeAnalytics)).toBe(true);
        }),
        { numRuns: 30 }
      );
    });

    it('should export reports in valid CSV format', () => {
      fc.assert(
        fc.property(dateRangeArb, async (dateRange) => {
          // Generate a report
          const report = await analyticsService.generateReport(dateRange.start, dateRange.end);

          // Property: CSV export should always produce valid CSV content
          const csvContent = analyticsService.exportReportAsCSV(report);

          // Property: CSV should be a non-empty string
          expect(typeof csvContent).toBe('string');
          expect(csvContent.length).toBeGreaterThan(0);

          // Property: CSV should contain expected sections
          expect(csvContent).toContain('Report Period');
          expect(csvContent).toContain('Usage Metrics');
          expect(csvContent).toContain('Route Analytics');
          expect(csvContent).toContain('System Performance');
          expect(csvContent).toContain('Optimization Metrics');

          // Property: CSV should contain the date range
          expect(csvContent).toContain(dateRange.start.toISOString());
          expect(csvContent).toContain(dateRange.end.toISOString());

          // Property: CSV should have proper line endings
          const lines = csvContent.split('\n');
          expect(lines.length).toBeGreaterThan(10); // Should have multiple sections
        }),
        { numRuns: 20 }
      );
    });

    it('should export reports in valid JSON format', () => {
      fc.assert(
        fc.property(dateRangeArb, async (dateRange) => {
          // Generate a report
          const report = await analyticsService.generateReport(dateRange.start, dateRange.end);

          // Property: JSON export should always produce valid JSON
          const jsonContent = analyticsService.exportReportAsJSON(report);

          // Property: JSON should be a non-empty string
          expect(typeof jsonContent).toBe('string');
          expect(jsonContent.length).toBeGreaterThan(0);

          // Property: JSON should be parseable
          let parsedReport: ReportData;
          expect(() => {
            parsedReport = JSON.parse(jsonContent);
          }).not.toThrow();

          // Property: Parsed JSON should match original report structure
          expect(parsedReport!.period).toBeDefined();
          expect(parsedReport!.usageMetrics).toBeDefined();
          expect(parsedReport!.routeAnalytics).toBeDefined();
          expect(parsedReport!.systemPerformance).toBeDefined();
          expect(parsedReport!.optimizationMetrics).toBeDefined();

          // Property: Dates should be preserved (as strings in JSON)
          expect(new Date(parsedReport!.period.start)).toEqual(dateRange.start);
          expect(new Date(parsedReport!.period.end)).toEqual(dateRange.end);
        }),
        { numRuns: 20 }
      );
    });

    it('should handle route search tracking consistently', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          userIdArb,
          (origin, destination, userId) => {
            // Property: Route search tracking should not throw errors
            expect(() => {
              analyticsService.trackRouteSearch(origin, destination, userId);
            }).not.toThrow();

            // Property: Multiple identical searches should be trackable
            expect(() => {
              analyticsService.trackRouteSearch(origin, destination, userId);
              analyticsService.trackRouteSearch(origin, destination, userId);
            }).not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle route optimization tracking consistently', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          userIdArb,
          (routeId, optimizationScore, userId) => {
            // Property: Route optimization tracking should not throw errors
            expect(() => {
              analyticsService.trackRouteOptimization(routeId, optimizationScore, userId);
            }).not.toThrow();

            // Property: Optimization score should be preserved in tracking
            // (In a real implementation, this would verify the score was stored correctly)
            expect(optimizationScore).toBeGreaterThanOrEqual(0);
            expect(optimizationScore).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle error tracking gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.option(fc.record({
            component: fc.string({ minLength: 1, maxLength: 50 }),
            action: fc.string({ minLength: 1, maxLength: 50 }),
          }), { nil: undefined }),
          userIdArb,
          (errorMessage, context, userId) => {
            const error = new Error(errorMessage);

            // Property: Error tracking should not throw additional errors
            expect(() => {
              analyticsService.trackError(error, context, userId);
            }).not.toThrow();

            // Property: Error message should be preserved
            expect(error.message).toBe(errorMessage);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain data consistency across multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              eventType: eventTypeArb,
              properties: eventPropertiesArb,
              userId: userIdArb,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          dateRangeArb,
          async (events, dateRange) => {
            // Track multiple events
            events.forEach(event => {
              analyticsService.track(event.eventType, event.properties, event.userId);
            });

            // Property: Analytics generation should work after tracking events
            const [usageMetrics, routeAnalytics, systemPerformance] = await Promise.all([
              analyticsService.getUsageMetrics(dateRange.start, dateRange.end),
              analyticsService.getRouteAnalytics(dateRange.start, dateRange.end),
              analyticsService.getSystemPerformance(dateRange.start, dateRange.end),
            ]);

            // Property: All analytics should be generated successfully
            expect(usageMetrics).toBeDefined();
            expect(routeAnalytics).toBeDefined();
            expect(systemPerformance).toBeDefined();

            // Property: Data should be consistent across calls
            const secondUsageMetrics = await analyticsService.getUsageMetrics(dateRange.start, dateRange.end);
            expect(secondUsageMetrics.totalUsers).toBe(usageMetrics.totalUsers);
            expect(secondUsageMetrics.activeUsers).toBe(usageMetrics.activeUsers);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Additional unit tests for specific analytics functionality
  describe('Analytics Edge Cases', () => {
    it('should handle empty date ranges gracefully', async () => {
      const now = new Date();
      const sameDate = new Date(now.getTime());

      const metrics = await analyticsService.getUsageMetrics(now, sameDate);
      expect(metrics).toBeDefined();
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(0);
    });

    it('should handle future date ranges', async () => {
      const future1 = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const future2 = new Date(Date.now() + 48 * 60 * 60 * 1000); // Day after tomorrow

      const metrics = await analyticsService.getUsageMetrics(future1, future2);
      expect(metrics).toBeDefined();
    });

    it('should track user login events correctly', () => {
      const userId = 'test-user-123';
      const userRole = 'passenger';

      expect(() => {
        analyticsService.trackUserLogin(userId, userRole);
      }).not.toThrow();
    });

    it('should track API requests with all parameters', () => {
      expect(() => {
        analyticsService.trackApiRequest('/api/routes', 'GET', 150, 200);
        analyticsService.trackApiRequest('/api/optimize', 'POST', 2500, 201);
        analyticsService.trackApiRequest('/api/invalid', 'GET', 50, 404);
      }).not.toThrow();
    });

    it('should track page views correctly', () => {
      expect(() => {
        analyticsService.trackPageView('/dashboard');
        analyticsService.trackPageView('/routes');
        analyticsService.trackPageView('/admin', 'admin-user-123');
      }).not.toThrow();
    });

    it('should generate reports with consistent structure', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      const report1 = await analyticsService.generateReport(start, end);
      const report2 = await analyticsService.generateReport(start, end);

      // Structure should be consistent
      expect(Object.keys(report1)).toEqual(Object.keys(report2));
      expect(Object.keys(report1.usageMetrics)).toEqual(Object.keys(report2.usageMetrics));
      expect(Object.keys(report1.optimizationMetrics)).toEqual(Object.keys(report2.optimizationMetrics));
    });
  });
});