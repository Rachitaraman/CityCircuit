"""
SQLAlchemy database models for CityCircuit ML Service
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON,
    ForeignKey, Table, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

Base = declarative_base()


def generate_uuid():
    """Generate a new UUID string"""
    return str(uuid.uuid4())


# Association table for route-busstop many-to-many relationship
route_stops = Table(
    'route_stops',
    Base.metadata,
    Column('route_id', UUID(as_uuid=False), ForeignKey('routes.id'), primary_key=True),
    Column('bus_stop_id', UUID(as_uuid=False), ForeignKey('bus_stops.id'), primary_key=True),
    Column('stop_order', Integer, nullable=False),  # Order of stop in route
    Column('created_at', DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
)


class BusStop(Base):
    """Bus stop database model"""
    __tablename__ = 'bus_stops'
    
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=False)
    amenities = Column(JSON, default=list)  # Store as JSON array
    daily_passenger_count = Column(Integer, default=0)
    is_accessible = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    routes = relationship("Route", secondary=route_stops, back_populates="stops")
    
    # Indexes for geospatial queries
    __table_args__ = (
        Index('idx_bus_stops_location', 'latitude', 'longitude'),
        Index('idx_bus_stops_name', 'name'),
    )


class Route(Base):
    """Route database model"""
    __tablename__ = 'routes'
    
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, default="")
    operator_id = Column(String(100), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    optimization_score = Column(Float, default=0.0)
    estimated_travel_time = Column(Integer, nullable=False)  # in minutes
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    stops = relationship("BusStop", secondary=route_stops, back_populates="routes")
    optimization_results = relationship("OptimizationResult", back_populates="original_route")
    
    # Indexes
    __table_args__ = (
        Index('idx_routes_operator', 'operator_id'),
        Index('idx_routes_active', 'is_active'),
    )


class User(Base):
    """User database model"""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, unique=True, index=True)
    role = Column(String(20), nullable=False)  # operator, passenger, admin
    profile = Column(JSON, nullable=False)  # Store profile as JSON
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Indexes
    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_role', 'role'),
    )


class PopulationDensityData(Base):
    """Population density data database model"""
    __tablename__ = 'population_density_data'
    
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    region = Column(String(200), nullable=False, index=True)
    data_source = Column(String(200), nullable=False)
    collected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Geographic bounds
    north_bound = Column(Float, nullable=False)
    south_bound = Column(Float, nullable=False)
    east_bound = Column(Float, nullable=False)
    west_bound = Column(Float, nullable=False)
    
    # Relationships
    density_points = relationship("DensityPoint", back_populates="population_data", cascade="all, delete-orphan")
    optimization_results = relationship("OptimizationResult", back_populates="population_data")
    
    # Indexes for geospatial queries
    __table_args__ = (
        Index('idx_population_region', 'region'),
        Index('idx_population_bounds', 'north_bound', 'south_bound', 'east_bound', 'west_bound'),
    )


class DensityPoint(Base):
    """Density point database model"""
    __tablename__ = 'density_points'
    
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    population_data_id = Column(UUID(as_uuid=False), ForeignKey('population_density_data.id'), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    population = Column(Integer, nullable=False, default=0)
    demographic_data = Column(JSON, default=dict)  # Store demographic data as JSON
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    population_data = relationship("PopulationDensityData", back_populates="density_points")
    
    # Indexes for geospatial queries
    __table_args__ = (
        Index('idx_density_points_location', 'latitude', 'longitude'),
        Index('idx_density_points_population', 'population'),
    )


class OptimizationResult(Base):
    """Optimization result database model"""
    __tablename__ = 'optimization_results'
    
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    original_route_id = Column(UUID(as_uuid=False), ForeignKey('routes.id'), nullable=False)
    population_data_id = Column(UUID(as_uuid=False), ForeignKey('population_density_data.id'), nullable=False)
    
    # Optimized route data (stored as JSON for flexibility)
    optimized_route_data = Column(JSON, nullable=False)
    
    # Optimization metrics
    time_improvement = Column(Float, nullable=False, default=0.0)
    distance_reduction = Column(Float, nullable=False, default=0.0)
    passenger_coverage_increase = Column(Float, nullable=False, default=0.0)
    cost_savings = Column(Float, nullable=False, default=0.0)
    
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    original_route = relationship("Route", back_populates="optimization_results")
    population_data = relationship("PopulationDensityData", back_populates="optimization_results")
    
    # Indexes
    __table_args__ = (
        Index('idx_optimization_route', 'original_route_id'),
        Index('idx_optimization_generated', 'generated_at'),
    )