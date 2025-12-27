"""
Repository implementations for CityCircuit ML Service
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from sqlalchemy.exc import SQLAlchemyError

from models import (
    BusStop as PydanticBusStop, Route as PydanticRoute, User as PydanticUser,
    PopulationDensityData as PydanticPopulationData, OptimizationResult as PydanticOptimizationResult,
    Coordinates, GeoBounds, DensityPoint, DemographicData, OptimizationMetrics
)
from database.models import (
    BusStop as DBBusStop, Route as DBRoute, User as DBUser,
    PopulationDensityData as DBPopulationData, OptimizationResult as DBOptimizationResult,
    DensityPoint as DBDensityPoint, route_stops
)
from .base import BaseRepository
from .interfaces import IBusStopRepository, IRouteRepository, IUserRepository, IPopulationDataRepository, IOptimizationResultRepository
from .exceptions import RepositoryError, NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class BusStopRepository(BaseRepository[PydanticBusStop, DBBusStop], IBusStopRepository):
    """Bus stop repository implementation"""
    
    def __init__(self, session: Session):
        super().__init__(session, PydanticBusStop, DBBusStop)
    
    def _to_pydantic(self, db_entity: DBBusStop) -> PydanticBusStop:
        """Convert SQLAlchemy BusStop to Pydantic BusStop"""
        return PydanticBusStop(
            id=db_entity.id,
            name=db_entity.name,
            coordinates=Coordinates(
                latitude=db_entity.latitude,
                longitude=db_entity.longitude
            ),
            address=db_entity.address,
            amenities=db_entity.amenities or [],
            daily_passenger_count=db_entity.daily_passenger_count or 0,
            is_accessible=db_entity.is_accessible or False
        )
    
    def _to_sqlalchemy(self, pydantic_entity: PydanticBusStop) -> DBBusStop:
        """Convert Pydantic BusStop to SQLAlchemy BusStop"""
        return DBBusStop(
            id=pydantic_entity.id,
            name=pydantic_entity.name,
            latitude=pydantic_entity.coordinates.latitude,
            longitude=pydantic_entity.coordinates.longitude,
            address=pydantic_entity.address,
            amenities=pydantic_entity.amenities,
            daily_passenger_count=pydantic_entity.daily_passenger_count,
            is_accessible=pydantic_entity.is_accessible,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    
    def _update_sqlalchemy_from_pydantic(self, db_entity: DBBusStop, pydantic_entity: PydanticBusStop) -> None:
        """Update SQLAlchemy BusStop from Pydantic BusStop"""
        db_entity.name = pydantic_entity.name
        db_entity.latitude = pydantic_entity.coordinates.latitude
        db_entity.longitude = pydantic_entity.coordinates.longitude
        db_entity.address = pydantic_entity.address
        db_entity.amenities = pydantic_entity.amenities
        db_entity.daily_passenger_count = pydantic_entity.daily_passenger_count
        db_entity.is_accessible = pydantic_entity.is_accessible
        db_entity.updated_at = datetime.now(timezone.utc)
    
    def find_by_name(self, name: str) -> List[PydanticBusStop]:
        """Find bus stops by name (partial match)"""
        try:
            db_entities = (
                self.session.query(DBBusStop)
                .filter(DBBusStop.name.ilike(f"%{name}%"))
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding bus stops by name '{name}': {e}")
            raise RepositoryError(f"Failed to find bus stops by name: {e}")
    
    def find_nearby(self, latitude: float, longitude: float, radius_km: float) -> List[PydanticBusStop]:
        """Find bus stops within radius of coordinates"""
        try:
            # Simple bounding box approximation (1 degree ≈ 111 km)
            radius_degrees = radius_km / 111.0
            
            db_entities = (
                self.session.query(DBBusStop)
                .filter(
                    and_(
                        DBBusStop.latitude.between(latitude - radius_degrees, latitude + radius_degrees),
                        DBBusStop.longitude.between(longitude - radius_degrees, longitude + radius_degrees)
                    )
                )
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding nearby bus stops: {e}")
            raise RepositoryError(f"Failed to find nearby bus stops: {e}")
    
    def find_accessible(self) -> List[PydanticBusStop]:
        """Find all wheelchair accessible bus stops"""
        try:
            db_entities = (
                self.session.query(DBBusStop)
                .filter(DBBusStop.is_accessible == True)
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding accessible bus stops: {e}")
            raise RepositoryError(f"Failed to find accessible bus stops: {e}")
    
    def get_by_coordinates(self, latitude: float, longitude: float, tolerance: float = 0.001) -> Optional[PydanticBusStop]:
        """Find bus stop by exact coordinates with tolerance"""
        try:
            db_entity = (
                self.session.query(DBBusStop)
                .filter(
                    and_(
                        DBBusStop.latitude.between(latitude - tolerance, latitude + tolerance),
                        DBBusStop.longitude.between(longitude - tolerance, longitude + tolerance)
                    )
                )
                .first()
            )
            return self._to_pydantic(db_entity) if db_entity else None
        except SQLAlchemyError as e:
            logger.error(f"Error finding bus stop by coordinates: {e}")
            raise RepositoryError(f"Failed to find bus stop by coordinates: {e}")

class RouteRepository(BaseRepository[PydanticRoute, DBRoute], IRouteRepository):
    """Route repository implementation"""
    
    def __init__(self, session: Session):
        super().__init__(session, PydanticRoute, DBRoute)
    
    def _to_pydantic(self, db_entity: DBRoute) -> PydanticRoute:
        """Convert SQLAlchemy Route to Pydantic Route"""
        # Get stops in order - handle case where route might not have stops yet
        try:
            stops = self.get_route_stops_ordered(db_entity.id)
        except:
            stops = []  # Empty list if no stops or error getting stops
        
        return PydanticRoute(
            id=db_entity.id,
            name=db_entity.name,
            description=db_entity.description or "",
            stops=stops if len(stops) >= 2 else [
                # Create dummy stops to satisfy validation if needed
                PydanticBusStop(
                    name="Placeholder Stop 1",
                    coordinates=Coordinates(latitude=0.0, longitude=0.0),
                    address="Placeholder Address 1"
                ),
                PydanticBusStop(
                    name="Placeholder Stop 2", 
                    coordinates=Coordinates(latitude=0.0, longitude=0.0),
                    address="Placeholder Address 2"
                )
            ] if len(stops) == 0 else stops,
            operator_id=db_entity.operator_id,
            is_active=db_entity.is_active,
            optimization_score=db_entity.optimization_score,
            estimated_travel_time=db_entity.estimated_travel_time
        )
    
    def _to_sqlalchemy(self, pydantic_entity: PydanticRoute) -> DBRoute:
        """Convert Pydantic Route to SQLAlchemy Route"""
        return DBRoute(
            id=pydantic_entity.id,
            name=pydantic_entity.name,
            description=pydantic_entity.description,
            operator_id=pydantic_entity.operator_id,
            is_active=pydantic_entity.is_active,
            optimization_score=pydantic_entity.optimization_score,
            estimated_travel_time=pydantic_entity.estimated_travel_time,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    
    def _update_sqlalchemy_from_pydantic(self, db_entity: DBRoute, pydantic_entity: PydanticRoute) -> None:
        """Update SQLAlchemy Route from Pydantic Route"""
        db_entity.name = pydantic_entity.name
        db_entity.description = pydantic_entity.description
        db_entity.operator_id = pydantic_entity.operator_id
        db_entity.is_active = pydantic_entity.is_active
        db_entity.optimization_score = pydantic_entity.optimization_score
        db_entity.estimated_travel_time = pydantic_entity.estimated_travel_time
        db_entity.updated_at = datetime.now(timezone.utc)
    
    def find_by_operator(self, operator_id: str) -> List[PydanticRoute]:
        """Find routes by operator ID"""
        try:
            db_entities = (
                self.session.query(DBRoute)
                .filter(DBRoute.operator_id == operator_id)
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding routes by operator '{operator_id}': {e}")
            raise RepositoryError(f"Failed to find routes by operator: {e}")
    
    def find_active_routes(self) -> List[PydanticRoute]:
        """Find all active routes"""
        try:
            db_entities = (
                self.session.query(DBRoute)
                .filter(DBRoute.is_active == True)
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding active routes: {e}")
            raise RepositoryError(f"Failed to find active routes: {e}")
    
    def find_by_stops(self, origin_stop_id: str, destination_stop_id: str) -> List[PydanticRoute]:
        """Find routes connecting two stops"""
        try:
            # Find routes that contain both stops
            routes_with_origin = (
                self.session.query(DBRoute.id)
                .join(route_stops, DBRoute.id == route_stops.c.route_id)
                .filter(route_stops.c.bus_stop_id == origin_stop_id)
                .subquery()
            )
            
            routes_with_destination = (
                self.session.query(DBRoute.id)
                .join(route_stops, DBRoute.id == route_stops.c.route_id)
                .filter(route_stops.c.bus_stop_id == destination_stop_id)
                .subquery()
            )
            
            db_entities = (
                self.session.query(DBRoute)
                .filter(
                    and_(
                        DBRoute.id.in_(routes_with_origin),
                        DBRoute.id.in_(routes_with_destination)
                    )
                )
                .all()
            )
            
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding routes between stops: {e}")
            raise RepositoryError(f"Failed to find routes between stops: {e}")
    
    def add_stop_to_route(self, route_id: str, stop_id: str, order: int) -> bool:
        """Add a stop to a route at specified order"""
        try:
            # Check if route and stop exist
            route_exists = self.session.query(DBRoute).filter_by(id=route_id).first() is not None
            stop_exists = self.session.query(DBBusStop).filter_by(id=stop_id).first() is not None
            
            if not route_exists:
                raise NotFoundError("Route", route_id)
            if not stop_exists:
                raise NotFoundError("BusStop", stop_id)
            
            # Insert route-stop association
            self.session.execute(
                route_stops.insert().values(
                    route_id=route_id,
                    bus_stop_id=stop_id,
                    stop_order=order,
                    created_at=datetime.now(timezone.utc)
                )
            )
            self.session.flush()
            return True
        except NotFoundError:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error adding stop to route: {e}")
            raise RepositoryError(f"Failed to add stop to route: {e}")
    
    def remove_stop_from_route(self, route_id: str, stop_id: str) -> bool:
        """Remove a stop from a route"""
        try:
            result = self.session.execute(
                route_stops.delete().where(
                    and_(
                        route_stops.c.route_id == route_id,
                        route_stops.c.bus_stop_id == stop_id
                    )
                )
            )
            self.session.flush()
            return result.rowcount > 0
        except SQLAlchemyError as e:
            logger.error(f"Error removing stop from route: {e}")
            raise RepositoryError(f"Failed to remove stop from route: {e}")
    
    def get_route_stops_ordered(self, route_id: str) -> List[PydanticBusStop]:
        """Get route stops in correct order"""
        try:
            # Query stops with their order
            stops_query = (
                self.session.query(DBBusStop, route_stops.c.stop_order)
                .join(route_stops, DBBusStop.id == route_stops.c.bus_stop_id)
                .filter(route_stops.c.route_id == route_id)
                .order_by(route_stops.c.stop_order)
                .all()
            )
            
            # Convert to Pydantic models
            bus_stop_repo = BusStopRepository(self.session)
            return [bus_stop_repo._to_pydantic(stop) for stop, order in stops_query]
        except SQLAlchemyError as e:
            logger.error(f"Error getting ordered route stops: {e}")
            raise RepositoryError(f"Failed to get ordered route stops: {e}")
    
    def create_route_with_stops(self, route: PydanticRoute) -> PydanticRoute:
        """Create a route and add its stops in the correct order"""
        try:
            # First create the route without stops
            db_route = DBRoute(
                id=route.id,
                name=route.name,
                description=route.description,
                operator_id=route.operator_id,
                is_active=route.is_active,
                optimization_score=route.optimization_score,
                estimated_travel_time=route.estimated_travel_time,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            self.session.add(db_route)
            self.session.flush()  # Get the route ID
            
            # Add stops to the route
            for i, stop in enumerate(route.stops):
                self.add_stop_to_route(db_route.id, stop.id, i + 1)
            
            # Return the complete route
            return self._to_pydantic(db_route)
            
        except SQLAlchemyError as e:
            logger.error(f"Error creating route with stops: {e}")
            raise RepositoryError(f"Failed to create route with stops: {e}")
    
    def validate_route_data(self, route: PydanticRoute) -> Dict[str, Any]:
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }
        
        try:
            # Validate minimum stops requirement
            if len(route.stops) < 2:
                validation_result["is_valid"] = False
                validation_result["errors"].append("Route must have at least 2 stops")
            
            # Validate travel time is reasonable
            if route.estimated_travel_time <= 0:
                validation_result["is_valid"] = False
                validation_result["errors"].append("Estimated travel time must be positive")
            elif route.estimated_travel_time > 1440:  # 24 hours
                validation_result["warnings"].append("Travel time exceeds 24 hours")
            
            # Validate optimization score range
            if route.optimization_score < 0 or route.optimization_score > 100:
                validation_result["warnings"].append("Optimization score should be between 0 and 100")
            
            # Validate stop coordinates are reasonable
            for i, stop in enumerate(route.stops):
                if not (-90 <= stop.coordinates.latitude <= 90):
                    validation_result["is_valid"] = False
                    validation_result["errors"].append(f"Stop {i+1} has invalid latitude: {stop.coordinates.latitude}")
                
                if not (-180 <= stop.coordinates.longitude <= 180):
                    validation_result["is_valid"] = False
                    validation_result["errors"].append(f"Stop {i+1} has invalid longitude: {stop.coordinates.longitude}")
            
            # Check for duplicate stops
            stop_ids = [stop.id for stop in route.stops]
            if len(stop_ids) != len(set(stop_ids)):
                validation_result["warnings"].append("Route contains duplicate stops")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating route data: {e}")
            return {
                "is_valid": False,
                "errors": [f"Validation error: {e}"],
                "warnings": []
            }

class UserRepository(BaseRepository[PydanticUser, DBUser], IUserRepository):
    """User repository implementation"""
    
    def __init__(self, session: Session):
        super().__init__(session, PydanticUser, DBUser)
    
    def _to_pydantic(self, db_entity: DBUser) -> PydanticUser:
        """Convert SQLAlchemy User to Pydantic User"""
        return PydanticUser(
            id=db_entity.id,
            email=db_entity.email,
            role=db_entity.role,
            profile=db_entity.profile
        )
    
    def _to_sqlalchemy(self, pydantic_entity: PydanticUser) -> DBUser:
        """Convert Pydantic User to SQLAlchemy User"""
        return DBUser(
            id=pydantic_entity.id,
            email=pydantic_entity.email,
            role=pydantic_entity.role.value if hasattr(pydantic_entity.role, 'value') else pydantic_entity.role,
            profile=pydantic_entity.profile.dict() if hasattr(pydantic_entity.profile, 'dict') else pydantic_entity.profile,
            created_at=datetime.now(timezone.utc),
            last_login_at=datetime.now(timezone.utc)
        )
    
    def _update_sqlalchemy_from_pydantic(self, db_entity: DBUser, pydantic_entity: PydanticUser) -> None:
        """Update SQLAlchemy User from Pydantic User"""
        db_entity.email = pydantic_entity.email
        db_entity.role = pydantic_entity.role.value if hasattr(pydantic_entity.role, 'value') else pydantic_entity.role
        db_entity.profile = pydantic_entity.profile.dict() if hasattr(pydantic_entity.profile, 'dict') else pydantic_entity.profile
    
    def find_by_email(self, email: str) -> Optional[PydanticUser]:
        """Find user by email address"""
        try:
            db_entity = self.session.query(DBUser).filter_by(email=email).first()
            return self._to_pydantic(db_entity) if db_entity else None
        except SQLAlchemyError as e:
            logger.error(f"Error finding user by email '{email}': {e}")
            raise RepositoryError(f"Failed to find user by email: {e}")
    
    def find_by_role(self, role: str) -> List[PydanticUser]:
        """Find users by role"""
        try:
            db_entities = self.session.query(DBUser).filter_by(role=role).all()
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding users by role '{role}': {e}")
            raise RepositoryError(f"Failed to find users by role: {e}")
    
    def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp"""
        try:
            result = (
                self.session.query(DBUser)
                .filter_by(id=user_id)
                .update({"last_login_at": datetime.now(timezone.utc)})
            )
            self.session.flush()
            return result > 0
        except SQLAlchemyError as e:
            logger.error(f"Error updating last login for user '{user_id}': {e}")
            raise RepositoryError(f"Failed to update last login: {e}")


