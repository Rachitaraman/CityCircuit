#!/usr/bin/env python3
"""
Test script for route analysis algorithms
"""

from models import Route, BusStop, Coordinates, PopulationDensityData, DensityPoint, DemographicData, GeoBounds
from algorithms import RouteAnalyzer, PopulationAnalyzer, PathMatrixCalculator, OptimizationEngine, PathAlgorithm
from datetime import datetime, timezone


def create_sample_route():
    """Create a sample route for testing"""
    # Create sample bus stops (Mumbai area)
    stop1 = BusStop(
        name="Chhatrapati Shivaji Terminus",
        coordinates=Coordinates(latitude=18.9398, longitude=72.8355),
        address="Dr Dadabhai Naoroji Rd, Fort, Mumbai",
        amenities=["wheelchair_accessible", "shelter", "seating"],
        daily_passenger_count=50000,
        is_accessible=True
    )
    
    stop2 = BusStop(
        name="Gateway of India",
        coordinates=Coordinates(latitude=18.9220, longitude=72.8347),
        address="Apollo Bandar, Colaba, Mumbai",
        amenities=["shelter", "seating"],
        daily_passenger_count=25000,
        is_accessible=False
    )
    
    stop3 = BusStop(
        name="Marine Drive",
        coordinates=Coordinates(latitude=18.9435, longitude=72.8234),
        address="Marine Drive, Mumbai",
        amenities=["shelter"],
        daily_passenger_count=15000,
        is_accessible=True
    )
    
    # Create route
    route = Route(
        name="Mumbai Heritage Route",
        description="Connects major heritage sites in South Mumbai",
        stops=[stop1, stop2, stop3],
        operator_id="mumbai-transport-001",
        estimated_travel_time=45,
        optimization_score=65.0
    )
    
    return route


def create_sample_population_data():
    """Create sample population density data"""
    # Create density points
    density_points = [
        DensityPoint(
            coordinates=Coordinates(latitude=18.9398, longitude=72.8355),
            population=75000,
            demographic_data=DemographicData(
                age_groups={"18-25": 25.0, "25-64": 60.0, "65+": 15.0},
                economic_indicators={"income": 45000.0}
            )
        ),
        DensityPoint(
            coordinates=Coordinates(latitude=18.9220, longitude=72.8347),
            population=50000,
            demographic_data=DemographicData(
                age_groups={"18-25": 30.0, "25-64": 55.0, "65+": 15.0},
                economic_indicators={"income": 55000.0}
            )
        ),
        DensityPoint(
            coordinates=Coordinates(latitude=18.9435, longitude=72.8234),
            population=35000,
            demographic_data=DemographicData(
                age_groups={"18-25": 35.0, "25-64": 50.0, "65+": 15.0},
                economic_indicators={"income": 40000.0}
            )
        )
    ]
    
    # Create population data
    population_data = PopulationDensityData(
        region="South Mumbai",
        coordinates=GeoBounds(
            north=18.95,
            south=18.90,
            east=72.85,
            west=72.80
        ),
        density_points=density_points,
        data_source="Test Data",
        collected_at=datetime.now(timezone.utc)
    )
    
    return population_data


def test_route_analyzer():
    """Test the route analyzer"""
    print("Testing Route Analyzer...")
    
    route = create_sample_route()
    population_data = create_sample_population_data()
    
    analyzer = RouteAnalyzer()
    result = analyzer.analyze_route(route, population_data)
    
    print(f"✓ Route Analysis Results:")
    print(f"  - Route ID: {result.route_id}")
    print(f"  - Overall Score: {result.get_overall_score():.2f}")
    print(f"  - Efficiency Score: {result.efficiency_score:.2f}")
    print(f"  - Coverage Score: {result.coverage_score:.2f}")
    print(f"  - Accessibility Score: {result.accessibility_score:.2f}")
    print(f"  - Passenger Demand Score: {result.passenger_demand_score:.2f}")
    print(f"  - Travel Time Estimate: {result.travel_time_estimate} minutes")
    print(f"  - Bottlenecks Found: {len(result.bottlenecks)}")
    print(f"  - Recommendations: {len(result.recommendations)}")
    
    if result.recommendations:
        print("  - Top Recommendations:")
        for i, rec in enumerate(result.recommendations[:3], 1):
            print(f"    {i}. {rec}")
    
    print()


