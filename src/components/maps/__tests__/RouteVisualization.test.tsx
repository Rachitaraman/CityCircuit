/**
 * Property-based tests for RouteVisualization component
 * Tests route display completeness and information accuracy
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { RouteVisualization, RouteVisualizationProps } from '../RouteVisualization';
import { Route, BusStop } from '../../../types';

// Mock GoogleMap component since we're testing the display logic, not map rendering
jest.mock('../GoogleMap', () => ({
  GoogleMap: ({ markers, routes, onMarkerClick }: any) => (
    <div data-testid="google-map">
      <div data-testid="markers-count">{markers?.length || 0}</div>
      <div data-testid="routes-count">{routes?.length || 0}</div>
      {markers?.map((marker: any) => (
        <button
          key={marker.id}
          data-testid={`marker-${marker.id}`}
          onClick={() => onMarkerClick?.(marker)}
        >
          {marker.title}
        </button>
      ))}
    </div>
  ),
}));

describe('RouteVisualization Component', () => {
  // Generator for valid Mumbai coordinates
  const mumbaiCoordinatesArb = fc.record({
    latitude: fc.double({ min: 18.85, max: 19.25, noNaN: true }),
    longitude: fc.double({ min: 72.75, max: 73.05, noNaN: true }),
  });

  // Generator for valid bus stops
  const busStopArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    coordinates: mumbaiCoordinatesArb,
    address: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    amenities: fc.array(fc.string()),
    dailyPassengerCount: fc.integer({ min: 0, max: 100000 }),
    isAccessible: fc.boolean(),
  });

  // Generator for arrays of unique bus stops
  const uniqueStopsArb = fc.array(busStopArb, { minLength: 2, maxLength: 8 })
    .map(stops => {
      return stops.map((stop, index) => ({
        ...stop,
        id: `stop-${index}`,
        coordinates: {
          latitude: 18.9 + (index * 0.01),
          longitude: 72.8 + (index * 0.01),
        },
      }));
    });

  // Generator for valid routes
  const routeArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.string({ maxLength: 500 }),
    stops: uniqueStopsArb,
    operatorId: fc.uuid(),
    isActive: fc.boolean(),
    optimizationScore: fc.integer({ min: 0, max: 100 }),
    estimatedTravelTime: fc.integer({ min: 1, max: 1440 }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });

  // Generator for arrays of routes
  const routesArb = fc.array(routeArb, { minLength: 1, maxLength: 5 })
    .map(routes => {
      return routes.map((route, index) => ({
        ...route,
        id: `route-${index}`,
        name: `Route ${index + 1}`,
      }));
    });

  /**
   * **Feature: city-circuit, Property 7: Route information completeness**
   * **Validates: Requirements 2.2**
   * 
   * Property: For any route displayed, all essential route information should be 
   * visible and accessible to passengers
   */
  describe('Property 7: Route information completeness', () => {
    it('should display all essential route information for any valid route', () => {
      fc.assert(
        fc.property(routesArb, fc.option(fc.nat(), { nil: undefined }), (routes, selectedIndexOpt) => {
          const selectedRouteId = selectedIndexOpt !== undefined && selectedIndexOpt < routes.length 
            ? routes[selectedIndexOpt].id 
            : undefined;

          const props: RouteVisualizationProps = {
            routes,
            selectedRouteId,
            onRouteSelect: jest.fn(),
            onStopClick: jest.fn(),
            onOptimizeRoute: jest.fn(),
          };

          const { container } = render(<RouteVisualization {...props} />);

          // Property: Route visualization should always be rendered
          expect(screen.getByTestId('google-map')).toBeInTheDocument();

          // Property: All routes should be available for selection
          const routeSelect = container.querySelector('select');
          if (routeSelect) {
            const options = Array.from(routeSelect.querySelectorAll('option'));
            // Should have "Select a route..." option plus all routes
            expect(options.length).toBe(routes.length + 1);
            
            routes.forEach(route => {
              const routeOption = options.find(option => 
                option.getAttribute('value') === route.id
              );
              expect(routeOption).toBeTruthy();
              expect(routeOption?.textContent).toBe(route.name);
            });
          }

          // Property: If a route is selected, its complete information should be displayed
          if (selectedRouteId) {
            const selectedRoute = routes.find(r => r.id === selectedRouteId);
            if (selectedRoute) {
              // Essential route information should be visible
              expect(screen.getByText(`${selectedRoute.stops.length} stops`)).toBeInTheDocument();
              expect(screen.getByText(`${selectedRoute.estimatedTravelTime}m`)).toBeInTheDocument();
              expect(screen.getByText(`${selectedRoute.optimizationScore}%`)).toBeInTheDocument();
              
              // Optimize button should be available
              expect(screen.getByText('Optimize Route')).toBeInTheDocument();
            }
          }

          // Property: Route legend should display when routes are shown
          const routesToShow = selectedRouteId ? routes.filter(r => r.id === selectedRouteId) : [];
          if (routesToShow.length > 0) {
            routesToShow.forEach(route => {
              // Route name should be in legend
              expect(screen.getByText(route.name)).toBeInTheDocument();
              
              // Route details should be in legend
              const stopCountText = `${route.stops.length} stops • ${route.estimatedTravelTime}m`;
              expect(screen.getByText(stopCountText)).toBeInTheDocument();
              
              // Optimization score should be displayed
              expect(screen.getByText(`${route.optimizationScore}%`)).toBeInTheDocument();
            });
          }

          // Property: Map should contain markers for all stops of displayed routes
          const markersCount = screen.getByTestId('markers-count');
          const expectedMarkerCount = routesToShow.reduce((total, route) => total + route.stops.length, 0);
          expect(parseInt(markersCount.textContent || '0')).toBe(expectedMarkerCount);

          // Property: Map should contain route paths for all displayed routes with 2+ stops
          const routesCount = screen.getByTestId('routes-count');
          const expectedRouteCount = routesToShow.filter(route => route.stops.length >= 2).length;
          expect(parseInt(routesCount.textContent || '0')).toBe(expectedRouteCount);
        }),
        { numRuns: 50 }
      );
    });

    it('should display complete stop information when markers are clicked', () => {
      fc.assert(
        fc.property(routesArb, (routes) => {
          const onStopClick = jest.fn();
          const props: RouteVisualizationProps = {
            routes,
            selectedRouteId: routes[0]?.id,
            onStopClick,
          };

          render(<RouteVisualization {...props} />);

          // Property: Each stop marker should be clickable and provide complete information
          if (routes.length > 0 && routes[0].stops.length > 0) {
            const firstRoute = routes[0];
            firstRoute.stops.forEach((stop, stopIndex) => {
              const markerId = `${firstRoute.id}-${stop.id}`;
              const markerButton = screen.getByTestId(`marker-${markerId}`);
              
              // Property: Marker should display complete stop identification
              expect(markerButton.textContent).toBe(`${stop.name} (${firstRoute.name})`);
              
              // Property: Clicking marker should trigger callback with complete stop and route data
              fireEvent.click(markerButton);
              expect(onStopClick).toHaveBeenCalledWith(stop, firstRoute);
            });
          }
        }),
        { numRuns: 30 }
      );
    });

    it('should maintain route information consistency across different view modes', () => {
      fc.assert(
        fc.property(routesArb, (routes) => {
          const props: RouteVisualizationProps = {
            routes,
            selectedRouteId: routes[0]?.id,
          };

          const { rerender } = render(<RouteVisualization {...props} />);

          // Property: Route information should be consistent when switching between single and all routes view
          if (routes.length > 0) {
            // Test single route view
            const singleRouteMarkersCount = parseInt(screen.getByTestId('markers-count').textContent || '0');
            const singleRouteRoutesCount = parseInt(screen.getByTestId('routes-count').textContent || '0');

            // Switch to show all routes
            const showAllCheckbox = screen.getByRole('checkbox', { name: /show all routes/i });
            fireEvent.click(showAllCheckbox);

            // Property: All routes should now be displayed with complete information
            const allRoutesMarkersCount = parseInt(screen.getByTestId('markers-count').textContent || '0');
            const allRoutesRoutesCount = parseInt(screen.getByTestId('routes-count').textContent || '0');

            // Verify that all routes mode shows more or equal markers/routes
            expect(allRoutesMarkersCount).toBeGreaterThanOrEqual(singleRouteMarkersCount);
            expect(allRoutesRoutesCount).toBeGreaterThanOrEqual(singleRouteRoutesCount);

            // Property: Each route should maintain its complete information in legend
            routes.forEach(route => {
              if (route.stops.length >= 2) { // Only routes with 2+ stops are displayed
                expect(screen.getByText(route.name)).toBeInTheDocument();
                expect(screen.getByText(`${route.stops.length} stops • ${route.estimatedTravelTime}m`)).toBeInTheDocument();
              }
            });
          }
        }),
        { numRuns: 30 }
      );
    });

    it('should display optimization scores with appropriate visual indicators', () => {
      fc.assert(
        fc.property(routesArb, (routes) => {
          const props: RouteVisualizationProps = {
            routes,
            selectedRouteId: routes[0]?.id,
          };

          render(<RouteVisualization {...props} />);

          // Property: Optimization scores should be displayed with appropriate visual context
          routes.forEach(route => {
            if (route.stops.length >= 2) { // Only displayed routes
              const scoreElements = screen.getAllByText(`${route.optimizationScore}%`);
              expect(scoreElements.length).toBeGreaterThan(0);

              // Property: Score should be categorized appropriately
              scoreElements.forEach(element => {
                const classList = Array.from(element.classList);
                
                if (route.optimizationScore >= 80) {
                  // High score should have success styling
                  expect(classList.some(cls => cls.includes('success') || cls.includes('green'))).toBe(true);
                } else if (route.optimizationScore >= 60) {
                  // Medium score should have warning styling
                  expect(classList.some(cls => cls.includes('warning') || cls.includes('yellow'))).toBe(true);
                } else {
                  // Low score should have danger styling
                  expect(classList.some(cls => cls.includes('danger') || cls.includes('red'))).toBe(true);
                }
              });
            }
          });
        }),
        { numRuns: 30 }
      );
    });

    it('should handle empty routes gracefully while maintaining interface completeness', () => {
      const props: RouteVisualizationProps = {
        routes: [],
      };

      render(<RouteVisualization {...props} />);

      // Property: Interface should remain complete even with no routes
      expect(screen.getByTestId('google-map')).toBeInTheDocument();
      expect(screen.getByText('Route Visualization')).toBeInTheDocument();
      expect(screen.getByText('Fit to View')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /show all routes/i })).toBeInTheDocument();

      // Property: Route selector should show appropriate empty state
      const routeSelect = screen.getByRole('combobox');
      expect(routeSelect).toBeInTheDocument();
      
      // Should have only the "Select a route..." option
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Select a route...');

      // Property: Map should show no markers or routes
      expect(screen.getByTestId('markers-count')).toHaveTextContent('0');
      expect(screen.getByTestId('routes-count')).toHaveTextContent('0');
    });
  });

  // Additional unit tests for specific functionality
  describe('Route Selection and Interaction', () => {
    it('should call onRouteSelect when route is selected', () => {
      const onRouteSelect = jest.fn();
      const routes: Route[] = [{
        id: 'route-1',
        name: 'Test Route',
        description: 'Test Description',
        stops: [
          {
            id: 'stop-1',
            name: 'Stop 1',
            coordinates: { latitude: 19.0760, longitude: 72.8777 },
            address: 'Address 1',
            amenities: [],
            dailyPassengerCount: 1000,
            isAccessible: true,
          },
          {
            id: 'stop-2',
            name: 'Stop 2',
            coordinates: { latitude: 19.0860, longitude: 72.8877 },
            address: 'Address 2',
            amenities: [],
            dailyPassengerCount: 1500,
            isAccessible: false,
          },
        ],
        operatorId: 'operator-1',
        isActive: true,
        optimizationScore: 85,
        estimatedTravelTime: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      render(<RouteVisualization routes={routes} onRouteSelect={onRouteSelect} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'route-1' } });

      expect(onRouteSelect).toHaveBeenCalledWith('route-1');
    });

    it('should call onOptimizeRoute when optimize button is clicked', () => {
      const onOptimizeRoute = jest.fn();
      const routes: Route[] = [{
        id: 'route-1',
        name: 'Test Route',
        description: 'Test Description',
        stops: [
          {
            id: 'stop-1',
            name: 'Stop 1',
            coordinates: { latitude: 19.0760, longitude: 72.8777 },
            address: 'Address 1',
            amenities: [],
            dailyPassengerCount: 1000,
            isAccessible: true,
          },
          {
            id: 'stop-2',
            name: 'Stop 2',
            coordinates: { latitude: 19.0860, longitude: 72.8877 },
            address: 'Address 2',
            amenities: [],
            dailyPassengerCount: 1500,
            isAccessible: false,
          },
        ],
        operatorId: 'operator-1',
        isActive: true,
        optimizationScore: 85,
        estimatedTravelTime: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      render(
        <RouteVisualization 
          routes={routes} 
          selectedRouteId="route-1"
          onOptimizeRoute={onOptimizeRoute} 
        />
      );

      const optimizeButton = screen.getByText('Optimize Route');
      fireEvent.click(optimizeButton);

      expect(onOptimizeRoute).toHaveBeenCalledWith(routes[0]);
    });
  });
});