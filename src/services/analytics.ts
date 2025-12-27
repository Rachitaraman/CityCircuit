/**
 * Analytics service for collecting and processing system usage data
 * Provides methods for tracking user interactions, route optimizations, and system performance
 */

export interface AnalyticsEvent {
  eventType: 'route_search' | 'route_optimization' | 'user_login' | 'api_request' | 'error' | 'page_view';
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    platform?: 'web' | 'mobile' | 'api';
  };
}

export interface UsageMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sessionCount: number;
  averageSessionDuration: number;
  bounceRate: number;
  retentionRate: number;
}

export interface RouteAnalytics {
  routeId: string;
  routeName: string;
  searchCount: number;
  optimizationCount: number;
  averageRating: number;
  passengerCount: number;
  efficiencyScore: number;
  popularityRank: number;
}

export interface SystemPerformance {
  apiResponseTime: number;
  errorRate: number;
  throughput: number;
  uptime: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

export interface ReportData {
  period: {
    start: Date;
    end: Date;
  };
  usageMetrics: UsageMetrics;
  routeAnalytics: RouteAnalytics[];
  systemPerformance: SystemPerformance;
  optimizationMetrics: {
    totalOptimizations: number;
    averageTimeReduction: number;
    averageDistanceReduction: number;
    costSavings: number;
    passengerSatisfaction: number;
  };
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Track an analytics event
   */
  track(eventType: AnalyticsEvent['eventType'], properties: Record<string, any>, userId?: string): void {
    const event: AnalyticsEvent = {
      eventType,
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        platform: this.detectPlatform(),
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      },
    };

    this.events.push(event);
    this.sendEvent(event);
  }

  /**
   * Track route search event
   */
  trackRouteSearch(origin: string, destination: string, userId?: string): void {
    this.track('route_search', {
      origin,
      destination,
      searchTime: new Date().toISOString(),
    }, userId);
  }

  /**
   * Track route optimization event
   */
  trackRouteOptimization(routeId: string, optimizationScore: number, userId?: string): void {
    this.track('route_optimization', {
      routeId,
      optimizationScore,
      optimizationTime: new Date().toISOString(),
    }, userId);
  }

  /**
   * Track user login event
   */
  trackUserLogin(userId: string, userRole: string): void {
    this.track('user_login', {
      userRole,
      loginTime: new Date().toISOString(),
    }, userId);
  }

  /**
   * Track API request
   */
  trackApiRequest(endpoint: string, method: string, responseTime: number, statusCode: number): void {
    this.track('api_request', {
      endpoint,
      method,
      responseTime,
      statusCode,
      requestTime: new Date().toISOString(),
    });
  }

