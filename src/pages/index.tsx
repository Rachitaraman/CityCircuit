import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Layout } from '../components/layout/Layout';
import { RouteSearchForm, RouteCard } from '../components/routes';
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, Badge } from '../components/ui';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

// Mock data
const mockRoutes = [
  {
    id: 'route_001',
    name: 'CST to Gateway Express',
    description: 'Historic route connecting CST to Gateway of India with scenic views',
    operatorId: 'mumbai-transport-001',
    estimatedTravelTime: 30,
    optimizationScore: 75,
    stops: [
      {
        id: 'stop_001',
        name: 'Chhatrapati Shivaji Terminus',
        coordinates: { latitude: 18.9398, longitude: 72.8355 },
        isAccessible: true,
      },
      {
        id: 'stop_002',
        name: 'Fort District',
        coordinates: { latitude: 18.9320, longitude: 72.8347 },
        isAccessible: false,
      },
      {
        id: 'stop_003',
        name: 'Gateway of India',
        coordinates: { latitude: 18.9220, longitude: 72.8347 },
        isAccessible: true,
      },
    ],
    isActive: true,
  },
  {
    id: 'route_002',
    name: 'Andheri to Bandra Link',
    description: 'Fast connection between Andheri and Bandra business districts',
    operatorId: 'mumbai-transport-002',
    estimatedTravelTime: 45,
    optimizationScore: 92,
    stops: [
      {
        id: 'stop_004',
        name: 'Andheri Station',
        coordinates: { latitude: 19.1197, longitude: 72.8464 },
        isAccessible: true,
      },
      {
        id: 'stop_005',
        name: 'Bandra Kurla Complex',
        coordinates: { latitude: 19.0596, longitude: 72.8656 },
        isAccessible: true,
      },
    ],
    isActive: true,
  },
];

