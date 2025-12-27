import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface Route {
  id: string;
  name: string;
  description: string;
  operatorId: string;
  estimatedTravelTime: number;
  optimizationScore: number;
  stops: Array<{
    id: string;
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    isAccessible: boolean;
  }>;
  isActive: boolean;
}

export interface RouteCardProps {
  route: Route;
  onViewDetails?: (route: Route) => void;
  onOptimize?: (route: Route) => void;
  onEdit?: (route: Route) => void;
  showActions?: boolean;
  compact?: boolean;
}

const RouteCard: React.FC<RouteCardProps> = ({
  route,
  onViewDetails,
  onOptimize,
  onEdit,
  showActions = true,
  compact = false,
}) => {
  const getOptimizationBadge = (score: number) => {
    if (score >= 80) return { variant: 'success' as const, label: 'Excellent' };
    if (score >= 60) return { variant: 'warning' as const, label: 'Good' };
    if (score >= 40) return { variant: 'neutral' as const, label: 'Fair' };
    return { variant: 'danger' as const, label: 'Needs Optimization' };
  };

  const optimizationBadge = getOptimizationBadge(route.optimizationScore);
  const accessibleStops = route.stops.filter(stop => stop.isAccessible).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-neutral-900">
                {route.name}
              </CardTitle>
              {!compact && (
                <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                  {route.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Badge
                variant={route.isActive ? 'success' : 'neutral'}
                size="sm"
              >
                {route.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={optimizationBadge.variant} size="sm">
                {route.optimizationScore}%
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className={compact ? 'pt-0' : undefined}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {route.stops.length}
              </p>
              <p className="text-xs text-neutral-600">Total Stops</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary-600">
                {accessibleStops}
              </p>
              <p className="text-xs text-neutral-600">Accessible</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-600">
                {route.estimatedTravelTime}m
              </p>
              <p className="text-xs text-neutral-600">Travel Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-700">
                {route.optimizationScore}%
              </p>
              <p className="text-xs text-neutral-600">Optimization</p>
            </div>
          </div>

          {!compact && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-neutral-700 mb-2">
                Route Stops ({route.stops.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {route.stops.slice(0, 3).map((stop, index) => (
                  <Badge key={stop.id} variant="outline" size="sm">
                    {index === 0 && '🚏 '}
                    {stop.name}
                    {stop.isAccessible && ' ♿'}
                  </Badge>
                ))}
                {route.stops.length > 3 && (
                  <Badge variant="neutral" size="sm">
                    +{route.stops.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {showActions && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(route)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              >
                View Details
              </Button>
              
              {route.optimizationScore < 80 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOptimize?.(route)}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                >
                  Optimize
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(route)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export { RouteCard };