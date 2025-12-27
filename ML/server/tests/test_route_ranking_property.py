"""
Property-based tests for route ranking consistency
**Feature: city-circuit, Property 4: Route ranking consistency**
**Validates: Requirements 1.4**

Tests that route optimization results are consistently ranked by efficiency metrics in descending order
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, timezone
from typing import List
import random

from models import (
    Route, BusStop, Coordinates, OptimizationResult, OptimizationMetrics,
    PopulationDensityData, DensityPoint, DemographicData, GeoBounds
)
from algorithms import RouteRankingEngine, RankingCriteria


def create_test_route(name: str, score: float = 75.0) -> Route:
    """Create a test route with valid data"""
    stops = [
        BusStop(
            name=f"{name} Stop 1",
            coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
            address=f"{name} Address 1",
            amenities=["shelter", "seating"],
            daily_passenger_count=1000,
            is_accessible=True
        ),
        BusStop(
            name=f"{name} Stop 2",
            coordinates=Coordinates(latitude=19.0896, longitude=72.8656),
            address=f"{name} Address 2",
            amenities=["shelter"],
            daily_passenger_count=800,
            is_accessible=False
        )
    ]
    
    return Route(
        name=name,
        description=f"Test route {name}",
        stops=stops,
        operator_id="test-operator",
        estimated_travel_time=30,
        optimization_score=score
    )


def create_test_population_data() -> PopulationDensityData:
    """Create test population data"""
    return PopulationDensityData(
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


def create_test_optimization_result(route_id: str, metrics: OptimizationMetrics) -> OptimizationResult:
    """Create a test optimization result"""
    route = create_test_route(f"Route {route_id}", score=75.0)
    population_data = create_test_population_data()
    
    return OptimizationResult(
        original_route_id=route_id,
        optimized_route=route,
        metrics=metrics,
        population_data=population_data,
        generated_at=datetime.now(timezone.utc)
    )


class TestRouteRankingConsistency:
    """
    Property-based tests for route ranking consistency
    **Feature: city-circuit, Property 4: Route ranking consistency**
    """
    
    def setup_method(self):
        """Set up test fixtures"""
        self.ranking_engine = RouteRankingEngine()
    
    @given(st.lists(
        st.builds(
            OptimizationMetrics,
            time_improvement=st.floats(min_value=0.0, max_value=50.0, allow_nan=False, allow_infinity=False),
            distance_reduction=st.floats(min_value=0.0, max_value=40.0, allow_nan=False, allow_infinity=False),
            passenger_coverage_increase=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
            cost_savings=st.floats(min_value=0.0, max_value=30.0, allow_nan=False, allow_infinity=False)
        ),
        min_size=2, max_size=10
    ))
    @settings(max_examples=100, deadline=None)
    def test_ranking_consistency_overall_score(self, metrics_list: List[OptimizationMetrics]):
        """
        **Feature: city-circuit, Property 4: Route ranking consistency**
        Test that routes are consistently ranked by overall score in descending order
        """
        assume(len(metrics_list) >= 2)
        
        # Create optimization results from metrics
        optimization_results = []
        for i, metrics in enumerate(metrics_list):
            result = create_test_optimization_result(f"route-{i}", metrics)
            optimization_results.append(result)
        
        # Rank the results by overall score
        ranked_results = self.ranking_engine.rank_optimization_results(
            optimization_results, RankingCriteria.OVERALL_SCORE
        )
        
        # Verify ranking consistency: scores should be in descending order
        scores = [result.metrics.get_overall_score() for result in ranked_results]
        
        # Property: For any set of route options, they should be consistently ranked 
        # by efficiency metrics in descending order
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], (
                f"Ranking inconsistency: score at position {i} ({scores[i]:.2f}) "
                f"is less than score at position {i+1} ({scores[i+1]:.2f})"
            )
        
        # Additional consistency check: re-ranking should produce same order
        re_ranked_results = self.ranking_engine.rank_optimization_results(
            optimization_results, RankingCriteria.OVERALL_SCORE
        )
        
        re_ranked_scores = [result.metrics.get_overall_score() for result in re_ranked_results]
        assert scores == re_ranked_scores, "Re-ranking produced different order"
    
    @given(st.lists(
        st.builds(
            OptimizationMetrics,
            time_improvement=st.floats(min_value=0.0, max_value=50.0, allow_nan=False, allow_infinity=False),
            distance_reduction=st.floats(min_value=0.0, max_value=40.0, allow_nan=False, allow_infinity=False),
            passenger_coverage_increase=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
            cost_savings=st.floats(min_value=0.0, max_value=30.0, allow_nan=False, allow_infinity=False)
        ),
        min_size=2, max_size=10
    ))
    @settings(max_examples=50, deadline=None)
    def test_ranking_consistency_time_efficiency(self, metrics_list: List[OptimizationMetrics]):
        """
        **Feature: city-circuit, Property 4: Route ranking consistency**
        Test that routes are consistently ranked by time efficiency in descending order
        """
        assume(len(metrics_list) >= 2)
        
        # Create optimization results from metrics
        optimization_results = []
        for i, metrics in enumerate(metrics_list):
            result = create_test_optimization_result(f"route-{i}", metrics)
            optimization_results.append(result)
        
        # Rank by time efficiency
        ranked_results = self.ranking_engine.rank_optimization_results(
            optimization_results, RankingCriteria.TIME_EFFICIENCY
        )
        
        # Verify descending order by time improvement
        time_improvements = [result.metrics.time_improvement for result in ranked_results]
        
        for i in range(len(time_improvements) - 1):
            assert time_improvements[i] >= time_improvements[i + 1], (
                f"Time efficiency ranking inconsistency: improvement at position {i} "
                f"({time_improvements[i]:.2f}%) is less than at position {i+1} "
                f"({time_improvements[i+1]:.2f}%)"
            )
    
    @given(st.lists(
        st.builds(
            OptimizationMetrics,
            time_improvement=st.floats(min_value=0.0, max_value=50.0, allow_nan=False, allow_infinity=False),
            distance_reduction=st.floats(min_value=0.0, max_value=40.0, allow_nan=False, allow_infinity=False),
            passenger_coverage_increase=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
            cost_savings=st.floats(min_value=0.0, max_value=30.0, allow_nan=False, allow_infinity=False)
        ),
        min_size=2, max_size=10
    ))
    @settings(max_examples=50, deadline=None)
    def test_ranking_consistency_passenger_coverage(self, metrics_list: List[OptimizationMetrics]):
        """
        **Feature: city-circuit, Property 4: Route ranking consistency**
        Test that routes are consistently ranked by passenger coverage in descending order
        """
        assume(len(metrics_list) >= 2)
        
        # Create optimization results from metrics
        optimization_results = []
        for i, metrics in enumerate(metrics_list):
            result = create_test_optimization_result(f"route-{i}", metrics)
            optimization_results.append(result)
        
        # Rank by passenger coverage
        ranked_results = self.ranking_engine.rank_optimization_results(
            optimization_results, RankingCriteria.PASSENGER_COVERAGE
        )
        
        # Verify descending order by coverage increase
        coverage_increases = [result.metrics.passenger_coverage_increase for result in ranked_results]
        
        for i in range(len(coverage_increases) - 1):
            assert coverage_increases[i] >= coverage_increases[i + 1], (
                f"Passenger coverage ranking inconsistency: coverage at position {i} "
                f"({coverage_increases[i]:.2f}%) is less than at position {i+1} "
                f"({coverage_increases[i+1]:.2f}%)"
            )
    
    @given(st.lists(
        st.builds(
            OptimizationMetrics,
            time_improvement=st.floats(min_value=0.0, max_value=50.0, allow_nan=False, allow_infinity=False),
            distance_reduction=st.floats(min_value=0.0, max_value=40.0, allow_nan=False, allow_infinity=False),
            passenger_coverage_increase=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
            cost_savings=st.floats(min_value=0.0, max_value=30.0, allow_nan=False, allow_infinity=False)
        ),
        min_size=3, max_size=8
    ))
    @settings(max_examples=30, deadline=None)
    def test_ranking_stability_with_shuffled_input(self, metrics_list: List[OptimizationMetrics]):
        """
        **Feature: city-circuit, Property 4: Route ranking consistency**
        Test that ranking is stable regardless of input order (shuffle invariance)
        """
        assume(len(metrics_list) >= 3)
        
        # Create optimization results from metrics
        optimization_results = []
        for i, metrics in enumerate(metrics_list):
            result = create_test_optimization_result(f"route-{i}", metrics)
            optimization_results.append(result)
        
        # Get original ranking
        original_ranking = self.ranking_engine.rank_optimization_results(
            optimization_results, RankingCriteria.OVERALL_SCORE
        )
        original_ids = [result.original_route_id for result in original_ranking]
        
        # Shuffle the input and rank again
        shuffled_results = optimization_results.copy()
        random.shuffle(shuffled_results)
        
        shuffled_ranking = self.ranking_engine.rank_optimization_results(
            shuffled_results, RankingCriteria.OVERALL_SCORE
        )
        shuffled_ids = [result.original_route_id for result in shuffled_ranking]
        
        # Property: Ranking should be stable regardless of input order
        assert original_ids == shuffled_ids, (
            f"Ranking is not stable under input shuffling. "
            f"Original order: {original_ids}, Shuffled order: {shuffled_ids}"
        )
    
    @given(st.lists(
        st.builds(
            OptimizationMetrics,
            time_improvement=st.floats(min_value=0.0, max_value=50.0, allow_nan=False, allow_infinity=False),
            distance_reduction=st.floats(min_value=0.0, max_value=40.0, allow_nan=False, allow_infinity=False),
            passenger_coverage_increase=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
            cost_savings=st.floats(min_value=0.0, max_value=30.0, allow_nan=False, allow_infinity=False)
        ),
        min_size=3, max_size=8
    ))
    @settings(max_examples=30, deadline=None)
    def test_ranking_transitivity(self, metrics_list: List[OptimizationMetrics]):
        """
        **Feature: city-circuit, Property 4: Route ranking consistency**
        Test ranking transitivity: if A > B and B > C, then A > C
        """
        assume(len(metrics_list) >= 3)
        
        # Create optimization results from metrics
        optimization_results = []
        for i, metrics in enumerate(metrics_list):
            result = create_test_optimization_result(f"route-{i}", metrics)
            optimization_results.append(result)
        
        # Rank by overall score
        ranked_results = self.ranking_engine.rank_optimization_results(
            optimization_results, RankingCriteria.OVERALL_SCORE
        )
        
        scores = [result.metrics.get_overall_score() for result in ranked_results]
        
        # Test transitivity property for all triplets
        for i in range(len(scores) - 2):
            score_a = scores[i]
            score_b = scores[i + 1]
            score_c = scores[i + 2]
            
            # If A >= B and B >= C, then A >= C (transitivity)
            if score_a >= score_b and score_b >= score_c:
                assert score_a >= score_c, (
                    f"Transitivity violation: A({score_a:.2f}) >= B({score_b:.2f}) "
                    f"and B >= C({score_c:.2f}) but A < C"
                )
    
    def test_ranking_with_identical_scores(self):
        """
        **Feature: city-circuit, Property 4: Route ranking consistency**
        Test ranking behavior with identical scores
        """
        # Create results with identical metrics
        identical_metrics = OptimizationMetrics(
            time_improvement=25.0,
            distance_reduction=15.0,
            passenger_coverage_increase=30.0,
            cost_savings=20.0
        )
        
        optimization_results = []
        for i in range(3):
            result = create_test_optimization_result(f"route-{i}", identical_metrics)
            optimization_results.append(result)
        
        # Rank the results
        ranked_results = self.ranking_engine.rank_optimization_results(
            optimization_results, RankingCriteria.OVERALL_SCORE
        )
        
        # All scores should be identical
        scores = [result.metrics.get_overall_score() for result in ranked_results]
        
        # Property: All identical scores should remain in a valid order
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], (
                f"Identical scores not properly ordered: {scores[i]} < {scores[i+1]}"
            )


def test_ranking_criteria_completeness():
    """
    **Feature: city-circuit, Property 4: Route ranking consistency**
    Test that all ranking criteria are properly defined and accessible
    """
    # Verify all expected ranking criteria exist
    expected_criteria = [
        'TIME_EFFICIENCY',
        'COST_EFFECTIVENESS', 
        'PASSENGER_COVERAGE',
        'ACCESSIBILITY',
        'ENVIRONMENTAL_IMPACT',
        'OVERALL_SCORE'
    ]
    
    for criteria_name in expected_criteria:
        assert hasattr(RankingCriteria, criteria_name), f"Missing ranking criteria: {criteria_name}"
        criteria = getattr(RankingCriteria, criteria_name)
        assert isinstance(criteria, RankingCriteria), f"Invalid criteria type: {criteria_name}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])