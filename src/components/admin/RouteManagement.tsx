import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../utils/translations';
import { Route, BusStop } from '../../types';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface RouteManagementProps {
  className?: string;
}

interface RouteFormData {
  name: string;
  description: string;
  operatorId: string;
  stops: string[];
  isActive: boolean;
}

const RouteManagement: React.FC<RouteManagementProps> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState<RouteFormData>({
    name: '',
    description: '',
    operatorId: '',
    stops: [],
    isActive: true,
  });

  useEffect(() => {
    loadRoutes();
    loadBusStops();
  }, []);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock API call - in production this would be a real API
      const mockRoutes: Route[] = [
        {
          id: 'route-001',
          name: 'Bandra to Andheri Express',
          description: 'Fast route connecting Bandra and Andheri via Western Express Highway',
          stops: [
            {
              id: 'stop-001',
              name: 'Bandra Station',
              coordinates: { latitude: 19.0544, longitude: 72.8406 },
              address: 'Bandra West, Mumbai',
              amenities: ['shelter', 'seating'],
              dailyPassengerCount: 2500,
              isAccessible: true,
            },
            {
              id: 'stop-002',
              name: 'Andheri Station',
              coordinates: { latitude: 19.1197, longitude: 72.8464 },
              address: 'Andheri West, Mumbai',
              amenities: ['shelter', 'seating', 'digital_display'],
              dailyPassengerCount: 3200,
              isAccessible: true,
            },
          ],
          operatorId: 'operator-001',
          isActive: true,
          optimizationScore: 85,
          estimatedTravelTime: 45,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
        },
        {
          id: 'route-002',
          name: 'Colaba to Churchgate Local',
          description: 'Local route serving South Mumbai business district',
          stops: [
            {
              id: 'stop-003',
              name: 'Colaba Bus Depot',
              coordinates: { latitude: 18.9067, longitude: 72.8147 },
              address: 'Colaba, Mumbai',
              amenities: ['shelter'],
              dailyPassengerCount: 1800,
              isAccessible: false,
            },
            {
              id: 'stop-004',
              name: 'Churchgate Station',
              coordinates: { latitude: 18.9322, longitude: 72.8264 },
              address: 'Churchgate, Mumbai',
              amenities: ['shelter', 'seating', 'digital_display'],
              dailyPassengerCount: 4100,
              isAccessible: true,
            },
          ],
          operatorId: 'operator-002',
          isActive: false,
          optimizationScore: 72,
          estimatedTravelTime: 25,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-18'),
        },
      ];

      setRoutes(mockRoutes);
    } catch (err) {
      console.error('Failed to load routes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load routes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusStops = async () => {
    try {
      // Mock API call for bus stops
      const mockStops: BusStop[] = [
        {
          id: 'stop-001',
          name: 'Bandra Station',
          coordinates: { latitude: 19.0544, longitude: 72.8406 },
          address: 'Bandra West, Mumbai',
          amenities: ['shelter', 'seating'],
          dailyPassengerCount: 2500,
          isAccessible: true,
        },
        {
          id: 'stop-002',
          name: 'Andheri Station',
          coordinates: { latitude: 19.1197, longitude: 72.8464 },
          address: 'Andheri West, Mumbai',
          amenities: ['shelter', 'seating', 'digital_display'],
          dailyPassengerCount: 3200,
          isAccessible: true,
        },
        {
          id: 'stop-003',
          name: 'Colaba Bus Depot',
          coordinates: { latitude: 18.9067, longitude: 72.8147 },
          address: 'Colaba, Mumbai',
          amenities: ['shelter'],
          dailyPassengerCount: 1800,
          isAccessible: false,
        },
        {
          id: 'stop-004',
          name: 'Churchgate Station',
          coordinates: { latitude: 18.9322, longitude: 72.8264 },
          address: 'Churchgate, Mumbai',
          amenities: ['shelter', 'seating', 'digital_display'],
          dailyPassengerCount: 4100,
          isAccessible: true,
        },
      ];

      setBusStops(mockStops);
    } catch (err) {
      console.error('Failed to load bus stops:', err);
    }
  };

  const handleCreateRoute = async () => {
    try {
      // Validate form data
      if (!formData.name.trim()) {
        setError('Route name is required');
        return;
      }

      if (formData.stops.length < 2) {
        setError('Route must have at least 2 stops');
        return;
      }

      // Mock API call to create route
      const newRoute: Route = {
        id: `route-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        stops: busStops.filter(stop => formData.stops.includes(stop.id)),
        operatorId: formData.operatorId || 'default-operator',
        isActive: formData.isActive,
        optimizationScore: 0,
        estimatedTravelTime: 30, // Default value
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setRoutes(prev => [...prev, newRoute]);
      setShowCreateForm(false);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Failed to create route:', err);
      setError('Failed to create route');
    }
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;

    try {
      // Mock API call to update route
      const updatedRoute: Route = {
        ...editingRoute,
        name: formData.name,
        description: formData.description,
        stops: busStops.filter(stop => formData.stops.includes(stop.id)),
        isActive: formData.isActive,
        updatedAt: new Date(),
      };

      setRoutes(prev => prev.map(route => 
        route.id === editingRoute.id ? updatedRoute : route
      ));

      setEditingRoute(null);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Failed to update route:', err);
      setError('Failed to update route');
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm(t('admin.confirmDelete') || 'Are you sure you want to delete this route?')) {
      return;
    }

    try {
      // Mock API call to delete route
      setRoutes(prev => prev.filter(route => route.id !== routeId));
    } catch (err) {
      console.error('Failed to delete route:', err);
      setError('Failed to delete route');
    }
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      description: route.description,
      operatorId: route.operatorId,
      stops: route.stops.map(stop => stop.id),
      isActive: route.isActive,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      operatorId: '',
      stops: [],
      isActive: true,
    });
  };

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && route.isActive) ||
                         (filterStatus === 'inactive' && !route.isActive);
    return matchesSearch && matchesFilter;
  });

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
            {t('admin.routeManagement') || 'Route Management'}
          </h2>
          <p className="text-neutral-600">
            {t('admin.routeManagementDesc') || 'Create, edit, and manage bus routes'}
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(true);
            setEditingRoute(null);
            resetForm();
          }}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('admin.createRoute') || 'Create Route'}
        </Button>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('admin.searchRoutes') || 'Search routes...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">{t('admin.allRoutes') || 'All Routes'}</option>
          <option value="active">{t('admin.activeRoutes') || 'Active Routes'}</option>
          <option value="inactive">{t('admin.inactiveRoutes') || 'Inactive Routes'}</option>
        </select>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingRoute ? 
              (t('admin.editRoute') || 'Edit Route') : 
              (t('admin.createNewRoute') || 'Create New Route')
            }
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('routes.name') || 'Route Name'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('admin.routeNamePlaceholder') || 'Enter route name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('admin.operatorId') || 'Operator ID'}
              </label>
              <input
                type="text"
                value={formData.operatorId}
                onChange={(e) => setFormData(prev => ({ ...prev, operatorId: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('admin.operatorIdPlaceholder') || 'Enter operator ID'}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('routes.description') || 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('admin.routeDescPlaceholder') || 'Enter route description'}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('routes.stops') || 'Bus Stops'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-neutral-300 rounded-md p-3">
                {busStops.map(stop => (
                  <label key={stop.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.stops.includes(stop.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, stops: [...prev.stops, stop.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, stops: prev.stops.filter(id => id !== stop.id) }));
                        }
                      }}
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">{stop.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700">
                  {t('admin.activeRoute') || 'Active Route'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setEditingRoute(null);
                resetForm();
                setError(null);
              }}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={editingRoute ? handleUpdateRoute : handleCreateRoute}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {editingRoute ? 
                (t('common.update') || 'Update') : 
                (t('common.create') || 'Create')
              }
            </Button>
          </div>
        </div>
      )}

      {/* Routes List */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900">
            {t('admin.routesList') || 'Routes List'} ({filteredRoutes.length})
          </h3>
        </div>

        {filteredRoutes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 mx-auto text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-neutral-500">
              {searchTerm ? 
                (t('admin.noRoutesFound') || 'No routes found matching your search') :
                (t('admin.noRoutes') || 'No routes available')
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {filteredRoutes.map(route => (
              <div key={route.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-neutral-900">{route.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        route.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {route.isActive ? 
                          (t('admin.active') || 'Active') : 
                          (t('admin.inactive') || 'Inactive')
                        }
                      </span>
                    </div>
                    <p className="text-neutral-600 mt-1">{route.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-neutral-500">
                      <span>{route.stops.length} {t('routes.stops') || 'stops'}</span>
                      <span>{route.estimatedTravelTime} {t('common.minutes') || 'min'}</span>
                      <span>{t('admin.score') || 'Score'}: {route.optimizationScore}%</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRoute(route)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRoute(route.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
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

export { RouteManagement };