  /**
   * Track error event
   */
  trackError(error: Error, context?: Record<string, any>, userId?: string): void {
    this.track('error', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      context,
      errorTime: new Date().toISOString(),
    }, userId);
  }

  /**
   * Track page view
   */
  trackPageView(page: string, userId?: string): void {
    this.track('page_view', {
      page,
      viewTime: new Date().toISOString(),
    }, userId);
  }

  /**
   * Get usage metrics for a specific time period
   */
  async getUsageMetrics(startDate: Date, endDate: Date): Promise<UsageMetrics> {
    // In production, this would query a real analytics database
    const filteredEvents = this.events.filter(
      event => event.timestamp >= startDate && event.timestamp <= endDate
    );

    const uniqueUsers = new Set(filteredEvents.filter(e => e.userId).map(e => e.userId)).size;
    const uniqueSessions = new Set(filteredEvents.map(e => e.sessionId)).size;
    
    // Mock calculations - in production these would be real metrics
    return {
      totalUsers: uniqueUsers || Math.floor(Math.random() * 1000 + 5000),
      activeUsers: Math.floor(uniqueUsers * 0.3) || Math.floor(Math.random() * 500 + 1500),
      newUsers: Math.floor(uniqueUsers * 0.1) || Math.floor(Math.random() * 100 + 200),
      sessionCount: uniqueSessions || Math.floor(Math.random() * 2000 + 3000),
      averageSessionDuration: Math.random() * 10 + 5, // 5-15 minutes
      bounceRate: Math.random() * 30 + 20, // 20-50%
      retentionRate: Math.random() * 20 + 70, // 70-90%
    };
  }

  /**
   * Get route analytics for a specific time period
   */
  async getRouteAnalytics(startDate: Date, endDate: Date): Promise<RouteAnalytics[]> {
    // Mock data - in production this would query real analytics
    return [
      {
        routeId: 'route-001',
        routeName: 'Bandra to Andheri Express',
        searchCount: Math.floor(Math.random() * 1000 + 2000),
        optimizationCount: Math.floor(Math.random() * 50 + 100),
        averageRating: Math.random() * 1.5 + 3.5,
        passengerCount: Math.floor(Math.random() * 5000 + 10000),
        efficiencyScore: Math.floor(Math.random() * 20 + 80),
        popularityRank: 1,
      },
      {
        routeId: 'route-002',
        routeName: 'Colaba to Churchgate Local',
        searchCount: Math.floor(Math.random() * 800 + 1500),
        optimizationCount: Math.floor(Math.random() * 40 + 80),
        averageRating: Math.random() * 1.2 + 3.8,
        passengerCount: Math.floor(Math.random() * 4000 + 8000),
        efficiencyScore: Math.floor(Math.random() * 25 + 70),
        popularityRank: 2,
      },
      {
        routeId: 'route-003',
        routeName: 'Dadar to Borivali Fast',
        searchCount: Math.floor(Math.random() * 1200 + 1800),
        optimizationCount: Math.floor(Math.random() * 60 + 120),
        averageRating: Math.random() * 1.0 + 4.0,
        passengerCount: Math.floor(Math.random() * 6000 + 12000),
        efficiencyScore: Math.floor(Math.random() * 15 + 85),
        popularityRank: 3,
      },
    ];
  }

  /**
   * Get system performance metrics
   */
  async getSystemPerformance(startDate: Date, endDate: Date): Promise<SystemPerformance> {
    // Mock data - in production this would query real system metrics
    return {
      apiResponseTime: Math.random() * 200 + 50, // 50-250ms
      errorRate: Math.random() * 5, // 0-5%
      throughput: Math.random() * 1000 + 500, // 500-1500 req/min
      uptime: Math.random() * 5 + 95, // 95-100%
      resourceUtilization: {
        cpu: Math.random() * 80 + 10, // 10-90%
        memory: Math.random() * 70 + 20, // 20-90%
        disk: Math.random() * 60 + 30, // 30-90%
        network: Math.random() * 50 + 25, // 25-75%
      },
    };
  }

  /**
   * Generate a comprehensive report for a time period
   */
  async generateReport(startDate: Date, endDate: Date): Promise<ReportData> {
    const [usageMetrics, routeAnalytics, systemPerformance] = await Promise.all([
      this.getUsageMetrics(startDate, endDate),
      this.getRouteAnalytics(startDate, endDate),
      this.getSystemPerformance(startDate, endDate),
    ]);

    return {
      period: { start: startDate, end: endDate },
      usageMetrics,
      routeAnalytics,
      systemPerformance,
      optimizationMetrics: {
        totalOptimizations: Math.floor(Math.random() * 500 + 1000),
        averageTimeReduction: Math.random() * 20 + 15,
        averageDistanceReduction: Math.random() * 15 + 10,
        costSavings: Math.random() * 500000 + 200000,
        passengerSatisfaction: Math.random() * 20 + 75,
      },
    };
  }

  /**
   * Export report data as CSV
   */
  exportReportAsCSV(reportData: ReportData): string {
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('Report Period,' + reportData.period.start.toISOString() + ' to ' + reportData.period.end.toISOString());
    csvRows.push('');
    
    // Usage Metrics
    csvRows.push('Usage Metrics');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Users,${reportData.usageMetrics.totalUsers}`);
    csvRows.push(`Active Users,${reportData.usageMetrics.activeUsers}`);
    csvRows.push(`New Users,${reportData.usageMetrics.newUsers}`);
    csvRows.push(`Session Count,${reportData.usageMetrics.sessionCount}`);
    csvRows.push(`Average Session Duration,${reportData.usageMetrics.averageSessionDuration.toFixed(2)} minutes`);
    csvRows.push(`Bounce Rate,${reportData.usageMetrics.bounceRate.toFixed(2)}%`);
    csvRows.push(`Retention Rate,${reportData.usageMetrics.retentionRate.toFixed(2)}%`);
    csvRows.push('');
    
    // Route Analytics
    csvRows.push('Route Analytics');
    csvRows.push('Route Name,Search Count,Optimization Count,Average Rating,Passenger Count,Efficiency Score,Popularity Rank');
    reportData.routeAnalytics.forEach(route => {
      csvRows.push(`${route.routeName},${route.searchCount},${route.optimizationCount},${route.averageRating.toFixed(2)},${route.passengerCount},${route.efficiencyScore},${route.popularityRank}`);
    });
    csvRows.push('');
    
    // System Performance
    csvRows.push('System Performance');
    csvRows.push('Metric,Value');
    csvRows.push(`API Response Time,${reportData.systemPerformance.apiResponseTime.toFixed(2)}ms`);
    csvRows.push(`Error Rate,${reportData.systemPerformance.errorRate.toFixed(2)}%`);
    csvRows.push(`Throughput,${reportData.systemPerformance.throughput.toFixed(0)} req/min`);
    csvRows.push(`Uptime,${reportData.systemPerformance.uptime.toFixed(2)}%`);
    csvRows.push(`CPU Utilization,${reportData.systemPerformance.resourceUtilization.cpu.toFixed(2)}%`);
    csvRows.push(`Memory Utilization,${reportData.systemPerformance.resourceUtilization.memory.toFixed(2)}%`);
    csvRows.push(`Disk Utilization,${reportData.systemPerformance.resourceUtilization.disk.toFixed(2)}%`);
    csvRows.push(`Network Utilization,${reportData.systemPerformance.resourceUtilization.network.toFixed(2)}%`);
    csvRows.push('');
    
    // Optimization Metrics
    csvRows.push('Optimization Metrics');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Optimizations,${reportData.optimizationMetrics.totalOptimizations}`);
    csvRows.push(`Average Time Reduction,${reportData.optimizationMetrics.averageTimeReduction.toFixed(2)}%`);
    csvRows.push(`Average Distance Reduction,${reportData.optimizationMetrics.averageDistanceReduction.toFixed(2)}%`);
    csvRows.push(`Cost Savings,$${reportData.optimizationMetrics.costSavings.toFixed(0)}`);
    csvRows.push(`Passenger Satisfaction,${reportData.optimizationMetrics.passengerSatisfaction.toFixed(2)}%`);
    
    return csvRows.join('\n');
  }

  /**
   * Export report data as JSON
   */
  exportReportAsJSON(reportData: ReportData): string {
    return JSON.stringify(reportData, null, 2);
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private detectPlatform(): 'web' | 'mobile' | 'api' {
    if (typeof window === 'undefined') return 'api';
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile';
    }
    return 'web';
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // In production, this would send the event to an analytics service
      // For now, we'll just log it
      console.log('Analytics Event:', event);
      
      // Mock API call
      // await fetch('/api/analytics/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export types and service class
export { AnalyticsService };