import React, { useState, useMemo } from 'react';
import { GoogleMap, MapMarker, MapRoute } from './GoogleMap';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Route, BusStop } from '../../types';

export interface RouteVisualizationProps {
  routes: Route[];
  selectedRouteId?: string;
  onRouteSelect?: (routeId: string) => void;
  onStopClick?: (stop: BusStop, route: Route) => void;
  onOptimizeRoute?: (route: Route) => void;
  className?: string;
  height?: string;
}

const ROUTE_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const RouteVisualization: React.FC<RouteVisualizationProps> = ({
  routes,
  selectedRouteId,
  onRouteSelect,
  onStopClick,
  onOptimizeRoute,
  className = '',
  height = '500px',
}) => {
  const [mapCenter, setMapCenter] = useState({
    lat: 19.0760, // Mumbai center
    lng: 72.8777
  });
  const [mapZoom, setMapZoom] = useState(12);
  const [showAllRoutes, setShowAllRoutes] = useState(false);

  // Convert routes to map data
  const { mapMarkers, mapRoutes, routeOptions } = useMemo(() => {
    const markers: MapMarker[] = [];
    const mapRoutes: MapRoute[] = [];
    const options = routes.map(route => ({
      value: route.id,
      label: route.name
    }));

    const routesToShow = showAllRoutes ? routes : 
      selectedRouteId ? routes.filter(r => r.id === selectedRouteId) : [];

    routesToShow.forEach((route, routeIndex) => {
      const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];

      // Add route stops as markers
      route.stops.forEach((stop, stopIndex) => {
        const isFirst = stopIndex === 0;
        const isLast = stopIndex === route.stops.length - 1;
        
        markers.push({
          id: `${route.id}-${stop.id}`,
          position: {
            lat: stop.coordinates.latitude,
            lng: stop.coordinates.longitude,
          },
          title: `${stop.name} (${route.name})`,
          icon: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                ${isFirst ? 'S' : isLast ? 'E' : stopIndex + 1}
              </text>
            </svg>
          `)}`,
          info: `
            <div class="p-2 max-w-xs">
              <h3 class="font-semibold text-sm">${stop.name}</h3>
              <p class="text-xs text-gray-600 mb-2">${stop.address}</p>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${route.name}</span>
                ${stop.isAccessible ? '<span class="text-xs">♿ Accessible</span>' : ''}
              </div>
              <p class="text-xs text-gray-500">
                ${isFirst ? 'Starting point' : isLast ? 'End point' : `Stop ${stopIndex + 1} of ${route.stops.length}`}
              </p>
            </div>
          `,
        });
      });

      // Add route path
      if (route.stops.length >= 2) {
        mapRoutes.push({
          id: route.id,
          waypoints: route.stops.map(stop => ({
            lat: stop.coordinates.latitude,
            lng: stop.coordinates.longitude,
          })),
          color,
          strokeWeight: selectedRouteId === route.id ? 6 : 4,
        });
      }
    });

    return { mapMarkers: markers, mapRoutes, routeOptions: options };
  }, [routes, selectedRouteId, showAllRoutes]);

  // Calculate map bounds to fit all routes
  const fitMapToRoutes = () => {
    if (routes.length === 0) return;

    const allStops = routes.flatMap(route => route.stops);
    if (allStops.length === 0) return;

    const bounds = {
      north: Math.max(...allStops.map(stop => stop.coordinates.latitude)),
      south: Math.min(...allStops.map(stop => stop.coordinates.latitude)),
      east: Math.max(...allStops.map(stop => stop.coordinates.longitude)),
      west: Math.min(...allStops.map(stop => stop.coordinates.longitude)),
    };

    const center = {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2,
    };

    setMapCenter(center);
    
    // Calculate appropriate zoom level
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 12;
    if (maxDiff > 0.5) zoom = 9;
    else if (maxDiff > 0.2) zoom = 10;
    else if (maxDiff > 0.1) zoom = 11;
    else if (maxDiff > 0.05) zoom = 12;
    else zoom = 13;
    
    setMapZoom(zoom);
  };

  const handleMarkerClick = (marker: MapMarker) => {
    const [routeId, stopId] = marker.id.split('-');
    const route = routes.find(r => r.id === routeId);
    const stop = route?.stops.find(s => s.id === stopId);
    
    if (route && stop && onStopClick) {
      onStopClick(stop, route);
    }
  };

  const selectedRoute = selectedRouteId ? routes.find(r => r.id === selectedRouteId) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Route Visualization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fitMapToRoutes}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                }
              >
                Fit to View
              </Button>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showAllRoutes}
                  onChange={(e) => setShowAllRoutes(e.target.checked)}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700">Show all routes</span>
              </label>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Select Route"
              options={[
                { value: '', label: 'Select a route...' },
                ...routeOptions
              ]}
              value={selectedRouteId || ''}
              onChange={(e) => onRouteSelect?.(e.target.value)}
            />
            
            {selectedRoute && (
              <>
                <div className="flex items-end">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Route Info
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedRoute.stops.length} stops</Badge>
                      <Badge variant="secondary">{selectedRoute.estimatedTravelTime}m</Badge>
                      <Badge 
                        variant={selectedRoute.optimizationScore >= 80 ? 'success' : 
                                selectedRoute.optimizationScore >= 60 ? 'warning' : 'danger'}
                      >
                        {selectedRoute.optimizationScore}%
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => onOptimizeRoute?.(selectedRoute)}
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    }
                  >
                    Optimize Route
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <GoogleMap
            center={mapCenter}
            zoom={mapZoom}
            markers={mapMarkers}
            routes={mapRoutes}
            onMarkerClick={handleMarkerClick}
            height={height}
            className="rounded-lg"
          />
        </CardContent>
      </Card>

      {/* Route Legend */}
      {mapRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Route Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {mapRoutes.map((mapRoute, index) => {
                const route = routes.find(r => r.id === mapRoute.id);
                if (!route) return null;
                
                return (
                  <div key={mapRoute.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50">
                    <div 
                      className="w-4 h-1 rounded-full"
                      style={{ backgroundColor: mapRoute.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {route.name}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {route.stops.length} stops • {route.estimatedTravelTime}m
                      </p>
                    </div>
                    <Badge 
                      variant={route.optimizationScore >= 80 ? 'success' : 
                              route.optimizationScore >= 60 ? 'warning' : 'danger'}
                      size="sm"
                    >
                      {route.optimizationScore}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { RouteVisualization };