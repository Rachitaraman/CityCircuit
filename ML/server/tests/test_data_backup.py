"""
Property-based tests for secure data backup functionality
**Feature: city-circuit, Property 21: Secure data backup**
**Validates: Requirements 5.4**
"""

import pytest
import json
import tempfile
import os
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timezone
from typing import List, Dict, Any

from models.route import Route, BusStop
from models.user import User, UserProfile, UserRole
from models.base import Coordinates
from models.serialization import DataSerializer, TransportationDataExporter, SerializationError
from repositories.implementations import RouteRepository, UserRepository, BusStopRepository
from repositories.unit_of_work import UnitOfWork
from database.connection import get_db_context


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
    name = draw(st.text(min_size=1, max_size=100))
    coords = draw(coordinates_strategy())
    address = draw(st.text(min_size=1, max_size=200))
    amenities = draw(st.lists(st.text(min_size=1, max_size=30), max_size=5))
    daily_count = draw(st.integers(min_value=0, max_value=10000))
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
    name = draw(st.text(min_size=1, max_size=100))
    description = draw(st.text(max_size=500))
    
    # Generate at least 2 stops
    num_stops = draw(st.integers(min_value=2, max_value=10))
    stops = [draw(bus_stop_strategy()) for _ in range(num_stops)]
    
    operator_id = draw(st.text(min_size=1, max_size=50))
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
def user_profile_strategy(draw):
    """Generate user profiles"""
    name = draw(st.text(min_size=1, max_size=100))
    organization = draw(st.one_of(st.none(), st.text(min_size=1, max_size=100)))
    preferences = draw(st.dictionaries(
        st.text(min_size=1, max_size=20),
        st.one_of(st.text(max_size=50), st.booleans(), st.integers()),
        max_size=5
    ))
    
    return UserProfile(
        name=name,
        organization=organization,
        preferences=preferences
    )


@st.composite
def user_strategy(draw):
    """Generate users"""
    email = draw(st.emails())
    role = draw(st.sampled_from([UserRole.OPERATOR, UserRole.PASSENGER, UserRole.ADMIN]))
    profile = draw(user_profile_strategy())
    
    return User(
        email=email,
        role=role,
        profile=profile
    )


