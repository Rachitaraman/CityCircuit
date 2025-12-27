import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../utils/translations';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AnalyticsDashboardProps {
  className?: string;
}

interface AnalyticsData {
  routeUsage: {
    routeId: string;
    routeName: string;
    dailyPassengers: number;
    weeklyPassengers: number;
    monthlyPassengers: number;
    optimizationScore: number;
    efficiency: number;
  }[];
  systemUsage: {
    date: string;
    webUsers: number;
    mobileUsers: number;
    apiRequests: number;
    optimizationRequests: number;
  }[];
  optimizationMetrics: {
    totalOptimizations: number;
    averageTimeReduction: number;
    averageDistanceReduction: number;
    totalCostSavings: number;
    passengerSatisfaction: number;
  };
  popularRoutes: {
    routeId: string;
    routeName: string;
    searchCount: number;
    bookingCount: number;
    rating: number;
  }[];
  userEngagement: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    retentionRate: number;
    averageSessionTime: number;
  };
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'passengers' | 'requests' | 'optimizations'>('passengers');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock API call - in production this would be real analytics data
      const mockAnalytics: AnalyticsData = {
        routeUsage: [
          {
            routeId: 'route-001',
            routeName: 'Bandra to Andheri Express',
            dailyPassengers: Math.floor(Math.random() * 2000 + 1000),
            weeklyPassengers: Math.floor(Math.random() * 14000 + 7000),
            monthlyPassengers: Math.floor(Math.random() * 60000 + 30000),
            optimizationScore: Math.floor(Math.random() * 30 + 70),
            efficiency: Math.floor(Math.random() * 20 + 80),
          },
          {
            routeId: 'route-002',
            routeName: 'Colaba to Churchgate Local',
            dailyPassengers: Math.floor(Math.random() * 1500 + 800),
            weeklyPassengers: Math.floor(Math.random() * 10500 + 5600),
            monthlyPassengers: Math.floor(Math.random() * 45000 + 24000),
            optimizationScore: Math.floor(Math.random() * 25 + 65),
            efficiency: Math.floor(Math.random() * 25 + 70),
          },
          {
            routeId: 'route-003',
            routeName: 'Dadar to Borivali Fast',
            dailyPassengers: Math.floor(Math.random() * 2500 + 1200),
            weeklyPassengers: Math.floor(Math.random() * 17500 + 8400),
            monthlyPassengers: Math.floor(Math.random() * 75000 + 36000),
            optimizationScore: Math.floor(Math.random() * 20 + 75),
            efficiency: Math.floor(Math.random() * 15 + 85),
          },
        ],
        systemUsage: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          webUsers: Math.floor(Math.random() * 500 + 200),
          mobileUsers: Math.floor(Math.random() * 800 + 400),
          apiRequests: Math.floor(Math.random() * 2000 + 1000),
          optimizationRequests: Math.floor(Math.random() * 100 + 50),
        })).reverse(),
        optimizationMetrics: {
          totalOptimizations: Math.floor(Math.random() * 500 + 1000),
          averageTimeReduction: Math.random() * 20 + 15, // 15-35%
          averageDistanceReduction: Math.random() * 15 + 10, // 10-25%
          totalCostSavings: Math.random() * 500000 + 200000, // $200k-$700k
          passengerSatisfaction: Math.random() * 20 + 75, // 75-95%
        },
        popularRoutes: [
          {
            routeId: 'route-001',
            routeName: 'Bandra to Andheri Express',
            searchCount: Math.floor(Math.random() * 5000 + 3000),
            bookingCount: Math.floor(Math.random() * 2000 + 1500),
            rating: Math.random() * 1.5 + 3.5, // 3.5-5.0
          },
          {
            routeId: 'route-003',
            routeName: 'Dadar to Borivali Fast',
            searchCount: Math.floor(Math.random() * 4500 + 2500),
            bookingCount: Math.floor(Math.random() * 1800 + 1200),
            rating: Math.random() * 1.2 + 3.8, // 3.8-5.0
          },
          {
            routeId: 'route-002',
            routeName: 'Colaba to Churchgate Local',
            searchCount: Math.floor(Math.random() * 3500 + 2000),
            bookingCount: Math.floor(Math.random() * 1500 + 1000),
            rating: Math.random() * 1.0 + 4.0, // 4.0-5.0
          },
        ],
        userEngagement: {
          totalUsers: Math.floor(Math.random() * 2000 + 8000),
          activeUsers: Math.floor(Math.random() * 1500 + 2000),
          newUsers: Math.floor(Math.random() * 300 + 150),
          retentionRate: Math.random() * 20 + 70, // 70-90%
          averageSessionTime: Math.random() * 10 + 5, // 5-15 minutes
        },
      };

      setAnalytics(mockAnalytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            {t('admin.analytics') || 'Analytics Dashboard'}
          </h2>
          <p className="text-neutral-600">
            {t('admin.analyticsDesc') || 'System usage analytics and optimization effectiveness'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="7d">{t('admin.last7Days') || 'Last 7 Days'}</option>
            <option value="30d">{t('admin.last30Days') || 'Last 30 Days'}</option>
            <option value="90d">{t('admin.last90Days') || 'Last 90 Days'}</option>
          </select>
          <Button
            onClick={loadAnalytics}
            variant="outline"
            size="sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('common.refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">
                    {t('admin.totalOptimizations') || 'Total Optimizations'}
                  </p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {formatNumber(analytics.optimizationMetrics.totalOptimizations)}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-md">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">
                    {t('admin.avgTimeReduction') || 'Avg Time Reduction'}
                  </p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {analytics.optimizationMetrics.averageTimeReduction.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-md">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">
                    {t('admin.costSavings') || 'Cost Savings'}
                  </p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {formatCurrency(analytics.optimizationMetrics.totalCostSavings)}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-md">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">
                    {t('admin.passengerSatisfaction') || 'Passenger Satisfaction'}
                  </p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {analytics.optimizationMetrics.passengerSatisfaction.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-md">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* User Engagement */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              {t('admin.userEngagement') || 'User Engagement'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">
                  {formatNumber(analytics.userEngagement.totalUsers)}
                </p>
                <p className="text-sm text-neutral-600">
                  {t('admin.totalUsers') || 'Total Users'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(analytics.userEngagement.activeUsers)}
                </p>
                <p className="text-sm text-neutral-600">
                  {t('admin.activeUsers') || 'Active Users'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(analytics.userEngagement.newUsers)}
                </p>
                <p className="text-sm text-neutral-600">
                  {t('admin.newUsers') || 'New Users'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {analytics.userEngagement.retentionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-neutral-600">
                  {t('admin.retentionRate') || 'Retention Rate'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {analytics.userEngagement.averageSessionTime.toFixed(1)}m
                </p>
                <p className="text-sm text-neutral-600">
                  {t('admin.avgSessionTime') || 'Avg Session Time'}
                </p>
              </div>
            </div>
          </div>

          {/* Route Performance */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">
                {t('admin.routePerformance') || 'Route Performance'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('routes.name') || 'Route Name'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('admin.dailyPassengers') || 'Daily Passengers'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('admin.monthlyPassengers') || 'Monthly Passengers'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('admin.optimizationScore') || 'Optimization Score'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {t('admin.efficiency') || 'Efficiency'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {analytics.routeUsage.map((route) => (
                    <tr key={route.routeId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">{route.routeName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{formatNumber(route.dailyPassengers)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{formatNumber(route.monthlyPassengers)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-neutral-900">{route.optimizationScore}%</div>
                          <div className="ml-2 w-16 bg-neutral-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${route.optimizationScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-neutral-900">{route.efficiency}%</div>
                          <div className="ml-2 w-16 bg-neutral-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${route.efficiency}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Popular Routes */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">
                {t('admin.popularRoutes') || 'Popular Routes'}
              </h3>
            </div>
            <div className="divide-y divide-neutral-200">
              {analytics.popularRoutes.map((route, index) => (
                <div key={route.routeId} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">#{index + 1}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-neutral-900">{route.routeName}</h4>
                        <div className="flex items-center space-x-4 text-sm text-neutral-500">
                          <span>{formatNumber(route.searchCount)} searches</span>
                          <span>{formatNumber(route.bookingCount)} bookings</span>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>{route.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export { AnalyticsDashboard };