/**
 * Graceful degradation service for handling external service failures
 * Provides fallback mechanisms and cached data serving for offline scenarios
 */

import { Route, BusStop, OptimizationResult } from '../types';

export interface ServiceStatus {
  name: string;
  isAvailable: boolean;
  lastChecked: Date;
  responseTime?: number;
  errorCount: number;
  lastError?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  source: 'primary' | 'fallback' | 'cache';
}

export interface FallbackConfig {
  enableCache: boolean;
  cacheExpiryMinutes: number;
  maxCacheSize: number;
  enableOfflineMode: boolean;
  fallbackDataSources: string[];
  healthCheckIntervalMs: number;
}

export class ServiceHealthMonitor {
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: FallbackConfig) {}

  registerService(
    serviceName: string,
    healthCheckUrl: string,
    checkInterval: number = this.config.healthCheckIntervalMs
  ): void {
    // Initialize service status
    this.serviceStatuses.set(serviceName, {
      name: serviceName,
      isAvailable: true,
      lastChecked: new Date(),
      errorCount: 0,
    });

    // Set up periodic health checks
    const interval = setInterval(async () => {
      await this.checkServiceHealth(serviceName, healthCheckUrl);
    }, checkInterval);

    this.healthCheckIntervals.set(serviceName, interval);

    // Perform initial health check
    this.checkServiceHealth(serviceName, healthCheckUrl);
  }

  private async checkServiceHealth(serviceName: string, healthCheckUrl: string): Promise<void> {
    const startTime = Date.now();
    const status = this.serviceStatuses.get(serviceName);
    
    if (!status) return;

    try {
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok && responseTime < 10000; // Consider healthy if < 10s response

      this.serviceStatuses.set(serviceName, {
        ...status,
        isAvailable: isHealthy,
        lastChecked: new Date(),
        responseTime,
        errorCount: isHealthy ? 0 : status.errorCount + 1,
        lastError: isHealthy ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      });

      // Emit service status change event
      this.emitStatusChange(serviceName, isHealthy);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.serviceStatuses.set(serviceName, {
        ...status,
        isAvailable: false,
        lastChecked: new Date(),
        responseTime,
        errorCount: status.errorCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });

      this.emitStatusChange(serviceName, false);
    }
  }

  private emitStatusChange(serviceName: string, isAvailable: boolean): void {
    // In a real application, this would emit events to subscribers
    console.log(`Service ${serviceName} status changed: ${isAvailable ? 'available' : 'unavailable'}`);
    
    // Notify global event system if available
    if (typeof window !== 'undefined' && (window as any).eventBus) {
      (window as any).eventBus.emit('serviceStatusChange', {
        serviceName,
        isAvailable,
        timestamp: new Date(),
      });
    }
  }

  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.serviceStatuses.get(serviceName) || null;
  }

  getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  isServiceAvailable(serviceName: string): boolean {
    const status = this.serviceStatuses.get(serviceName);
    return status?.isAvailable ?? false;
  }

  cleanup(): void {
    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
  }
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessTimes: Map<string, Date> = new Map();

  constructor(private config: FallbackConfig) {
    // Periodic cleanup of expired entries
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Clean up every minute
  }

  set(key: string, data: T, source: 'primary' | 'fallback' | 'cache' = 'primary'): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cacheExpiryMinutes * 60 * 1000);

    // Enforce cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      source,
    });

    this.accessTimes.set(key, now);
  }

  get(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return null;
    }

    // Update access time for LRU
    this.accessTimes.set(key, new Date());
    
    return entry;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && entry.expiresAt >= new Date();
  }

  delete(key: string): boolean {
    this.accessTimes.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime: Date | null = null;

    for (const [key, accessTime] of this.accessTimes.entries()) {
      if (!oldestTime || accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const entries = Array.from(this.cache.values());
    const accessTimes = Array.from(this.accessTimes.values());

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestEntry: accessTimes.length > 0 ? new Date(Math.min(...accessTimes.map(d => d.getTime()))) : null,
      newestEntry: accessTimes.length > 0 ? new Date(Math.max(...accessTimes.map(d => d.getTime()))) : null,
    };
  }
}

export class GracefulDegradationService {
  private healthMonitor: ServiceHealthMonitor;
  private routeCache: CacheManager<Route[]>;
  private optimizationCache: CacheManager<OptimizationResult>;
  private busStopCache: CacheManager<BusStop[]>;
  private userNotifications: Set<string> = new Set();

  constructor(private config: FallbackConfig) {
    this.healthMonitor = new ServiceHealthMonitor(config);
    this.routeCache = new CacheManager<Route[]>(config);
    this.optimizationCache = new CacheManager<OptimizationResult>(config);
    this.busStopCache = new CacheManager<BusStop[]>(config);

    this.initializeServices();
  }

