"""
Repository exceptions for CityCircuit ML Service
"""


class RepositoryError(Exception):
    """Base exception for repository operations"""
    pass


class ValidationError(RepositoryError):
    """Raised when data validation fails"""
    def __init__(self, message: str, field: str = None, value=None):
        super().__init__(message)
        self.field = field
        self.value = value


class NotFoundError(RepositoryError):
    """Raised when requested entity is not found"""
    def __init__(self, entity_type: str, identifier: str):
        super().__init__(f"{entity_type} with identifier '{identifier}' not found")
        self.entity_type = entity_type
        self.identifier = identifier


class DuplicateError(RepositoryError):
    """Raised when attempting to create duplicate entity"""
    def __init__(self, entity_type: str, field: str, value: str):
        super().__init__(f"{entity_type} with {field} '{value}' already exists")
        self.entity_type = entity_type
        self.field = field
        self.value = value


class IntegrityError(RepositoryError):
    """Raised when database integrity constraints are violated"""
    pass


class TransactionError(RepositoryError):
    """Raised when transaction operations fail"""
    pass