# Placeholder implementations for PopulationDataRepository and OptimizationResultRepository
class PopulationDataRepository(BaseRepository[PydanticPopulationData, DBPopulationData], IPopulationDataRepository):
    """Population density data repository implementation"""
    
    def __init__(self, session: Session):
        super().__init__(session, PydanticPopulationData, DBPopulationData)
    
    def _to_pydantic(self, db_entity: DBPopulationData) -> PydanticPopulationData:
        """Convert SQLAlchemy PopulationData to Pydantic PopulationData"""
        # Simplified implementation - full implementation would handle density points
        return PydanticPopulationData(
            id=db_entity.id,
            region=db_entity.region,
            coordinates=GeoBounds(
                north=db_entity.north_bound,
                south=db_entity.south_bound,
                east=db_entity.east_bound,
                west=db_entity.west_bound
            ),
            density_points=[],  # Simplified for now
            data_source=db_entity.data_source,
            collected_at=db_entity.collected_at
        )
    
    def _to_sqlalchemy(self, pydantic_entity: PydanticPopulationData) -> DBPopulationData:
        """Convert Pydantic PopulationData to SQLAlchemy PopulationData"""
        return DBPopulationData(
            id=pydantic_entity.id,
            region=pydantic_entity.region,
            data_source=pydantic_entity.data_source,
            collected_at=pydantic_entity.collected_at,
            north_bound=pydantic_entity.coordinates.north,
            south_bound=pydantic_entity.coordinates.south,
            east_bound=pydantic_entity.coordinates.east,
            west_bound=pydantic_entity.coordinates.west,
            created_at=datetime.now(timezone.utc)
        )
    
    def _update_sqlalchemy_from_pydantic(self, db_entity: DBPopulationData, pydantic_entity: PydanticPopulationData) -> None:
        """Update SQLAlchemy PopulationData from Pydantic PopulationData"""
        db_entity.region = pydantic_entity.region
        db_entity.data_source = pydantic_entity.data_source
        db_entity.collected_at = pydantic_entity.collected_at
        db_entity.north_bound = pydantic_entity.coordinates.north
        db_entity.south_bound = pydantic_entity.coordinates.south
        db_entity.east_bound = pydantic_entity.coordinates.east
        db_entity.west_bound = pydantic_entity.coordinates.west
    
    def find_by_region(self, region: str) -> List[PydanticPopulationData]:
        """Find population data by region"""
        return self.find_by_field("region", region)
    
    def find_by_bounds(self, north: float, south: float, east: float, west: float) -> List[PydanticPopulationData]:
        """Find population data within geographic bounds"""
        try:
            db_entities = (
                self.session.query(DBPopulationData)
                .filter(
                    and_(
                        DBPopulationData.north_bound <= north,
                        DBPopulationData.south_bound >= south,
                        DBPopulationData.east_bound <= east,
                        DBPopulationData.west_bound >= west
                    )
                )
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding population data by bounds: {e}")
            raise RepositoryError(f"Failed to find population data by bounds: {e}")
    
    def find_by_data_source(self, data_source: str) -> List[PydanticPopulationData]:
        """Find population data by data source"""
        return self.find_by_field("data_source", data_source)


class OptimizationResultRepository(BaseRepository[PydanticOptimizationResult, DBOptimizationResult], IOptimizationResultRepository):
    """Optimization result repository implementation"""
    
    def __init__(self, session: Session):
        super().__init__(session, PydanticOptimizationResult, DBOptimizationResult)
    
    def _to_pydantic(self, db_entity: DBOptimizationResult) -> PydanticOptimizationResult:
        """Convert SQLAlchemy OptimizationResult to Pydantic OptimizationResult"""
        # Simplified implementation
        from models.serialization import deserialize_model
        
        # Deserialize the optimized route data
        optimized_route = deserialize_model(PydanticRoute, db_entity.optimized_route_data, 'dict')
        
        # Create metrics
        metrics = OptimizationMetrics(
            time_improvement=db_entity.time_improvement,
            distance_reduction=db_entity.distance_reduction,
            passenger_coverage_increase=db_entity.passenger_coverage_increase,
            cost_savings=db_entity.cost_savings
        )
        
        # Get population data (simplified)
        population_data = PydanticPopulationData(
            id="placeholder",
            region="placeholder",
            coordinates=GeoBounds(north=0, south=0, east=0, west=0),
            density_points=[],
            data_source="placeholder"
        )
        
        return PydanticOptimizationResult(
            id=db_entity.id,
            original_route_id=db_entity.original_route_id,
            optimized_route=optimized_route,
            metrics=metrics,
            population_data=population_data,
            generated_at=db_entity.generated_at
        )
    
    def _to_sqlalchemy(self, pydantic_entity: PydanticOptimizationResult) -> DBOptimizationResult:
        """Convert Pydantic OptimizationResult to SQLAlchemy OptimizationResult"""
        from models.serialization import serialize_model
        
        return DBOptimizationResult(
            id=pydantic_entity.id,
            original_route_id=pydantic_entity.original_route_id,
            population_data_id=pydantic_entity.population_data.id,
            optimized_route_data=serialize_model(pydantic_entity.optimized_route, 'dict'),
            time_improvement=pydantic_entity.metrics.time_improvement,
            distance_reduction=pydantic_entity.metrics.distance_reduction,
            passenger_coverage_increase=pydantic_entity.metrics.passenger_coverage_increase,
            cost_savings=pydantic_entity.metrics.cost_savings,
            generated_at=pydantic_entity.generated_at,
            created_at=datetime.now(timezone.utc)
        )
    
    def _update_sqlalchemy_from_pydantic(self, db_entity: DBOptimizationResult, pydantic_entity: PydanticOptimizationResult) -> None:
        """Update SQLAlchemy OptimizationResult from Pydantic OptimizationResult"""
        from models.serialization import serialize_model
        
        db_entity.optimized_route_data = serialize_model(pydantic_entity.optimized_route, 'dict')
        db_entity.time_improvement = pydantic_entity.metrics.time_improvement
        db_entity.distance_reduction = pydantic_entity.metrics.distance_reduction
        db_entity.passenger_coverage_increase = pydantic_entity.metrics.passenger_coverage_increase
        db_entity.cost_savings = pydantic_entity.metrics.cost_savings
        db_entity.generated_at = pydantic_entity.generated_at
    
    def find_by_route(self, route_id: str) -> List[PydanticOptimizationResult]:
        """Find optimization results for a route"""
        return self.find_by_field("original_route_id", route_id)
    
    def find_recent_results(self, days: int = 30) -> List[PydanticOptimizationResult]:
        """Find optimization results from recent days"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timezone.timedelta(days=days)
            db_entities = (
                self.session.query(DBOptimizationResult)
                .filter(DBOptimizationResult.generated_at >= cutoff_date)
                .order_by(DBOptimizationResult.generated_at.desc())
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error finding recent optimization results: {e}")
            raise RepositoryError(f"Failed to find recent optimization results: {e}")
    
    def get_best_result_for_route(self, route_id: str) -> Optional[PydanticOptimizationResult]:
        """Get the best optimization result for a route"""
        try:
            db_entity = (
                self.session.query(DBOptimizationResult)
                .filter(DBOptimizationResult.original_route_id == route_id)
                .order_by(DBOptimizationResult.time_improvement.desc())
                .first()
            )
            return self._to_pydantic(db_entity) if db_entity else None
        except SQLAlchemyError as e:
            logger.error(f"Error finding best optimization result for route '{route_id}': {e}")
            raise RepositoryError(f"Failed to find best optimization result: {e}")