#!/usr/bin/env python3
"""
Test script to verify repository pattern implementation
"""

from dotenv import load_dotenv
load_dotenv()

from repositories import (
    BusStopRepository, RouteRepository, UserRepository,
    UnitOfWork, get_unit_of_work
)
from models import BusStop, Route, User, UserRole, UserProfile, UserPreferences, Coordinates
from database.connection import get_db_context

def test_repositories():
    """Test repository pattern implementation"""
    
    print("Testing repository pattern implementation...")
    
    # Test Unit of Work pattern
    with get_unit_of_work() as uow:
        print("✓ Unit of Work context manager working")
        
        # Test BusStop repository
        print("\n--- Testing BusStop Repository ---")
        
        # Create a bus stop
        bus_stop = BusStop(
            name="Test Repository Stop",
            coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
            address="Test Repository Address",
            amenities=["shelter", "seating"],
            daily_passenger_count=1500,
            is_accessible=True
        )
        
        # Create through repository
        created_stop = uow.bus_stops.create(bus_stop)
        print(f"✓ Created bus stop: {created_stop.name} (ID: {created_stop.id})")
        
        # Get by ID
        retrieved_stop = uow.bus_stops.get_by_id(created_stop.id)
        print(f"✓ Retrieved bus stop by ID: {retrieved_stop.name}")
        
        # Find by name
        stops_by_name = uow.bus_stops.find_by_name("Repository")
        print(f"✓ Found {len(stops_by_name)} stops by name search")
        
        # Find nearby
        nearby_stops = uow.bus_stops.find_nearby(19.0760, 72.8777, 1.0)
        print(f"✓ Found {len(nearby_stops)} nearby stops")
        
        # Find accessible
        accessible_stops = uow.bus_stops.find_accessible()
        print(f"✓ Found {len(accessible_stops)} accessible stops")
        
        # Test Route repository
        print("\n--- Testing Route Repository ---")
        
        # Create another stop for the route
        stop2 = BusStop(
            name="Test Repository Stop 2",
            coordinates=Coordinates(latitude=19.0800, longitude=72.8800),
            address="Test Repository Address 2",
            amenities=["shelter"],
            daily_passenger_count=1200,
            is_accessible=False
        )
        created_stop2 = uow.bus_stops.create(stop2)
        
        # Create a route
        route = Route(
            name="Test Repository Route",
            description="A test route for repository testing",
            stops=[created_stop, created_stop2],
            operator_id="test-repo-operator",
            estimated_travel_time=25
        )
        
        # Create through repository using the new method
        created_route = uow.routes.create_route_with_stops(route)
        print(f"✓ Created route: {created_route.name} (ID: {created_route.id})")
        
        # Route already has stops from create_route_with_stops method
        print(f"✓ Route created with {len(created_route.stops)} stops")
        
        # Get route with stops
        retrieved_route = uow.routes.get_by_id(created_route.id)
        print(f"✓ Retrieved route with {len(retrieved_route.stops)} stops")
        
        # Find by operator
        operator_routes = uow.routes.find_by_operator("test-repo-operator")
        print(f"✓ Found {len(operator_routes)} routes by operator")
        
        # Find active routes
        active_routes = uow.routes.find_active_routes()
        print(f"✓ Found {len(active_routes)} active routes")
        
        # Validate route data
        validation_result = uow.routes.validate_route_data(retrieved_route)
        print(f"✓ Route validation: {'Valid' if validation_result['is_valid'] else 'Invalid'}")
        if validation_result['errors']:
            print(f"  Errors: {validation_result['errors']}")
        if validation_result['warnings']:
            print(f"  Warnings: {validation_result['warnings']}")
        
        # Test User repository
        print("\n--- Testing User Repository ---")
        
        # Create a user
        user = User(
            email="test@repository.com",
            role=UserRole.OPERATOR,
            profile=UserProfile(
                name="Test Repository User",
                organization="Test Organization",
                preferences=UserPreferences(
                    language="en",
                    theme="light",
                    notifications=True,
                    map_style="default"
                )
            )
        )
        
        # Create through repository
        created_user = uow.users.create(user)
        print(f"✓ Created user: {created_user.email} (ID: {created_user.id})")
        
        # Find by email
        user_by_email = uow.users.find_by_email("test@repository.com")
        print(f"✓ Found user by email: {user_by_email.email}")
        
        # Find by role
        users_by_role = uow.users.find_by_role("operator")
        print(f"✓ Found {len(users_by_role)} users by role")
        
        # Update last login
        login_updated = uow.users.update_last_login(created_user.id)
        print(f"✓ Updated last login: {login_updated}")
        
        # Test repository counts
        print("\n--- Testing Repository Counts ---")
        print(f"✓ Total bus stops: {uow.bus_stops.count()}")
        print(f"✓ Total routes: {uow.routes.count()}")
        print(f"✓ Total users: {uow.users.count()}")
        
        # Test exists method
        print(f"✓ Bus stop exists: {uow.bus_stops.exists(created_stop.id)}")
        print(f"✓ Route exists: {uow.routes.exists(created_route.id)}")
        print(f"✓ User exists: {uow.users.exists(created_user.id)}")
        
        # Test update operations
        print("\n--- Testing Update Operations ---")
        
        # Update bus stop
        created_stop.daily_passenger_count = 2000
        updated_stop = uow.bus_stops.update(created_stop.id, created_stop)
        print(f"✓ Updated bus stop passenger count: {updated_stop.daily_passenger_count}")
        
        # Update route
        created_route.optimization_score = 85.5
        updated_route = uow.routes.update(created_route.id, created_route)
        print(f"✓ Updated route optimization score: {updated_route.optimization_score}")
        
        print("\n✓ All repository tests completed successfully!")
        
        # Transaction will be automatically committed when exiting the context


def test_error_handling():
    """Test repository error handling"""
    print("\n--- Testing Error Handling ---")
    
    with get_unit_of_work() as uow:
        # Test getting non-existent entity
        non_existent = uow.bus_stops.get_by_id("non-existent-id")
        print(f"✓ Non-existent entity returns None: {non_existent is None}")
        
        # Test exists for non-existent entity
        exists = uow.bus_stops.exists("non-existent-id")
        print(f"✓ Non-existent entity exists check: {exists}")
        
        # Test delete non-existent entity
        deleted = uow.bus_stops.delete("non-existent-id")
        print(f"✓ Delete non-existent entity returns False: {not deleted}")


if __name__ == "__main__":
    test_repositories()
    test_error_handling()