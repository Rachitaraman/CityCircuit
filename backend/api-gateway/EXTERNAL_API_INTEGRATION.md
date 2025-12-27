# CityCircuit API Gateway - External API Integration

This document describes the external API integration layer implemented for the CityCircuit API Gateway, providing comprehensive integration with Google Maps, Azure Maps, and ML services with advanced features like rate limiting, circuit breaking, caching, and fallback mechanisms.

## Overview

The External API Integration Service provides:
- **Rate Limiting**: Prevents API quota exhaustion
- **Circuit Breaking**: Handles service failures gracefully
- **Caching**: Reduces API calls and improves performance
- **Fallback Mechanisms**: Ensures service availability even when external APIs fail
- **Multi-Provider Support**: Google Maps, Azure Maps, and ML service integration

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Routes    │───▶│  External API    │───▶│  External APIs  │
│   (maps.js)     │    │    Service       │    │  (Google/Azure) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Redis Cache     │
                       │  (or Memory)     │
                       └──────────────────┘
```

## Features

### 1. Rate Limiting

Prevents API quota exhaustion by limiting requests per service:

- **Google Maps**: 100 requests/minute
- **Azure Maps**: 50 requests/minute  
- **ML Service**: 30 requests/minute

**Implementation:**
```javascript
// Check rate limit before making request
if (!this.checkRateLimit(serviceName)) {
  throw new Error(`Rate limit exceeded for ${serviceName}`);
}
```

### 2. Circuit Breaker Pattern

Protects against cascading failures by monitoring service health:

- **States**: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
- **Failure Threshold**: 5 consecutive failures trigger OPEN state
- **Recovery Timeout**: 30 seconds before attempting recovery
- **Monitoring Period**: 10 seconds for health checks

**State Transitions:**
```
CLOSED ──(failures >= threshold)──▶ OPEN
   ▲                                  │
   │                                  │
   └──(success)──── HALF_OPEN ◀──(timeout)
```

### 3. Intelligent Caching

Reduces API calls and improves performance:

- **Primary**: Redis cache (if configured)
- **Fallback**: In-memory cache
- **TTL**: Configurable per endpoint (300s-3600s)
- **Cache Keys**: Base64 encoded request parameters

**Cache Strategy:**
- Geocoding: 1 hour TTL
- Reverse Geocoding: 1 hour TTL
- Directions: 30 minutes TTL
- Places Search: 30 minutes TTL
- ML Requests: 10 minutes TTL

### 4. Multi-Level Fallback

Ensures service availability through cascading fallbacks:

1. **Primary Provider** (Google Maps)
2. **Secondary Provider** (Azure Maps)
3. **Mock/Fallback Data** (Always available)

**Fallback Flow:**
```
Google Maps API
      │
      ▼ (on failure)
Azure Maps API
      │
      ▼ (on failure)
Fallback Data
```

## API Endpoints

### Maps Service Status
**GET** `/api/maps/status`

Returns comprehensive service status including circuit breaker states, rate limits, and cache information.

**Response:**
```json
{
  "services": {
    "google_maps": {
      "available": true,
      "status": "configured",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0
      },
      "rateLimit": {
        "requests": 5,
        "remaining": 95
      }
    }
  },
  "cache": {
    "type": "redis",
    "connected": true
  },
  "fallback_mode": false
}
```

### Geocoding
**POST** `/api/maps/geocode`

Converts addresses to coordinates with intelligent fallback.

**Request:**
```json
{
  "address": "Mumbai Central Station",
  "provider": "google"
}
```

**Response:**
```json
{
  "result": {
    "address": "Mumbai Central Station, Mumbai, Maharashtra, India",
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "placeId": "ChIJ...",
    "types": ["transit_station"],
    "provider": "google"
  },
  "query": "Mumbai Central Station"
}
```

## Configuration

### Environment Variables

```bash
# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Azure Maps API
AZURE_MAPS_API_KEY=your_azure_maps_api_key

# Redis Cache (optional)
REDIS_URL=redis://localhost:6379

