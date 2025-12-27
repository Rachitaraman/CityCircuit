import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Route, OptimizationResult } from '../../types';

export interface OptimizationGoal {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export interface RouteOptimizationInterfaceProps {
  route: Route;
  onOptimize: (routeId: string, goals: string[]) => Promise<OptimizationResult>;
  onApplyOptimization?: (result: OptimizationResult) => void;
  onClose?: () => void;
  className?: string;
}

const OPTIMIZATION_GOALS: OptimizationGoal[] = [
  {
    id: 'time',
    name: 'Minimize Travel Time',
    description: 'Optimize for fastest passenger journey times',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'distance',
    name: 'Minimize Distance',
    description: 'Optimize for shortest route distance',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    id: 'coverage',
    name: 'Maximize Coverage',
    description: 'Optimize for maximum passenger coverage',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'cost',
    name: 'Minimize Cost',
    description: 'Optimize for operational cost efficiency',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
  },
];

const RouteOptimizationInterface: React.FC<RouteOptimizationInterfaceProps> = ({
  route,
  onOptimize,
  onApplyOptimization,
  onClose,
  className = '',
}) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['time']);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleOptimize = async () => {
    if (selectedGoals.length === 0) {
      setError('Please select at least one optimization goal');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const result = await onOptimize(route.id, selectedGoals);
      setOptimizationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = () => {
    if (optimizationResult && onApplyOptimization) {
      onApplyOptimization(optimizationResult);
    }
  };

  const getImprovementColor = (value: number) => {
    if (value > 20) return 'text-green-600';
    if (value > 10) return 'text-blue-600';
    if (value > 0) return 'text-yellow-600';
    return 'text-neutral-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Route Optimization
              </CardTitle>
              <p className="text-sm text-neutral-600 mt-1">
                Optimize "{route.name}" using AI-powered analysis
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{route.stops.length}</p>
              <p className="text-xs text-neutral-600">Stops</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary-600">{route.estimatedTravelTime}m</p>
              <p className="text-xs text-neutral-600">Travel Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-600">{route.optimizationScore}%</p>
              <p className="text-xs text-neutral-600">Current Score</p>
            </div>
            <div className="text-center">
              <Badge variant={route.isActive ? 'success' : 'neutral'}>
                {route.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Goals</CardTitle>
          <p className="text-sm text-neutral-600">
            Select one or more goals for the optimization algorithm
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OPTIMIZATION_GOALS.map(goal => (
              <motion.div
                key={goal.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedGoals.includes(goal.id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
                onClick={() => handleGoalToggle(goal.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedGoals.includes(goal.id) 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {goal.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-neutral-900">{goal.name}</h3>
                    <p className="text-sm text-neutral-600 mt-1">{goal.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedGoals.includes(goal.id)
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-neutral-300'
                  }`}>
                    {selectedGoals.includes(goal.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleOptimize}
              loading={isOptimizing}
              disabled={selectedGoals.length === 0}
              size="lg"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              {isOptimizing ? 'Optimizing Route...' : 'Start Optimization'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {optimizationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Optimization Results
              </CardTitle>
              <p className="text-sm text-neutral-600">
                Analysis completed successfully
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getImprovementColor(optimizationResult.metrics.timeImprovement)}`}>
                    +{optimizationResult.metrics.timeImprovement.toFixed(1)}%
                  </p>
                  <p className="text-xs text-neutral-600">Time Improvement</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getImprovementColor(optimizationResult.metrics.distanceReduction)}`}>
                    -{optimizationResult.metrics.distanceReduction.toFixed(1)}%
                  </p>
                  <p className="text-xs text-neutral-600">Distance Reduction</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getImprovementColor(optimizationResult.metrics.passengerCoverageIncrease)}`}>
                    +{optimizationResult.metrics.passengerCoverageIncrease.toFixed(1)}%
                  </p>
                  <p className="text-xs text-neutral-600">Coverage Increase</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    ₹{optimizationResult.metrics.costSavings.toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-600">Cost Savings</p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-neutral-900 mb-2">Optimization Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-600">Original Route:</span>
                    <span className="ml-2 font-medium">{route.name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-600">Optimization Score:</span>
                    <span className="ml-2 font-medium">
                      {route.optimizationScore}% → {optimizationResult.optimizedRoute.optimizationScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-600">Travel Time:</span>
                    <span className="ml-2 font-medium">
                      {route.estimatedTravelTime}m → {optimizationResult.optimizedRoute.estimatedTravelTime}m
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-600">Total Stops:</span>
                    <span className="ml-2 font-medium">
                      {route.stops.length} → {optimizationResult.optimizedRoute.stops.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setOptimizationResult(null)}
                >
                  Run Another Optimization
                </Button>
                <Button
                  onClick={handleApplyOptimization}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  }
                >
                  Apply Optimization
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export { RouteOptimizationInterface };