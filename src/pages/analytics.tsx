import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Alert } from '../components/ui';
import { motion } from 'framer-motion';
import { useRealTimeData } from '../hooks/useRealTimeData';

interface AnalyticsData {
  totalRoutes: number;
  activeRoutes: number;
  totalPassengers: number;
  averageWaitTime: number;
  onTimePerformance: number;
  fuelEfficiency: number;
  popularRoutes: Array<{
    id: string;
    name: string;
    passengers: number;
    efficiency: number;
  }>;
  recentOptimizations: Array<{
    id: string;
    routeName: string;
    timeSaved: number;
    date: string;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const { data: realTimeData, isConnected, error } = useRealTimeData();

  // Mock real-time data updates
  useEffect(() => {
    const fetchAnalytics = () => {
      const mockData: AnalyticsData = {
        totalRoutes: 156,
        activeRoutes: 142,
        totalPassengers: realTimeData.passengerCount || Math.floor(Math.random() * 1000) + 25000,
        averageWaitTime: Math.floor(Math.random() * 5) + 8,
        onTimePerformance: Math.floor(Math.random() * 10) + 85,
        fuelEfficiency: Math.floor(Math.random() * 5) + 78,
        popularRoutes: [
          {
            id: 'route-001',
            name: 'Downtown Express',
            passengers: Math.floor(Math.random() * 500) + 2500,
            efficiency: Math.floor(Math.random() * 10) + 85
          },
          {
            id: 'route-002',
            name: 'Airport Shuttle',
            passengers: Math.floor(Math.random() * 300) + 1800,
            efficiency: Math.floor(Math.random() * 10) + 80
          },
          {
            id: 'route-003',
            name: 'Suburban Connector',
            passengers: Math.floor(Math.random() * 400) + 2200,
            efficiency: Math.floor(Math.random() * 10) + 75
          }
        ],
        recentOptimizations: [
          {
            id: 'opt-001',
            routeName: 'Downtown Express',
            timeSaved: 7,
            date: new Date().toLocaleDateString()
          },
          {
            id: 'opt-002',
            routeName: 'Cross Town Link',
            timeSaved: 12,
            date: new Date(Date.now() - 86400000).toLocaleDateString()
          }
        ]
      };
      setAnalytics(mockData);
    };

    fetchAnalytics();
    
    // Update data every 30 seconds for real-time effect
    const interval = setInterval(fetchAnalytics, 30000);
    
    return () => clearInterval(interval);
  }, [timeRange]);

  if (!analytics) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Analytics Dashboard - CityCircuit</title>
        <meta name="description" content="Real-time analytics and insights for Mumbai bus transportation system" />
      </Head>
      
      <Layout>
        <div className="space-y-8">
          {/* Real-time Connection Status */}
          {error && (
            <Alert variant="danger" title="Connection Error">
              {error}
            </Alert>
          )}
          
          {/* Real-time Alerts */}
          {realTimeData.systemAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Real-time Alerts
                    <Badge variant={isConnected ? 'success' : 'danger'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {realTimeData.systemAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded">
                        <span className="text-sm">{alert.message}</span>
                        <span className="text-xs text-neutral-500">
                          {alert.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-xl text-neutral-600">
                Real-time insights and performance metrics
              </p>
            </div>
            
            {/* Time Range Selector */}
            <div className="mt-4 md:mt-0">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">Total Routes</p>
                      <p className="text-3xl font-bold text-neutral-900">{analytics.totalRoutes}</p>
                      <p className="text-sm text-secondary-600">{analytics.activeRoutes} active</p>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">Daily Passengers</p>
                      <p className="text-3xl font-bold text-neutral-900">{analytics.totalPassengers.toLocaleString()}</p>
                      <p className="text-sm text-secondary-600">+5.2% from yesterday</p>
                    </div>
                    <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">Avg Wait Time</p>
                      <p className="text-3xl font-bold text-neutral-900">{analytics.averageWaitTime}m</p>
                      <p className="text-sm text-primary-600">-2m from last week</p>
                    </div>
                    <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">On-Time Performance</p>
                      <p className="text-3xl font-bold text-neutral-900">{analytics.onTimePerformance}%</p>
                      <p className="text-sm text-secondary-600">+3% this month</p>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Routes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Popular Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.popularRoutes.map((route, index) => (
                      <div key={route.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-primary-600">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">{route.name}</p>
                            <p className="text-sm text-neutral-600">{route.passengers.toLocaleString()} passengers</p>
                          </div>
                        </div>
                        <Badge variant={route.efficiency > 85 ? 'success' : route.efficiency > 75 ? 'warning' : 'danger'}>
                          {route.efficiency}% efficient
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Optimizations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Recent Optimizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.recentOptimizations.map((opt) => (
                      <div key={opt.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                        <div>
                          <p className="font-medium text-neutral-900">{opt.routeName}</p>
                          <p className="text-sm text-neutral-600">{opt.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">-{opt.timeSaved}m</p>
                          <p className="text-sm text-neutral-600">time saved</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Real-time Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>System Status</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-secondary-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-neutral-600">Live</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{analytics.fuelEfficiency}%</p>
                    <p className="text-sm text-neutral-600">Fuel Efficiency</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">1,247</p>
                    <p className="text-sm text-neutral-600">Total Optimizations</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">₹2.3M</p>
                    <p className="text-sm text-neutral-600">Cost Savings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    </>
  );
}