class MockDataBackupService:
    """Mock data backup service for testing secure data export"""
    
    def __init__(self):
        self.serializer = DataSerializer()
        self.exporter = TransportationDataExporter()
    
    def export_all_data_securely(self, routes: List[Route], users: List[User]) -> Dict[str, Any]:
        """
        Export all route and user data securely
        
        Args:
            routes: List of routes to export
            users: List of users to export
            
        Returns:
            Dictionary containing all exported data with metadata
        """
        try:
            # Create secure export package
            export_data = {
                "metadata": {
                    "export_timestamp": datetime.now(timezone.utc).isoformat(),
                    "version": "1.0",
                    "data_types": ["routes", "users"],
                    "total_routes": len(routes),
                    "total_users": len(users),
                    "checksum": None  # Will be calculated
                },
                "routes": {
                    "data": [self.serializer.to_dict(route) for route in routes],
                    "formats": {
                        "gtfs": self.exporter.to_gtfs_format(routes) if routes else {},
                        "geojson": self.exporter.to_geojson_format(routes) if routes else {}
                    }
                },
                "users": {
                    "data": [self.serializer.to_dict(user) for user in users]
                }
            }
            
            # Calculate checksum for data integrity
            data_string = json.dumps(export_data["routes"]["data"] + export_data["users"]["data"], sort_keys=True, default=str)
            export_data["metadata"]["checksum"] = hash(data_string)
            
            return export_data
            
        except Exception as e:
            raise SerializationError(f"Secure data export failed: {e}")
    
    def import_and_validate_data(self, export_data: Dict[str, Any]) -> Dict[str, List]:
        """
        Import and validate exported data (round-trip test)
        
        Args:
            export_data: Previously exported data
            
        Returns:
            Dictionary with imported routes and users
        """
        try:
            # Validate metadata
            if "metadata" not in export_data:
                raise SerializationError("Export data missing metadata")
            
            metadata = export_data["metadata"]
            if "checksum" not in metadata:
                raise SerializationError("Export data missing checksum")
            
            # Validate checksum
            routes_data = export_data.get("routes", {}).get("data", [])
            users_data = export_data.get("users", {}).get("data", [])
            
            data_string = json.dumps(routes_data + users_data, sort_keys=True, default=str)
            calculated_checksum = hash(data_string)
            
            if calculated_checksum != metadata["checksum"]:
                raise SerializationError("Data integrity check failed - checksum mismatch")
            
            # Import routes
            imported_routes = []
            for route_data in routes_data:
                try:
                    route = self.serializer.from_dict(Route, route_data)
                    imported_routes.append(route)
                except Exception as e:
                    raise SerializationError(f"Failed to import route: {e}")
            
            # Import users
            imported_users = []
            for user_data in users_data:
                try:
                    user = self.serializer.from_dict(User, user_data)
                    imported_users.append(user)
                except Exception as e:
                    raise SerializationError(f"Failed to import user: {e}")
            
            return {
                "routes": imported_routes,
                "users": imported_users
            }
            
        except Exception as e:
            raise SerializationError(f"Data import and validation failed: {e}")
    
    def export_to_file_securely(self, routes: List[Route], users: List[User], file_path: str) -> bool:
        """
        Export data to a secure file format
        
        Args:
            routes: Routes to export
            users: Users to export  
            file_path: Path to export file
            
        Returns:
            True if export successful
        """
        try:
            export_data = self.export_all_data_securely(routes, users)
            
            # Write to file with proper error handling
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
            # Verify file was written correctly
            if not os.path.exists(file_path):
                raise SerializationError("Export file was not created")
            
            # Verify file can be read back
            with open(file_path, 'r', encoding='utf-8') as f:
                loaded_data = json.load(f)
            
            # Basic validation that data was preserved
            if loaded_data.get("metadata", {}).get("checksum") != export_data["metadata"]["checksum"]:
                raise SerializationError("File export integrity check failed")
            
            return True
            
        except Exception as e:
            raise SerializationError(f"Secure file export failed: {e}")


