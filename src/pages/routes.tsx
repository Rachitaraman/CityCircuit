import React, { useState } from 'react';
import Head from 'next/head';
import { Layout } from '../components/layout/Layout';
import { RouteManagement } from '../components/routes/RouteManagement';
import { Route, OptimizationResult } from '../types';

// Mock data - in a real app, this would come from an API
const mockRoutes: Route[] = [
  {
    id: 'route_001',
    name: 'CST to Gateway Express',
    description: 'Historic route connecting CST to Gateway of India with scenic views',
    operatorId: 'mumbai-transport-001',
    estimatedTravelTime: 30,
    optimizationScore: 75,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    stops: [
      {
        id: 'stop_001',
        name: 'Chhatrapati Shivaji Terminus',
        coordinates: { latitude: 18.9398, longitude: 72.8355 },
        address: 'Dr Dadabhai Naoroji Rd, Fort, Mumbai, Maharashtra 400001',
        amenities: ['Waiting Area', 'Ticket Counter', 'Restrooms'],
        dailyPassengerCount: 5000,
        isAccessible: true,
      },
      {
        id: 'stop_002',
        name: 'Fort District',
        coordinates: { latitude: 18.9320, longitude: 72.8347 },
        address: 'Fort District, Mumbai, Maharashtra 400001',
        amenities: ['Shelter', 'Seating'],
        dailyPassengerCount: 2500,
        isAccessible: false,
      },
      {
        id: 'stop_003',
        name: 'Regal Cinema',
        coordinates: { latitude: 18.9270, longitude: 72.8347 },
        address: 'Shahid Bhagat Singh Rd, Fort, Mumbai, Maharashtra 400001',
        amenities: ['Shelter'],
        dailyPassengerCount: 1800,
        isAccessible: true,
      },
      {
        id: 'stop_004',
        name: 'Gateway of India',
        coordinates: { latitude: 18.9220, longitude: 72.8347 },
        address: 'Apollo Bandar, Colaba, Mumbai, Maharashtra 400001',
        amenities: ['Waiting Area', 'Information Kiosk', 'Restrooms'],
        dailyPassengerCount: 3500,
        isAccessible: true,
      },
    ],
  },
  {
    id: 'route_002',
    name: 'Andheri to Bandra Link',
    description: 'Fast connection between Andheri and Bandra business districts',
    operatorId: 'mumbai-transport-002',
    estimatedTravelTime: 45,
    optimizationScore: 92,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    stops: [
      {
        id: 'stop_005',
        name: 'Andheri Station West',
        coordinates: { latitude: 19.1197, longitude: 72.8464 },
        address: 'Andheri West, Mumbai, Maharashtra 400058',
        amenities: ['Waiting Area', 'Ticket Counter', 'Food Court'],
        dailyPassengerCount: 8000,
        isAccessible: true,
      },
      {
        id: 'stop_006',
        name: 'Versova',
        coordinates: { latitude: 19.1317, longitude: 72.8156 },
        address: 'Versova, Andheri West, Mumbai, Maharashtra 400061',
        amenities: ['Shelter', 'Seating'],
        dailyPassengerCount: 3200,
        isAccessible: true,
      },
      {
        id: 'stop_007',
        name: 'Juhu Beach',
        coordinates: { latitude: 19.0990, longitude: 72.8265 },
        address: 'Juhu Beach, Mumbai, Maharashtra 400049',
        amenities: ['Shelter', 'Information Board'],
        dailyPassengerCount: 2800,
        isAccessible: false,
      },
      {
        id: 'stop_008',
        name: 'Bandra Kurla Complex',
        coordinates: { latitude: 19.0596, longitude: 72.8656 },
        address: 'Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
        amenities: ['Waiting Area', 'Ticket Counter', 'Restrooms', 'ATM'],
        dailyPassengerCount: 6500,
        isAccessible: true,
      },
    ],
  },
  {
    id: 'route_003',
    name: 'Suburban Circle Route',
    description: 'Comprehensive suburban route covering major residential areas',
    operatorId: 'mumbai-transport-003',
    estimatedTravelTime: 75,
    optimizationScore: 58,
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
    stops: [
      {
        id: 'stop_009',
        name: 'Borivali Station',
        coordinates: { latitude: 19.2307, longitude: 72.8567 },
        address: 'Borivali West, Mumbai, Maharashtra 400092',
        amenities: ['Waiting Area', 'Ticket Counter'],
        dailyPassengerCount: 4500,
        isAccessible: true,
      },
      {
        id: 'stop_010',
        name: 'Malad West',
        coordinates: { latitude: 19.1864, longitude: 72.8493 },
        address: 'Malad West, Mumbai, Maharashtra 400064',
        amenities: ['Shelter'],
        dailyPassengerCount: 3800,
        isAccessible: false,
      },
      {
        id: 'stop_011',
        name: 'Goregaon Station',
        coordinates: { latitude: 19.1653, longitude: 72.8526 },
        address: 'Goregaon West, Mumbai, Maharashtra 400062',
        amenities: ['Waiting Area', 'Food Stall'],
        dailyPassengerCount: 4200,
        isAccessible: true,
      },
    ],
  },
  {
    id: 'route_004',
    name: 'Airport Express',
    description: 'Direct route to Mumbai International Airport',
    operatorId: 'mumbai-transport-004',
    estimatedTravelTime: 25,
    optimizationScore: 88,
    isActive: false,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-22'),
    stops: [
      {
        id: 'stop_012',
        name: 'Andheri Station East',
        coordinates: { latitude: 19.1136, longitude: 72.8697 },
        address: 'Andheri East, Mumbai, Maharashtra 400069',
        amenities: ['Waiting Area', 'Luggage Storage'],
        dailyPassengerCount: 2200,
        isAccessible: true,
      },
      {
        id: 'stop_013',
        name: 'Mumbai International Airport',
        coordinates: { latitude: 19.0896, longitude: 72.8656 },
        address: 'Mumbai International Airport, Andheri East, Mumbai, Maharashtra 400099',
        amenities: ['Waiting Area', 'Information Desk', 'Restrooms', 'WiFi'],
        dailyPassengerCount: 1500,
        isAccessible: true,
      },
    ],
  },
];

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>(mockRoutes);

  const handleCreateRoute = () => {
    console.log('Create new route');
    // In a real app, this would open a route creation modal/form
  };

  const handleEditRoute = (route: Route) => {
    console.log('Edit route:', route);
    // In a real app, this would open a route editing modal/form
  };

  const handleDeleteRoute = (routeId: string) => {
    console.log('Delete route:', routeId);
    setRoutes(prev => prev.filter(r => r.id !== routeId));
  };

  const handleOptimizeRoute = async (routeId: string, goals: string[]): Promise<OptimizationResult> => {
    console.log('Optimize route:', routeId, 'with goals:', goals);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const route = routes.find(r => r.id === routeId);
    if (!route) throw new Error('Route not found');

    // Mock optimization result
    const mockResult: OptimizationResult = {
      id: `opt_${Date.now()}`,
      originalRouteId: routeId,
      optimizedRoute: {
        ...route,
        optimizationScore: Math.min(100, route.optimizationScore + Math.random() * 20 + 5),
        estimatedTravelTime: Math.max(10, route.estimatedTravelTime - Math.random() * 10),
        updatedAt: new Date(),
      },
      metrics: {
        timeImprovement: Math.random() * 25 + 5,
        distanceReduction: Math.random() * 15 + 3,
        passengerCoverageIncrease: Math.random() * 20 + 8,
        costSavings: Math.random() * 50000 + 10000,
      },
      populationData: {
        id: `pop_${Date.now()}`,
        region: 'Mumbai Metropolitan Region',
        coordinates: {
          north: 19.3,
          south: 18.8,
          east: 73.0,
          west: 72.7,
        },
        densityPoints: [],
        dataSource: 'Census 2021',
        collectedAt: new Date(),
      },
      generatedAt: new Date(),
    };

    return mockResult;
  };

  const handleApplyOptimization = (result: OptimizationResult) => {
    console.log('Apply optimization:', result);
    
    // Update the route with optimized version
    setRoutes(prev => prev.map(route => 
      route.id === result.originalRouteId ? result.optimizedRoute : route
    ));
  };

  return (
    <>
      <Head>
        <title>Route Management - CityCircuit</title>
        <meta name="description" content="Manage and optimize your bus routes with CityCircuit" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Layout>
        <RouteManagement
          routes={routes}
          onCreateRoute={handleCreateRoute}
          onEditRoute={handleEditRoute}
          onDeleteRoute={handleDeleteRoute}
          onOptimizeRoute={handleOptimizeRoute}
          onApplyOptimization={handleApplyOptimization}
        />
      </Layout>
    </>
  );
}