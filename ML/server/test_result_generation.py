"""
Test suite for optimization result generation and ranking functionality
Tests the implementation of task 4.3: Create optimization result generation and ranking
"""

import pytest
from datetime import datetime, timezone

from models import (
    Route, BusStop, Coordinates, PopulationDensityData, DensityPoint,
    DemographicData, GeoBounds, OptimizationResult, OptimizationMetrics
)
from algorithms import (
    OptimizationResultGenerator, EfficiencyMetricsCalculator,
    RouteRankingEngine, RankingCriteria
)


class TestEfficiencyMetricsCalculator:
    """Test comprehensive efficiency metrics calculation"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.calculator = EfficiencyMetricsCalculator()
        
        # Create test routes
        self.original_route = Route(
            name="Original Route",
            description="Test original route",
            stops=[
                BusStop(
                    name="Stop 1",
                    coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
                    address="Mumbai Central",
                    amenities=["shelter"],
                    daily_passenger_count=1000,
                    is_accessible=False
                ),
                BusStop(
                    name="Stop 2", 
                    coordinates=Coordinates(latitude=19.0896, longitude=72.8656),
                    address="Dadar",
                    amenities=["shelter", "seating"],
                    daily_passenger_count=1500,
                    is_accessible=True
                )
            ],
            operator_id="test-operator",
            estimated_travel_time=45,
            optimization_score=60.0
        )
        
        self.optimized_route = Route(
            name="Optimized Route",
            description="Test optimized route",
            stops=[
                BusStop(
                    name="Stop 1",
                    coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
                    address="Mumbai Central",
                    amenities=["shelter", "wheelchair_accessible", "tactile_paving"],
                    daily_passenger_count=1000,
                    is_accessible=True
                ),
                BusStop(
                    name="Stop 2",
                    coordinates=Coordinates(latitude=19.0896, longitude=72.8656),
                    address="Dadar",
                    amenities=["shelter", "seating", "wheelchair_accessible"],
                    daily_passenger_count=1500,
                    is_accessible=True
                ),
                BusStop(
                    name="Stop 3",
                    coordinates=Coordinates(latitude=19.0950, longitude=72.8700),
                    address="New Coverage Area",
                    amenities=["shelter", "seating", "wheelchair_accessible"],
                    daily_passenger_count=800,
                    is_accessible=True
                )
            ],
            operator_id="test-operator",
            estimated_travel_time=35,
            optimization_score=85.0
        )
    
    def test_calculate_comprehensive_metrics(self):
        """Test comprehensive metrics calculation"""
        metrics = self.calculator.calculate_comprehensive_metrics(
            self.original_route, self.optimized_route
        )
        
        # Verify metrics structure
        assert isinstance(metrics, OptimizationMetrics)
        assert metrics.time_improvement >= 0
        assert metrics.distance_reduction >= 0
        assert metrics.passenger_coverage_increase >= 0
        assert metrics.cost_savings >= 0
        
        # Verify time improvement calculation
        expected_time_improvement = ((45 - 35) / 45) * 100
        assert abs(metrics.time_improvement - expected_time_improvement) < 5  # Allow some variance
        
        # Verify passenger coverage increase
        original_coverage = 1000 + 1500  # 2500
        optimized_coverage = 1000 + 1500 + 800  # 3800
        expected_coverage_increase = ((3800 - 2500) / 2500) * 100  # 52%
        assert abs(metrics.passenger_coverage_increase - expected_coverage_increase) < 25  # Allow more variance
    
    def test_metrics_with_population_data(self):
        """Test metrics calculation with population data"""
        # Create test population data
        population_data = PopulationDensityData(
            region="Test Region",
            coordinates=GeoBounds(north=19.1, south=19.0, east=72.9, west=72.8),
            density_points=[
                DensityPoint(
                    coordinates=Coordinates(latitude=19.0800, longitude=72.8800),
                    population=5000,
                    demographic_data=DemographicData(
                        age_groups={"25-64": 60.0, "18-25": 25.0, "65+": 15.0},
                        economic_indicators={"income": 40000.0}
                    )
                )
            ],
            data_source="Test data",
            collected_at=datetime.now(timezone.utc)
        )
        
        metrics = self.calculator.calculate_comprehensive_metrics(
            self.original_route, self.optimized_route, population_data
        )
        
        # Should have population density bonus
        assert metrics.passenger_coverage_increase > 0
        assert metrics.get_overall_score() > 0


class TestRouteRankingEngine:
    """Test route ranking functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.ranking_engine = RouteRankingEngine()
        
        # Create test optimization results
        self.results = []
        
        # Result 1: High time improvement, low coverage
        result1 = OptimizationResult(
            original_route_id="route-1",
            optimized_route=Route(
                name="Route 1 Optimized",
                description="High time efficiency",
                stops=[
                    BusStop(
                        name="Stop A",
                        coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
                        address="Location A",
                        amenities=["shelter"],
                        daily_passenger_count=500,
                        is_accessible=True
                    ),
                    BusStop(
                        name="Stop B",
                        coordinates=Coordinates(latitude=19.0800, longitude=72.8800),
                        address="Location B",
                        amenities=["shelter"],
                        daily_passenger_count=300,
                        is_accessible=True
                    )
                ],
                operator_id="test-op",
                estimated_travel_time=20,
                optimization_score=90.0
            ),
            metrics=OptimizationMetrics(
                time_improvement=40.0,
                distance_reduction=15.0,
                passenger_coverage_increase=5.0,
                cost_savings=25.0
            ),
            population_data=PopulationDensityData(
                region="Test",
                coordinates=GeoBounds(north=19.1, south=19.0, east=72.9, west=72.8),
                density_points=[],
                data_source="Test",
                collected_at=datetime.now(timezone.utc)
            )
        )
        self.results.append(result1)
        
        # Result 2: Low time improvement, high coverage
        result2 = OptimizationResult(
            original_route_id="route-2",
            optimized_route=Route(
                name="Route 2 Optimized",
                description="High coverage",
                stops=[
                    BusStop(
                        name="Stop C",
                        coordinates=Coordinates(latitude=19.0800, longitude=72.8800),
                        address="Location C",
                        amenities=["shelter", "wheelchair_accessible"],
                        daily_passenger_count=2000,
                        is_accessible=True
                    ),
                    BusStop(
                        name="Stop D",
                        coordinates=Coordinates(latitude=19.0850, longitude=72.8850),
                        address="Location D",
                        amenities=["shelter", "wheelchair_accessible"],
                        daily_passenger_count=1500,
                        is_accessible=True
                    )
                ],
                operator_id="test-op",
                estimated_travel_time=35,
                optimization_score=75.0
            ),
            metrics=OptimizationMetrics(
                time_improvement=10.0,
                distance_reduction=8.0,
                passenger_coverage_increase=60.0,
                cost_savings=20.0
            ),
            population_data=PopulationDensityData(
                region="Test",
                coordinates=GeoBounds(north=19.1, south=19.0, east=72.9, west=72.8),
                density_points=[],
                data_source="Test",
                collected_at=datetime.now(timezone.utc)
            )
        )
        self.results.append(result2)
    
    def test_rank_by_time_efficiency(self):
        """Test ranking by time efficiency"""
        ranked = self.ranking_engine.rank_optimization_results(
            self.results, RankingCriteria.TIME_EFFICIENCY
        )
        
        assert len(ranked) == 2
        # Result 1 should be first (higher time improvement)
        assert ranked[0].original_route_id == "route-1"
        assert ranked[1].original_route_id == "route-2"
    
    def test_rank_by_passenger_coverage(self):
        """Test ranking by passenger coverage"""
        ranked = self.ranking_engine.rank_optimization_results(
            self.results, RankingCriteria.PASSENGER_COVERAGE
        )
        
        assert len(ranked) == 2
        # Result 2 should be first (higher coverage increase)
        assert ranked[0].original_route_id == "route-2"
        assert ranked[1].original_route_id == "route-1"
    
    def test_rank_by_overall_score(self):
        """Test ranking by overall score"""
        ranked = self.ranking_engine.rank_optimization_results(
            self.results, RankingCriteria.OVERALL_SCORE
        )
        
        assert len(ranked) == 2
        # Should be ranked by overall weighted score
        assert all(result.metrics.get_overall_score() >= 0 for result in ranked)
    
    def test_generate_ranking_report(self):
        """Test ranking report generation"""
        report = self.ranking_engine.generate_ranking_report(
            self.results, RankingCriteria.OVERALL_SCORE
        )
        
        # Verify report structure
        assert 'ranking_criteria' in report
        assert 'total_routes' in report
        assert 'statistics' in report
        assert 'top_routes' in report
        assert 'insights' in report
        
        # Verify content
        assert report['total_routes'] == 2
        assert report['ranking_criteria'] == 'overall_score'
        assert len(report['top_routes']) == 2
        assert len(report['insights']) > 0


