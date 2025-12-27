# CityCircuit API Gateway - Route Management Endpoints

This document describes the route management endpoints implemented in the CityCircuit API Gateway.

## Overview

The route management endpoints provide comprehensive functionality for:
- Route CRUD operations (Create, Read, Update, Delete)
- Route search and filtering
- Route optimization requests
- Batch operations

## Authentication

Most endpoints require authentication using JWT tokens:
- **Public endpoints**: Route search, get routes (read-only)
- **Operator endpoints**: Create, update, delete routes, optimization requests
- **Admin endpoints**: All operations including cross-operator management

## Endpoints

### 1. Get All Routes
**GET** `/api/routes`

Retrieve all routes with optional filtering and pagination.

**Query Parameters:**
- `origin` (string, optional): Filter by origin location
- `destination` (string, optional): Filter by destination location
- `operatorId` (string, optional): Filter by operator ID
- `maxTravelTime` (integer, optional): Maximum travel time in minutes
- `accessibleOnly` (boolean, optional): Filter for accessible routes only
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `sortBy` (string, optional): Sort field (default: 'name')
- `sortOrder` (string, optional): Sort order 'asc' or 'desc' (default: 'asc')

**Response:**
```json
{
  "routes": [
    {
      "id": "route_001",
      "name": "CST to Gateway Express",
      "description": "Historic route connecting CST to Gateway of India",
      "operatorId": "mumbai-transport-001",
      "estimatedTravelTime": 30,
      "optimizationScore": 75.5,
      "stops": [
        {
          "id": "stop_001",
          "name": "Chhatrapati Shivaji Terminus",
          "coordinates": {
            "latitude": 18.9398,
            "longitude": 72.8355
          },
          "address": "Dr Dadabhai Naoroji Rd, Fort, Mumbai",
          "amenities": ["wheelchair_accessible", "shelter", "seating"],
          "dailyPassengerCount": 50000,
          "isAccessible": true
        }
      ],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  },
  "filters": {
    "operatorId": "mumbai-transport-001"
  }
}
```

### 2. Get Route by ID
**GET** `/api/routes/:id`

Retrieve a specific route by its ID.

**Parameters:**
- `id` (string): Route ID

**Response:**
```json
{
  "route": {
    "id": "route_001",
    "name": "CST to Gateway Express",
    "description": "Historic route connecting CST to Gateway of India",
    "operatorId": "mumbai-transport-001",
    "estimatedTravelTime": 30,
    "optimizationScore": 75.5,
    "stops": [...],
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Create New Route
**POST** `/api/routes`

Create a new route. Requires operator authentication.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "name": "New Route Name",
  "description": "Route description",
  "operatorId": "operator-id",
  "estimatedTravelTime": 45,
  "stops": [
    {
      "name": "Stop Name",
      "coordinates": {
        "latitude": 19.0760,
        "longitude": 72.8777
      },
      "address": "Stop Address",
      "amenities": ["shelter", "seating"],
      "dailyPassengerCount": 1000,
      "isAccessible": true
    }
  ]
}
```

