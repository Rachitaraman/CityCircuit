"""
Database configuration for CityCircuit ML Service
"""

import os
from dataclasses import dataclass
from typing import Optional
from urllib.parse import quote_plus


@dataclass
class DatabaseConfig:
    """Database configuration settings"""
    database_type: str = "postgresql"  # postgresql or sqlite
    host: str = "localhost"
    port: int = 5432
    database: str = "citycircuit"
    username: str = "citycircuit_user"
    password: str = "citycircuit_password"
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False
    
    @classmethod
    def from_env(cls) -> 'DatabaseConfig':
        """Create configuration from environment variables"""
        return cls(
            database_type=os.getenv('DB_TYPE', 'postgresql'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '5432')),
            database=os.getenv('DB_NAME', 'citycircuit'),
            username=os.getenv('DB_USER', 'citycircuit_user'),
            password=os.getenv('DB_PASSWORD', 'citycircuit_password'),
            pool_size=int(os.getenv('DB_POOL_SIZE', '10')),
            max_overflow=int(os.getenv('DB_MAX_OVERFLOW', '20')),
            pool_timeout=int(os.getenv('DB_POOL_TIMEOUT', '30')),
            pool_recycle=int(os.getenv('DB_POOL_RECYCLE', '3600')),
            echo=os.getenv('DB_ECHO', 'false').lower() == 'true'
        )


def get_database_url(config: Optional[DatabaseConfig] = None) -> str:
    """
    Generate database URL from configuration
    
    Args:
        config: Database configuration. If None, loads from environment.
        
    Returns:
        Database connection URL
    """
    if config is None:
        config = DatabaseConfig.from_env()
    
    if config.database_type.lower() == 'sqlite':
        # SQLite database URL
        db_path = os.path.join(os.getcwd(), f"{config.database}.db")
        return f"sqlite:///{db_path}"
    else:
        # PostgreSQL database URL
        # URL encode password to handle special characters
        encoded_password = quote_plus(config.password)
        
        return (
            f"postgresql://{config.username}:{encoded_password}@"
            f"{config.host}:{config.port}/{config.database}"
        )


def get_test_database_url(config: Optional[DatabaseConfig] = None) -> str:
    """
    Generate test database URL (appends _test to database name)
    
    Args:
        config: Database configuration. If None, loads from environment.
        
    Returns:
        Test database connection URL
    """
    if config is None:
        config = DatabaseConfig.from_env()
    
    if config.database_type.lower() == 'sqlite':
        # SQLite test database URL
        db_path = os.path.join(os.getcwd(), f"{config.database}_test.db")
        return f"sqlite:///{db_path}"
    else:
        # PostgreSQL test database URL
        # Create test config with modified database name
        test_config = DatabaseConfig(
            database_type=config.database_type,
            host=config.host,
            port=config.port,
            database=f"{config.database}_test",
            username=config.username,
            password=config.password,
            pool_size=config.pool_size,
            max_overflow=config.max_overflow,
            pool_timeout=config.pool_timeout,
            pool_recycle=config.pool_recycle,
            echo=config.echo
        )
        
        return get_database_url(test_config)