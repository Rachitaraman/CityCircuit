import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { RouteCard } from './RouteCard';
import { RouteVisualization } from '../maps/RouteVisualization';
import { RouteOptimizationInterface } from './RouteOptimizationInterface';
import { Route, BusStop, OptimizationResult } from '../../types';

export interface RouteManagementProps {
  routes: Route[];
  onCreateRoute?: () => void;
  onEditRoute?: (route: Route) => void;
  onDeleteRoute?: (routeId: string) => void;
  onOptimizeRoute?: (routeId: string, goals: string[]) => Promise<OptimizationResult>;
  onApplyOptimization?: (result: OptimizationResult) => void;
  className?: string;
}

type ViewMode = 'list' | 'map' | 'optimize';

const RouteManagement: React.FC<RouteManagementProps> = ({
  routes,
  onCreateRoute,
  onEditRoute,
  onDeleteRoute,
  onOptimizeRoute,
  onApplyOptimization,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'optimization' | 'travelTime' | 'stops'>('name');

  // Filter and sort routes
  const filteredAndSortedRoutes = useMemo(() => {
    let filtered = routes.filter(route => {
      const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           route.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && route.isActive) ||
                           (filterStatus === 'inactive' && !route.isActive);
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'optimization':
          return b.optimizationScore - a.optimizationScore;
        case 'travelTime':
          return a.estimatedTravelTime - b.estimatedTravelTime;
        case 'stops':
          return b.stops.length - a.stops.length;
        default:
          return 0;
      }
    });
  }, [routes, searchQuery, filterStatus, sortBy]);

  const selectedRoute = selectedRouteId ? routes.find(r => r.id === selectedRouteId) : null;

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
  };

  const handleStopClick = (stop: BusStop, route: Route) => {
    console.log('Stop clicked:', stop, 'on route:', route);
    // Could open stop details modal or perform other actions
  };

  const handleOptimizeClick = (route: Route) => {
    setSelectedRouteId(route.id);
    setViewMode('optimize');
  };

  const statusOptions = [
    { value: 'all', label: 'All Routes' },
    { value: 'active', label: 'Active Only' },
    { value: 'inactive', label: 'Inactive Only' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'optimization', label: 'Optimization Score' },
    { value: 'travelTime', label: 'Travel Time' },
    { value: 'stops', label: 'Number of Stops' },
  ];

  const viewModeButtons = [
    {
      id: 'list' as ViewMode,
      label: 'List View',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'map' as ViewMode,
      label: 'Map View',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Route Management
              </CardTitle>
              <p className="text-sm text-neutral-600 mt-1">
                Manage and optimize your bus routes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredAndSortedRoutes.length} routes
              </Badge>
              {onCreateRoute && (
                <Button
                  onClick={onCreateRoute}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                >
                  Create Route
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Search routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            
            <Select
              options={statusOptions}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            />
            
            <Select
              options={sortOptions}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            />
            
            <div className="flex items-center gap-1">
              {viewModeButtons.map(button => (
                <Button
                  key={button.id}
                  variant={viewMode === button.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode(button.id);
                    if (button.id === 'optimize' && !selectedRouteId && filteredAndSortedRoutes.length > 0) {
                      setSelectedRouteId(filteredAndSortedRoutes[0].id);
                    }
                  }}
                  leftIcon={button.icon}
                  className="flex-1"
                >
                  {button.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSortedRoutes.map((route, index) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <RouteCard
                route={route}
                onViewDetails={() => {
                  setSelectedRouteId(route.id);
                  setViewMode('map');
                }}
                onOptimize={() => handleOptimizeClick(route)}
                onEdit={() => onEditRoute?.(route)}
              />
            </motion.div>
          ))}
          
          {filteredAndSortedRoutes.length === 0 && (
            <div className="col-span-full text-center py-12">
              <svg className="w-12 h-12 text-neutral-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No routes found</h3>
              <p className="text-neutral-600 mb-4">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first route'
                }
              </p>
              {onCreateRoute && !searchQuery && filterStatus === 'all' && (
                <Button onClick={onCreateRoute}>
                  Create Your First Route
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {viewMode === 'map' && (
        <RouteVisualization
          routes={filteredAndSortedRoutes}
          selectedRouteId={selectedRouteId || undefined}
          onRouteSelect={handleRouteSelect}
          onStopClick={handleStopClick}
          onOptimizeRoute={handleOptimizeClick}
          height="600px"
        />
      )}

      {viewMode === 'optimize' && selectedRoute && onOptimizeRoute && (
        <RouteOptimizationInterface
          route={selectedRoute}
          onOptimize={onOptimizeRoute}
          onApplyOptimization={onApplyOptimization}
          onClose={() => setViewMode('list')}
        />
      )}
    </div>
  );
};

export { RouteManagement };