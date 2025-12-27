/**
 * Property-based tests for route display components
 * Tests route information completeness and display requirements
 */

import * as fc from 'fast-check';
import React from 'react';
import { render } from '@testing-library/react';
import { RouteCard } from '../RouteCard';
import type { Route } from '../../../types';

describe('Route Display Property Tests', () => {
  /**
   * **Feature: city-circuit, Property 7: Route information completeness**
   * **Validates: Requirements 2.2**
   * 
   * Property: For any displayed route, the information should include both 
   * estimated travel time and distance data
   */
  describe('Property 7: Route information completeness', () => {
    // Generator for valid Mumbai coordinates
    const mumbaiCoordinatesArb = fc.record({
      latitude: fc.double({ min: 18.85, max: 19.25, noNaN: true }),
      longitude: fc.double({ min: 72.75, max: 73.05, noNaN: true }),
    });

    // Generator for valid bus stops
    const busStopArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      coordinates: mumbaiCoordinatesArb,
      address: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
      amenities: fc.array(fc.string()),
      dailyPassengerCount: fc.integer({ min: 0, max: 100000 }),
      isAccessible: fc.boolean(),
    });

    // Generator for arrays of unique bus stops
    const uniqueStopsArb = fc.array(busStopArb, { minLength: 2, maxLength: 10 })
      .map(stops => {
        return stops.map((stop, index) => ({
          ...stop,
          id: `${stop.id.slice(0, -4)}${index.toString().padStart(4, '0')}`,
          coordinates: {
            latitude: 18.9 + (index * 0.01) + (Math.random() * 0.05),
            longitude: 72.8 + (index * 0.01) + (Math.random() * 0.05),
          },
        }));
      });

    // Generator for valid routes with required display information
    const displayableRouteArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      description: fc.string({ maxLength: 1000 }),
      stops: uniqueStopsArb,
      operatorId: fc.uuid(),
      isActive: fc.boolean(),
      optimizationScore: fc.integer({ min: 0, max: 100 }),
      estimatedTravelTime: fc.integer({ min: 1, max: 1440 }), // Required for display
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

    it('should display estimated travel time for any route', () => {
      fc.assert(
        fc.property(displayableRouteArb, (routeData) => {
          const { container } = render(<RouteCard route={routeData} />);
          
          // Property: Any displayed route must show estimated travel time
          const travelTimeElement = container.querySelector('[data-testid="travel-time"], .travel-time');
          const travelTimeText = container.textContent;
          
          // Check that travel time is displayed somewhere in the component
          const hasTravelTimeDisplay = 
            travelTimeElement !== null || 
            travelTimeText?.includes(`${routeData.estimatedTravelTime}m`) ||
            travelTimeText?.includes('Travel Time') ||
            travelTimeText?.includes('minutes') ||
            travelTimeText?.includes('min');
          
          expect(hasTravelTimeDisplay).toBe(true);
          
          // Verify the actual travel time value is present
          expect(travelTimeText).toContain(routeData.estimatedTravelTime.toString());
        }),
        { numRuns: 100 }
      );
    });

    it('should display route distance information for any route', () => {
      fc.assert(
        fc.property(displayableRouteArb, (routeData) => {
          const { container } = render(<RouteCard route={routeData} />);
          
          // Property: Any displayed route must show distance-related information
          const componentText = container.textContent;
          
          // Check for distance indicators - either explicit distance or stop count (which implies distance)
          const hasDistanceInfo = 
            componentText?.includes('stops') ||
            componentText?.includes('km') ||
            componentText?.includes('distance') ||
            componentText?.includes(`${routeData.stops.length}`) ||
            componentText?.includes('Total Stops');
          
          expect(hasDistanceInfo).toBe(true);
          
          // Verify stop count is displayed (as a proxy for route distance/coverage)
          expect(componentText).toContain(routeData.stops.length.toString());
        }),
        { numRuns: 100 }
      );
    });

    it('should display both travel time and distance information together', () => {
      fc.assert(
        fc.property(displayableRouteArb, (routeData) => {
          const { container } = render(<RouteCard route={routeData} />);
          
          const componentText = container.textContent || '';
          
          // Property: Route display must include BOTH time and distance information
          const hasTravelTime = 
            componentText.includes(`${routeData.estimatedTravelTime}m`) ||
            componentText.includes('Travel Time');
          
          const hasDistanceInfo = 
            componentText.includes(`${routeData.stops.length}`) ||
            componentText.includes('stops') ||
            componentText.includes('Total Stops');
          
          // Both pieces of information must be present
          expect(hasTravelTime).toBe(true);
          expect(hasDistanceInfo).toBe(true);
          
          // Verify specific values are displayed
          expect(componentText).toContain(routeData.estimatedTravelTime.toString());
          expect(componentText).toContain(routeData.stops.length.toString());
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain information completeness regardless of route complexity', () => {
      fc.assert(
        fc.property(displayableRouteArb, (routeData) => {
          const { container } = render(<RouteCard route={routeData} />);
          
          const componentText = container.textContent || '';
          
          // Property: Information completeness should not depend on route complexity
          // (number of stops, optimization score, etc.)
          
          // Essential information that must always be present
          const essentialInfo = [
            routeData.name,
            routeData.estimatedTravelTime.toString(),
            routeData.stops.length.toString(),
            routeData.optimizationScore.toString(),
          ];
          
          essentialInfo.forEach(info => {
            expect(componentText).toContain(info);
          });
          
          // Verify route status is displayed
          const hasStatusInfo = 
            componentText.includes('Active') ||
            componentText.includes('Inactive') ||
            componentText.includes(routeData.isActive ? 'Active' : 'Inactive');
          
          expect(hasStatusInfo).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should display route information in a structured format', () => {
      fc.assert(
        fc.property(displayableRouteArb, (routeData) => {
          const { container } = render(<RouteCard route={routeData} />);
          
          // Property: Route information should be displayed in a structured, readable format
          
          // Check for proper HTML structure
          const hasCardStructure = container.querySelector('.card, [class*="card"], [role="article"]');
          const hasTitle = container.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"]');
          
          expect(hasCardStructure || hasTitle).toBeTruthy();
          
          // Check that information is organized (not just dumped as plain text)
          const hasOrganizedLayout = 
            container.querySelector('.grid, .flex, [class*="grid"], [class*="flex"]') ||
            container.querySelectorAll('div').length > 1; // Multiple divs suggest structure
          
          expect(hasOrganizedLayout).toBeTruthy();
          
          // Verify accessibility - important information should be properly labeled
          const componentText = container.textContent || '';
          const hasLabels = 
            componentText.includes('stops') ||
            componentText.includes('Travel Time') ||
            componentText.includes('Optimization');
          
          expect(hasLabels).toBe(true);
        }),
        { numRuns: 50 } // Fewer runs for UI structure tests
      );
    });

    // Edge case: Test with minimal route data
    it('should handle routes with minimal required information', () => {
      const minimalRouteArb = fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        description: fc.constant(''),
        stops: fc.array(busStopArb, { minLength: 2, maxLength: 2 }), // Minimal stops
        operatorId: fc.uuid(),
        isActive: fc.boolean(),
        optimizationScore: fc.constant(0), // Minimal score
        estimatedTravelTime: fc.integer({ min: 1, max: 30 }), // Short routes
        createdAt: fc.date(),
        updatedAt: fc.date(),
      });

      fc.assert(
        fc.property(minimalRouteArb, (routeData) => {
          const { container } = render(<RouteCard route={routeData} />);
          
          // Property: Even minimal routes must display complete information
          const componentText = container.textContent || '';
          
          expect(componentText).toContain(routeData.name);
          expect(componentText).toContain(routeData.estimatedTravelTime.toString());
          expect(componentText).toContain('2'); // Two stops
          expect(componentText).toContain('0'); // Zero optimization score
        }),
        { numRuns: 50 }
      );
    });

    // Edge case: Test with maximum complexity routes
    it('should handle routes with maximum complexity', () => {
      const complexRouteArb = fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 50, maxLength: 200 }),
        description: fc.string({ minLength: 100, maxLength: 1000 }),
        stops: fc.array(busStopArb, { minLength: 8, maxLength: 10 }), // Many stops
        operatorId: fc.uuid(),
        isActive: fc.boolean(),
        optimizationScore: fc.integer({ min: 90, max: 100 }), // High optimization
        estimatedTravelTime: fc.integer({ min: 120, max: 1440 }), // Long routes
        createdAt: fc.date(),
        updatedAt: fc.date(),
      });

      fc.assert(
        fc.property(complexRouteArb, (routeData) => {
          const { container } = render(<RouteCard route={routeData} />);
          
          // Property: Complex routes must still display all required information clearly
          const componentText = container.textContent || '';
          
          expect(componentText).toContain(routeData.estimatedTravelTime.toString());
          expect(componentText).toContain(routeData.stops.length.toString());
          expect(componentText).toContain(routeData.optimizationScore.toString());
          
          // Verify the component doesn't break with long content
          expect(container.innerHTML.length).toBeGreaterThan(0);
        }),
        { numRuns: 30 }
      );
    });
  });
});