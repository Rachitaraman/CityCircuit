"""
Base repository implementation for CityCircuit ML Service
"""

import logging
from typing import List, Optional, Type, TypeVar, Generic
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError as SQLIntegrityError
from pydantic import BaseModel

from database.models import Base as SQLAlchemyBase
from .interfaces import IRepository
from .exceptions import RepositoryError, NotFoundError, IntegrityError, ValidationError

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)  # Pydantic model type
S = TypeVar('S', bound=SQLAlchemyBase)  # SQLAlchemy model type


class BaseRepository(IRepository[T], Generic[T, S]):
    """Base repository implementation with common CRUD operations"""
    
    def __init__(self, session: Session, pydantic_model: Type[T], sqlalchemy_model: Type[S]):
        """
        Initialize repository
        
        Args:
            session: Database session
            pydantic_model: Pydantic model class
            sqlalchemy_model: SQLAlchemy model class
        """
        self.session = session
        self.pydantic_model = pydantic_model
        self.sqlalchemy_model = sqlalchemy_model
    
    def get_by_id(self, entity_id: str) -> Optional[T]:
        """Get entity by ID"""
        try:
            db_entity = self.session.query(self.sqlalchemy_model).filter_by(id=entity_id).first()
            if db_entity is None:
                return None
            return self._to_pydantic(db_entity)
        except SQLAlchemyError as e:
            logger.error(f"Error getting {self.sqlalchemy_model.__name__} by ID {entity_id}: {e}")
            raise RepositoryError(f"Failed to get entity by ID: {e}")
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination"""
        try:
            db_entities = (
                self.session.query(self.sqlalchemy_model)
                .offset(skip)
                .limit(limit)
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except SQLAlchemyError as e:
            logger.error(f"Error getting all {self.sqlalchemy_model.__name__}: {e}")
            raise RepositoryError(f"Failed to get entities: {e}")
    
    def create(self, entity: T) -> T:
        """Create new entity"""
        try:
            db_entity = self._to_sqlalchemy(entity)
            self.session.add(db_entity)
            self.session.flush()  # Flush to get ID without committing
            return self._to_pydantic(db_entity)
        except SQLIntegrityError as e:
            logger.error(f"Integrity error creating {self.sqlalchemy_model.__name__}: {e}")
            raise IntegrityError(f"Failed to create entity due to integrity constraint: {e}")
        except SQLAlchemyError as e:
            logger.error(f"Error creating {self.sqlalchemy_model.__name__}: {e}")
            raise RepositoryError(f"Failed to create entity: {e}")
    
    def update(self, entity_id: str, entity: T) -> T:
        """Update existing entity"""
        try:
            db_entity = self.session.query(self.sqlalchemy_model).filter_by(id=entity_id).first()
            if db_entity is None:
                raise NotFoundError(self.sqlalchemy_model.__name__, entity_id)
            
            # Update fields from Pydantic model
            self._update_sqlalchemy_from_pydantic(db_entity, entity)
            self.session.flush()
            return self._to_pydantic(db_entity)
        except NotFoundError:
            raise
        except SQLIntegrityError as e:
            logger.error(f"Integrity error updating {self.sqlalchemy_model.__name__} {entity_id}: {e}")
            raise IntegrityError(f"Failed to update entity due to integrity constraint: {e}")
        except SQLAlchemyError as e:
            logger.error(f"Error updating {self.sqlalchemy_model.__name__} {entity_id}: {e}")
            raise RepositoryError(f"Failed to update entity: {e}")
    
    def delete(self, entity_id: str) -> bool:
        """Delete entity by ID"""
        try:
            db_entity = self.session.query(self.sqlalchemy_model).filter_by(id=entity_id).first()
            if db_entity is None:
                return False
            
            self.session.delete(db_entity)
            self.session.flush()
            return True
        except SQLAlchemyError as e:
            logger.error(f"Error deleting {self.sqlalchemy_model.__name__} {entity_id}: {e}")
            raise RepositoryError(f"Failed to delete entity: {e}")
    
    def exists(self, entity_id: str) -> bool:
        """Check if entity exists"""
        try:
            return self.session.query(self.sqlalchemy_model).filter_by(id=entity_id).first() is not None
        except SQLAlchemyError as e:
            logger.error(f"Error checking existence of {self.sqlalchemy_model.__name__} {entity_id}: {e}")
            raise RepositoryError(f"Failed to check entity existence: {e}")
    
    def _to_pydantic(self, db_entity: S) -> T:
        """Convert SQLAlchemy model to Pydantic model"""
        # This method should be overridden in concrete implementations
        # for proper model conversion
        raise NotImplementedError("Subclasses must implement _to_pydantic method")
    
    def _to_sqlalchemy(self, pydantic_entity: T) -> S:
        """Convert Pydantic model to SQLAlchemy model"""
        # This method should be overridden in concrete implementations
        # for proper model conversion
        raise NotImplementedError("Subclasses must implement _to_sqlalchemy method")
    
    def _update_sqlalchemy_from_pydantic(self, db_entity: S, pydantic_entity: T) -> None:
        """Update SQLAlchemy model fields from Pydantic model"""
        # This method should be overridden in concrete implementations
        # for proper field updates
        raise NotImplementedError("Subclasses must implement _update_sqlalchemy_from_pydantic method")
    
    def count(self) -> int:
        """Get total count of entities"""
        try:
            return self.session.query(self.sqlalchemy_model).count()
        except SQLAlchemyError as e:
            logger.error(f"Error counting {self.sqlalchemy_model.__name__}: {e}")
            raise RepositoryError(f"Failed to count entities: {e}")
    
    def find_by_field(self, field_name: str, value: any) -> List[T]:
        """Find entities by field value"""
        try:
            db_entities = (
                self.session.query(self.sqlalchemy_model)
                .filter(getattr(self.sqlalchemy_model, field_name) == value)
                .all()
            )
            return [self._to_pydantic(entity) for entity in db_entities]
        except AttributeError:
            raise ValidationError(f"Field '{field_name}' does not exist on {self.sqlalchemy_model.__name__}")
        except SQLAlchemyError as e:
            logger.error(f"Error finding {self.sqlalchemy_model.__name__} by {field_name}: {e}")
            raise RepositoryError(f"Failed to find entities by field: {e}")