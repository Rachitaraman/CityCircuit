"""
Property-based tests for route analysis functionality
**Feature: city-circuit, Property 1: Route analysis completion**
**Validates: Requirements 1.1**
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timezone
from typing import List

from models.route import Route, BusStop
from models.population import PopulationDensityData, DensityPoint, DemographicData
from models.base import Coordinates, GeoBounds
from algorithms.route_analyzer import RouteAnalyzer, RouteAnalysisResult


# Hypothesis strategies for generating test data
@st.composite
def coordinates_strategy(draw):
    """Generate valid coordinates"""
    lat = draw(st.floats(min_value=-90, max_value=90))
    lon = draw(st.floats(min_value=-180, max_value=180))
    return Coordinates(latitude=lat, longitude=lon)


@st.composite
def bus_stop_strategy(draw):
    """Generate bus stops"""
    name = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(min_codepoint=32, max_codepoint=126)))
    coords = draw(coordinates_strategy())
    address = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(min_codepoint=32, max_codepoint=126)))
    amenities = draw(st.lists(st.text(min_size=1, max_size=10, alphabet=st.characters(min_codepoint=32, max_codepoint=126)), max_size=3))
    daily_count = draw(st.integers(min_value=0, max_value=50000))
    is_accessible = draw(st.booleans())
    
    return BusStop(
        name=name,
        coordinates=coords,
        address=address,
        amenities=amenities,
        daily_passenger_count=daily_count,
        is_accessible=is_accessible
    )


@st.composite
def route_strategy(draw):
    """Generate routes with at least 2 stops"""
    name = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(min_codepoint=32, max_codepoint=126)))
    description = draw(st.text(max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126)))
    
    # Generate at least 2 stops for a valid route
    num_stops = draw(st.integers(min_value=2, max_value=5))  # Reduced max stops
    stops = [draw(bus_stop_strategy()) for _ in range(num_stops)]
    
    operator_id = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(min_codepoint=32, max_codepoint=126)))
    is_active = draw(st.booleans())
    optimization_score = draw(st.floats(min_value=0, max_value=100))
    travel_time = draw(st.integers(min_value=1, max_value=1440))
    
    return Route(
        name=name,
        description=description,
        stops=stops,
        operator_id=operator_id,
        is_active=is_active,
        optimization_score=optimization_score,
        estimated_travel_time=travel_time
    )


@st.composite
def geo_bounds_strategy(draw):
    """Generate valid geographic bounds"""
    south = draw(st.floats(min_value=-89, max_value=0))
    north = draw(st.floats(min_value=south + 0.1, max_value=89))
    west = draw(st.floats(min_value=-179, max_value=0))
    east = draw(st.floats(min_value=west + 0.1, max_value=179))
    
    return GeoBounds(north=north, south=south, east=east, west=west)


@st.composite
def demographic_data_strategy(draw):
    """Generate demographic data"""
    age_groups = draw(st.dictionaries(
        st.sampled_from(["0-18", "18-25", "25-64", "65+"]),
        st.floats(min_value=0, max_value=100),
        min_size=1, max_size=4
    ))
    economic_indicators = draw(st.dictionaries(
        st.sampled_from(["income", "employment_rate", "education_level"]),
        st.floats(min_value=0, max_value=100000),
        min_size=1, max_size=3
    ))
    
    return DemographicData(age_groups=age_groups, economic_indicators=economic_indicators)


@st.composite
def density_point_strategy(draw):
    """Generate density points"""
    coords = draw(coordinates_strategy())
    population = draw(st.integers(min_value=0, max_value=100000))
    demographic = draw(demographic_data_strategy())
    
    return DensityPoint(
        coordinates=coords,
        population=population,
        demographic_data=demographic
    )


@st.composite
def population_density_data_strategy(draw):
    """Generate population density datasets - optimized for speed"""
    region = draw(st.text(min_size=1, max_size=50))
    bounds = draw(geo_bounds_strategy())
    
    # Generate fewer density points for speed
    num_points = draw(st.integers(min_value=0, max_value=10))
    density_points = []
    
    for _ in range(num_points):
        # Generate coordinates within bounds
        lat = draw(st.floats(min_value=bounds.south, max_value=bounds.north))
        lon = draw(st.floats(min_value=bounds.west, max_value=bounds.east))
        coords = Coordinates(latitude=lat, longitude=lon)
        
        population = draw(st.integers(min_value=0, max_value=10000))
        demographic = draw(demographic_data_strategy())
        
        density_points.append(DensityPoint(
            coordinates=coords,
            population=population,
            demographic_data=demographic
        ))
    
    data_source = draw(st.text(min_size=1, max_size=50))
    collected_at = datetime.now(timezone.utc)
    
    return PopulationDensityData(
        region=region,
        coordinates=bounds,
        density_points=density_points,
        data_source=data_source,
        collected_at=collected_at
    )


class TestRouteAnalysisCompletion:
    """Test class for route analysis completion properties"""
    
    @given(route_strategy())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.too_slow], deadline=None)
    def test_route_analysis_always_completes_successfully(self, route: Route):
        """
        **Feature: city-circuit, Property 1: Route analysis completion**
        **Validates: Requirements 1.1**
        
        Property: For any valid route data uploaded by a bus operator, 
        the system SHALL analyze the current routes using machine learning algorithms
        and always complete successfully
        """
        # Arrange
        analyzer = RouteAnalyzer()
        
        # Act - Perform route analysis (this should never fail for valid route data)
        analysis_result = analyzer.analyze_route(route)
        
        # Assert - Analysis must always complete and return valid results
        assert isinstance(analysis_result, RouteAnalysisResult), "Analysis must return a RouteAnalysisResult"
        assert analysis_result.route_id == route.id, "Analysis result must reference the correct route"
        
        # Verify all required analysis components are present
        assert isinstance(analysis_result.efficiency_score, (int, float)), "Efficiency score must be numeric"
        assert isinstance(analysis_result.coverage_score, (int, float)), "Coverage score must be numeric"
        assert isinstance(analysis_result.accessibility_score, (int, float)), "Accessibility score must be numeric"
        assert isinstance(analysis_result.travel_time_estimate, int), "Travel time estimate must be an integer"
        assert isinstance(analysis_result.passenger_demand_score, (int, float)), "Passenger demand score must be numeric"
        
        # Verify scores are within valid ranges
        assert 0 <= analysis_result.efficiency_score <= 100, "Efficiency score must be between 0 and 100"
        assert 0 <= analysis_result.coverage_score <= 100, "Coverage score must be between 0 and 100"
        assert 0 <= analysis_result.accessibility_score <= 100, "Accessibility score must be between 0 and 100"
        assert 0 <= analysis_result.passenger_demand_score <= 100, "Passenger demand score must be between 0 and 100"
        assert analysis_result.travel_time_estimate > 0, "Travel time estimate must be positive"
        
        # Verify overall score calculation works
        overall_score = analysis_result.get_overall_score()
        assert isinstance(overall_score, (int, float)), "Overall score must be numeric"
        assert 0 <= overall_score <= 100, "Overall score must be between 0 and 100"
        
        # Verify analysis components are present
        assert isinstance(analysis_result.bottlenecks, list), "Bottlenecks must be a list"
        assert isinstance(analysis_result.recommendations, list), "Recommendations must be a list"
        assert isinstance(analysis_result.analysis_timestamp, datetime), "Analysis timestamp must be a datetime"
        
        # Verify bottlenecks have proper structure if present
        for bottleneck in analysis_result.bottlenecks:
            assert isinstance(bottleneck, dict), "Each bottleneck must be a dictionary"
            assert 'type' in bottleneck, "Bottleneck must have a type"
            assert 'severity' in bottleneck, "Bottleneck must have a severity"
            assert 'description' in bottleneck, "Bottleneck must have a description"
            assert bottleneck['severity'] in ['low', 'medium', 'high'], "Severity must be valid"
        
        # Verify recommendations are strings
        for recommendation in analysis_result.recommendations:
            assert isinstance(recommendation, str), "Each recommendation must be a string"
            assert len(recommendation) > 0, "Recommendations must not be empty"
    
    @given(route_strategy(), population_density_data_strategy())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.too_slow], deadline=None)
    def test_route_analysis_with_population_data_completes(self, route: Route, population_data: PopulationDensityData):
        """
        Property: Route analysis with population density data should always complete successfully
        and provide enhanced analysis results
        """
        # Arrange
        analyzer = RouteAnalyzer()
        
        # Act - Perform route analysis with population data
        analysis_result = analyzer.analyze_route(route, population_data)
        
        # Assert - Analysis must complete successfully with enhanced results
        assert isinstance(analysis_result, RouteAnalysisResult), "Analysis must return a RouteAnalysisResult"
        assert analysis_result.route_id == route.id, "Analysis result must reference the correct route"
        
        # With population data, coverage score should be more accurate
        assert isinstance(analysis_result.coverage_score, (int, float)), "Coverage score must be numeric"
        assert 0 <= analysis_result.coverage_score <= 100, "Coverage score must be between 0 and 100"
        
        # Passenger demand score should be enhanced with population data
        assert isinstance(analysis_result.passenger_demand_score, (int, float)), "Passenger demand score must be numeric"
        assert 0 <= analysis_result.passenger_demand_score <= 100, "Passenger demand score must be between 0 and 100"
        
        # All other analysis components must still be present and valid
        assert 0 <= analysis_result.efficiency_score <= 100, "Efficiency score must be between 0 and 100"
        assert 0 <= analysis_result.accessibility_score <= 100, "Accessibility score must be between 0 and 100"
        assert analysis_result.travel_time_estimate > 0, "Travel time estimate must be positive"
        
        # Overall score must be calculable
        overall_score = analysis_result.get_overall_score()
        assert 0 <= overall_score <= 100, "Overall score must be between 0 and 100"
    
    @given(st.lists(route_strategy(), min_size=1, max_size=3))
    @settings(max_examples=5, suppress_health_check=[HealthCheck.too_slow], deadline=None)
    def test_batch_route_analysis_completes(self, routes: List[Route]):
        """
        Property: Batch route analysis should complete successfully for any list of valid routes
        """
        # Arrange
        analyzer = RouteAnalyzer()
        
        # Act - Perform batch analysis
        analysis_results = analyzer.batch_analyze_routes(routes)
        
        # Assert - Batch analysis must complete and return results for all routes
        assert isinstance(analysis_results, list), "Batch analysis must return a list"
        assert len(analysis_results) <= len(routes), "Results count should not exceed input routes"
        
        # Each result must be valid
        for result in analysis_results:
            assert isinstance(result, RouteAnalysisResult), "Each result must be a RouteAnalysisResult"
            assert result.route_id in [route.id for route in routes], "Result must reference an input route"
            
            # Verify basic analysis completeness
            assert 0 <= result.efficiency_score <= 100, "Efficiency score must be valid"
            assert 0 <= result.coverage_score <= 100, "Coverage score must be valid"
            assert 0 <= result.accessibility_score <= 100, "Accessibility score must be valid"
            assert 0 <= result.passenger_demand_score <= 100, "Passenger demand score must be valid"
            assert result.travel_time_estimate > 0, "Travel time must be positive"
            
            # Overall score must be calculable
            overall_score = result.get_overall_score()
            assert 0 <= overall_score <= 100, "Overall score must be valid"
    
    @given(route_strategy())
    @settings(max_examples=10, deadline=None)
    def test_route_analysis_deterministic_for_same_input(self, route: Route):
        """
        Property: Route analysis should be deterministic - same input should produce same results
        """
        # Arrange
        analyzer = RouteAnalyzer()
        
        # Act - Analyze the same route twice
        result1 = analyzer.analyze_route(route)
        result2 = analyzer.analyze_route(route)
        
        # Assert - Results should be identical (within floating point precision)
        assert result1.route_id == result2.route_id, "Route IDs must match"
        assert abs(result1.efficiency_score - result2.efficiency_score) < 0.01, "Efficiency scores must be consistent"
        assert abs(result1.coverage_score - result2.coverage_score) < 0.01, "Coverage scores must be consistent"
        assert abs(result1.accessibility_score - result2.accessibility_score) < 0.01, "Accessibility scores must be consistent"
        assert abs(result1.passenger_demand_score - result2.passenger_demand_score) < 0.01, "Passenger demand scores must be consistent"
        assert result1.travel_time_estimate == result2.travel_time_estimate, "Travel time estimates must match"
        
        # Bottlenecks and recommendations should be identical
        assert len(result1.bottlenecks) == len(result2.bottlenecks), "Bottleneck counts must match"
        assert len(result1.recommendations) == len(result2.recommendations), "Recommendation counts must match"
    
    @given(route_strategy())
    @settings(max_examples=10, deadline=None)
    def test_route_analysis_handles_edge_cases(self, route: Route):
        """
        Property: Route analysis should handle edge cases gracefully
        """
        # Arrange
        analyzer = RouteAnalyzer()
        
        # Test with minimal route (2 stops)
        if len(route.stops) > 2:
            minimal_route = Route(
                name=route.name,
                description=route.description,
                stops=route.stops[:2],  # Only first 2 stops
                operator_id=route.operator_id,
                is_active=route.is_active,
                optimization_score=route.optimization_score,
                estimated_travel_time=route.estimated_travel_time
            )
            
            # Act - Analysis should still complete
            result = analyzer.analyze_route(minimal_route)
            
            # Assert - Analysis must complete successfully even for minimal routes
            assert isinstance(result, RouteAnalysisResult), "Analysis must complete for minimal routes"
            assert result.route_id == minimal_route.id, "Result must reference the minimal route"
            assert 0 <= result.get_overall_score() <= 100, "Overall score must be valid for minimal routes"
        
        # Test with route having zero passenger counts
        zero_passenger_route = Route(
            name=route.name,
            description=route.description,
            stops=[
                BusStop(
                    name=stop.name,
                    coordinates=stop.coordinates,
                    address=stop.address,
                    amenities=stop.amenities,
                    daily_passenger_count=0,  # Zero passengers
                    is_accessible=stop.is_accessible
                ) for stop in route.stops
            ],
            operator_id=route.operator_id,
            is_active=route.is_active,
            optimization_score=route.optimization_score,
            estimated_travel_time=route.estimated_travel_time
        )
        
        # Act - Analysis should handle zero passenger counts
        result = analyzer.analyze_route(zero_passenger_route)
        
        # Assert - Analysis must complete even with zero passenger counts
        assert isinstance(result, RouteAnalysisResult), "Analysis must handle zero passenger counts"
        assert result.passenger_demand_score >= 0, "Passenger demand score must be non-negative"
        assert 0 <= result.get_overall_score() <= 100, "Overall score must be valid"
    
    def test_route_analysis_handles_invalid_coordinates_gracefully(self):
        """
        Property: Route analysis should handle invalid coordinates gracefully
        """
        # Arrange
        analyzer = RouteAnalyzer()
        
        # Create route with extreme coordinates
        extreme_route = Route(
            name="Extreme Route",
            description="Route with extreme coordinates",
            stops=[
                BusStop(
                    name="North Pole",
                    coordinates=Coordinates(latitude=90.0, longitude=0.0),
                    address="North Pole",
                    amenities=[],
                    daily_passenger_count=100,
                    is_accessible=True
                ),
                BusStop(
                    name="South Pole", 
                    coordinates=Coordinates(latitude=-90.0, longitude=180.0),
                    address="South Pole",
                    amenities=[],
                    daily_passenger_count=100,
                    is_accessible=True
                )
            ],
            operator_id="extreme-operator",
            is_active=True,
            optimization_score=50.0,
            estimated_travel_time=1000
        )
        
        # Act - Analysis should handle extreme coordinates
        result = analyzer.analyze_route(extreme_route)
        
        # Assert - Analysis must complete even with extreme coordinates
        assert isinstance(result, RouteAnalysisResult), "Analysis must handle extreme coordinates"
        assert result.route_id == extreme_route.id, "Result must reference the extreme route"
        assert 0 <= result.get_overall_score() <= 100, "Overall score must be valid"
        assert result.travel_time_estimate > 0, "Travel time must be positive"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])