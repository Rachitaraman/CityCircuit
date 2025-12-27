"""
Route and bus stop data models for CityCircuit ML Service
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone

from .base import BaseModelWithId, Coordinates


class BusStop(BaseModelWithId):
    """Bus stop model with location and amenity information"""
    name: str = Field(..., min_length=1, max_length=200, description="Bus stop name")
    coordinates: Coordinates = Field(..., description="Geographic coordinates")
    address: str = Field(..., min_length=1, max_length=500, description="Physical address")
    amenities: List[str] = Field(default_factory=list, description="Available amenities")
    daily_passenger_count: int = Field(
        default=0, 
        ge=0, 
        description="Average daily passenger count",
        alias="dailyPassengerCount"
    )
    is_accessible: bool = Field(
        default=False, 
        description="Wheelchair accessibility",
        alias="isAccessible"
    )


class Route(BaseModelWithId):
    """Bus route model with stops and optimization metrics"""
    name: str = Field(..., min_length=1, max_length=200, description="Route name")
    description: str = Field(default="", max_length=1000, description="Route description")
    stops: List[BusStop] = Field(..., min_length=2, description="List of bus stops on the route")
    operator_id: str = Field(..., description="ID of the operating company", alias="operatorId")
    is_active: bool = Field(default=True, description="Whether the route is currently active", alias="isActive")
    optimization_score: float = Field(
        default=0.0, 
        ge=0, 
        le=100, 
        description="Route optimization score (0-100)",
        alias="optimizationScore"
    )
    estimated_travel_time: int = Field(
        ..., 
        ge=1, 
        le=1440, 
        description="Estimated travel time in minutes (max 24 hours)",
        alias="estimatedTravelTime"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        description="Route creation timestamp",
        alias="createdAt"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        description="Last update timestamp",
        alias="updatedAt"
    )
    
    @field_validator('stops')
    @classmethod
    def validate_minimum_stops(cls, v):
        if len(v) < 2:
            raise ValueError('A route must have at least 2 stops')
        return v


class CreateRouteRequest(BaseModel):
    """Request model for creating a new route"""
    name: str = Field(..., min_length=1, max_length=200, description="Route name")
    description: Optional[str] = Field(None, max_length=1000, description="Route description")
    stops: List[str] = Field(..., min_length=2, description="List of bus stop IDs")
    operator_id: str = Field(..., description="ID of the operating company", alias="operatorId")
    
    @field_validator('stops')
    @classmethod
    def validate_minimum_stops(cls, v):
        if len(v) < 2:
            raise ValueError('A route must have at least 2 stops')
        return v


class UpdateRouteRequest(BaseModel):
    """Request model for updating an existing route"""
    id: str = Field(..., description="Route ID to update")
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Route name")
    description: Optional[str] = Field(None, max_length=1000, description="Route description")
    stops: Optional[List[str]] = Field(None, min_length=2, description="List of bus stop IDs")
    operator_id: Optional[str] = Field(None, description="ID of the operating company", alias="operatorId")
    
    @field_validator('stops')
    @classmethod
    def validate_minimum_stops(cls, v):
        if v is not None and len(v) < 2:
            raise ValueError('A route must have at least 2 stops')
        return v


class RouteSearchRequest(BaseModel):
    """Request model for searching routes between stops"""
    origin: str = Field(..., description="Origin bus stop ID")
    destination: str = Field(..., description="Destination bus stop ID")
    departure_time: Optional[datetime] = Field(None, description="Preferred departure time", alias="departureTime")
    max_transfers: int = Field(
        default=2, 
        ge=0, 
        le=5, 
        description="Maximum number of transfers allowed",
        alias="maxTransfers"
    )


class OptimizeRouteRequest(BaseModel):
    """Request model for route optimization"""
    route_id: str = Field(..., description="Route ID to optimize", alias="routeId")
    population_data_id: Optional[str] = Field(
        None, 
        description="Population data ID to use for optimization",
        alias="populationDataId"
    )
    optimization_goals: List[str] = Field(
        default=["time"], 
        description="Optimization goals: time, distance, coverage, cost",
        alias="optimizationGoals"
    )
    
    @field_validator('optimization_goals')
    @classmethod
    def validate_optimization_goals(cls, v):
        valid_goals = {'time', 'distance', 'coverage', 'cost'}
        for goal in v:
            if goal not in valid_goals:
                raise ValueError(f'Invalid optimization goal: {goal}. Must be one of {valid_goals}')
        return v