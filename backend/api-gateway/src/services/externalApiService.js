/**
 * External API Integration Service for CityCircuit API Gateway
 * Handles Google Maps, Azure Maps, and other external API integrations
 * with rate limiting, caching, and fallback mechanisms
 */

const axios = require('axios');
const redis = require('redis');
const { logger } = require('../middleware/errorHandler');

class ExternalApiService {
  constructor() {
    this.redisClient = null;
    this.rateLimiters = new Map();
    this.circuitBreakers = new Map();
    this.initializeRedis();
    this.initializeRateLimiters();
    this.initializeCircuitBreakers();
  }

  /**
   * Initialize Redis client for caching
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL
        });
        
        this.redisClient.on('error', (err) => {
          logger.error('Redis client error:', err);
        });
        
        await this.redisClient.connect();
        logger.info('Redis client connected for API caching');
      } else {
        logger.warn('Redis not configured, using in-memory cache fallback');
        this.memoryCache = new Map();
      }
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.memoryCache = new Map();
    }
  }

  /**
   * Initialize rate limiters for different services
   */
  initializeRateLimiters() {
    // Google Maps API rate limits
    this.rateLimiters.set('google_maps', {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 100, // per minute
      windowMs: 60000
    });

    // Azure Maps API rate limits
    this.rateLimiters.set('azure_maps', {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 50, // per minute
      windowMs: 60000
    });

    // ML Service rate limits
    this.rateLimiters.set('ml_service', {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 30, // per minute
      windowMs: 60000
    });
  }

  /**
   * Initialize circuit breakers for external services
   */
  initializeCircuitBreakers() {
    const defaultConfig = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 10000,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null,
      lastSuccessTime: null
    };

