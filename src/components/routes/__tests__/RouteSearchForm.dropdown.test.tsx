import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RouteSearchForm } from '../RouteSearchForm';

// Mock fetch for bus stops data
global.fetch = jest.fn();

const mockBusStops = [
  {
    id: 'stop-001',
    name: 'Central Station',
    address: 'Central Station, Mumbai Central, Mumbai',
    area: 'Mumbai Central',
    zone: 'South Mumbai'
  },
  {
    id: 'stop-002',
    name: 'Gateway of India',
    address: 'Gateway of India, Colaba, Mumbai',
    area: 'Colaba',
    zone: 'South Mumbai'
  },
  {
    id: 'stop-003',
    name: 'Bandra Station',
    address: 'Bandra Railway Station, Bandra West, Mumbai',
    area: 'Bandra West',
    zone: 'Western Suburbs'
  }
];

describe('RouteSearchForm Dropdown Functionality', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockBusStops)
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load and display bus stops in dropdown', async () => {
    const mockOnSearch = jest.fn();
    
    render(
      <RouteSearchForm 
        onSearch={mockOnSearch}
        loading={false}
        recentSearches={[]}
      />
    );

    // Wait for bus stops to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/data/mumbai-bus-stops.json');
    });

    // Click on origin dropdown
    const originInput = screen.getByPlaceholderText('Search origin stop...');
    fireEvent.focus(originInput);

    // Should show dropdown options
    await waitFor(() => {
      expect(screen.getByText('Central Station')).toBeInTheDocument();
      expect(screen.getByText('Gateway of India')).toBeInTheDocument();
      expect(screen.getByText('Bandra Station')).toBeInTheDocument();
    });
  });

  it('should filter bus stops based on search input', async () => {
    const mockOnSearch = jest.fn();
    
    render(
      <RouteSearchForm 
        onSearch={mockOnSearch}
        loading={false}
        recentSearches={[]}
      />
    );

    // Wait for bus stops to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/data/mumbai-bus-stops.json');
    });

    // Type in origin input to filter
    const originInput = screen.getByPlaceholderText('Search origin stop...');
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: 'Central' } });

    // Should show filtered results
    await waitFor(() => {
      expect(screen.getByText('Central Station')).toBeInTheDocument();
      expect(screen.queryByText('Gateway of India')).not.toBeInTheDocument();
    });
  });

  it('should select bus stop from dropdown', async () => {
    const mockOnSearch = jest.fn();
    
    render(
      <RouteSearchForm 
        onSearch={mockOnSearch}
        loading={false}
        recentSearches={[]}
      />
    );

    // Wait for bus stops to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/data/mumbai-bus-stops.json');
    });

    // Click on origin dropdown and select option
    const originInput = screen.getByPlaceholderText('Search origin stop...');
    fireEvent.focus(originInput);
    
    await waitFor(() => {
      expect(screen.getByText('Central Station')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Central Station'));

    // Input should show selected value
    expect(originInput).toHaveValue('Central Station');
  });

  it('should swap origin and destination values', async () => {
    const mockOnSearch = jest.fn();
    
    render(
      <RouteSearchForm 
        onSearch={mockOnSearch}
        loading={false}
        recentSearches={[]}
      />
    );

    // Wait for bus stops to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/data/mumbai-bus-stops.json');
    });

    // Select origin
    const originInput = screen.getByPlaceholderText('Search origin stop...');
    fireEvent.focus(originInput);
    await waitFor(() => {
      expect(screen.getByText('Central Station')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Central Station'));

    // Select destination
    const destinationInput = screen.getByPlaceholderText('Search destination stop...');
    fireEvent.focus(destinationInput);
    await waitFor(() => {
      expect(screen.getByText('Gateway of India')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Gateway of India'));

    // Click swap button
    const swapButton = screen.getByTitle('Swap locations');
    fireEvent.click(swapButton);

    // Values should be swapped
    expect(originInput).toHaveValue('Gateway of India');
    expect(destinationInput).toHaveValue('Central Station');
  });

  it('should handle fetch error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const mockOnSearch = jest.fn();
    
    render(
      <RouteSearchForm 
        onSearch={mockOnSearch}
        loading={false}
        recentSearches={[]}
      />
    );

    // Should still render with fallback options
    await waitFor(() => {
      const originInput = screen.getByPlaceholderText('Search origin stop...');
      fireEvent.focus(originInput);
    });

    // Should show fallback options
    await waitFor(() => {
      expect(screen.getByText('Central Station')).toBeInTheDocument();
    });
  });
});