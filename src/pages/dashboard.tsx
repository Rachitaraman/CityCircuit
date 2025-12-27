import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Layout } from '../components/layout/Layout';
import { RouteSearchForm, RouteCard } from '../components/routes';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [recentRoutes, setRecentRoutes] = useState([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState([]);
  const [quickStats, setQuickStats] = useState({
    totalTrips: 0,
    savedRoutes: 0,
    timeSaved: 0,
    carbonSaved: 0
  });
  const [recentSearches, setRecentSearches] = useState([
    { origin: 'Andheri Station', destination: 'Bandra Kurla Complex', timestamp: new Date() },
    { origin: 'CST Station', destination: 'Gateway of India', timestamp: new Date() },
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    // Simulate loading user's recent routes and stats
    setQuickStats({
      totalTrips: Math.floor(Math.random() * 50) + 10,
      savedRoutes: Math.floor(Math.random() * 10) + 3,
      timeSaved: Math.floor(Math.random() * 120) + 30, // minutes
      carbonSaved: Math.floor(Math.random() * 50) + 15 // kg CO2
    });

    // Load recent routes
    const mockRecentRoutes = [
      {
        id: 'recent_001',
        name: 'Andheri to Bandra Express',
        description: 'Your most used route - saves 15 minutes daily',
        estimatedTravelTime: 35,
        optimizationScore: 92,
        lastUsed: new Date(),
        isActive: true,
      },
      {
        id: 'recent_002', 
        name: 'CST to Colaba Local',
        description: 'Weekend favorite route to South Mumbai',
        estimatedTravelTime: 25,
        optimizationScore: 88,
        lastUsed: new Date(Date.now() - 86400000), // Yesterday
        isActive: true,
      }
    ];
    setRecentRoutes(mockRecentRoutes);
  };

  const handleQuickSearch = async (filters: any) => {
    // Redirect to main search with filters
    window.location.href = `/?origin=${encodeURIComponent(filters.origin)}&destination=${encodeURIComponent(filters.destination)}`;
  };

  const getRoleBasedGreeting = () => {
    switch (user?.role) {
      case 'admin':
        return 'System Overview';
      case 'operator':
        return 'Route Management Hub';
      case 'passenger':
      default:
        return 'Your Journey Dashboard';
    }
  };

  const getRoleBasedActions = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { title: 'User Management', href: '/admin/users', icon: '👥', description: 'Manage system users' },
          { title: 'System Analytics', href: '/admin/analytics', icon: '📊', description: 'View system performance' },
          { title: 'Route Optimization', href: '/admin/optimization', icon: '⚡', description: 'Optimize all routes' },
        ];
      case 'operator':
        return [
          { title: 'Manage Routes', href: '/routes', icon: '🚌', description: 'Create and edit routes' },
          { title: 'Route Analytics', href: '/analytics', icon: '📈', description: 'View route performance' },
          { title: 'Optimization Tools', href: '/optimization', icon: '🔧', description: 'Optimize your routes' },
        ];
      case 'passenger':
      default:
        return [
          { title: 'Find Routes', href: '/routes', icon: '🔍', description: 'Search for bus routes' },
          { title: 'My Favorites', href: '/favorites', icon: '⭐', description: 'Your saved routes' },
          { title: 'Trip History', href: '/history', icon: '📋', description: 'View past journeys' },
        ];
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Please Sign In</h1>
          <p className="text-neutral-600 mb-6">You need to be signed in to access your dashboard.</p>
          <Link href="/">
            <Button variant="primary">Go to Home</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - CityCircuit</title>
        <meta name="description" content="Your personal CityCircuit dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Layout>
        <div className="space-y-8">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-6 text-white">
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-primary-100 text-lg">{getRoleBasedGreeting()}</p>
              <div className="mt-4 flex items-center space-x-4">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </Badge>
                <span className="text-primary-100 text-sm">
                  Last login: {new Date(user?.lastLoginAt || '').toLocaleDateString()}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-primary-600 mb-2">{quickStats.totalTrips}</div>
                  <div className="text-sm text-neutral-600">Total Trips</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-secondary-600 mb-2">{quickStats.savedRoutes}</div>
                  <div className="text-sm text-neutral-600">Saved Routes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-accent-600 mb-2">{quickStats.timeSaved}m</div>
                  <div className="text-sm text-neutral-600">Time Saved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">{quickStats.carbonSaved}kg</div>
                  <div className="text-sm text-neutral-600">CO₂ Saved</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getRoleBasedActions().map((action, index) => (
                    <Link key={index} href={action.href}>
                      <div className="p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{action.icon}</span>
                          <div>
                            <h3 className="font-medium text-neutral-900">{action.title}</h3>
                            <p className="text-sm text-neutral-600">{action.description}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Route Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Route Search</CardTitle>
              </CardHeader>
              <CardContent>
                <RouteSearchForm
                  onSearch={handleQuickSearch}
                  loading={false}
                  recentSearches={recentSearches}
                  compact={true}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Routes */}
          {recentRoutes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Routes</CardTitle>
                    <Link href="/routes">
                      <Button variant="ghost" size="sm">View All</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentRoutes.map((route, index) => (
                      <div key={route.id} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                        <div>
                          <h3 className="font-medium text-neutral-900">{route.name}</h3>
                          <p className="text-sm text-neutral-600">{route.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-neutral-500">
                            <span>⏱️ {route.estimatedTravelTime} min</span>
                            <span>📊 {route.optimizationScore}% optimized</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Use Route
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-neutral-600">Searched for routes from Andheri to Bandra</span>
                    <span className="text-neutral-400">2 hours ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-neutral-600">Saved route: CST to Gateway Express</span>
                    <span className="text-neutral-400">1 day ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-neutral-600">Updated profile preferences</span>
                    <span className="text-neutral-400">3 days ago</span>
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