const recentSearches = [
  { origin: 'CST Station', destination: 'Gateway of India', timestamp: new Date() },
  { origin: 'Andheri', destination: 'Bandra', timestamp: new Date() },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [searchResults, setSearchResults] = useState(mockRoutes);
  const [isSearching, setIsSearching] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [stats, setStats] = useState({
    activeRoutes: 150,
    dailyPassengers: 2500000,
    avgOptimization: 85,
    serviceMonitoring: '24/7'
  });

  // Show auth modal if user is not authenticated
  useEffect(() => {
    console.log('🏠 Home: Auth state effect triggered:', { isAuthenticated, user: user?.name });
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        console.log('🏠 Home: Showing auth modal after timeout');
        setShowAuthModal(true);
      }, 1000); // Show after 1 second
      
      return () => clearTimeout(timer);
    } else {
      console.log('🏠 Home: User is authenticated, hiding auth modal');
      setShowAuthModal(false);
    }
  }, [isAuthenticated, user]);

  const handleAuthSuccess = (user: any) => {
    console.log('🏠 Home: Authentication successful:', user);
    setShowAuthModal(false);
    // Stay on homepage after authentication - no redirect
    // User will see the enhanced authenticated homepage with CTA buttons
  };

  // Load real-time stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            activeRoutes: data.activeRoutes || 150,
            dailyPassengers: Math.floor(Math.random() * 500000) + 2000000, // Simulate daily passengers
            avgOptimization: 85,
            serviceMonitoring: '24/7'
          });
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (filters: any) => {
    setIsSearching(true);
    
    try {
      // Call the real backend API for route search with origin and destination
      const apiUrl = `/api/routes?origin=${encodeURIComponent(filters.origin)}&destination=${encodeURIComponent(filters.destination)}&limit=10`;
      
      console.log('🔍 Searching routes:', { origin: filters.origin, destination: filters.destination });
      console.log('📡 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 API Response:', data);
      
      // If we get routes from the API, use them
      if (data.routes && data.routes.length > 0) {
        console.log(`✅ Found ${data.routes.length} routes from API`);
        setSearchResults(data.routes);
      } else {
        console.log('⚠️ No routes from API, using fallback');
        // If no routes from API, generate realistic routes based on origin and destination
        const generatedRoutes = await generateRoutesForSearch(filters.origin, filters.destination);
        setSearchResults(generatedRoutes);
      }
    } catch (error) {
      console.error('❌ Route search failed:', error);
      // Fallback to generated routes if API fails
      try {
        const generatedRoutes = await generateRoutesForSearch(filters.origin, filters.destination);
        setSearchResults(generatedRoutes);
      } catch (fallbackError) {
        console.error('❌ Fallback route generation failed:', fallbackError);
        setSearchResults(mockRoutes);
      }
    }
    
    setIsSearching(false);
  };

  // Function to generate realistic routes based on search parameters
  const generateRoutesForSearch = async (origin: string, destination: string) => {
    if (!origin || !destination) {
      return mockRoutes;
    }

    // Load Mumbai bus stops data
    let busStops = [];
    try {
      const response = await fetch('/data/mumbai-bus-stops.json');
      busStops = await response.json();
    } catch (error) {
      console.error('Failed to load bus stops:', error);
      return mockRoutes;
    }

    // Find origin and destination stops
    const originStop = busStops.find((stop: any) => stop.name === origin);
    const destinationStop = busStops.find((stop: any) => stop.name === destination);

    if (!originStop || !destinationStop) {
      return mockRoutes;
    }

    // Generate 2-4 different route options
    const routes = [];
    const routeCount = Math.floor(Math.random() * 3) + 2; // 2-4 routes

    for (let i = 0; i < routeCount; i++) {
      // Generate intermediate stops
      const intermediateStops = generateIntermediateStops(busStops, originStop, destinationStop, i);
      
      // Calculate route metrics
      const totalStops = 2 + intermediateStops.length;
      const estimatedTime = calculateEstimatedTime(totalStops, originStop, destinationStop);
      const optimizationScore = Math.floor(Math.random() * 30) + 70; // 70-100%
      
      const route = {
        id: `route_${Date.now()}_${i}`,
        name: generateRouteName(origin, destination, i),
        description: generateRouteDescription(origin, destination, i),
        operatorId: 'mumbai-best-001',
        estimatedTravelTime: estimatedTime,
        optimizationScore: optimizationScore,
        stops: [
          {
            id: `stop_${originStop.name}`,
            name: originStop.name,
            coordinates: { latitude: originStop.latitude, longitude: originStop.longitude },
            isAccessible: Math.random() > 0.3,
          },
          ...intermediateStops.map((stop: any, idx: number) => ({
            id: `stop_${stop.name}_${idx}`,
            name: stop.name,
            coordinates: { latitude: stop.latitude, longitude: stop.longitude },
            isAccessible: Math.random() > 0.3,
          })),
          {
            id: `stop_${destinationStop.name}`,
            name: destinationStop.name,
            coordinates: { latitude: destinationStop.latitude, longitude: destinationStop.longitude },
            isAccessible: Math.random() > 0.3,
          },
        ],
        isActive: true,
      };

      routes.push(route);
    }

    return routes;
  };

  // Helper function to generate intermediate stops
  const generateIntermediateStops = (allStops: any[], origin: any, destination: any, routeIndex: number) => {
    // Filter stops that are geographically between origin and destination
    const intermediateStops = allStops.filter((stop: any) => {
      if (stop.name === origin.name || stop.name === destination.name) return false;
      
      // Simple geographic filtering - stops should be roughly between origin and destination
      const minLat = Math.min(origin.latitude, destination.latitude);
      const maxLat = Math.max(origin.latitude, destination.latitude);
      const minLng = Math.min(origin.longitude, destination.longitude);
      const maxLng = Math.max(origin.longitude, destination.longitude);
      
      return stop.latitude >= minLat - 0.01 && stop.latitude <= maxLat + 0.01 &&
             stop.longitude >= minLng - 0.01 && stop.longitude <= maxLng + 0.01;
    });

    // Select 1-4 random intermediate stops based on route index
    const stopCount = Math.min(routeIndex + 1, 4);
    const selectedStops = [];
    
    for (let i = 0; i < stopCount && i < intermediateStops.length; i++) {
      const randomIndex = Math.floor(Math.random() * intermediateStops.length);
      const stop = intermediateStops[randomIndex];
      if (!selectedStops.find(s => s.name === stop.name)) {
        selectedStops.push(stop);
      }
    }

    return selectedStops;
  };

  // Helper function to generate route names
  const generateRouteName = (origin: string, destination: string, index: number) => {
    const routeTypes = ['Express', 'Local', 'Limited', 'Fast'];
    const originShort = origin.split(',')[0].split(' ').slice(0, 2).join(' ');
    const destShort = destination.split(',')[0].split(' ').slice(0, 2).join(' ');
    
    return `${originShort} to ${destShort} ${routeTypes[index % routeTypes.length]}`;
  };

  // Helper function to generate route descriptions
  const generateRouteDescription = (origin: string, destination: string, index: number) => {
    const descriptions = [
      `Direct route connecting ${origin.split(',')[0]} to ${destination.split(',')[0]}`,
      `Fast connection between ${origin.split(',')[0]} and ${destination.split(',')[0]} with limited stops`,
      `Scenic route from ${origin.split(',')[0]} to ${destination.split(',')[0]} via major landmarks`,
      `Express service linking ${origin.split(',')[0]} and ${destination.split(',')[0]} business districts`,
    ];
    
    return descriptions[index % descriptions.length];
  };

  // Helper function to calculate estimated travel time
  const calculateEstimatedTime = (totalStops: number, origin: any, destination: any) => {
    // Base time calculation
    const baseTime = 15; // 15 minutes base
    const stopTime = totalStops * 3; // 3 minutes per stop
    
    // Distance factor (rough calculation)
    const latDiff = Math.abs(destination.latitude - origin.latitude);
    const lngDiff = Math.abs(destination.longitude - origin.longitude);
    const distanceFactor = (latDiff + lngDiff) * 1000; // Convert to approximate minutes
    
    return Math.max(15, Math.floor(baseTime + stopTime + distanceFactor));
  };

  const handleRouteAction = (action: string, route: any) => {
    console.log(`${action} route:`, route);
  };

  return (
    <>
      <Head>
        <title>CityCircuit - Bus Route Optimization</title>
        <meta name="description" content="Bus route optimization system for Mumbai's transportation challenges" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Layout>
        <div className="space-y-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-neutral-900 mb-4">
                {isAuthenticated ? `Welcome back, ${user?.name}!` : 'Welcome to CityCircuit'}
              </h1>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-6">
                {isAuthenticated 
                  ? 'Ready to find your perfect route? Discover optimized bus routes across Mumbai with real-time data and smart recommendations.'
                  : 'Smart bus route optimization for Mumbai\'s transportation network. Find the best routes, optimize existing ones, and improve urban mobility.'
                }
              </p>
              
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/dashboard">
                    <Button 
                      variant="primary" 
                      size="lg"
                      leftIcon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      }
                    >
                      🚌 Search Your Ride
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button 
                      variant="secondary" 
                      size="lg"
                      leftIcon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      }
                    >
                      📊 My Dashboard
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign In to Get Started
                  </Button>
                </div>
              )}
            </div>

            {showAlert && isAuthenticated && (
              <Alert
                variant="success"
                title="🎉 Welcome to CityCircuit!"
                dismissible
                onDismiss={() => setShowAlert(false)}
                className="mb-6"
              >
                You're now signed in! Click "Search Your Ride" to find optimized bus routes, or visit your dashboard to access advanced features like route analytics and optimization tools.
              </Alert>
            )}

            {!isAuthenticated && (
              <Alert
                variant="info"
                title="Get Started with CityCircuit"
                className="mb-6"
              >
                Sign in with your phone number to access route search, optimization features, and personalized recommendations for Mumbai's bus network.
              </Alert>
            )}
          </motion.div>

          {/* Feature Showcase for Authenticated Users */}
          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard'}>
                  <CardContent className="text-center p-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Smart Route Search</h3>
                    <p className="text-sm text-neutral-600">Find the fastest, most efficient routes across Mumbai with real-time data and AI optimization.</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/analytics'}>
                  <CardContent className="text-center p-6">
                    <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Route Analytics</h3>
                    <p className="text-sm text-neutral-600">Analyze route performance, passenger patterns, and optimization opportunities with detailed insights.</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/optimization'}>
                  <CardContent className="text-center p-6">
                    <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Route Optimization</h3>
                    <p className="text-sm text-neutral-600">Optimize existing routes for better efficiency, reduced travel time, and improved passenger experience.</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Search Form - Only show if authenticated */}
          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <RouteSearchForm
                onSearch={handleSearch}
                loading={isSearching}
                recentSearches={recentSearches}
              />
            </motion.div>
          )}

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-primary-600 mb-2">{stats.activeRoutes}+</div>
                  <div className="text-sm text-neutral-600">Active Routes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-secondary-600 mb-2">{(stats.dailyPassengers / 1000000).toFixed(1)}M</div>
                  <div className="text-sm text-neutral-600">Daily Passengers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-accent-600 mb-2">{stats.avgOptimization}%</div>
                  <div className="text-sm text-neutral-600">Avg Optimization</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-neutral-700 mb-2">{stats.serviceMonitoring}</div>
                  <div className="text-sm text-neutral-600">Service Monitoring</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Search Results - Only show if authenticated */}
          {isAuthenticated && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-900">
                  Available Routes
                </h2>
                <Badge variant="secondary">
                  {searchResults.length} routes found
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {searchResults.map((route, index) => (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <RouteCard
                      route={route}
                      onViewDetails={(route) => handleRouteAction('view', route)}
                      onOptimize={(route) => handleRouteAction('optimize', route)}
                      onEdit={(route) => handleRouteAction('edit', route)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{isAuthenticated ? 'Quick Actions' : 'Explore CityCircuit Features'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/routes">
                    <Button
                      variant="outline"
                      fullWidth
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      }
                    >
                      Manage Routes
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    }
                  >
                    Optimize Routes
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    }
                  >
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </Layout>
    </>
  );
}