class TestSecureDataBackup:
    """Test class for secure data backup properties"""
    
    @given(
        routes=st.lists(route_strategy(), min_size=0, max_size=20),
        users=st.lists(user_strategy(), min_size=0, max_size=20)
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_secure_data_backup_round_trip_property(self, routes: List[Route], users: List[User]):
        """
        **Feature: city-circuit, Property 21: Secure data backup**
        **Validates: Requirements 5.4**
        
        Property: For any collection of route and user data, exporting then importing 
        should preserve all data integrity and completeness
        """
        # Arrange
        backup_service = MockDataBackupService()
        
        # Act - Export data securely
        export_data = backup_service.export_all_data_securely(routes, users)
        
        # Assert - Export should always succeed and contain required structure
        assert isinstance(export_data, dict), "Export should return a dictionary"
        assert "metadata" in export_data, "Export should contain metadata"
        assert "routes" in export_data, "Export should contain routes section"
        assert "users" in export_data, "Export should contain users section"
        
        # Validate metadata completeness
        metadata = export_data["metadata"]
        assert "export_timestamp" in metadata, "Metadata should include timestamp"
        assert "version" in metadata, "Metadata should include version"
        assert "checksum" in metadata, "Metadata should include checksum for integrity"
        assert metadata["total_routes"] == len(routes), "Metadata should track route count"
        assert metadata["total_users"] == len(users), "Metadata should track user count"
        
        # Act - Import data back (round-trip test)
        imported_data = backup_service.import_and_validate_data(export_data)
        
        # Assert - Round-trip property: imported data should match original
        imported_routes = imported_data["routes"]
        imported_users = imported_data["users"]
        
        assert len(imported_routes) == len(routes), "All routes should be preserved in round-trip"
        assert len(imported_users) == len(users), "All users should be preserved in round-trip"
        
        # Validate route data preservation
        for i, (original_route, imported_route) in enumerate(zip(routes, imported_routes)):
            assert original_route.name == imported_route.name, f"Route {i} name should be preserved"
            assert original_route.description == imported_route.description, f"Route {i} description should be preserved"
            assert original_route.operator_id == imported_route.operator_id, f"Route {i} operator_id should be preserved"
            assert original_route.is_active == imported_route.is_active, f"Route {i} is_active should be preserved"
            assert abs(original_route.optimization_score - imported_route.optimization_score) < 0.001, f"Route {i} optimization_score should be preserved"
            assert original_route.estimated_travel_time == imported_route.estimated_travel_time, f"Route {i} travel_time should be preserved"
            assert len(original_route.stops) == len(imported_route.stops), f"Route {i} should preserve all stops"
            
            # Validate stop data preservation
            for j, (original_stop, imported_stop) in enumerate(zip(original_route.stops, imported_route.stops)):
                assert original_stop.name == imported_stop.name, f"Route {i} stop {j} name should be preserved"
                assert abs(original_stop.coordinates.latitude - imported_stop.coordinates.latitude) < 0.000001, f"Route {i} stop {j} latitude should be preserved"
                assert abs(original_stop.coordinates.longitude - imported_stop.coordinates.longitude) < 0.000001, f"Route {i} stop {j} longitude should be preserved"
                assert original_stop.address == imported_stop.address, f"Route {i} stop {j} address should be preserved"
                assert original_stop.amenities == imported_stop.amenities, f"Route {i} stop {j} amenities should be preserved"
                assert original_stop.daily_passenger_count == imported_stop.daily_passenger_count, f"Route {i} stop {j} passenger count should be preserved"
                assert original_stop.is_accessible == imported_stop.is_accessible, f"Route {i} stop {j} accessibility should be preserved"
        
        # Validate user data preservation
        for i, (original_user, imported_user) in enumerate(zip(users, imported_users)):
            assert original_user.email == imported_user.email, f"User {i} email should be preserved"
            assert original_user.role == imported_user.role, f"User {i} role should be preserved"
            assert original_user.profile.name == imported_user.profile.name, f"User {i} profile name should be preserved"
            assert original_user.profile.organization == imported_user.profile.organization, f"User {i} organization should be preserved"
            assert original_user.profile.preferences == imported_user.profile.preferences, f"User {i} preferences should be preserved"
    
    @given(
        routes=st.lists(route_strategy(), min_size=1, max_size=10),
        users=st.lists(user_strategy(), min_size=1, max_size=10)
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_secure_data_export_includes_transportation_formats(self, routes: List[Route], users: List[User]):
        """
        Property: Secure data export should include standard transportation formats (GTFS, GeoJSON)
        for interoperability and compliance with transportation standards
        """
        # Arrange
        backup_service = MockDataBackupService()
        
        # Act
        export_data = backup_service.export_all_data_securely(routes, users)
        
        # Assert - Export should include standard transportation formats
        routes_section = export_data["routes"]
        assert "formats" in routes_section, "Routes section should include format exports"
        
        formats = routes_section["formats"]
        assert "gtfs" in formats, "Export should include GTFS format"
        assert "geojson" in formats, "Export should include GeoJSON format"
        
        # Validate GTFS format structure
        gtfs_data = formats["gtfs"]
        if routes:  # Only validate if there are routes to export
            assert isinstance(gtfs_data, dict), "GTFS export should be a dictionary"
            assert "routes" in gtfs_data, "GTFS should include routes"
            assert "stops" in gtfs_data, "GTFS should include stops"
            assert "stop_times" in gtfs_data, "GTFS should include stop_times"
            
            # Validate that all routes are represented in GTFS
            assert len(gtfs_data["routes"]) == len(routes), "GTFS should include all routes"
        
        # Validate GeoJSON format structure
        geojson_data = formats["geojson"]
        if routes:  # Only validate if there are routes to export
            assert isinstance(geojson_data, dict), "GeoJSON export should be a dictionary"
            assert geojson_data.get("type") == "FeatureCollection", "GeoJSON should be a FeatureCollection"
            assert "features" in geojson_data, "GeoJSON should include features"
            
            # Validate that all routes are represented in GeoJSON
            assert len(geojson_data["features"]) == len(routes), "GeoJSON should include all routes as features"
    
    @given(
        routes=st.lists(route_strategy(), min_size=0, max_size=15),
        users=st.lists(user_strategy(), min_size=0, max_size=15)
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_secure_file_export_and_integrity(self, routes: List[Route], users: List[User]):
        """
        Property: Secure file export should create valid files that maintain data integrity
        """
        # Arrange
        backup_service = MockDataBackupService()
        
        # Act - Export to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            temp_path = temp_file.name
        
        try:
            # Export should succeed
            export_success = backup_service.export_to_file_securely(routes, users, temp_path)
            
            # Assert - Export should succeed
            assert export_success, "File export should succeed"
            assert os.path.exists(temp_path), "Export file should be created"
            assert os.path.getsize(temp_path) > 0, "Export file should not be empty"
            
            # Validate file can be read and contains valid JSON
            with open(temp_path, 'r', encoding='utf-8') as f:
                loaded_data = json.load(f)
            
            # Validate file structure matches expected export format
            assert isinstance(loaded_data, dict), "Exported file should contain valid JSON object"
            assert "metadata" in loaded_data, "Exported file should contain metadata"
            assert "routes" in loaded_data, "Exported file should contain routes"
            assert "users" in loaded_data, "Exported file should contain users"
            
            # Validate data integrity through checksum
            metadata = loaded_data["metadata"]
            assert "checksum" in metadata, "Exported file should include integrity checksum"
            
            # Validate that file export preserves all data (round-trip through file)
            imported_data = backup_service.import_and_validate_data(loaded_data)
            assert len(imported_data["routes"]) == len(routes), "File export should preserve all routes"
            assert len(imported_data["users"]) == len(users), "File export should preserve all users"
            
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    @given(st.lists(route_strategy(), min_size=0, max_size=5))
    @settings(max_examples=30)
    def test_backup_handles_empty_data_gracefully(self, routes: List[Route]):
        """
        Property: Backup system should handle empty or minimal data sets gracefully
        """
        # Arrange
        backup_service = MockDataBackupService()
        empty_users = []
        
        # Act & Assert - Should handle empty users list
        export_data = backup_service.export_all_data_securely(routes, empty_users)
        
        assert export_data["metadata"]["total_users"] == 0, "Should correctly report zero users"
        assert export_data["metadata"]["total_routes"] == len(routes), "Should correctly report route count"
        assert len(export_data["users"]["data"]) == 0, "Should handle empty users list"
        
        # Should still be able to round-trip
        imported_data = backup_service.import_and_validate_data(export_data)
        assert len(imported_data["users"]) == 0, "Should preserve empty users list"
        assert len(imported_data["routes"]) == len(routes), "Should preserve routes even with empty users"
    
    def test_backup_service_error_handling(self):
        """
        Property: Backup service should handle invalid data gracefully with proper error messages
        """
        backup_service = MockDataBackupService()
        
        # Test with corrupted export data
        corrupted_data = {
            "metadata": {"checksum": "invalid_checksum"},
            "routes": {"data": []},
            "users": {"data": []}
        }
        
        with pytest.raises(SerializationError) as exc_info:
            backup_service.import_and_validate_data(corrupted_data)
        
        assert "integrity check failed" in str(exc_info.value).lower(), "Should detect data corruption"
        
        # Test with missing metadata
        incomplete_data = {
            "routes": {"data": []},
            "users": {"data": []}
        }
        
        with pytest.raises(SerializationError) as exc_info:
            backup_service.import_and_validate_data(incomplete_data)
        
        assert "missing metadata" in str(exc_info.value).lower(), "Should detect missing metadata"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])