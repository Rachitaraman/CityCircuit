"""
Population density data models for CityCircuit ML Service
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List
from datetime import datetime, timezone

from .base import BaseModelWithId, Coordinates, GeoBounds


class DemographicData(BaseModel):
    """Demographic information for a population density point"""
    model_config = ConfigDict(populate_by_name=True)
    
    age_groups: Dict[str, float] = Field(
        default_factory=dict, 
        description="Population distribution by age groups",
        alias="ageGroups"
    )
    economic_indicators: Dict[str, float] = Field(
        default_factory=dict, 
        description="Economic indicators for the area",
        alias="economicIndicators"
    )


class DensityPoint(BaseModel):
    """Individual population density data point"""
    model_config = ConfigDict(populate_by_name=True)
    
    coordinates: Coordinates = Field(..., description="Geographic coordinates of the density point")
    population: int = Field(..., ge=0, description="Population count at this point")
    demographic_data: DemographicData = Field(
        default_factory=DemographicData, 
        description="Demographic breakdown",
        alias="demographicData"
    )


class PopulationDensityData(BaseModelWithId):
    """Complete population density dataset for a region"""
    model_config = ConfigDict(populate_by_name=True)
    
    region: str = Field(..., min_length=1, max_length=200, description="Region name or identifier")
    coordinates: GeoBounds = Field(..., description="Geographic bounds of the dataset")
    density_points: List[DensityPoint] = Field(
        default_factory=list, 
        description="List of population density points",
        alias="densityPoints"
    )
    data_source: str = Field(
        ..., 
        min_length=1, 
        max_length=200, 
        description="Source of the population data",
        alias="dataSource"
    )
    collected_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        description="Data collection timestamp",
        alias="collectedAt"
    )
    
    def get_total_population(self) -> int:
        """Calculate total population across all density points"""
        return sum(point.population for point in self.density_points)
    
    def get_population_in_bounds(self, bounds: GeoBounds) -> int:
        """Calculate population within specific geographic bounds"""
        total = 0
        for point in self.density_points:
            coords = point.coordinates
            if (bounds.south <= coords.latitude <= bounds.north and 
                bounds.west <= coords.longitude <= bounds.east):
                total += point.population
        return total
    
    def get_density_points_near_coordinates(self, center: Coordinates, radius_km: float) -> List[DensityPoint]:
        """Get density points within a specified radius of coordinates"""
        # Simple approximation: 1 degree ≈ 111 km
        radius_degrees = radius_km / 111.0
        
        nearby_points = []
        for point in self.density_points:
            lat_diff = abs(point.coordinates.latitude - center.latitude)
            lon_diff = abs(point.coordinates.longitude - center.longitude)
            
            # Simple distance approximation
            if lat_diff <= radius_degrees and lon_diff <= radius_degrees:
                nearby_points.append(point)
        
        return nearby_points