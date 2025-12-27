import { useEffect, useState, useCallback } from 'react';
import { getRealTimeService, WebSocketMessage } from '../services/websocket';

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

  const handleRouteUpdate = useCallback((updateData: any) => {
    setData(prev => {
      const newRoutes = new Map(prev.routes);
      newRoutes.set(updateData.routeId, {
        ...updateData,
        lastUpdate: new Date()
      });
      
      return {
        ...prev,
        routes: newRoutes,
        lastUpdate: new Date()
      };
    });
  }, []);

  const handlePassengerCount = useCallback((countData: any) => {
    setData(prev => ({
      ...prev,
      passengerCount: countData.totalPassengers,
      lastUpdate: new Date()
    }));
  }, []);

  const handleSystemAlert = useCallback((alertData: any) => {
    const alert: SystemAlert = {
      id: `alert-${Date.now()}`,
      type: alertData.type || 'info',
      message: alertData.message,
      timestamp: new Date()
    };

    setData(prev => ({
      ...prev,
      systemAlerts: [alert, ...prev.systemAlerts.slice(0, 9)], // Keep last 10 alerts
      lastUpdate: new Date()
    }));
  }, []);

  const handleOptimizationComplete = useCallback((optimizationData: any) => {
    const alert: SystemAlert = {
      id: `opt-${Date.now()}`,
      type: 'info',
      message: `Route ${optimizationData.routeId} optimized: ${optimizationData.timeSaved}m saved`,
      timestamp: new Date()
    };

    setData(prev => ({
      ...prev,
      systemAlerts: [alert, ...prev.systemAlerts.slice(0, 9)],
      lastUpdate: new Date()
    }));
  }, []);

  useEffect(() => {
    const wsService = getRealTimeService();

    const connectWebSocket = async () => {
      try {
        await wsService.connect();
        setIsConnected(true);
        setError(null);

        // Subscribe to different message types
        wsService.subscribe('route_update', handleRouteUpdate);
        wsService.subscribe('passenger_count', handlePassengerCount);
        wsService.subscribe('system_alert', handleSystemAlert);
        wsService.subscribe('optimization_complete', handleOptimizationComplete);

      } catch (err) {
        setError('Failed to connect to real-time service');
        setIsConnected(false);
        console.error('WebSocket connection error:', err);
      }
    };

    connectWebSocket();

    return () => {
      wsService.unsubscribe('route_update', handleRouteUpdate);
      wsService.unsubscribe('passenger_count', handlePassengerCount);
      wsService.unsubscribe('system_alert', handleSystemAlert);
      wsService.unsubscribe('optimization_complete', handleOptimizationComplete);
      wsService.disconnect();
      setIsConnected(false);
    };
  }, [handleRouteUpdate, handlePassengerCount, handleSystemAlert, handleOptimizationComplete]);

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