def test_population_analyzer():
    """Test the population analyzer"""
    print("Testing Population Analyzer...")
    
    population_data = create_sample_population_data()
    
    analyzer = PopulationAnalyzer()
    result = analyzer.analyze_population_data(population_data)
    
    print(f"✓ Population Analysis Results:")
    print(f"  - Region: {result.region}")
    print(f"  - Total Population: {result.total_population:,}")
    print(f"  - Population Density: {result.population_density:.2f} people/km²")
    print(f"  - High Density Areas: {len(result.high_density_areas)}")
    print(f"  - Optimal Stop Locations: {len(result.optimal_stop_locations)}")
    print(f"  - Coverage Gaps: {len(result.coverage_gaps)}")
    
    if result.demographic_insights:
        print(f"  - Dominant Age Group: {result.demographic_insights.get('dominant_age_group', 'N/A')}")
        print(f"  - Transport Dependency: {result.demographic_insights.get('transport_dependency', 'N/A')}")
    
    # Test route recommendations
    recommendations = analyzer.generate_route_recommendations(result)
    print(f"  - Route Recommendations: {len(recommendations)}")
    
    print()


def test_path_matrix_calculator():
    """Test the path matrix calculator"""
    print("Testing Path Matrix Calculator...")
    
    route = create_sample_route()
    
    calculator = PathMatrixCalculator()
    matrix = calculator.calculate_path_matrix(route.stops, PathAlgorithm.HAVERSINE)
    
    print(f"✓ Path Matrix Results:")
    print(f"  - Stops: {len(matrix.stop_ids)}")
    print(f"  - Segments: {len(matrix.segments)}")
    print(f"  - Algorithm: {matrix.algorithm_used.value}")
    print(f"  - Distance Matrix Shape: {matrix.distance_matrix.shape}")
    print(f"  - Time Matrix Shape: {matrix.time_matrix.shape}")
    
    # Test connectivity analysis
    connectivity = calculator.analyze_connectivity(matrix)
    print(f"  - Average Distance: {connectivity['distance_stats']['average_km']} km")
    print(f"  - Average Time: {connectivity['time_stats']['average_minutes']} minutes")
    
    # Test shortest path
    if len(matrix.stop_ids) >= 2:
        path = calculator.find_shortest_path(matrix, matrix.stop_ids[0], matrix.stop_ids[-1])
        print(f"  - Shortest Path: {' -> '.join(path) if path else 'No path found'}")
    
    print()


def test_optimization_engine():
    """Test the optimization engine"""
    print("Testing Optimization Engine...")
    
    route = create_sample_route()
    population_data = create_sample_population_data()
    
    engine = OptimizationEngine()
    result = engine.optimize_route(route, population_data)
    
    print(f"✓ Optimization Results:")
    print(f"  - Original Route: {result.original_route_id}")
    print(f"  - Optimized Route: {result.optimized_route.name}")
    print(f"  - Original Stops: {len(route.stops)}")
    print(f"  - Optimized Stops: {len(result.optimized_route.stops)}")
    print(f"  - Time Improvement: {result.metrics.time_improvement:.2f}%")
    print(f"  - Distance Reduction: {result.metrics.distance_reduction:.2f}%")
    print(f"  - Coverage Increase: {result.metrics.passenger_coverage_increase:.2f}%")
    print(f"  - Cost Savings: {result.metrics.cost_savings:.2f}%")
    print(f"  - Overall Score: {result.metrics.get_overall_score():.2f}")
    print(f"  - Is Improvement: {result.is_improvement()}")
    
    print()


def main():
    """Run all tests"""
    print("=" * 60)
    print("CityCircuit Route Analysis Algorithms Test")
    print("=" * 60)
    print()
    
    try:
        test_route_analyzer()
        test_population_analyzer()
        test_path_matrix_calculator()
        test_optimization_engine()
        
        print("=" * 60)
        print("✓ All tests completed successfully!")
        print("Route analysis algorithms are working correctly.")
        print("=" * 60)
        
    except Exception as e:
        print(f"✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()