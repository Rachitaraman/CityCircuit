"""
CityCircuit ML Service Data Models
Pydantic models for route optimization and population density data
"""

from .base import *
from .route import *
from .population import *
from .optimization import *
from .user import *
from .serialization import *

__all__ = [
    # Base models
    'Coordinates',
    'GeoBounds',
    'BaseModelWithId',
    
    # User models
    'UserRole',
    'UserPreferences', 
    'UserProfile',
    'User',
    
    # Route models
    'BusStop',
    'Route',
    'CreateRouteRequest',
    'UpdateRouteRequest',
    'RouteSearchRequest',
    'OptimizeRouteRequest',
    
    # Population models
    'DemographicData',
    'DensityPoint',
    'PopulationDensityData',
    
    # Optimization models
    'OptimizationMetrics',
    'OptimizationResult',
    
    # API models
    'ApiError',
    
    # Serialization utilities
    'DataSerializer',
    'TransportationDataExporter',
    'SerializationError',
    'serialize_model',
    'deserialize_model',
]