"""
Database connection management for CityCircuit ML Service
"""

import logging
from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import create_engine, Engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError

from .config import DatabaseConfig, get_database_url

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and sessions"""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        """
        Initialize database manager
        
        Args:
            config: Database configuration. If None, loads from environment.
        """
        self.config = config or DatabaseConfig.from_env()
        self.database_url = get_database_url(self.config)
        self._engine: Optional[Engine] = None
        self._session_factory: Optional[sessionmaker] = None
    
    @property
    def engine(self) -> Engine:
        """Get or create database engine"""
        if self._engine is None:
            if self.config.database_type.lower() == 'sqlite':
                # SQLite configuration
                self._engine = create_engine(
                    self.database_url,
                    echo=self.config.echo,
                    pool_pre_ping=True,
                    connect_args={
                        "check_same_thread": False  # Allow SQLite to be used across threads
                    }
                )
            else:
                # PostgreSQL configuration
                self._engine = create_engine(
                    self.database_url,
                    poolclass=QueuePool,
                    pool_size=self.config.pool_size,
                    max_overflow=self.config.max_overflow,
                    pool_timeout=self.config.pool_timeout,
                    pool_recycle=self.config.pool_recycle,
                    echo=self.config.echo,
                    # Connection pool settings for PostgreSQL
                    pool_pre_ping=True,  # Verify connections before use
                    connect_args={
                        "options": "-c timezone=utc"  # Set timezone to UTC
                    }
                )
            
            logger.info(f"Created {self.config.database_type} database engine for {self.database_url}")
        
        return self._engine
    
    @property
    def session_factory(self) -> sessionmaker:
        """Get or create session factory"""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False
            )
        
        return self._session_factory
    
    def create_session(self) -> Session:
        """Create a new database session"""
        return self.session_factory()
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """
        Context manager for database sessions with automatic cleanup
        
        Yields:
            Database session
            
        Raises:
            SQLAlchemyError: If database operation fails
        """
        session = self.create_session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def test_connection(self) -> bool:
        """
        Test database connection
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            with self.get_session() as session:
                session.execute(text("SELECT 1"))
            logger.info("Database connection test successful")
            return True
        except SQLAlchemyError as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def close(self):
        """Close database connections"""
        if self._engine:
            self._engine.dispose()
            logger.info("Database connections closed")


# Global database manager instance
_db_manager: Optional[DatabaseManager] = None


def get_database_manager() -> DatabaseManager:
    """Get global database manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


def get_db_session() -> Session:
    """Get a new database session"""
    return get_database_manager().create_session()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager for database sessions"""
    with get_database_manager().get_session() as session:
        yield session