import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_MAPS_API_KEY = 'test-maps-api-key';
process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-gemini-api-key';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000';

// Mock Google Maps API
global.google = {
  maps: {
    Map: jest.fn(),
    Marker: jest.fn(),
    InfoWindow: jest.fn(),
    LatLng: jest.fn(),
    places: {
      PlacesService: jest.fn(),
    },
  },
};