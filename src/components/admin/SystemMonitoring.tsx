import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../utils/translations';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface SystemMonitoringProps {
  className?: string;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    inbound: number;
    outbound: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    queryTime: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  services: {
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastCheck: Date;
  }[];
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  service: string;
  message: string;
  details?: string;
}

const SystemMonitoring: React.FC<SystemMonitoringProps> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLogLevel, setSelectedLogLevel] = useState<'all' | 'info' | 'warning' | 'error'>('all');

  useEffect(() => {
    loadSystemMetrics();
    loadSystemLogs();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadSystemMetrics();
        loadSystemLogs();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadSystemMetrics = async () => {
    try {
      setError(null);

      // Mock API call - in production this would be real system metrics
      const mockMetrics: SystemMetrics = {
        cpu: {
          usage: Math.random() * 80 + 10, // 10-90%
          cores: 8,
          temperature: Math.random() * 20 + 45, // 45-65°C
        },
        memory: {
          used: Math.random() * 6 + 2, // 2-8 GB
          total: 16,
          percentage: 0,
        },
        disk: {
          used: Math.random() * 200 + 50, // 50-250 GB
          total: 500,
          percentage: 0,
        },
        network: {
          inbound: Math.random() * 100 + 10, // 10-110 Mbps
          outbound: Math.random() * 50 + 5, // 5-55 Mbps
        },
        database: {
          connections: Math.floor(Math.random() * 80 + 10), // 10-90 connections
          maxConnections: 100,
          queryTime: Math.random() * 50 + 5, // 5-55ms
        },
        api: {
          requestsPerMinute: Math.floor(Math.random() * 1000 + 100), // 100-1100 req/min
          averageResponseTime: Math.random() * 200 + 50, // 50-250ms
          errorRate: Math.random() * 5, // 0-5%
        },
        services: [
          {
            name: 'API Gateway',
            status: Math.random() > 0.1 ? 'healthy' : 'warning',
            uptime: Math.random() * 30 + 1, // 1-31 days
            lastCheck: new Date(),
          },
          {
            name: 'ML Service',
            status: Math.random() > 0.15 ? 'healthy' : 'warning',
            uptime: Math.random() * 25 + 5, // 5-30 days
            lastCheck: new Date(),
          },
          {
            name: 'Database',
            status: Math.random() > 0.05 ? 'healthy' : 'critical',
            uptime: Math.random() * 45 + 10, // 10-55 days
            lastCheck: new Date(),
          },
          {
            name: 'Redis Cache',
            status: Math.random() > 0.1 ? 'healthy' : 'warning',
            uptime: Math.random() * 20 + 5, // 5-25 days
            lastCheck: new Date(),
          },
          {
            name: 'External APIs',
            status: Math.random() > 0.2 ? 'healthy' : 'warning',
            uptime: Math.random() * 15 + 1, // 1-16 days
            lastCheck: new Date(),
          },
        ],
      };

      // Calculate percentages
      mockMetrics.memory.percentage = (mockMetrics.memory.used / mockMetrics.memory.total) * 100;
      mockMetrics.disk.percentage = (mockMetrics.disk.used / mockMetrics.disk.total) * 100;

      setMetrics(mockMetrics);
    } catch (err) {
      console.error('Failed to load system metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load system metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemLogs = async () => {
    try {
      // Mock API call for system logs
      const mockLogs: LogEntry[] = [
        {
          id: 'log-001',
          timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          level: 'info',
          service: 'API Gateway',
          message: 'Route optimization request completed successfully',
          details: 'Processed 15 routes in 2.3 seconds',
        },
        {
          id: 'log-002',
          timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
          level: 'warning',
          service: 'ML Service',
          message: 'High memory usage detected',
          details: 'Memory usage at 85%, consider scaling up',
        },
        {
          id: 'log-003',
          timestamp: new Date(Date.now() - 18 * 60 * 1000), // 18 minutes ago
          level: 'info',
          service: 'Database',
          message: 'Database backup completed',
          details: 'Backup size: 2.4 GB, Duration: 45 seconds',
        },
        {
          id: 'log-004',
          timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          level: 'error',
          service: 'External APIs',
          message: 'Google Maps API rate limit exceeded',
          details: 'Switching to cached data for next 10 minutes',
        },
        {
          id: 'log-005',
          timestamp: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
          level: 'info',
          service: 'Redis Cache',
          message: 'Cache cleanup completed',
          details: 'Removed 1,247 expired entries',
        },
      ];

      setLogs(mockLogs);
    } catch (err) {
      console.error('Failed to load system logs:', err);
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogLevelColor = (level: 'info' | 'warning' | 'error') => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetricColor = (percentage: number) => {
    if (percentage < 60) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredLogs = logs.filter(log => 
    selectedLogLevel === 'all' || log.level === selectedLogLevel
  );

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
            {t('admin.systemMonitoring') || 'System Monitoring'}
          </h2>
          <p className="text-neutral-600">
            {t('admin.systemMonitoringDesc') || 'Monitor system health and performance metrics'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700">
              {t('admin.autoRefresh') || 'Auto Refresh'}
            </span>
          </label>
          <Button
            onClick={() => {
              loadSystemMetrics();
              loadSystemLogs();
            }}
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

      {metrics && (
        <>
          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* CPU */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t('admin.cpu') || 'CPU'}
                </h3>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.cpu.usage)}`}>
                  {metrics.cpu.usage.toFixed(1)}%
                </div>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{t('admin.cores') || 'Cores'}:</span>
                  <span>{metrics.cpu.cores}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.temperature') || 'Temperature'}:</span>
                  <span>{metrics.cpu.temperature.toFixed(1)}°C</span>
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t('admin.memory') || 'Memory'}
                </h3>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.memory.percentage)}`}>
                  {metrics.memory.percentage.toFixed(1)}%
                </div>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{t('admin.used') || 'Used'}:</span>
                  <span>{metrics.memory.used.toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.total') || 'Total'}:</span>
                  <span>{metrics.memory.total} GB</span>
                </div>
              </div>
            </div>

            {/* Disk */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t('admin.disk') || 'Disk'}
                </h3>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.disk.percentage)}`}>
                  {metrics.disk.percentage.toFixed(1)}%
                </div>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{t('admin.used') || 'Used'}:</span>
                  <span>{metrics.disk.used.toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.total') || 'Total'}:</span>
                  <span>{metrics.disk.total} GB</span>
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t('admin.network') || 'Network'}
                </h3>
                <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{t('admin.inbound') || 'Inbound'}:</span>
                  <span>{metrics.network.inbound.toFixed(1)} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.outbound') || 'Outbound'}:</span>
                  <span>{metrics.network.outbound.toFixed(1)} Mbps</span>
                </div>
              </div>
            </div>

            {/* Database */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t('admin.database') || 'Database'}
                </h3>
                <div className="text-2xl font-bold text-neutral-900">
                  {metrics.database.connections}
                </div>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{t('admin.connections') || 'Connections'}:</span>
                  <span>{metrics.database.connections}/{metrics.database.maxConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.queryTime') || 'Avg Query Time'}:</span>
                  <span>{metrics.database.queryTime.toFixed(1)}ms</span>
                </div>
              </div>
            </div>

            {/* API */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t('admin.api') || 'API'}
                </h3>
                <div className="text-2xl font-bold text-neutral-900">
                  {metrics.api.requestsPerMinute}
                </div>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{t('admin.requestsPerMin') || 'Requests/min'}:</span>
                  <span>{metrics.api.requestsPerMinute}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.avgResponseTime') || 'Avg Response'}:</span>
                  <span>{metrics.api.averageResponseTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.errorRate') || 'Error Rate'}:</span>
                  <span className={metrics.api.errorRate > 2 ? 'text-red-600' : 'text-green-600'}>
                    {metrics.api.errorRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Services Status */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">
                {t('admin.servicesStatus') || 'Services Status'}
              </h3>
            </div>
            <div className="divide-y divide-neutral-200">
              {metrics.services.map((service, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-neutral-900">{service.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right text-sm text-neutral-500">
                      <div>{t('admin.uptime') || 'Uptime'}: {service.uptime.toFixed(1)} days</div>
                      <div>{t('admin.lastCheck') || 'Last check'}: {service.lastCheck.toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* System Logs */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              {t('admin.systemLogs') || 'System Logs'}
            </h3>
            <select
              value={selectedLogLevel}
              onChange={(e) => setSelectedLogLevel(e.target.value as 'all' | 'info' | 'warning' | 'error')}
              className="px-3 py-1 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">{t('admin.allLogs') || 'All Logs'}</option>
              <option value="info">{t('admin.infoLogs') || 'Info'}</option>
              <option value="warning">{t('admin.warningLogs') || 'Warning'}</option>
              <option value="error">{t('admin.errorLogs') || 'Error'}</option>
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 mx-auto text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-neutral-500">
              {t('admin.noLogs') || 'No logs available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 max-h-96 overflow-y-auto">
            {filteredLogs.map(log => (
              <div key={log.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-neutral-900">{log.service}</span>
                      <span className="text-xs text-neutral-500">
                        {log.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-neutral-700">{log.message}</p>
                    {log.details && (
                      <p className="text-sm text-neutral-500 mt-1">{log.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { SystemMonitoring };