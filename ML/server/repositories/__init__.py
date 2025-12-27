"""
Repository pattern implementation for CityCircuit ML Service
Provides data access layer with proper abstraction and error handling
"""

from .interfaces import (
    IRepository, IBusStopRepository, IRouteRepository, 
    IUserRepository, IPopulationDataRepository, IOptimizationResultRepository
)
from .implementations import (
    BusStopRepository, RouteRepository, UserRepository,
    PopulationDataRepository, OptimizationResultRepository
)
from .unit_of_work import UnitOfWork, get_unit_of_work
from .exceptions import RepositoryError, ValidationError, NotFoundError

__all__ = [
    # Interfaces
    'IRepository',
    'IBusStopRepository', 
    'IRouteRepository',
    'IUserRepository',
    'IPopulationDataRepository',
    'IOptimizationResultRepository',
    
    # Implementations
    'BusStopRepository',
    'RouteRepository', 
    'UserRepository',
    'PopulationDataRepository',
    'OptimizationResultRepository',
    
    # Unit of Work
    'UnitOfWork',
    'get_unit_of_work',
    
    # Exceptions
    'RepositoryError',
    'ValidationError',
    'NotFoundError'
]