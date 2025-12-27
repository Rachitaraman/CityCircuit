/**
 * Maps and geolocation routes for CityCircuit API Gateway
 * Handles integration with Google Maps and Azure Maps APIs
 * with rate limiting, caching, and fallback mechanisms
 */

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { 
  validateCoordinates,
  sanitizeInput 
} = require('../middleware/validation');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const externalApiService = require('../services/externalApiService');

const router = express.Router();

/**
 * Geocode address to coordinates
 * POST /api/maps/geocode
 */
router.post('/geocode',
  optionalAuth,
  sanitizeInput,
  asyncHandler(async (req, res) => {
    const { address, provider = 'google' } = req.body;

    if (!address) {
      throw new APIError('Address is required', 400, 'MISSING_ADDRESS');
    }

    try {
      let geocodeResult;

      if (provider === 'google') {
        try {
          const response = await externalApiService.googleMapsGeocode(address);
          
          if (response.status === 'OK' && response.results.length > 0) {
            const result = response.results[0];
            geocodeResult = {
              address: result.formatted_address,
              coordinates: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng
              },
              placeId: result.place_id,
              types: result.types,
              provider: 'google'
            };
          }
        } catch (error) {
          // Fallback to Azure Maps or mock data
          if (process.env.AZURE_MAPS_API_KEY) {
            try {
              const response = await externalApiService.azureMapsGeocode(address);
              
              if (response.results && response.results.length > 0) {
                const result = response.results[0];
                geocodeResult = {
                  address: result.address.freeformAddress,
                  coordinates: {
                    latitude: result.position.lat,
                    longitude: result.position.lon
                  },
                  confidence: result.score,
                  provider: 'azure_fallback'
                };
              }
            } catch (azureError) {
              // Use fallback data
              const fallback = externalApiService.getFallbackData('geocode', { address });
              const result = fallback.results[0];
              geocodeResult = {
                address: result.formatted_address,
                coordinates: {
                  latitude: result.geometry.location.lat,
                  longitude: result.geometry.location.lng
                },
                placeId: result.place_id,
                types: result.types,
                provider: 'fallback'
              };
            }
          } else {
            // Use fallback data directly
            const fallback = externalApiService.getFallbackData('geocode', { address });
            const result = fallback.results[0];
            geocodeResult = {
              address: result.formatted_address,
              coordinates: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng
              },
              placeId: result.place_id,
              types: result.types,
              provider: 'fallback'
            };
          }
        }
      } else if (provider === 'azure') {
        try {
          const response = await externalApiService.azureMapsGeocode(address);
          
          if (response.results && response.results.length > 0) {
            const result = response.results[0];
            geocodeResult = {
              address: result.address.freeformAddress,
              coordinates: {
                latitude: result.position.lat,
                longitude: result.position.lon
              },
              confidence: result.score,
              provider: 'azure'
            };
          }
        } catch (error) {
          // Fallback to Google Maps or mock data
          if (process.env.GOOGLE_MAPS_API_KEY) {
            try {
              const response = await externalApiService.googleMapsGeocode(address);
              
              if (response.status === 'OK' && response.results.length > 0) {
                const result = response.results[0];
                geocodeResult = {
                  address: result.formatted_address,
                  coordinates: {
                    latitude: result.geometry.location.lat,
                    longitude: result.geometry.location.lng
                  },
                  placeId: result.place_id,
                  types: result.types,
                  provider: 'google_fallback'
                };
              }
            } catch (googleError) {
              // Use fallback data
              const fallback = externalApiService.getFallbackData('geocode', { address });
              const result = fallback.results[0];
              geocodeResult = {
                address: result.formatted_address,
                coordinates: {
                  latitude: result.geometry.location.lat,
                  longitude: result.geometry.location.lng
                },
                placeId: result.place_id,
                types: result.types,
                provider: 'fallback'
              };
            }
          } else {
            // Use fallback data directly
            const fallback = externalApiService.getFallbackData('geocode', { address });
            const result = fallback.results[0];
            geocodeResult = {
              address: result.formatted_address,
              coordinates: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng
              },
              placeId: result.place_id,
              types: result.types,
              provider: 'fallback'
            };
          }
        }
      } else {
        // Use fallback data for unknown providers
        const fallback = externalApiService.getFallbackData('geocode', { address });
        const result = fallback.results[0];
        geocodeResult = {
          address: result.formatted_address,
          coordinates: {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng
          },
          placeId: result.place_id,
          types: result.types,
          provider: 'fallback'
        };
      }

      if (!geocodeResult) {
        throw new APIError('Address not found', 404, 'ADDRESS_NOT_FOUND');
      }

      res.json({
        result: geocodeResult,
        query: address
      });

    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) {
        throw new APIError('Geocoding rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
      } else if (error.message.includes('Circuit breaker open')) {
        throw new APIError('Geocoding service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
      } else if (error.code === 'ETIMEDOUT') {
        throw new APIError('Geocoding service timeout', 504, 'GEOCODING_TIMEOUT');
      } else if (error.response?.status === 403) {
        throw new APIError('Invalid API key for geocoding service', 403, 'INVALID_API_KEY');
      } else {
        throw new APIError('Geocoding failed', 500, 'GEOCODING_ERROR', error.message);
      }
    }
  })
);

/**
 * Get map service status
 * GET /api/maps/status
 */
router.get('/status',
  asyncHandler(async (req, res) => {
    const serviceStatus = externalApiService.getServiceStatus();
    
    const services = {
      google_maps: {
        available: !!process.env.GOOGLE_MAPS_API_KEY,
        status: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'not_configured',
        ...serviceStatus.services.google_maps
      },
      azure_maps: {
        available: !!process.env.AZURE_MAPS_API_KEY,
        status: process.env.AZURE_MAPS_API_KEY ? 'configured' : 'not_configured',
        ...serviceStatus.services.azure_maps
      }
    };

    res.json({
      services,
      cache: serviceStatus.cache,
      fallback_mode: !process.env.GOOGLE_MAPS_API_KEY && !process.env.AZURE_MAPS_API_KEY,
      supported_operations: [
        'geocode',
        'reverse-geocode',
        'directions',
        'places-search'
      ]
    });
  })
);

module.exports = router;