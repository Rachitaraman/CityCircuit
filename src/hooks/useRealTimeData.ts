import { useEffect, useState, useCallback } from 'react';

export interface RealTimeData {
  routes: Map<string, RouteUpdate>;
  passengerCount: number;
  systemAlerts: SystemAlert[];
  lastUpdate: Date | null;
}

export interface RouteUpdate {
  routeId: string;
  currentPassengers: number;
  delay: number;
  nextStop: string;
  estimatedArrival: string;
  lastUpdate: Date;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

export const useRealTimeData = () => {
  const [data, setData] = useState<RealTimeData>({
    routes: new Map(),
    passengerCount: 0,
    systemAlerts: [],
    lastUpdate: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRealTimeData = useCallback(async () => {
    try {
      const response = await fetch('/api/realtime-data');
      if (response.ok) {
        const result = await response.json();
        const apiData = result.data;
        
        // Convert API data to our format
        const routesMap = new Map();
        apiData.routeUpdates?.forEach((update: any) => {
          routesMap.set(update.routeId, {
            routeId: update.routeId,
            currentPassengers: update.passengerCount,
            delay: update.delay,
            nextStop: 'Next Stop',
            estimatedArrival: new Date(Date.now() + update.delay * 60000).toISOString(),
            lastUpdate: new Date()
          });
        });

        setData({
          routes: routesMap,
          passengerCount: apiData.livePassengers || 0,
          systemAlerts: apiData.systemAlerts?.map((alert: any) => ({
            id: alert.id,
            type: alert.type,
            message: alert.message,
            timestamp: new Date(alert.timestamp)
          })) || [],
          lastUpdate: new Date()
        });
        
        setIsConnected(true);
        setError(null);
      } else {
        setError('Failed to fetch real-time data');
        setIsConnected(false);
      }
    } catch (err) {
      setError('Network error');
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRealTimeData();

    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchRealTimeData, 10000);

    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  const getRouteData = useCallback((routeId: string): RouteUpdate | null => {
    return data.routes.get(routeId) || null;
  }, [data.routes]);

  const clearAlerts = useCallback(() => {
    setData(prev => ({
      ...prev,
      systemAlerts: []
    }));
  }, []);

  return {
    data,
    isConnected,
    error,
    getRouteData,
    clearAlerts
  };
};