**Response:**
```json
{
  "message": "Route created successfully",
  "route": {
    "id": "route_new_123",
    "name": "New Route Name",
    "description": "Route description",
    "operatorId": "operator-id",
    "estimatedTravelTime": 45,
    "optimizationScore": 0,
    "stops": [...],
    "isActive": true,
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

### 4. Update Route
**PUT** `/api/routes/:id`

Update an existing route. Requires operator authentication and ownership.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Parameters:**
- `id` (string): Route ID

**Request Body:** Same as create route

**Response:**
```json
{
  "message": "Route updated successfully",
  "route": {
    "id": "route_001",
    "name": "Updated Route Name",
    "description": "Updated description",
    "updatedAt": "2024-01-20T11:00:00.000Z"
  }
}
```

### 5. Delete Route
**DELETE** `/api/routes/:id`

Delete (soft delete) a route. Requires operator authentication and ownership.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Parameters:**
- `id` (string): Route ID

**Response:**
```json
{
  "message": "Route deleted successfully"
}
```

### 6. Search Routes
**POST** `/api/routes/search`

Search for routes between two points with preferences.

**Request Body:**
```json
{
  "origin": "CST",
  "destination": "Gateway of India",
  "preferences": {
    "sortBy": "travelTime",
    "accessibleOnly": false,
    "maxTravelTime": 60
  }
}
```

**Response:**
```json
{
  "origin": "CST",
  "destination": "Gateway of India",
  "routes": [
    {
      "id": "route_001",
      "name": "Direct Route",
      "estimatedTravelTime": 25,
      "distance": 12.5,
      "transfers": 0,
      "accessibility": true,
      "stops": ["Origin Stop", "Intermediate Stop", "Destination Stop"],
      "fare": 15,
      "optimizationScore": 85.2
    }
  ],
  "searchMetadata": {
    "totalResults": 1,
    "searchTime": "0.15s",
    "preferences": {
      "sortBy": "travelTime"
    }
  }
}
```

### 7. Optimize Route
**POST** `/api/routes/:id/optimize`

Request route optimization using ML service. Requires operator authentication.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Parameters:**
- `id` (string): Route ID

**Request Body:**
```json
{
  "populationData": {
    "region": "Mumbai Central",
    "coordinates": {
      "north": 19.1,
      "south": 19.0,
      "east": 72.9,
      "west": 72.8
    },
    "densityPoints": [...]
  },
  "optimizationCriteria": "time_efficiency",
  "constraints": {
    "maxStops": 10,
    "minAccessibleStops": 2
  }
}
```

**Response:**
```json
{
  "message": "Route optimization completed",
  "optimizationResult": {
    "originalRouteId": "route_001",
    "optimizedRoute": {...},
    "metrics": {
      "timeImprovement": 15.5,
      "distanceReduction": 8.2,
      "passengerCoverageIncrease": 12.3,
      "costSavings": 18.7
    },
    "generatedAt": "2024-01-20T12:00:00.000Z"
  },
  "requestId": "req_123456"
}
```

### 8. Get Route Optimization History
**GET** `/api/routes/:id/optimizations`

Get optimization history for a route. Requires operator authentication.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Parameters:**
- `id` (string): Route ID

**Query Parameters:**
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page

**Response:**
```json
{
  "optimizations": [
    {
      "id": "opt_001",
      "routeId": "route_001",
      "optimizationCriteria": "time_efficiency",
      "metrics": {
        "timeImprovement": 15.5,
        "distanceReduction": 8.2,
        "passengerCoverageIncrease": 12.3,
        "costSavings": 18.7
      },
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T10:32:15.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### 9. Batch Optimize Routes
**POST** `/api/routes/batch-optimize`

Optimize multiple routes in batch. Requires operator authentication.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "routeIds": ["route_001", "route_002", "route_003"],
  "populationData": {...},
  "optimizationCriteria": "overall_score"
}
```

**Response:**
```json
{
  "message": "Batch optimization completed for 3 routes",
  "results": [
    {
      "originalRouteId": "route_001",
      "optimizedRoute": {...},
      "metrics": {...}
    }
  ],
  "summary": {
    "totalRoutes": 3,
    "successfulOptimizations": 3,
    "averageImprovement": 12.5
  },
  "requestId": "batch_req_123456"
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400
  },
  "timestamp": "2024-01-20T12:00:00.000Z",
  "path": "/api/routes",
  "method": "POST"
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid input data
- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `ROUTE_NOT_FOUND` (404): Route does not exist
- `ML_SERVICE_UNAVAILABLE` (503): ML service is down
- `OPTIMIZATION_TIMEOUT` (504): Optimization request timed out
- `RATE_LIMIT_EXCEEDED` (429): Too many requests

## Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Optimization endpoints: Special rate limiting (lower limits)
- Batch operations: Additional restrictions on batch size

## Integration with ML Service

Route optimization endpoints integrate with the Flask ML service:
- Forwards optimization requests to `http://localhost:5000/api/ml/optimize/route`
- Handles ML service timeouts and errors gracefully
- Provides fallback responses when ML service is unavailable

## Validation

All endpoints include comprehensive input validation:
- Route data validation (names, coordinates, stops)
- Authentication token validation
- Request parameter sanitization
- XSS and injection attack prevention

## Testing

Run the test suite:
```bash
node test_routes.js
```

This tests all major endpoints and validates responses.