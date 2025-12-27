import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { SearchableSelect, SearchableSelectOption } from '../ui/SearchableSelect';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useRealTimeData } from '../../hooks/useRealTimeData';

export interface SearchFilters {
  origin: string;
  destination: string;
  maxTravelTime?: number;
  accessibleOnly: boolean;
  sortBy: 'travelTime' | 'distance' | 'fare' | 'optimization';
}

export interface RouteSearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
  compact?: boolean;
  recentSearches?: Array<{
    origin: string;
    destination: string;
    timestamp: Date;
  }>;
}

const RouteSearchForm: React.FC<RouteSearchFormProps> = ({
  onSearch,
  loading = false,
  compact = false,
  recentSearches = [],
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    origin: '',
    destination: '',
    maxTravelTime: undefined,
    accessibleOnly: false,
    sortBy: 'travelTime',
  });

  const [busStops, setBusStops] = useState<SearchableSelectOption[]>([]);
  const { isConnected } = useRealTimeData();

  // Load Mumbai bus stops data
  useEffect(() => {
    const loadBusStops = async () => {
      try {
        const response = await fetch('/data/mumbai-bus-stops.json');
        const stops = await response.json();
        const stopOptions: SearchableSelectOption[] = stops.map((stop: any) => ({
          value: stop.name,
          label: stop.name,
          subtitle: `Ward: ${stop.ward} • Lat: ${stop.latitude.toFixed(4)}, Lng: ${stop.longitude.toFixed(4)}`,
        }));
        setBusStops(stopOptions);
      } catch (error) {
        console.error('Failed to load bus stops:', error);
        // Fallback to basic options if loading fails
        setBusStops([
          { value: 'CHHATRAPATI SHIVAJI MAHARAJ TERMINUS (GPO)', label: 'CHHATRAPATI SHIVAJI MAHARAJ TERMINUS (GPO)', subtitle: 'Ward: NW-19 • Central Mumbai' },
          { value: 'ELECTRIC HOUSE, COLABA DEPOT', label: 'ELECTRIC HOUSE, COLABA DEPOT', subtitle: 'Ward: NW-19 • South Mumbai' },
          { value: 'COLABA BUS STATION, POST OFFICE', label: 'COLABA BUS STATION, POST OFFICE', subtitle: 'Ward: NW-19 • South Mumbai' },
        ]);
      }
    };

    loadBusStops();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filters.origin.trim() && filters.destination.trim()) {
      onSearch(filters);
    }
  };

  const handleRecentSearchClick = (search: { origin: string; destination: string }) => {
    setFilters(prev => ({
      ...prev,
      origin: search.origin,
      destination: search.destination,
    }));
  };

  const swapLocations = () => {
    setFilters(prev => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  const sortOptions = [
    { value: 'travelTime', label: 'Fastest Route' },
    { value: 'distance', label: 'Shortest Distance' },
    { value: 'fare', label: 'Lowest Fare' },
    { value: 'optimization', label: 'Best Optimized' },
  ];

  const travelTimeOptions = [
    { value: '', label: 'Any duration' },
    { value: '30', label: 'Under 30 minutes' },
    { value: '60', label: 'Under 1 hour' },
    { value: '90', label: 'Under 1.5 hours' },
    { value: '120', label: 'Under 2 hours' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {compact ? 'Quick Search' : 'Find Your Route'}
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary-500 animate-pulse' : 'bg-neutral-400'}`}></div>
            <span className="text-sm text-neutral-600">
              {isConnected ? 'Live Data' : 'Offline'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Origin and Destination */}
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div className="relative">
              <SearchableSelect
                label="From"
                placeholder="Search origin stop..."
                options={busStops}
                selectedValue={filters.origin}
                onSelect={(option) => setFilters(prev => ({ 
                  ...prev, 
                  origin: option?.value || '' 
                }))}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                required
              />
            </div>
            
            <div className="relative">
              <SearchableSelect
                label="To"
                placeholder="Search destination stop..."
                options={busStops}
                selectedValue={filters.destination}
                onSelect={(option) => setFilters(prev => ({ 
                  ...prev, 
                  destination: option?.value || '' 
                }))}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                required
              />
              
              {/* Swap Button - Only show in non-compact mode */}
              {!compact && (
                <button
                  type="button"
                  onClick={swapLocations}
                  className="absolute -left-6 top-8 p-2 rounded-full bg-white border-2 border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  title="Swap locations"
                >
                  <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters - Hide in compact mode */}
          {!compact && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Sort by"
                options={sortOptions}
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              />
              
              <Select
                label="Max Travel Time"
                options={travelTimeOptions}
                value={filters.maxTravelTime?.toString() || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  maxTravelTime: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
              
              <div className="flex items-end">
                <label className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.accessibleOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, accessibleOnly: e.target.checked }))}
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-neutral-700">
                    Accessible routes only
                  </span>
                  <span className="text-lg">♿</span>
                </label>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className="flex justify-center pt-2">
            <Button
              type="submit"
              size={compact ? "md" : "lg"}
              loading={loading}
              disabled={!filters.origin.trim() || !filters.destination.trim()}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            >
              {compact ? 'Search' : 'Search Routes'}
            </Button>
          </div>
        </form>

        {/* Recent Searches - Only show in non-compact mode */}
        {!compact && recentSearches.length > 0 && (
          <motion.div
            className="mt-6 pt-6 border-t border-neutral-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Recent Searches</h4>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 5).map((search, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Badge variant="outline" className="hover:bg-primary-50 hover:border-primary-300 transition-colors">
                    <span className="text-xs">
                      {search.origin} → {search.destination}
                    </span>
                  </Badge>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export { RouteSearchForm };