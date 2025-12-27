export interface WebSocketMessage {
  type: 'route_update' | 'passenger_count' | 'optimization_complete' | 'system_alert';
  data: any;
  timestamp: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type) || [];
    listeners.forEach(listener => listener(message.data));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  subscribe(messageType: string, callback: (data: any) => void) {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }
    this.listeners.get(messageType)!.push(callback);
  }

  unsubscribe(messageType: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(messageType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!wsService) {
    // For development, we'll simulate WebSocket with a mock service
    const isDevelopment = process.env.NODE_ENV === 'development';
    const wsUrl = isDevelopment 
      ? 'ws://localhost:5001/ws' // Mock WebSocket server
      : `ws://${window.location.host}/ws`;
    
    wsService = new WebSocketService(wsUrl);
  }
  return wsService;
};

// Mock WebSocket service for development
export class MockWebSocketService extends WebSocketService {
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    super('mock://localhost');
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      console.log('Mock WebSocket connected');
      
      // Simulate real-time data updates
      this.intervalId = setInterval(() => {
        this.simulateData();
      }, 10000); // Update every 10 seconds
      
      resolve();
    });
  }

  private simulateData() {
    // Simulate route updates
    this.handleMessage({
      type: 'route_update',
      data: {
        routeId: 'route-001',
        currentPassengers: Math.floor(Math.random() * 50) + 20,
        delay: Math.floor(Math.random() * 10) - 5, // -5 to +5 minutes
        nextStop: 'Central Station',
        estimatedArrival: new Date(Date.now() + Math.random() * 600000).toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Simulate passenger count updates
    this.handleMessage({
      type: 'passenger_count',
      data: {
        totalPassengers: Math.floor(Math.random() * 1000) + 25000,
        change: Math.floor(Math.random() * 200) - 100
      },
      timestamp: new Date().toISOString()
    });

    // Occasionally simulate optimization completion
    if (Math.random() > 0.8) {
      this.handleMessage({
        type: 'optimization_complete',
        data: {
          routeId: `route-${Math.floor(Math.random() * 3) + 1}`,
          timeSaved: Math.floor(Math.random() * 15) + 5,
          efficiency: Math.floor(Math.random() * 20) + 75
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Mock WebSocket disconnected');
  }

  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type) || [];
    listeners.forEach(listener => listener(message.data));
  }
}

// Use mock service in development
export const getRealTimeService = (): WebSocketService => {
  if (process.env.NODE_ENV === 'development') {
    if (!wsService) {
      wsService = new MockWebSocketService();
    }
    return wsService;
  }
  return getWebSocketService();
};