    this.circuitBreakers.set('google_maps', { ...defaultConfig });
    this.circuitBreakers.set('azure_maps', { ...defaultConfig });
    this.circuitBreakers.set('ml_service', { ...defaultConfig });
  }

  /**
   * Check rate limit for a service
   */
  checkRateLimit(serviceName) {
    const limiter = this.rateLimiters.get(serviceName);
    if (!limiter) return true;

    const now = Date.now();
    
    // Reset window if expired
    if (now - limiter.windowStart >= limiter.windowMs) {
      limiter.requests = 0;
      limiter.windowStart = now;
    }

    // Check if limit exceeded
    if (limiter.requests >= limiter.maxRequests) {
      logger.warn(`Rate limit exceeded for ${serviceName}`);
      return false;
    }

    limiter.requests++;
    return true;
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return true;

    const now = Date.now();

    switch (breaker.state) {
      case 'OPEN':
        if (now - breaker.lastFailureTime >= breaker.recoveryTimeout) {
          breaker.state = 'HALF_OPEN';
          logger.info(`Circuit breaker for ${serviceName} moved to HALF_OPEN`);
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      case 'CLOSED':
      default:
        return true;
    }
  }

  /**
   * Record success for circuit breaker
   */
  recordSuccess(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return;

    breaker.failures = 0;
    breaker.lastSuccessTime = Date.now();
    
    if (breaker.state === 'HALF_OPEN') {
      breaker.state = 'CLOSED';
      logger.info(`Circuit breaker for ${serviceName} moved to CLOSED`);
    }
  }

  /**
   * Record failure for circuit breaker
   */
  recordFailure(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= breaker.failureThreshold) {
      breaker.state = 'OPEN';
      logger.warn(`Circuit breaker for ${serviceName} moved to OPEN`);
    }
  }

  /**
   * Get cached data
   */
  async getCache(key) {
    try {
      if (this.redisClient) {
        const cached = await this.redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
      } else if (this.memoryCache) {
        const cached = this.memoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.data;
        } else if (cached) {
          this.memoryCache.delete(key);
        }
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async setCache(key, data, ttlSeconds = 300) {
    try {
      if (this.redisClient) {
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
      } else if (this.memoryCache) {
        this.memoryCache.set(key, {
          data,
          expiry: Date.now() + (ttlSeconds * 1000)
        });
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Make API request with rate limiting, circuit breaking, and caching
   */
  async makeApiRequest(serviceName, requestConfig, cacheKey = null, cacheTtl = 300) {
    // Check rate limit
    if (!this.checkRateLimit(serviceName)) {
      throw new Error(`Rate limit exceeded for ${serviceName}`);
    }

    // Check circuit breaker
    if (!this.checkCircuitBreaker(serviceName)) {
      throw new Error(`Circuit breaker open for ${serviceName}`);
    }

    // Check cache first
    if (cacheKey) {
      const cached = await this.getCache(cacheKey);
      if (cached) {
        logger.info(`Cache hit for ${serviceName}: ${cacheKey}`);
        return cached;
      }
    }

    try {
      // Make the API request
      const response = await axios(requestConfig);
      
      // Record success
      this.recordSuccess(serviceName);
      
      // Cache the response
      if (cacheKey && response.data) {
        await this.setCache(cacheKey, response.data, cacheTtl);
      }

      logger.info(`API request successful for ${serviceName}`);
      return response.data;

    } catch (error) {
      // Record failure
      this.recordFailure(serviceName);
      
      logger.error(`API request failed for ${serviceName}:`, error.message);
      throw error;
    }
  }

  /**
   * Google Maps Geocoding API
   */
  async googleMapsGeocode(address) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const cacheKey = `geocode:google:${Buffer.from(address).toString('base64')}`;
    
    const requestConfig = {
      method: 'GET',
      url: 'https://maps.googleapis.com/maps/api/geocode/json',
      params: {
        address,
        key: apiKey,
        region: 'in'
      },
      timeout: 10000
    };

    return await this.makeApiRequest('google_maps', requestConfig, cacheKey, 3600); // Cache for 1 hour
  }

  /**
   * Google Maps Reverse Geocoding API
   */
  async googleMapsReverseGeocode(latitude, longitude) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const cacheKey = `reverse_geocode:google:${latitude},${longitude}`;
    
    const requestConfig = {
      method: 'GET',
      url: 'https://maps.googleapis.com/maps/api/geocode/json',
      params: {
        latlng: `${latitude},${longitude}`,
        key: apiKey,
        result_type: 'street_address|route|neighborhood|locality'
      },
      timeout: 10000
    };

    return await this.makeApiRequest('google_maps', requestConfig, cacheKey, 3600);
  }

  /**
   * Google Maps Directions API
   */
  async googleMapsDirections(origin, destination, waypoints = [], mode = 'transit') {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const originStr = typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`;
    const destinationStr = typeof destination === 'string' ? destination : `${destination.latitude},${destination.longitude}`;
    
    const cacheKey = `directions:google:${Buffer.from(`${originStr}-${destinationStr}-${mode}`).toString('base64')}`;
    
    const params = {
      origin: originStr,
      destination: destinationStr,
      mode,
      key: apiKey,
      region: 'in'
    };

    if (waypoints.length > 0) {
      params.waypoints = waypoints.map(wp => 
        typeof wp === 'string' ? wp : `${wp.latitude},${wp.longitude}`
      ).join('|');
    }

    const requestConfig = {
      method: 'GET',
      url: 'https://maps.googleapis.com/maps/api/directions/json',
      params,
      timeout: 15000
    };

    return await this.makeApiRequest('google_maps', requestConfig, cacheKey, 1800); // Cache for 30 minutes
  }

  /**
   * Google Maps Places API
   */
  async googleMapsPlacesSearch(query, location, radius = 5000, type = 'bus_station') {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const cacheKey = `places:google:${Buffer.from(`${query}-${location}-${radius}-${type}`).toString('base64')}`;
    
    const params = {
      key: apiKey,
      radius,
      type
    };

    if (query) {
      params.query = query;
    }

    if (location) {
      params.location = typeof location === 'string' ? location : `${location.latitude},${location.longitude}`;
    }

    const endpoint = query ? 'textsearch' : 'nearbysearch';
    const requestConfig = {
      method: 'GET',
      url: `https://maps.googleapis.com/maps/api/place/${endpoint}/json`,
      params,
      timeout: 10000
    };

    return await this.makeApiRequest('google_maps', requestConfig, cacheKey, 1800);
  }

  /**
   * Azure Maps Geocoding API
   */
  async azureMapsGeocode(address) {
    const apiKey = process.env.AZURE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Azure Maps API key not configured');
    }

    const cacheKey = `geocode:azure:${Buffer.from(address).toString('base64')}`;
    
    const requestConfig = {
      method: 'GET',
      url: 'https://atlas.microsoft.com/search/address/json',
      params: {
        'api-version': '1.0',
        'subscription-key': apiKey,
        query: address,
        countrySet: 'IN'
      },
      timeout: 10000
    };

    return await this.makeApiRequest('azure_maps', requestConfig, cacheKey, 3600);
  }

  /**
   * Azure Maps Reverse Geocoding API
   */
  async azureMapsReverseGeocode(latitude, longitude) {
    const apiKey = process.env.AZURE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Azure Maps API key not configured');
    }

    const cacheKey = `reverse_geocode:azure:${latitude},${longitude}`;
    
    const requestConfig = {
      method: 'GET',
      url: 'https://atlas.microsoft.com/search/address/reverse/json',
      params: {
        'api-version': '1.0',
        'subscription-key': apiKey,
        query: `${latitude},${longitude}`
      },
      timeout: 10000
    };

    return await this.makeApiRequest('azure_maps', requestConfig, cacheKey, 3600);
  }

  /**
   * ML Service API request
   */
  async mlServiceRequest(endpoint, data) {
    const baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    const cacheKey = `ml:${endpoint}:${Buffer.from(JSON.stringify(data)).toString('base64')}`;
    
    const requestConfig = {
      method: 'POST',
      url: `${baseUrl}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    return await this.makeApiRequest('ml_service', requestConfig, cacheKey, 600); // Cache for 10 minutes
  }

  /**
   * Get service health status
   */
  getServiceStatus() {
    const status = {};
    
    for (const [serviceName, breaker] of this.circuitBreakers) {
      const limiter = this.rateLimiters.get(serviceName);
      
      status[serviceName] = {
        circuitBreaker: {
          state: breaker.state,
          failures: breaker.failures,
          lastFailureTime: breaker.lastFailureTime,
          lastSuccessTime: breaker.lastSuccessTime
        },
        rateLimit: limiter ? {
          requests: limiter.requests,
          maxRequests: limiter.maxRequests,
          windowMs: limiter.windowMs,
          remaining: limiter.maxRequests - limiter.requests
        } : {
          requests: 0,
          maxRequests: 0,
          windowMs: 0,
          remaining: 0
        }
      };
    }

    return {
      services: status,
      cache: {
        type: this.redisClient ? 'redis' : 'memory',
        connected: this.redisClient ? true : false
      }
    };
  }

  /**
   * Fallback data for when external services are unavailable
   */
  getFallbackData(type, params = {}) {
    const fallbackData = {
      geocode: {
        results: [{
          formatted_address: `${params.address || 'Unknown Address'}, Mumbai, Maharashtra, India`,
          geometry: {
            location: {
              lat: 19.0760,
              lng: 72.8777
            }
          },
          place_id: 'fallback_place_id',
          types: ['establishment'],
          provider: 'fallback'
        }],
        status: 'OK'
      },
      
      reverse_geocode: {
        results: [{
          formatted_address: 'Fallback Address, Mumbai, Maharashtra 400001, India',
          address_components: [
            { long_name: 'Mumbai', types: ['locality'] },
            { long_name: 'Maharashtra', types: ['administrative_area_level_1'] },
            { long_name: 'India', types: ['country'] }
          ],
          provider: 'fallback'
        }],
        status: 'OK'
      },
      
      directions: {
        routes: [{
          legs: [{
            distance: { value: 12500, text: '12.5 km' },
            duration: { value: 1800, text: '30 mins' },
            steps: [
              {
                html_instructions: 'Head north on fallback route',
                distance: { value: 500, text: '0.5 km' },
                duration: { value: 120, text: '2 mins' }
              }
            ]
          }],
          overview_polyline: { points: 'fallback_polyline' },
          bounds: {
            northeast: { lat: 19.1, lng: 72.9 },
            southwest: { lat: 19.0, lng: 72.8 }
          },
          provider: 'fallback'
        }],
        status: 'OK'
      },
      
      places: {
        results: [{
          place_id: 'fallback_place_1',
          name: 'Fallback Bus Station',
          formatted_address: 'Fallback Street, Mumbai',
          geometry: {
            location: {
              lat: 19.0760,
              lng: 72.8777
            }
          },
          rating: 4.0,
          types: ['bus_station', 'transit_station'],
          provider: 'fallback'
        }],
        status: 'OK'
      }
    };

    return fallbackData[type] || null;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Export singleton instance
const externalApiService = new ExternalApiService();

module.exports = externalApiService;