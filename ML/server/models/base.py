"""
Base data models for CityCircuit ML Service
Common types and utilities used across all models
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Dict, Any
from datetime import datetime, timezone
import uuid


class Coordinates(BaseModel):
    """Geographic coordinates with validation"""
    model_config = ConfigDict(
        json_encoders={float: lambda v: round(v, 6)}  # Limit precision for coordinates
    )
    
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")


class GeoBounds(BaseModel):
    """Geographic bounding box with validation"""
    north: float = Field(..., ge=-90, le=90, description="Northern boundary latitude")
    south: float = Field(..., ge=-90, le=90, description="Southern boundary latitude") 
    east: float = Field(..., ge=-180, le=180, description="Eastern boundary longitude")
    west: float = Field(..., ge=-180, le=180, description="Western boundary longitude")
    
    @field_validator('north')
    @classmethod
    def validate_north_south(cls, v, info):
        if info.data and 'south' in info.data and v <= info.data['south']:
            raise ValueError('North boundary must be greater than south boundary')
        return v
    
    @field_validator('east')
    @classmethod
    def validate_east_west(cls, v, info):
        if info.data and 'west' in info.data and v <= info.data['west']:
            raise ValueError('East boundary must be greater than west boundary')
        return v


class ApiError(BaseModel):
    """Standard API error response"""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional error details")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Error timestamp")


def generate_uuid() -> str:
    """Generate a new UUID string"""
    return str(uuid.uuid4())


class BaseModelWithId(BaseModel):
    """Base model with UUID identifier"""
    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        validate_assignment=True
    )
    
    id: str = Field(default_factory=generate_uuid, description="Unique identifier")