# ML Service
ML_SERVICE_URL=http://localhost:5000
```

### Rate Limit Configuration

Rate limits can be adjusted in the service initialization:

```javascript
// Google Maps API rate limits
this.rateLimiters.set('google_maps', {
  requests: 0,
  windowStart: Date.now(),
  maxRequests: 100, // per minute
  windowMs: 60000
});
```

### Circuit Breaker Configuration

Circuit breaker settings can be customized:

```javascript
const defaultConfig = {
  failureThreshold: 5,      // failures before opening
  recoveryTimeout: 30000,   // 30 seconds
  monitoringPeriod: 10000,  // 10 seconds
  state: 'CLOSED'
};
```

## Error Handling

### Error Types

1. **Rate Limit Exceeded** (429)
   ```json
   {
     "error": {
       "message": "Geocoding rate limit exceeded",
       "code": "RATE_LIMIT_EXCEEDED",
       "statusCode": 429
     }
   }
   ```

2. **Service Unavailable** (503)
   ```json
   {
     "error": {
       "message": "Geocoding service temporarily unavailable",
       "code": "SERVICE_UNAVAILABLE", 
       "statusCode": 503
     }
   }
   ```

3. **Timeout** (504)
   ```json
   {
     "error": {
       "message": "Geocoding service timeout",
       "code": "GEOCODING_TIMEOUT",
       "statusCode": 504
     }
   }
   ```

### Fallback Data

When all external services fail, the system provides realistic fallback data:

- **Geocoding**: Mumbai-area coordinates with formatted addresses
- **Reverse Geocoding**: Generic Mumbai addresses
- **Directions**: Mock route with realistic travel times
- **Places**: Sample bus stations and transit stops

## Monitoring and Observability

### Service Health Monitoring

The service provides comprehensive health monitoring:

```javascript
const status = externalApiService.getServiceStatus();
```

**Returns:**
- Circuit breaker states for all services
- Rate limit usage and remaining quotas
- Cache connection status
- Last success/failure timestamps

### Logging

All operations are logged using Winston:

- **Info**: Successful API calls, cache hits, circuit breaker state changes
- **Warn**: Rate limit exceeded, circuit breaker opened
- **Error**: API failures, cache errors, service unavailable

### Metrics

Key metrics tracked:
- API request counts per service
- Cache hit/miss ratios
- Circuit breaker state changes
- Response times
- Error rates

## Best Practices

### 1. API Key Management
- Store API keys in environment variables
- Use different keys for development/production
- Monitor API usage and quotas
- Implement key rotation procedures

### 2. Caching Strategy
- Use appropriate TTL values for different data types
- Implement cache invalidation for critical updates
- Monitor cache hit ratios
- Consider cache warming for frequently accessed data

### 3. Error Handling
- Always provide fallback mechanisms
- Log errors with sufficient context
- Implement exponential backoff for retries
- Provide meaningful error messages to clients

### 4. Performance Optimization
- Use connection pooling for external APIs
- Implement request batching where possible
- Monitor and optimize cache performance
- Use CDN for static geographic data

## Testing

### Unit Tests
- Rate limiting functionality
- Circuit breaker state transitions
- Cache operations (set/get/expire)
- Fallback data generation

### Integration Tests
- End-to-end API workflows
- Multi-provider fallback scenarios
- Cache behavior under load
- Error handling and recovery

### Load Testing
- Rate limit enforcement under high load
- Circuit breaker behavior during failures
- Cache performance with concurrent requests
- Service degradation scenarios

## Deployment Considerations

### Production Setup
1. Configure Redis for distributed caching
2. Set appropriate rate limits based on API quotas
3. Monitor circuit breaker metrics
4. Set up alerting for service failures
5. Implement health checks for external dependencies

### Scaling
- Use Redis Cluster for cache scaling
- Implement service-specific rate limiting
- Consider API gateway for additional rate limiting
- Monitor and adjust circuit breaker thresholds

### Security
- Secure API keys using environment variables
- Implement request signing for sensitive APIs
- Use HTTPS for all external API calls
- Validate and sanitize all input data

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check API key validity
   - Verify network connectivity
   - Review rate limit settings
   - Check circuit breaker states

2. **Cache Misses**
   - Verify Redis connection
   - Check TTL settings
   - Monitor cache memory usage
   - Review cache key generation

3. **Slow Response Times**
   - Check external API performance
   - Review timeout settings
   - Monitor cache hit ratios
   - Consider request optimization

### Debug Commands

```bash
# Check service status
curl http://localhost:3001/api/maps/status

# Test geocoding with fallback
curl -X POST http://localhost:3001/api/maps/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "Test Address", "provider": "google"}'

# Monitor Redis cache
redis-cli monitor
```

## Future Enhancements

1. **Additional Providers**: HERE Maps, Mapbox integration
2. **Advanced Caching**: Cache warming, intelligent prefetching
3. **Analytics**: Detailed usage analytics and reporting
4. **Auto-scaling**: Dynamic rate limit adjustment
5. **Machine Learning**: Predictive caching and optimization

This external API integration layer provides a robust, scalable, and fault-tolerant foundation for the CityCircuit platform's mapping and geolocation services.