  private initializeServices(): void {
    // Register core services for health monitoring
    this.healthMonitor.registerService(
      'route-optimization',
      `${process.env.NEXT_PUBLIC_API_URL}/health`
    );
    
    this.healthMonitor.registerService(
      'maps-api',
      'https://maps.googleapis.com/maps/api/js'
    );

    this.healthMonitor.registerService(
      'analytics-service',
      `${process.env.NEXT_PUBLIC_API_URL}/analytics/health`
    );
  }

  async getRoutes(filters?: any): Promise<{ data: Route[]; source: string; isStale: boolean }> {
    const cacheKey = `routes:${JSON.stringify(filters || {})}`;
    
    // Try primary service first
    if (this.healthMonitor.isServiceAvailable('route-optimization')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/routes`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: filters ? JSON.stringify(filters) : undefined,
        });

        if (response.ok) {
          const routes = await response.json();
          
          // Cache successful response
          if (this.config.enableCache) {
            this.routeCache.set(cacheKey, routes, 'primary');
          }

          return {
            data: routes,
            source: 'primary',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('Primary route service failed:', error);
      }
    }

    // Try fallback data sources
    for (const fallbackSource of this.config.fallbackDataSources) {
      try {
        const fallbackData = await this.getFallbackRoutes(fallbackSource, filters);
        if (fallbackData) {
          // Cache fallback data
          if (this.config.enableCache) {
            this.routeCache.set(cacheKey, fallbackData, 'fallback');
          }

          this.notifyUserOfDegradation('route-service', 'Using fallback data source');

          return {
            data: fallbackData,
            source: fallbackSource,
            isStale: true,
          };
        }
      } catch (error) {
        console.warn(`Fallback source ${fallbackSource} failed:`, error);
      }
    }

    // Try cached data as last resort
    if (this.config.enableCache) {
      const cachedEntry = this.routeCache.get(cacheKey);
      if (cachedEntry) {
        this.notifyUserOfDegradation('route-service', 'Using cached data');

        return {
          data: cachedEntry.data,
          source: 'cache',
          isStale: true,
        };
      }
    }

    // If offline mode is enabled, return static fallback data
    if (this.config.enableOfflineMode) {
      const offlineRoutes = await this.getOfflineRoutes();
      this.notifyUserOfDegradation('route-service', 'Operating in offline mode');

      return {
        data: offlineRoutes,
        source: 'offline',
        isStale: true,
      };
    }

    throw new Error('All route data sources are unavailable');
  }

  async optimizeRoute(routeData: any): Promise<{ data: OptimizationResult; source: string; isStale: boolean }> {
    const cacheKey = `optimization:${JSON.stringify(routeData)}`;

    // Try primary optimization service
    if (this.healthMonitor.isServiceAvailable('route-optimization')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeData),
        });

        if (response.ok) {
          const result = await response.json();
          
          // Cache successful optimization
          if (this.config.enableCache) {
            this.optimizationCache.set(cacheKey, result, 'primary');
          }

          return {
            data: result,
            source: 'primary',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('Primary optimization service failed:', error);
      }
    }

    // Try cached optimization result
    if (this.config.enableCache) {
      const cachedEntry = this.optimizationCache.get(cacheKey);
      if (cachedEntry) {
        this.notifyUserOfDegradation('optimization-service', 'Using cached optimization result');

        return {
          data: cachedEntry.data,
          source: 'cache',
          isStale: true,
        };
      }
    }

    // Fallback to basic optimization algorithm
    const fallbackResult = await this.performBasicOptimization(routeData);
    this.notifyUserOfDegradation('optimization-service', 'Using basic optimization algorithm');

    return {
      data: fallbackResult,
      source: 'fallback-algorithm',
      isStale: true,
    };
  }

  async getBusStops(area?: any): Promise<{ data: BusStop[]; source: string; isStale: boolean }> {
    const cacheKey = `bus-stops:${JSON.stringify(area || {})}`;

    // Try primary service
    if (this.healthMonitor.isServiceAvailable('route-optimization')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bus-stops`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: area ? JSON.stringify(area) : undefined,
        });

