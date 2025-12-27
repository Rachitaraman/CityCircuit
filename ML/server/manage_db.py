#!/usr/bin/env python3
"""
Database management script for CityCircuit ML Service
Provides utilities for database creation, migration, and management.
"""

import os
import sys
import argparse
import logging
from typing import Optional

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import text
from dotenv import load_dotenv

from database.config import DatabaseConfig, get_database_url
from database.connection import DatabaseManager
from database.models import Base

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_database(config: Optional[DatabaseConfig] = None) -> bool:
    """
    Create the database if it doesn't exist
    
    Args:
        config: Database configuration
        
    Returns:
        True if database was created or already exists, False on error
    """
    if config is None:
        config = DatabaseConfig.from_env()
    
    try:
        # Connect to PostgreSQL server (not to specific database)
        conn = psycopg2.connect(
            host=config.host,
            port=config.port,
            user=config.username,
            password=config.password,
            database='postgres'  # Connect to default postgres database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
            (config.database,)
        )
        
        if cursor.fetchone():
            logger.info(f"Database '{config.database}' already exists")
            return True
        
        # Create database
        cursor.execute(f'CREATE DATABASE "{config.database}"')
        logger.info(f"Created database '{config.database}'")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        logger.error(f"Failed to create database: {e}")
        return False


def drop_database(config: Optional[DatabaseConfig] = None) -> bool:
    """
    Drop the database if it exists
    
    Args:
        config: Database configuration
        
    Returns:
        True if database was dropped or doesn't exist, False on error
    """
    if config is None:
        config = DatabaseConfig.from_env()
    
    try:
        # Connect to PostgreSQL server (not to specific database)
        conn = psycopg2.connect(
            host=config.host,
            port=config.port,
            user=config.username,
            password=config.password,
            database='postgres'  # Connect to default postgres database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Terminate existing connections to the database
        cursor.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = %s AND pid <> pg_backend_pid()
        """, (config.database,))
        
        # Drop database
        cursor.execute(f'DROP DATABASE IF EXISTS "{config.database}"')
        logger.info(f"Dropped database '{config.database}'")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        logger.error(f"Failed to drop database: {e}")
        return False


def create_tables(config: Optional[DatabaseConfig] = None) -> bool:
    """
    Create all tables using SQLAlchemy
    
    Args:
        config: Database configuration
        
    Returns:
        True if tables were created successfully, False on error
    """
    try:
        db_manager = DatabaseManager(config)
        
        # Create all tables
        Base.metadata.create_all(db_manager.engine)
        logger.info("Created all database tables")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        return False


def test_connection(config: Optional[DatabaseConfig] = None) -> bool:
    """
    Test database connection
    
    Args:
        config: Database configuration
        
    Returns:
        True if connection successful, False otherwise
    """
    try:
        db_manager = DatabaseManager(config)
        return db_manager.test_connection()
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False


def show_status(config: Optional[DatabaseConfig] = None) -> None:
    """
    Show database status and configuration
    
    Args:
        config: Database configuration
    """
    if config is None:
        config = DatabaseConfig.from_env()
    
    print(f"Database Configuration:")
    print(f"  Host: {config.host}")
    print(f"  Port: {config.port}")
    print(f"  Database: {config.database}")
    print(f"  Username: {config.username}")
    print(f"  Pool Size: {config.pool_size}")
    print(f"  Max Overflow: {config.max_overflow}")
    
    # Test connection
    if test_connection(config):
        print(f"  Status: ✓ Connected")
        
        try:
            db_manager = DatabaseManager(config)
            with db_manager.get_session() as session:
                # Get table count - different query for SQLite vs PostgreSQL
                if config.database_type.lower() == 'sqlite':
                    result = session.execute(text("""
                        SELECT COUNT(*) 
                        FROM sqlite_master 
                        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                    """))
                else:
                    result = session.execute(text("""
                        SELECT COUNT(*) 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """))
                table_count = result.scalar()
                print(f"  Tables: {table_count}")
                
        except Exception as e:
            print(f"  Tables: Error getting count - {e}")
    else:
        print(f"  Status: ✗ Connection failed")


def reset_database(config: Optional[DatabaseConfig] = None) -> bool:
    """
    Reset database (drop and recreate)
    
    Args:
        config: Database configuration
        
    Returns:
        True if reset successful, False on error
    """
    logger.info("Resetting database...")
    
    if not drop_database(config):
        return False
    
    if not create_database(config):
        return False
    
    if not create_tables(config):
        return False
    
    logger.info("Database reset completed successfully")
    return True


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='CityCircuit Database Management')
    parser.add_argument('command', choices=[
        'create', 'drop', 'reset', 'tables', 'test', 'status'
    ], help='Database command to execute')
    
    args = parser.parse_args()
    
    config = DatabaseConfig.from_env()
    
    if args.command == 'create':
        success = create_database(config)
    elif args.command == 'drop':
        success = drop_database(config)
    elif args.command == 'reset':
        success = reset_database(config)
    elif args.command == 'tables':
        success = create_tables(config)
    elif args.command == 'test':
        success = test_connection(config)
    elif args.command == 'status':
        show_status(config)
        return
    
    if success:
        logger.info(f"Command '{args.command}' completed successfully")
        sys.exit(0)
    else:
        logger.error(f"Command '{args.command}' failed")
        sys.exit(1)


if __name__ == '__main__':
    main()