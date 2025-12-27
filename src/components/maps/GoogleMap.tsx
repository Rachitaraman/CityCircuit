import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export interface MapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  icon?: string;
  info?: string;
}

export interface MapRoute {
  id: string;
  waypoints: Array<{
    lat: number;
    lng: number;
  }>;
  color?: string;
  strokeWeight?: number;
}

export interface GoogleMapProps {
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  onMapClick?: (event: google.maps.MapMouseEvent) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  height?: string;
  loading?: boolean;
}

const DEFAULT_CENTER = {
  lat: 19.0760, // Mumbai center
  lng: 72.8777
};

const GoogleMap: React.FC<GoogleMapProps> = ({
  center = DEFAULT_CENTER,
  zoom = 12,
  markers = [],
  routes = [],
  onMapClick,
  onMarkerClick,
  className = '',
  height = '400px',
  loading = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const routesRef = useRef<google.maps.DirectionsRenderer[]>([]);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not found');
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        await loader.load();
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError(err instanceof Error ? err.message : 'Failed to load Google Maps');
      }
    };

    initMap();
  }, []);

  // Create map instance
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    try {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'transit',
            elementType: 'labels.icon',
            stylers: [{ visibility: 'on' }],
          },
        ],
      });

      if (onMapClick) {
        mapInstance.addListener('click', onMapClick);
      }

      setMap(mapInstance);
    } catch (err) {
      console.error('Error creating map:', err);
      setError('Failed to create map instance');
    }
  }, [isLoaded, center, zoom, onMapClick, map]);

  // Clear existing markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  }, []);

  // Clear existing routes
  const clearRoutes = useCallback(() => {
    routesRef.current.forEach(renderer => renderer.setMap(null));
    routesRef.current = [];
  }, []);

  // Update markers
  useEffect(() => {
    if (!map || !isLoaded) return;

    clearMarkers();

    markers.forEach(markerData => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        icon: markerData.icon || {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3B82F6"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
        },
      });

      if (markerData.info) {
        const infoWindow = new google.maps.InfoWindow({
          content: markerData.info,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          onMarkerClick?.(markerData);
        });
      } else if (onMarkerClick) {
        marker.addListener('click', () => onMarkerClick(markerData));
      }

      markersRef.current.push(marker);
    });
  }, [map, markers, onMarkerClick, isLoaded, clearMarkers]);

  // Update routes
  useEffect(() => {
    if (!map || !isLoaded || routes.length === 0) return;

    clearRoutes();

    routes.forEach(routeData => {
      if (routeData.waypoints.length < 2) return;

      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: routeData.color || '#3B82F6',
          strokeWeight: routeData.strokeWeight || 4,
          strokeOpacity: 0.8,
        },
      });

      directionsRenderer.setMap(map);

      const waypoints = routeData.waypoints.slice(1, -1).map(point => ({
        location: point,
        stopover: true,
      }));

      directionsService.route(
        {
          origin: routeData.waypoints[0],
          destination: routeData.waypoints[routeData.waypoints.length - 1],
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            directionsRenderer.setDirections(result);
          } else {
            console.error('Directions request failed:', status);
          }
        }
      );

      routesRef.current.push(directionsRenderer);
    });
  }, [map, routes, isLoaded, clearRoutes]);

  // Update map center and zoom
  useEffect(() => {
    if (!map) return;
    map.setCenter(center);
    map.setZoom(zoom);
  }, [map, center, zoom]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-neutral-100 border border-neutral-300 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-neutral-600">Failed to load map</p>
          <p className="text-xs text-neutral-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !isLoaded) {
    return (
      <div 
        className={`flex items-center justify-center bg-neutral-100 border border-neutral-300 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-neutral-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`rounded-lg border border-neutral-300 ${className}`}
      style={{ height }}
    />
  );
};

export { GoogleMap };