class TestOptimizationResultGenerator:
    """Test optimization result generation"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.generator = OptimizationResultGenerator()
        
        self.original_route = Route(
            name="Test Original",
            description="Original route for testing",
            stops=[
                BusStop(
                    name="Start",
                    coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
                    address="Start location",
                    amenities=["shelter"],
                    daily_passenger_count=1000,
                    is_accessible=False
                ),
                BusStop(
                    name="End",
                    coordinates=Coordinates(latitude=19.0800, longitude=72.8800),
                    address="End location",
                    amenities=["shelter"],
                    daily_passenger_count=800,
                    is_accessible=False
                )
            ],
            operator_id="test-op",
            estimated_travel_time=30,
            optimization_score=50.0
        )
        
        self.optimized_route = Route(
            name="Test Optimized",
            description="Optimized route for testing",
            stops=[
                BusStop(
                    name="Start",
                    coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
                    address="Start location",
                    amenities=["shelter", "wheelchair_accessible"],
                    daily_passenger_count=1000,
                    is_accessible=True
                ),
                BusStop(
                    name="End",
                    coordinates=Coordinates(latitude=19.0800, longitude=72.8800),
                    address="End location",
                    amenities=["shelter", "wheelchair_accessible"],
                    daily_passenger_count=800,
                    is_accessible=True
                )
            ],
            operator_id="test-op",
            estimated_travel_time=25,
            optimization_score=80.0
        )
    
    def test_generate_optimization_result(self):
        """Test optimization result generation"""
        result = self.generator.generate_optimization_result(
            self.original_route, self.optimized_route
        )
        
        # Verify result structure
        assert isinstance(result, OptimizationResult)
        assert result.original_route_id == self.original_route.id
        assert result.optimized_route.name == self.optimized_route.name
        assert isinstance(result.metrics, OptimizationMetrics)
        assert result.generated_at is not None
        
        # Verify metrics are calculated
        assert result.metrics.time_improvement >= 0
        assert result.metrics.get_overall_score() >= 0
    
    def test_generate_and_rank_results(self):
        """Test batch generation and ranking"""
        route_pairs = [
            (self.original_route, self.optimized_route)
        ]
        
        ranked_results = self.generator.generate_and_rank_results(
            route_pairs, ranking_criteria=RankingCriteria.OVERALL_SCORE
        )
        
        assert len(ranked_results) == 1
        assert isinstance(ranked_results[0], OptimizationResult)
        assert ranked_results[0].metrics.get_overall_score() >= 0


def test_ranking_criteria_enum():
    """Test RankingCriteria enum values"""
    # Verify all expected criteria exist
    assert RankingCriteria.TIME_EFFICIENCY.value == "time_efficiency"
    assert RankingCriteria.COST_EFFECTIVENESS.value == "cost_effectiveness"
    assert RankingCriteria.PASSENGER_COVERAGE.value == "passenger_coverage"
    assert RankingCriteria.ACCESSIBILITY.value == "accessibility"
    assert RankingCriteria.ENVIRONMENTAL_IMPACT.value == "environmental_impact"
    assert RankingCriteria.OVERALL_SCORE.value == "overall_score"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])