"""
Property-based tests for data export functionality
**Feature: city-circuit, Property 5: Export format compliance**
**Validates: Requirements 1.5**

Tests that route data export and import maintains data integrity across all supported formats
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, timezone
from typing import List, Dict, Any
import json

from models import (
    Route, BusStop, Coordinates, OptimizationResult, OptimizationMetrics,
    PopulationDensityData, DensityPoint, DemographicData, GeoBounds,
    serialize_model, deserialize_model
)
from algorithms import DataExporter, DataValidator, DataImporter, ExportFormat


def create_test_coordinates() -> st.SearchStrategy[Coordinates]:
    """Strategy for generating valid coordinates (Mumbai area)"""
    return st.builds(
        Coordinates,
        latitude=st.floats(min_value=18.8, max_value=19.3, allow_nan=False, allow_infinity=False),
        longitude=st.floats(min_value=72.7, max_value=73.1, allow_nan=False, allow_infinity=False)
    )


def create_test_bus_stop() -> st.SearchStrategy[BusStop]:
    """Strategy for generating valid bus stops"""
    return st.builds(
        BusStop,
        name=st.text(min_size=3, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'))),
        coordinates=create_test_coordinates(),
        address=st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po'))),
        amenities=st.lists(
            st.sampled_from(['shelter', 'seating', 'wheelchair_accessible', 'lighting', 'security']),
            min_size=0, max_size=3, unique=True
        ),
        daily_passenger_count=st.integers(min_value=100, max_value=10000),
        is_accessible=st.booleans()
    )


def create_test_route() -> st.SearchStrategy[Route]:
    """Strategy for generating valid routes"""
    return st.builds(
        Route,
        name=st.text(min_size=3, max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'))),
        description=st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po'))),
        stops=st.lists(create_test_bus_stop(), min_size=2, max_size=8),
        operator_id=st.text(min_size=5, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc'))),
        estimated_travel_time=st.integers(min_value=10, max_value=120),
        optimization_score=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)
    )


class TestDataExportCompliance:
    """
    Property-based tests for data export format compliance
    **Feature: city-circuit, Property 5: Export format compliance**
    """
    
    def setup_method(self):
        """Set up test fixtures"""
        self.data_exporter = DataExporter()
        self.data_validator = DataValidator()
        self.data_importer = DataImporter()
    
    @given(st.lists(create_test_route(), min_size=1, max_size=5))
    @settings(max_examples=50, deadline=None)
    def test_json_export_import_round_trip(self, routes: List[Route]):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that JSON export and import preserves route data integrity
        """
        assume(len(routes) >= 1)
        
        # Export routes to JSON
        export_result = self.data_exporter.export_route_data(routes, ExportFormat.JSON, True)
        
        # Validate exported JSON
        validation_result = self.data_validator.validate_export(export_result, ExportFormat.JSON)
        assert validation_result['valid'], f"JSON export validation failed: {validation_result.get('errors', [])}"
        
        # Import routes from JSON
        imported_routes = self.data_importer.import_route_data(export_result, ExportFormat.JSON)
        
        # Property: For any route data export, importing the exported data 
        # should produce equivalent route information
        assert len(imported_routes) == len(routes), "Route count mismatch after round-trip"
        
        # Verify route names are preserved
        original_names = {route.name for route in routes}
        imported_names = {route.name for route in imported_routes}
        assert original_names == imported_names, "Route names not preserved in round-trip"
        
        # Verify stop counts are preserved
        original_stop_counts = [len(route.stops) for route in routes]
        imported_stop_counts = [len(route.stops) for route in imported_routes]
        assert sorted(original_stop_counts) == sorted(imported_stop_counts), "Stop counts not preserved"
    
    @given(st.lists(create_test_route(), min_size=1, max_size=5))
    @settings(max_examples=30, deadline=None)
    def test_csv_export_import_round_trip(self, routes: List[Route]):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that CSV export and import preserves route data integrity
        """
        assume(len(routes) >= 1)
        
        # Export routes to CSV
        export_result = self.data_exporter.export_route_data(routes, ExportFormat.CSV, True)
        
        # Validate exported CSV
        validation_result = self.data_validator.validate_export(export_result, ExportFormat.CSV)
        assert validation_result['valid'], f"CSV export validation failed: {validation_result.get('errors', [])}"
        
        # Import routes from CSV
        imported_routes = self.data_importer.import_route_data(export_result, ExportFormat.CSV)
        
        # Property: CSV round-trip should preserve essential route data
        assert len(imported_routes) == len(routes), "Route count mismatch after CSV round-trip"
        
        # Verify route names are preserved
        original_names = {route.name for route in routes}
        imported_names = {route.name for route in imported_routes}
        assert original_names == imported_names, "Route names not preserved in CSV round-trip"
    
    @given(st.lists(create_test_route(), min_size=1, max_size=5))
    @settings(max_examples=30, deadline=None)
    def test_xml_export_import_round_trip(self, routes: List[Route]):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that XML export and import preserves route data integrity
        """
        assume(len(routes) >= 1)
        
        # Export routes to XML
        export_result = self.data_exporter.export_route_data(routes, ExportFormat.XML, True)
        
        # Validate exported XML
        validation_result = self.data_validator.validate_export(export_result, ExportFormat.XML)
        assert validation_result['valid'], f"XML export validation failed: {validation_result.get('errors', [])}"
        
        # Import routes from XML
        imported_routes = self.data_importer.import_route_data(export_result, ExportFormat.XML)
        
        # Property: XML round-trip should preserve route structure
        assert len(imported_routes) == len(routes), "Route count mismatch after XML round-trip"
        
        # Verify route names are preserved
        original_names = {route.name for route in routes}
        imported_names = {route.name for route in imported_routes}
        assert original_names == imported_names, "Route names not preserved in XML round-trip"
    
    @given(st.lists(create_test_route(), min_size=1, max_size=3))
    @settings(max_examples=20, deadline=None)
    def test_geojson_export_import_round_trip(self, routes: List[Route]):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that GeoJSON export and import preserves geographic data
        """
        assume(len(routes) >= 1)
        assume(all(len(route.stops) >= 2 for route in routes))  # GeoJSON needs at least 2 stops for LineString
        
        # Export routes to GeoJSON
        export_result = self.data_exporter.export_route_data(routes, ExportFormat.GEOJSON, True)
        
        # Validate exported GeoJSON
        validation_result = self.data_validator.validate_export(export_result, ExportFormat.GEOJSON)
        assert validation_result['valid'], f"GeoJSON export validation failed: {validation_result.get('errors', [])}"
        
        # Import routes from GeoJSON (simplified comparison due to format limitations)
        imported_routes = self.data_importer.import_route_data(export_result, ExportFormat.GEOJSON)
        
        # Property: GeoJSON should preserve route count and basic structure
        assert len(imported_routes) == len(routes), "Route count mismatch after GeoJSON round-trip"
        
        # Verify coordinate preservation (at least the count)
        original_coord_counts = [len(route.stops) for route in routes]
        imported_coord_counts = [len(route.stops) for route in imported_routes]
        assert sorted(original_coord_counts) == sorted(imported_coord_counts), "Coordinate counts not preserved"
    
    @given(st.lists(create_test_route(), min_size=1, max_size=5))
    @settings(max_examples=30, deadline=None)
    def test_gtfs_export_validation(self, routes: List[Route]):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that GTFS export produces valid transportation format
        """
        assume(len(routes) >= 1)
        
        # Export routes to GTFS
        export_result = self.data_exporter.export_route_data(routes, ExportFormat.GTFS, True)
        
        # Validate exported GTFS
        validation_result = self.data_validator.validate_export(export_result, ExportFormat.GTFS)
        
        # Property: GTFS export should always produce valid format
        assert validation_result['valid'], f"GTFS export validation failed: {validation_result.get('errors', [])}"
        
        # Verify required GTFS files are present
        files = export_result.get('files', {})
        required_files = ['agency.txt', 'routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt']
        
        for required_file in required_files:
            assert required_file in files, f"Missing required GTFS file: {required_file}"
            assert len(files[required_file]) > 0, f"Empty GTFS file: {required_file}"
    
    @given(st.lists(create_test_route(), min_size=1, max_size=5))
    @settings(max_examples=20, deadline=None)
    def test_export_format_consistency(self, routes: List[Route]):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that all export formats maintain consistent metadata
        """
        assume(len(routes) >= 1)
        
        # Export to all supported formats
        export_results = {}
        for export_format in [ExportFormat.JSON, ExportFormat.CSV, ExportFormat.XML, ExportFormat.GEOJSON, ExportFormat.GTFS]:
            try:
                export_results[export_format] = self.data_exporter.export_route_data(routes, export_format, True)
            except Exception as e:
                pytest.fail(f"Export failed for format {export_format}: {str(e)}")
        
        # Property: All formats should include consistent metadata
        for export_format, result in export_results.items():
            assert 'format' in result, f"Missing format field in {export_format} export"
            assert result['format'] == export_format.value, f"Format mismatch in {export_format} export"
            
            if 'metadata' in result:
                metadata = result['metadata']
                assert 'export_timestamp' in metadata, f"Missing timestamp in {export_format} metadata"
                assert 'total_routes' in metadata, f"Missing route count in {export_format} metadata"
                assert metadata['total_routes'] == len(routes), f"Incorrect route count in {export_format} metadata"
    
    @given(
        st.lists(create_test_route(), min_size=1, max_size=3),
        st.sampled_from([ExportFormat.JSON, ExportFormat.CSV, ExportFormat.XML])
    )
    @settings(max_examples=30, deadline=None)
    def test_export_validation_consistency(self, routes: List[Route], export_format: ExportFormat):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that export validation is consistent and reliable
        """
        assume(len(routes) >= 1)
        
        # Export routes
        export_result = self.data_exporter.export_route_data(routes, export_format, True)
        
        # Validate multiple times
        validation_results = []
        for _ in range(3):
            validation_result = self.data_validator.validate_export(export_result, export_format)
            validation_results.append(validation_result)
        
        # Property: Validation should be consistent across multiple runs
        first_result = validation_results[0]
        for result in validation_results[1:]:
            assert result['valid'] == first_result['valid'], "Validation consistency failed"
            assert result['format'] == first_result['format'], "Format consistency failed"
    
    @given(st.lists(create_test_route(), min_size=2, max_size=5))
    @settings(max_examples=20, deadline=None)
    def test_export_scalability(self, routes: List[Route]):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that export functionality scales with route count
        """
        assume(len(routes) >= 2)
        
        # Test with different subsets of routes
        for i in range(1, len(routes) + 1):
            subset_routes = routes[:i]
            
            # Export to JSON (fastest format)
            export_result = self.data_exporter.export_route_data(subset_routes, ExportFormat.JSON, True)
            
            # Property: Export should succeed regardless of route count
            assert 'data' in export_result, f"Export failed for {i} routes"
            assert 'routes' in export_result['data'], f"Missing routes data for {i} routes"
            assert len(export_result['data']['routes']) == i, f"Route count mismatch for {i} routes"
    
    def test_export_format_enumeration_completeness(self):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that all export formats are properly defined and accessible
        """
        # Verify all expected export formats exist
        expected_formats = ['gtfs', 'json', 'csv', 'xml', 'geojson']
        
        for format_name in expected_formats:
            assert hasattr(ExportFormat, format_name.upper()), f"Missing export format: {format_name}"
            format_enum = getattr(ExportFormat, format_name.upper())
            assert isinstance(format_enum, ExportFormat), f"Invalid format type: {format_name}"
            assert format_enum.value == format_name, f"Format value mismatch: {format_name}"
    
    def test_export_error_handling(self):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that export handles invalid inputs gracefully
        """
        # Test with empty route list
        empty_routes = []
        
        for export_format in ExportFormat:
            try:
                export_result = self.data_exporter.export_route_data(empty_routes, export_format, True)
                # Should succeed but with empty data
                assert 'format' in export_result, f"Missing format in empty export for {export_format}"
            except Exception as e:
                # Should not raise exceptions for empty data
                pytest.fail(f"Export failed for empty routes with format {export_format}: {str(e)}")
    
    @given(create_test_route())
    @settings(max_examples=20, deadline=None)
    def test_single_route_export_completeness(self, route: Route):
        """
        **Feature: city-circuit, Property 5: Export format compliance**
        Test that single route export includes all essential data
        """
        routes = [route]
        
        # Export to JSON for detailed verification
        export_result = self.data_exporter.export_route_data(routes, ExportFormat.JSON, True)
        
        # Property: Single route export should preserve all route properties
        assert 'data' in export_result
        assert 'routes' in export_result['data']
        
        exported_routes = export_result['data']['routes']
        assert len(exported_routes) == 1, "Single route export should contain exactly one route"
        
        exported_route = exported_routes[0]
        
        # Verify essential fields are present
        essential_fields = ['name', 'description', 'stops', 'operator_id', 'estimated_travel_time']
        for field in essential_fields:
            assert field in exported_route, f"Missing essential field '{field}' in exported route"
        
        # Verify stops data
        assert len(exported_route['stops']) == len(route.stops), "Stop count mismatch in export"
        
        for i, exported_stop in enumerate(exported_route['stops']):
            original_stop = route.stops[i]
            assert exported_stop['name'] == original_stop.name, f"Stop name mismatch at index {i}"
            assert 'coordinates' in exported_stop, f"Missing coordinates for stop {i}"


def test_optimization_result_export_compliance():
    """
    **Feature: city-circuit, Property 5: Export format compliance**
    Test optimization result export format compliance
    """
    from datetime import datetime, timezone
    
    # Create test optimization result
    route = Route(
        name="Test Route",
        description="Test route for export",
        stops=[
            BusStop(
                name="Stop 1",
                coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
                address="Test Address 1",
                amenities=["shelter"],
                daily_passenger_count=1000,
                is_accessible=True
            ),
            BusStop(
                name="Stop 2", 
                coordinates=Coordinates(latitude=19.0896, longitude=72.8656),
                address="Test Address 2",
                amenities=["seating"],
                daily_passenger_count=800,
                is_accessible=False
            )
        ],
        operator_id="test-operator",
        estimated_travel_time=30,
        optimization_score=75.0
    )
    
    metrics = OptimizationMetrics(
        time_improvement=25.0,
        distance_reduction=15.0,
        passenger_coverage_increase=30.0,
        cost_savings=20.0
    )
    
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
    
    optimization_result = OptimizationResult(
        original_route_id="original-route-1",
        optimized_route=route,
        metrics=metrics,
        population_data=population_data,
        generated_at=datetime.now(timezone.utc)
    )
    
    # Test export
    data_exporter = DataExporter()
    data_validator = DataValidator()
    
    # Test JSON export
    json_export = data_exporter.export_optimization_results([optimization_result], ExportFormat.JSON)
    json_validation = data_validator.validate_export(json_export, ExportFormat.JSON)
    
    assert json_validation['valid'], f"Optimization result JSON export validation failed: {json_validation.get('errors', [])}"
    
    # Test CSV export
    csv_export = data_exporter.export_optimization_results([optimization_result], ExportFormat.CSV)
    csv_validation = data_validator.validate_export(csv_export, ExportFormat.CSV)
    
    assert csv_validation['valid'], f"Optimization result CSV export validation failed: {csv_validation.get('errors', [])}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])