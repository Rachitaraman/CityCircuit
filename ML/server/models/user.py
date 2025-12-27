"""
User-related data models for CityCircuit ML Service
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from enum import Enum

from .base import BaseModelWithId


class UserRole(str, Enum):
    """User role enumeration"""
    OPERATOR = "operator"
    PASSENGER = "passenger"
    ADMIN = "admin"


class UserPreferences(BaseModel):
    """User preferences configuration"""
    language: str = Field(default="en", min_length=2, max_length=5, description="Language code")
    theme: str = Field(default="light", pattern="^(light|dark)$", description="UI theme preference")
    notifications: bool = Field(default=True, description="Enable notifications")
    map_style: str = Field(
        default="default", 
        pattern="^(default|satellite|terrain)$", 
        description="Preferred map style",
        alias="mapStyle"
    )


class UserProfile(BaseModel):
    """User profile information"""
    name: str = Field(..., min_length=1, max_length=100, description="User's full name")
    organization: Optional[str] = Field(None, max_length=200, description="Organization name")
    preferences: UserPreferences = Field(default_factory=UserPreferences, description="User preferences")


class User(BaseModelWithId):
    """Complete user model"""
    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)
    
    email: str = Field(..., description="User's email address")
    role: UserRole = Field(..., description="User's role in the system")
    profile: UserProfile = Field(..., description="User profile information")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Account creation timestamp", alias="createdAt")
    last_login_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last login timestamp", alias="lastLoginAt")