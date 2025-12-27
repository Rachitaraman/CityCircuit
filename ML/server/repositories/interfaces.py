"""
Repository interfaces for CityCircuit ML Service
Defines contracts for data access operations
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Generic, TypeVar
from sqlalchemy.orm import Session

from models import (
    BusStop as PydanticBusStop, Route as PydanticRoute, User as PydanticUser,
    PopulationDensityData as PydanticPopulationData, OptimizationResult as PydanticOptimizationResult
)

T = TypeVar('T')


class IRepository(ABC, Generic[T]):
    """Base repository interface"""
    
    @abstractmethod
    def get_by_id(self, entity_id: str) -> Optional[T]:
        """Get entity by ID"""
        pass
    
    @abstractmethod
    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination"""
        pass
    
    @abstractmethod
    def create(self, entity: T) -> T:
        """Create new entity"""
        pass
    
    @abstractmethod
    def update(self, entity_id: str, entity: T) -> T:
        """Update existing entity"""
        pass
    
    @abstractmethod
    def delete(self, entity_id: str) -> bool:
        """Delete entity by ID"""
        pass
    
    @abstractmethod
    def exists(self, entity_id: str) -> bool:
        """Check if entity exists"""
        pass


class IBusStopRepository(IRepository[PydanticBusStop]):
    """Bus stop repository interface"""
    
    @abstractmethod
    def find_by_name(self, name: str) -> List[PydanticBusStop]:
        """Find bus stops by name (partial match)"""
        pass
    
    @abstractmethod
    def find_nearby(self, latitude: float, longitude: float, radius_km: float) -> List[PydanticBusStop]:
        """Find bus stops within radius of coordinates"""
        pass
    
    @abstractmethod
    def find_accessible(self) -> List[PydanticBusStop]:
        """Find all wheelchair accessible bus stops"""
        pass
    
    @abstractmethod
    def get_by_coordinates(self, latitude: float, longitude: float, tolerance: float = 0.001) -> Optional[PydanticBusStop]:
        """Find bus stop by exact coordinates with tolerance"""
        pass


class IRouteRepository(IRepository[PydanticRoute]):
    """Route repository interface"""
    
    @abstractmethod
    def find_by_operator(self, operator_id: str) -> List[PydanticRoute]:
        """Find routes by operator ID"""
        pass
    
    @abstractmethod
    def find_active_routes(self) -> List[PydanticRoute]:
        """Find all active routes"""
        pass
    
    @abstractmethod
    def find_by_stops(self, origin_stop_id: str, destination_stop_id: str) -> List[PydanticRoute]:
        """Find routes connecting two stops"""
        pass
    
    @abstractmethod
    def add_stop_to_route(self, route_id: str, stop_id: str, order: int) -> bool:
        """Add a stop to a route at specified order"""
        pass
    
    @abstractmethod
    def remove_stop_from_route(self, route_id: str, stop_id: str) -> bool:
        """Remove a stop from a route"""
        pass
    
    @abstractmethod
    def get_route_stops_ordered(self, route_id: str) -> List[PydanticBusStop]:
        """Get route stops in correct order"""
        pass
    
    @abstractmethod
    def validate_route_data(self, route: PydanticRoute) -> Dict[str, Any]:
        """Validate route data against transportation standards"""
        pass


class IUserRepository(IRepository[PydanticUser]):
    """User repository interface"""
    
    @abstractmethod
    def find_by_email(self, email: str) -> Optional[PydanticUser]:
        """Find user by email address"""
        pass
    
    @abstractmethod
    def find_by_role(self, role: str) -> List[PydanticUser]:
        """Find users by role"""
        pass
    
    @abstractmethod
    def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp"""
        pass


class IPopulationDataRepository(IRepository[PydanticPopulationData]):
    """Population density data repository interface"""
    
    @abstractmethod
    def find_by_region(self, region: str) -> List[PydanticPopulationData]:
        """Find population data by region"""
        pass
    
    @abstractmethod
    def find_by_bounds(self, north: float, south: float, east: float, west: float) -> List[PydanticPopulationData]:
        """Find population data within geographic bounds"""
        pass
    
    @abstractmethod
    def find_by_data_source(self, data_source: str) -> List[PydanticPopulationData]:
        """Find population data by data source"""
        pass


class IOptimizationResultRepository(IRepository[PydanticOptimizationResult]):
    """Optimization result repository interface"""
    
    @abstractmethod
    def find_by_route(self, route_id: str) -> List[PydanticOptimizationResult]:
        """Find optimization results for a route"""
        pass
    
    @abstractmethod
    def find_recent_results(self, days: int = 30) -> List[PydanticOptimizationResult]:
        """Find optimization results from recent days"""
        pass
    
    @abstractmethod
    def get_best_result_for_route(self, route_id: str) -> Optional[PydanticOptimizationResult]:
        """Get the best optimization result for a route"""
        pass