"""
Serialization and deserialization utilities for CityCircuit ML Service
Provides methods for converting between different data formats
"""

import json
import pickle
from typing import Any, Dict, List, Type, TypeVar, Union
from datetime import datetime
from pydantic import BaseModel, ValidationError
import logging

from .base import ApiError

T = TypeVar('T', bound=BaseModel)

logger = logging.getLogger(__name__)


class SerializationError(Exception):
    """Custom exception for serialization/deserialization errors"""
    pass


class DataSerializer:
    """Utility class for data serialization and deserialization"""
    
    @staticmethod
    def to_json(model: BaseModel, **kwargs) -> str:
        """
        Serialize a Pydantic model to JSON string
        
        Args:
            model: Pydantic model instance
            **kwargs: Additional arguments for json.dumps
            
        Returns:
            JSON string representation
            
        Raises:
            SerializationError: If serialization fails
        """
        try:
            return model.json(**kwargs)
        except Exception as e:
            logger.error(f"Failed to serialize model to JSON: {e}")
            raise SerializationError(f"JSON serialization failed: {e}")
    
    @staticmethod
    def from_json(model_class: Type[T], json_str: str) -> T:
        """
        Deserialize JSON string to Pydantic model
        
        Args:
            model_class: Pydantic model class
            json_str: JSON string to deserialize
            
        Returns:
            Pydantic model instance
            
        Raises:
            SerializationError: If deserialization fails
        """
        try:
            return model_class.parse_raw(json_str)
        except ValidationError as e:
            logger.error(f"Validation error during JSON deserialization: {e}")
            raise SerializationError(f"JSON deserialization validation failed: {e}")
        except Exception as e:
            logger.error(f"Failed to deserialize JSON to model: {e}")
            raise SerializationError(f"JSON deserialization failed: {e}")
    
    @staticmethod
    def to_dict(model: BaseModel, **kwargs) -> Dict[str, Any]:
        """
        Convert Pydantic model to dictionary
        
        Args:
            model: Pydantic model instance
            **kwargs: Additional arguments for model.dict()
            
        Returns:
            Dictionary representation
        """
        try:
            return model.dict(**kwargs)
        except Exception as e:
            logger.error(f"Failed to convert model to dict: {e}")
            raise SerializationError(f"Dict conversion failed: {e}")
    
    @staticmethod
    def from_dict(model_class: Type[T], data: Dict[str, Any]) -> T:
        """
        Create Pydantic model from dictionary
        
        Args:
            model_class: Pydantic model class
            data: Dictionary data
            
        Returns:
            Pydantic model instance
            
        Raises:
            SerializationError: If creation fails
        """
        try:
            return model_class.parse_obj(data)
        except ValidationError as e:
            logger.error(f"Validation error during dict deserialization: {e}")
            raise SerializationError(f"Dict deserialization validation failed: {e}")
        except Exception as e:
            logger.error(f"Failed to create model from dict: {e}")
            raise SerializationError(f"Dict deserialization failed: {e}")
    
    @staticmethod
    def to_pickle(model: BaseModel) -> bytes:
        """
        Serialize Pydantic model to pickle bytes
        
        Args:
            model: Pydantic model instance
            
        Returns:
            Pickled bytes
            
        Raises:
            SerializationError: If serialization fails
        """
        try:
            return pickle.dumps(model.dict())
        except Exception as e:
            logger.error(f"Failed to pickle model: {e}")
            raise SerializationError(f"Pickle serialization failed: {e}")
    
    @staticmethod
    def from_pickle(model_class: Type[T], data: bytes) -> T:
        """
        Deserialize pickle bytes to Pydantic model
        
        Args:
            model_class: Pydantic model class
            data: Pickled bytes
            
        Returns:
            Pydantic model instance
            
        Raises:
            SerializationError: If deserialization fails
        """
        try:
            unpickled_data = pickle.loads(data)
            return model_class.parse_obj(unpickled_data)
        except ValidationError as e:
            logger.error(f"Validation error during pickle deserialization: {e}")
            raise SerializationError(f"Pickle deserialization validation failed: {e}")
        except Exception as e:
            logger.error(f"Failed to unpickle model: {e}")
            raise SerializationError(f"Pickle deserialization failed: {e}")
    
    @staticmethod
    def batch_to_json(models: List[BaseModel]) -> str:
        """
        Serialize a list of Pydantic models to JSON
        
        Args:
            models: List of Pydantic model instances
            
        Returns:
            JSON string representation of the list
            
        Raises:
            SerializationError: If serialization fails
        """
        try:
            data = [model.dict() for model in models]
            return json.dumps(data, default=str)  # default=str handles datetime objects
        except Exception as e:
            logger.error(f"Failed to serialize model list to JSON: {e}")
            raise SerializationError(f"Batch JSON serialization failed: {e}")
    
    @staticmethod
    def batch_from_json(model_class: Type[T], json_str: str) -> List[T]:
        """
        Deserialize JSON string to list of Pydantic models
        
        Args:
            model_class: Pydantic model class
            json_str: JSON string containing list of objects
            
        Returns:
            List of Pydantic model instances
            
        Raises:
            SerializationError: If deserialization fails
        """
        try:
            data_list = json.loads(json_str)
            if not isinstance(data_list, list):
                raise SerializationError("JSON data must be a list for batch deserialization")
            
            models = []
            for i, data in enumerate(data_list):
                try:
                    models.append(model_class.parse_obj(data))
                except ValidationError as e:
                    logger.error(f"Validation error for item {i} in batch deserialization: {e}")
                    raise SerializationError(f"Batch deserialization failed at item {i}: {e}")
            
            return models
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error during batch deserialization: {e}")
            raise SerializationError(f"Invalid JSON for batch deserialization: {e}")
        except Exception as e:
            logger.error(f"Failed to deserialize JSON list to models: {e}")
            raise SerializationError(f"Batch JSON deserialization failed: {e}")


