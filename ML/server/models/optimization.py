"""
Route optimization result models for CityCircuit ML Service
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone

from .base import BaseModelWithId
from .route import Route
from .population import PopulationDensityData


class OptimizationMetrics(BaseModel):
    """Metrics showing the improvement from route optimization"""
    model_config = ConfigDict(populate_by_name=True)
    
    time_improvement: float = Field(
        ..., 
        ge=0, 
        description="Percentage improvement in travel time",
        alias="timeImprovement"
    )
    distance_reduction: float = Field(
        ..., 
        ge=0, 
        description="Percentage reduction in total distance",
        alias="distanceReduction"
    )
    passenger_coverage_increase: float = Field(
        ..., 
        ge=0, 
        description="Percentage increase in passenger coverage",
        alias="passengerCoverageIncrease"
    )
    cost_savings: float = Field(
        ..., 
        ge=0, 
        description="Estimated monetary savings",
        alias="costSavings"
    )
    
    def get_overall_score(self) -> float:
        """Calculate an overall optimization score based on all metrics"""
        # Weighted average of improvements (weights can be adjusted based on priorities)
        weights = {
            'time': 0.3,
            'distance': 0.2,
            'coverage': 0.3,
            'cost': 0.2
        }
        
        score = (
            self.time_improvement * weights['time'] +
            self.distance_reduction * weights['distance'] +
            self.passenger_coverage_increase * weights['coverage'] +
            min(self.cost_savings, 100) * weights['cost']  # Cap cost savings at 100% for scoring
        )
        
        return min(score, 100.0)  # Cap at 100%


class OptimizationResult(BaseModelWithId):
    """Complete result of a route optimization process"""
    model_config = ConfigDict(populate_by_name=True)
    
    original_route_id: str = Field(
        ..., 
        description="ID of the original route that was optimized",
        alias="originalRouteId"
    )
    optimized_route: Route = Field(
        ..., 
        description="The optimized route with improved stops and timing",
        alias="optimizedRoute"
    )
    metrics: OptimizationMetrics = Field(..., description="Optimization improvement metrics")
    population_data: PopulationDensityData = Field(
        ..., 
        description="Population data used for optimization",
        alias="populationData"
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        description="Timestamp when optimization was completed",
        alias="generatedAt"
    )
    
    def is_improvement(self, threshold: float = 5.0) -> bool:
        """Check if the optimization shows significant improvement"""
        overall_score = self.metrics.get_overall_score()
        return overall_score >= threshold
    
    def get_summary(self) -> dict:
        """Get a summary of the optimization results"""
        return {
            'original_route_id': self.original_route_id,
            'optimized_route_name': self.optimized_route.name,
            'overall_score': self.metrics.get_overall_score(),
            'time_improvement': self.metrics.time_improvement,
            'distance_reduction': self.metrics.distance_reduction,
            'passenger_coverage_increase': self.metrics.passenger_coverage_increase,
            'cost_savings': self.metrics.cost_savings,
            'generated_at': self.generated_at.isoformat(),
            'is_significant_improvement': self.is_improvement()
        }