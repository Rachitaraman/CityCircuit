"""
Unit of Work pattern implementation for CityCircuit ML Service
Manages database transactions and repository coordination
"""

import logging
from typing import Optional
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database.connection import get_db_context
from .implementations import (
    BusStopRepository, RouteRepository, UserRepository,
    PopulationDataRepository, OptimizationResultRepository
)
from .exceptions import TransactionError

logger = logging.getLogger(__name__)


class UnitOfWork:
    """
    Unit of Work pattern implementation
    Coordinates multiple repositories and manages transactions
    """
    
    def __init__(self, session: Optional[Session] = None):
        """
        Initialize Unit of Work
        
        Args:
            session: Optional database session. If None, will create new session.
        """
        self._session = session
        self._own_session = session is None
        
        # Repository instances
        self._bus_stops: Optional[BusStopRepository] = None
        self._routes: Optional[RouteRepository] = None
        self._users: Optional[UserRepository] = None
        self._population_data: Optional[PopulationDataRepository] = None
        self._optimization_results: Optional[OptimizationResultRepository] = None
    
    @property
    def session(self) -> Session:
        """Get the database session"""
        if self._session is None:
            raise RuntimeError("Unit of Work not initialized with session")
        return self._session
    
    @property
    def bus_stops(self) -> BusStopRepository:
        """Get bus stops repository"""
        if self._bus_stops is None:
            self._bus_stops = BusStopRepository(self.session)
        return self._bus_stops
    
    @property
    def routes(self) -> RouteRepository:
        """Get routes repository"""
        if self._routes is None:
            self._routes = RouteRepository(self.session)
        return self._routes
    
    @property
    def users(self) -> UserRepository:
        """Get users repository"""
        if self._users is None:
            self._users = UserRepository(self.session)
        return self._users
    
    @property
    def population_data(self) -> PopulationDataRepository:
        """Get population data repository"""
        if self._population_data is None:
            self._population_data = PopulationDataRepository(self.session)
        return self._population_data
    
    @property
    def optimization_results(self) -> OptimizationResultRepository:
        """Get optimization results repository"""
        if self._optimization_results is None:
            self._optimization_results = OptimizationResultRepository(self.session)
        return self._optimization_results
    
    def commit(self) -> None:
        """Commit the current transaction"""
        try:
            self.session.commit()
            logger.debug("Transaction committed successfully")
        except SQLAlchemyError as e:
            logger.error(f"Error committing transaction: {e}")
            self.rollback()
            raise TransactionError(f"Failed to commit transaction: {e}")
    
    def rollback(self) -> None:
        """Rollback the current transaction"""
        try:
            self.session.rollback()
            logger.debug("Transaction rolled back")
        except SQLAlchemyError as e:
            logger.error(f"Error rolling back transaction: {e}")
            raise TransactionError(f"Failed to rollback transaction: {e}")
    
    def flush(self) -> None:
        """Flush pending changes to database without committing"""
        try:
            self.session.flush()
            logger.debug("Session flushed successfully")
        except SQLAlchemyError as e:
            logger.error(f"Error flushing session: {e}")
            raise TransactionError(f"Failed to flush session: {e}")
    
    def __enter__(self):
        """Enter context manager"""
        if self._own_session:
            # Create new session context
            self._session_context = get_db_context()
            self._session = self._session_context.__enter__()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager"""
        if self._own_session and hasattr(self, '_session_context'):
            # Let the session context handle cleanup
            return self._session_context.__exit__(exc_type, exc_val, exc_tb)
        return False


@contextmanager
def get_unit_of_work():
    """
    Context manager for Unit of Work
    
    Usage:
        with get_unit_of_work() as uow:
            # Use repositories through uow
            user = uow.users.get_by_id("123")
            route = uow.routes.create(new_route)
            # Transaction is automatically committed on success
    """
    with UnitOfWork() as uow:
        yield uow