class TransportationDataExporter:
    """Specialized exporter for transportation data formats"""
    
    @staticmethod
    def to_gtfs_format(routes: List['Route']) -> Dict[str, Any]:
        """
        Export routes to GTFS (General Transit Feed Specification) format
        
        Args:
            routes: List of Route models
            
        Returns:
            Dictionary with GTFS-formatted data
        """
        try:
            gtfs_data = {
                'routes': [],
                'stops': [],
                'stop_times': []
            }
            
            stop_id_map = {}
            stop_counter = 1
            
            for route in routes:
                # Add route info
                gtfs_data['routes'].append({
                    'route_id': route.id,
                    'route_short_name': route.name,
                    'route_long_name': route.description or route.name,
                    'route_type': 3,  # Bus
                    'route_color': '',
                    'route_text_color': ''
                })
                
                # Add stops and stop times
                for i, stop in enumerate(route.stops):
                    if stop.id not in stop_id_map:
                        stop_id_map[stop.id] = f"stop_{stop_counter}"
                        stop_counter += 1
                        
                        gtfs_data['stops'].append({
                            'stop_id': stop_id_map[stop.id],
                            'stop_name': stop.name,
                            'stop_lat': stop.coordinates.latitude,
                            'stop_lon': stop.coordinates.longitude,
                            'wheelchair_boarding': 1 if stop.is_accessible else 0
                        })
                    
                    # Add stop time (simplified)
                    gtfs_data['stop_times'].append({
                        'trip_id': f"{route.id}_trip_1",
                        'arrival_time': f"{8 + i}:00:00",  # Simplified timing
                        'departure_time': f"{8 + i}:00:00",
                        'stop_id': stop_id_map[stop.id],
                        'stop_sequence': i + 1
                    })
            
            return gtfs_data
        except Exception as e:
            logger.error(f"Failed to export to GTFS format: {e}")
            raise SerializationError(f"GTFS export failed: {e}")
    
    @staticmethod
    def to_geojson_format(routes: List['Route']) -> Dict[str, Any]:
        """
        Export routes to GeoJSON format for mapping applications
        
        Args:
            routes: List of Route models
            
        Returns:
            GeoJSON FeatureCollection
        """
        try:
            features = []
            
            for route in routes:
                # Create LineString geometry from stops
                coordinates = [
                    [stop.coordinates.longitude, stop.coordinates.latitude]
                    for stop in route.stops
                ]
                
                feature = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': coordinates
                    },
                    'properties': {
                        'route_id': route.id,
                        'route_name': route.name,
                        'description': route.description,
                        'operator_id': route.operator_id,
                        'is_active': route.is_active,
                        'optimization_score': route.optimization_score,
                        'estimated_travel_time': route.estimated_travel_time,
                        'stop_count': len(route.stops)
                    }
                }
                features.append(feature)
            
            return {
                'type': 'FeatureCollection',
                'features': features
            }
        except Exception as e:
            logger.error(f"Failed to export to GeoJSON format: {e}")
            raise SerializationError(f"GeoJSON export failed: {e}")


# Convenience functions for common operations
def serialize_model(model: BaseModel, format: str = 'json') -> Union[str, bytes]:
    """
    Serialize a model to the specified format
    
    Args:
        model: Pydantic model instance
        format: Output format ('json', 'dict', 'pickle')
        
    Returns:
        Serialized data
    """
    serializer = DataSerializer()
    
    if format == 'json':
        return serializer.to_json(model)
    elif format == 'dict':
        return serializer.to_dict(model)
    elif format == 'pickle':
        return serializer.to_pickle(model)
    else:
        raise ValueError(f"Unsupported format: {format}")


def deserialize_model(model_class: Type[T], data: Union[str, bytes, Dict], format: str = 'json') -> T:
    """
    Deserialize data to a model instance
    
    Args:
        model_class: Pydantic model class
        data: Data to deserialize
        format: Input format ('json', 'dict', 'pickle')
        
    Returns:
        Pydantic model instance
    """
    serializer = DataSerializer()
    
    if format == 'json':
        return serializer.from_json(model_class, data)
    elif format == 'dict':
        return serializer.from_dict(model_class, data)
    elif format == 'pickle':
        return serializer.from_pickle(model_class, data)
    else:
        raise ValueError(f"Unsupported format: {format}")