        if (response.ok) {
          const busStops = await response.json();
          
          // Cache successful response
          if (this.config.enableCache) {
            this.busStopCache.set(cacheKey, busStops, 'primary');
          }

          return {
            data: busStops,
            source: 'primary',
            isStale: false,
          };
        }
      } catch (error) {
        console.warn('Primary bus stop service failed:', error);
      }
    }

    // Try cached data
    if (this.config.enableCache) {
      const cachedEntry = this.busStopCache.get(cacheKey);
      if (cachedEntry) {
        this.notifyUserOfDegradation('bus-stop-service', 'Using cached bus stop data');

        return {
          data: cachedEntry.data,
          source: 'cache',
          isStale: true,
        };
      }
    }

    // Fallback to static bus stop data
    const staticBusStops = await this.getStaticBusStops();
    this.notifyUserOfDegradation('bus-stop-service', 'Using static bus stop data');

    return {
      data: staticBusStops,
      source: 'static',
      isStale: true,
    };
  }

  private async getFallbackRoutes(source: string, filters?: any): Promise<Route[] | null> {
    switch (source) {
      case 'static-data':
        return this.getStaticRoutes();
      case 'local-storage':
        return this.getLocalStorageRoutes();
      case 'backup-api':
        return this.getBackupApiRoutes(filters);
      default:
        return null;
    }
  }

  private async getStaticRoutes(): Promise<Route[]> {
    // Load static route data from public folder
    try {
      const response = await fetch('/data/fallback-routes.json');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to load static routes:', error);
    }

    // Return minimal fallback routes
    return [
      {
        id: 'fallback-1',
        name: 'Emergency Route 1',
        description: 'Basic city center route',
        stops: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private async getLocalStorageRoutes(): Promise<Route[]> {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('cached-routes');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load routes from localStorage:', error);
      return [];
    }
  }

  private async getBackupApiRoutes(filters?: any): Promise<Route[]> {
    const backupUrl = process.env.NEXT_PUBLIC_BACKUP_API_URL;
    if (!backupUrl) return [];

    try {
      const response = await fetch(`${backupUrl}/api/routes`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: filters ? JSON.stringify(filters) : undefined,
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Backup API failed:', error);
    }

    return [];
  }

  private async getOfflineRoutes(): Promise<Route[]> {
    // Return basic offline routes for essential functionality
    return [
      {
        id: 'offline-1',
        name: 'Offline Route 1',
        description: 'Basic route available offline',
        stops: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private async performBasicOptimization(routeData: any): Promise<OptimizationResult> {
    // Simple fallback optimization algorithm
    // In a real implementation, this would use a basic algorithm
    return {
      optimizedRoute: routeData.route || [],
      efficiency: 0.7, // Conservative efficiency estimate
      estimatedTime: routeData.estimatedTime * 1.2, // Add 20% buffer
      recommendations: [
        'Service temporarily unavailable - using basic optimization',
        'Results may be less accurate than usual',
      ],
      metadata: {
        algorithm: 'basic-fallback',
        confidence: 0.6,
        timestamp: new Date(),
      },
    };
  }

  private async getStaticBusStops(): Promise<BusStop[]> {
    try {
      const response = await fetch('/data/fallback-bus-stops.json');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to load static bus stops:', error);
    }

    return [];
  }

  private notifyUserOfDegradation(service: string, message: string): void {
    const notificationKey = `${service}:${message}`;
    
    // Avoid duplicate notifications
    if (this.userNotifications.has(notificationKey)) {
      return;
    }

    this.userNotifications.add(notificationKey);

    // Clear notification after 5 minutes
    setTimeout(() => {
      this.userNotifications.delete(notificationKey);
    }, 5 * 60 * 1000);

    // Emit user notification
    if (typeof window !== 'undefined' && (window as any).notificationService) {
      (window as any).notificationService.showWarning(
        'Service Degradation',
        message,
        { persistent: false, duration: 10000 }
      );
    }

    console.warn(`Service degradation: ${service} - ${message}`);
  }

  // Public API for monitoring and management
  getServiceStatuses(): ServiceStatus[] {
    return this.healthMonitor.getAllServiceStatuses();
  }

  getCacheStats(): {
    routes: any;
    optimizations: any;
    busStops: any;
  } {
    return {
      routes: this.routeCache.getStats(),
      optimizations: this.optimizationCache.getStats(),
      busStops: this.busStopCache.getStats(),
    };
  }

  clearAllCaches(): void {
    this.routeCache.clear();
    this.optimizationCache.clear();
    this.busStopCache.clear();
  }

  updateConfig(newConfig: Partial<FallbackConfig>): void {
    Object.assign(this.config, newConfig);
  }

  cleanup(): void {
    this.healthMonitor.cleanup();
  }
}

// Default configuration
export const defaultFallbackConfig: FallbackConfig = {
  enableCache: true,
  cacheExpiryMinutes: 30,
  maxCacheSize: 1000,
  enableOfflineMode: true,
  fallbackDataSources: ['static-data', 'local-storage', 'backup-api'],
  healthCheckIntervalMs: 30000, // 30 seconds
};

// Singleton instance
export const gracefulDegradationService = new GracefulDegradationService(defaultFallbackConfig);