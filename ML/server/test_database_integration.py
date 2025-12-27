#!/usr/bin/env python3
"""
Test script to verify database integration with Pydantic models
"""

from dotenv import load_dotenv
load_dotenv()

from database.connection import get_db_context
from database.models import BusStop as DBBusStop, Route as DBRoute
from models import BusStop, Route, Coordinates
from datetime import datetime, timezone

def test_database_integration():
    """Test that we can create and retrieve data using both Pydantic and SQLAlchemy models"""
    
    print("Testing database integration...")
    
    # Create Pydantic models
    pydantic_stop1 = BusStop(
        name="Test Stop 1",
        coordinates=Coordinates(latitude=19.0760, longitude=72.8777),
        address="Test Address 1",
        amenities=["shelter", "seating"],
        daily_passenger_count=1000,
        is_accessible=True
    )
    
    pydantic_stop2 = BusStop(
        name="Test Stop 2", 
        coordinates=Coordinates(latitude=19.0800, longitude=72.8800),
        address="Test Address 2",
        amenities=["shelter"],
        daily_passenger_count=800,
        is_accessible=False
    )
    
    print(f"Created Pydantic bus stops: {pydantic_stop1.name}, {pydantic_stop2.name}")
    
    # Convert to SQLAlchemy models and save to database
    with get_db_context() as session:
        # Create SQLAlchemy bus stops
        db_stop1 = DBBusStop(
            id=pydantic_stop1.id,
            name=pydantic_stop1.name,
            latitude=pydantic_stop1.coordinates.latitude,
            longitude=pydantic_stop1.coordinates.longitude,
            address=pydantic_stop1.address,
            amenities=pydantic_stop1.amenities,
            daily_passenger_count=pydantic_stop1.daily_passenger_count,
            is_accessible=pydantic_stop1.is_accessible,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db_stop2 = DBBusStop(
            id=pydantic_stop2.id,
            name=pydantic_stop2.name,
            latitude=pydantic_stop2.coordinates.latitude,
            longitude=pydantic_stop2.coordinates.longitude,
            address=pydantic_stop2.address,
            amenities=pydantic_stop2.amenities,
            daily_passenger_count=pydantic_stop2.daily_passenger_count,
            is_accessible=pydantic_stop2.is_accessible,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        # Add to session
        session.add(db_stop1)
        session.add(db_stop2)
        session.flush()  # Flush to get IDs
        
        print(f"Saved bus stops to database with IDs: {db_stop1.id}, {db_stop2.id}")
        
        # Create a route
        pydantic_route = Route(
            name="Test Route",
            description="A test route connecting two stops",
            stops=[pydantic_stop1, pydantic_stop2],
            operator_id="test-operator",
            estimated_travel_time=30
        )
        
        db_route = DBRoute(
            id=pydantic_route.id,
            name=pydantic_route.name,
            description=pydantic_route.description,
            operator_id=pydantic_route.operator_id,
            is_active=pydantic_route.is_active,
            optimization_score=pydantic_route.optimization_score,
            estimated_travel_time=pydantic_route.estimated_travel_time,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        session.add(db_route)
        session.flush()
        
        # Add stops to route (many-to-many relationship with order)
        from database.models import route_stops
        from sqlalchemy import insert
        
        # Insert route-stop associations with order
        session.execute(
            insert(route_stops).values([
                {
                    'route_id': db_route.id,
                    'bus_stop_id': db_stop1.id,
                    'stop_order': 1,
                    'created_at': datetime.now(timezone.utc)
                },
                {
                    'route_id': db_route.id,
                    'bus_stop_id': db_stop2.id,
                    'stop_order': 2,
                    'created_at': datetime.now(timezone.utc)
                }
            ])
        )
        
        print(f"Created route '{db_route.name}' with {len(db_route.stops)} stops")
        
        # Query back from database
        retrieved_route = session.query(DBRoute).filter_by(name="Test Route").first()
        if retrieved_route:
            print(f"Retrieved route: {retrieved_route.name}")
            print(f"Route has {len(retrieved_route.stops)} stops:")
            for stop in retrieved_route.stops:
                print(f"  - {stop.name} at ({stop.latitude}, {stop.longitude})")
        
        # Test querying bus stops
        all_stops = session.query(DBBusStop).all()
        print(f"Total bus stops in database: {len(all_stops)}")
        
        # Test geospatial query (find stops near a coordinate)
        nearby_stops = session.query(DBBusStop).filter(
            DBBusStop.latitude.between(19.0, 19.1),
            DBBusStop.longitude.between(72.8, 72.9)
        ).all()
        print(f"Stops in coordinate range: {len(nearby_stops)}")
        
    print("✓ Database integration test completed successfully!")

if __name__ == "__main__":
    test_database_integration()