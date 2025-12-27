import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Alert } from '../components/ui';
import { motion } from 'framer-motion';

interface OptimizationResult {
  id: string;
  routeId: string;
  routeName: string;
  originalTime: number;
  optimizedTime: number;
  timeSaved: number;
  efficiency: number;
  recommendations: string[];
  status: 'pending' | 'completed' | 'failed';
}

export default function OptimizationPage() {
  const [optimizations, setOptimizations] = useState<OptimizationResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const mockOptimizations: OptimizationResult[] = [
      {
        id: 'opt-001',
        routeId: 'route-001',
        routeName: 'Downtown Express',
        originalTime: 45,
        optimizedTime: 38,
        timeSaved: 7,
        efficiency: 85.5,
        recommendations: [
          'Reduce stops during peak hours',
          'Optimize traffic light timing',
          'Add express lanes'
        ],
        status: 'completed'
      },
      {
        id: 'opt-002',
        routeId: 'route-002',
        routeName: 'Suburban Connector',
        originalTime: 60,
        optimizedTime: 52,
        timeSaved: 8,
        efficiency: 78.2,
        recommendations: [
          'Implement dynamic routing',
          'Increase frequency during rush hours',
          'Add dedicated bus lanes'
        ],
        status: 'completed'
      }
    ];
    setOptimizations(mockOptimizations);
  }, []);

  const handleOptimizeRoute = async () => {
    if (!selectedRoute) return;
    
    setIsOptimizing(true);
    
    // Simulate optimization process
    setTimeout(() => {
      const newOptimization: OptimizationResult = {
        id: `opt-${Date.now()}`,
        routeId: selectedRoute,
        routeName: `Route ${selectedRoute}`,
        originalTime: Math.floor(Math.random() * 60) + 30,
        optimizedTime: 0,
        timeSaved: 0,
        efficiency: Math.floor(Math.random() * 20) + 70,
        recommendations: [
          'Dynamic route adjustment based on traffic',
          'Optimize stop locations',
          'Implement real-time passenger data'
        ],
        status: 'completed'
      };
      
      newOptimization.optimizedTime = Math.floor(newOptimization.originalTime * 0.85);
      newOptimization.timeSaved = newOptimization.originalTime - newOptimization.optimizedTime;
      
      setOptimizations(prev => [newOptimization, ...prev]);
      setIsOptimizing(false);
      setSelectedRoute('');
    }, 3000);
  };

  return (
    <>
      <Head>
        <title>Route Optimization - CityCircuit</title>
        <meta name="description" content="Optimize bus routes for better efficiency and passenger experience" />
      </Head>
      
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">
              Route Optimization
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              AI-powered route optimization to improve efficiency, reduce travel time, and enhance passenger experience.
            </p>
          </div>

          {/* Optimization Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Optimize New Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Select Route to Optimize
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Choose a route...</option>
                    <option value="route-001">Downtown Express</option>
                    <option value="route-002">Suburban Connector</option>
                    <option value="route-003">Airport Shuttle</option>
                    <option value="route-004">Cross Town Link</option>
                  </select>
                </div>
                <Button
                  onClick={handleOptimizeRoute}
                  loading={isOptimizing}
                  disabled={!selectedRoute}
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                >
                  {isOptimizing ? 'Optimizing...' : 'Start Optimization'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Optimization Results */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900">Optimization Results</h2>
            
            {optimizations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <svg className="w-16 h-16 text-neutral-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-neutral-600">No optimization results yet. Start by optimizing a route above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {optimizations.map((optimization, index) => (
                  <motion.div
                    key={optimization.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{optimization.routeName}</CardTitle>
                          <Badge variant={optimization.status === 'completed' ? 'success' : 'warning'}>
                            {optimization.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Time Comparison */}
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-sm text-neutral-600">Original</p>
                              <p className="text-2xl font-bold text-neutral-900">{optimization.originalTime}m</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600">Optimized</p>
                              <p className="text-2xl font-bold text-secondary-600">{optimization.optimizedTime}m</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600">Saved</p>
                              <p className="text-2xl font-bold text-primary-600">{optimization.timeSaved}m</p>
                            </div>
                          </div>

                          {/* Efficiency Score */}
                          <div className="text-center">
                            <p className="text-sm text-neutral-600 mb-2">Efficiency Score</p>
                            <div className="relative w-full bg-neutral-200 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${optimization.efficiency}%` }}
                              />
                            </div>
                            <p className="text-lg font-bold text-neutral-900 mt-2">{optimization.efficiency}%</p>
                          </div>

                          {/* Recommendations */}
                          <div>
                            <p className="text-sm font-medium text-neutral-700 mb-2">Recommendations:</p>
                            <ul className="space-y-1">
                              {optimization.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-neutral-600 flex items-start">
                                  <span className="text-primary-500 mr-2">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" fullWidth>
                              View Details
                            </Button>
                            <Button variant="primary" size="sm" fullWidth>
                              Apply Changes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}