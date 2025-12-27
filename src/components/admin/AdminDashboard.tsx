import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../utils/translations';
import { useAuth } from '../../contexts/AuthContext';
import { Route, BusStop, User } from '../../types';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { RouteManagement } from './RouteManagement';
import { UserManagement } from './UserManagement';
import { SystemMonitoring } from './SystemMonitoring';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ReportGenerator } from './ReportGenerator';

interface AdminDashboardProps {
  className?: string;
}

type DashboardTab = 'routes' | 'users' | 'analytics' | 'reports' | 'monitoring';

interface DashboardStats {
  totalRoutes: number;
  activeRoutes: number;
  totalStops: number;
  totalUsers: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('routes');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call to get dashboard statistics
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard statistics');
      }

      const data = await response.json();
      setStats({
        totalRoutes: data.totalRoutes || 0,
        activeRoutes: data.activeRoutes || 0,
        totalStops: data.totalStops || 0,
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        systemHealth: data.systemHealth || 'healthy',
        lastUpdated: new Date(data.lastUpdated || Date.now()),
      });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      
      // Fallback mock data for development
      setStats({
        totalRoutes: 156,
        activeRoutes: 142,
        totalStops: 1247,
        totalUsers: 8934,
        activeUsers: 2341,
        systemHealth: 'healthy',
        lastUpdated: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'routes' as DashboardTab, label: t('admin.routes') || 'Routes', icon: 'route' },
    { id: 'users' as DashboardTab, label: t('admin.users') || 'Users', icon: 'users' },
    { id: 'analytics' as DashboardTab, label: t('admin.analytics') || 'Analytics', icon: 'chart' },
    { id: 'reports' as DashboardTab, label: t('admin.reports') || 'Reports', icon: 'document' },
    { id: 'monitoring' as DashboardTab, label: t('admin.monitoring') || 'Monitoring', icon: 'monitor' },
  ];

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            {t('admin.accessDenied') || 'Access Denied'}
          </h2>
          <p className="text-neutral-600">
            {t('admin.adminRequired') || 'Administrator privileges required to access this page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {t('admin.dashboard') || 'Admin Dashboard'}
              </h1>
              <p className="text-sm text-neutral-600">
                {t('admin.subtitle') || 'Manage routes, users, and system configuration'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={loadDashboardStats}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('common.refresh') || 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {isLoading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-neutral-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {t('errors.loadFailed') || 'Failed to load dashboard'}
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard
              title={t('admin.stats.totalRoutes') || 'Total Routes'}
              value={stats.totalRoutes}
              icon="route"
              color="blue"
            />
            <StatCard
              title={t('admin.stats.activeRoutes') || 'Active Routes'}
              value={stats.activeRoutes}
              icon="check"
              color="green"
            />
            <StatCard
              title={t('admin.stats.totalStops') || 'Bus Stops'}
              value={stats.totalStops}
              icon="location"
              color="purple"
            />
            <StatCard
              title={t('admin.stats.totalUsers') || 'Total Users'}
              value={stats.totalUsers}
              icon="users"
              color="indigo"
            />
            <StatCard
              title={t('admin.stats.systemHealth') || 'System Health'}
              value={stats.systemHealth}
              icon="heart"
              color={stats.systemHealth === 'healthy' ? 'green' : stats.systemHealth === 'warning' ? 'yellow' : 'red'}
              isStatus
            />
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center">
                  <TabIcon icon={tab.icon} className="w-5 h-5 mr-2" />
                  {tab.label}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'routes' && <RouteManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'reports' && <ReportGenerator />}
        {activeTab === 'monitoring' && <SystemMonitoring />}
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  isStatus?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, isStatus = false }) => {
  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const formatValue = (val: number | string) => {
    if (isStatus) {
      return typeof val === 'string' ? val.charAt(0).toUpperCase() + val.slice(1) : val;
    }
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${getColorClasses(color)}`}>
          <StatIcon icon={icon} className="w-6 h-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className="text-2xl font-semibold text-neutral-900">{formatValue(value)}</p>
        </div>
      </div>
    </div>
  );
};

const TabIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className = '' }) => {
  const icons = {
    route: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    ),
    chart: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    document: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
    monitor: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[icon as keyof typeof icons] || icons.route}
    </svg>
  );
};

const StatIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className = '' }) => {
  const icons = {
    route: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    ),
    check: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    ),
    location: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    ),
    heart: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    ),
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[icon as keyof typeof icons] || icons.route}
    </svg>
  );
};

export { AdminDashboard };