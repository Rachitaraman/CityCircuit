"""
Test script for new API endpoints
Tests the Flask API endpoints for result generation and ranking
"""

import requests
import json
from datetime import datetime, timezone

# Test data
test_original_route = {
    "name": "Original Test Route",
    "description": "Test route for API testing",
    "stops": [
        {
            "name": "Start Stop",
            "coordinates": {"latitude": 19.0760, "longitude": 72.8777},
            "address": "Mumbai Central",
            "amenities": ["shelter"],
            "daily_passenger_count": 1000,
            "is_accessible": False
        },
        {
            "name": "End Stop",
            "coordinates": {"latitude": 19.0896, "longitude": 72.8656},
            "address": "Dadar",
            "amenities": ["shelter", "seating"],
            "daily_passenger_count": 1500,
            "is_accessible": True
        }
    ],
    "operator_id": "test-operator",
    "estimated_travel_time": 45,
    "optimization_score": 60.0
}

test_optimized_route = {
    "name": "Optimized Test Route",
    "description": "Optimized version for API testing",
    "stops": [
        {
            "name": "Start Stop",
            "coordinates": {"latitude": 19.0760, "longitude": 72.8777},
            "address": "Mumbai Central",
            "amenities": ["shelter", "wheelchair_accessible"],
            "daily_passenger_count": 1000,
            "is_accessible": True
        },
        {
            "name": "End Stop",
            "coordinates": {"latitude": 19.0896, "longitude": 72.8656},
            "address": "Dadar",
            "amenities": ["shelter", "seating", "wheelchair_accessible"],
            "daily_passenger_count": 1500,
            "is_accessible": True
        },
        {
            "name": "New Stop",
            "coordinates": {"latitude": 19.0850, "longitude": 72.8700},
            "address": "New Coverage Area",
            "amenities": ["shelter", "seating", "wheelchair_accessible"],
            "daily_passenger_count": 800,
            "is_accessible": True
        }
    ],
    "operator_id": "test-operator",
    "estimated_travel_time": 35,
    "optimization_score": 85.0
}

def test_health_endpoint():
    """Test basic health endpoint"""
    try:
        response = requests.get("http://localhost:5000/health")
        print(f"Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            return True
    except Exception as e:
        print(f"Health check failed: {e}")
    return False

def test_efficiency_metrics_endpoint():
    """Test efficiency metrics calculation endpoint"""
    try:
        data = {
            "original_route": test_original_route,
            "optimized_route": test_optimized_route
        }
        
        response = requests.post(
            "http://localhost:5000/api/ml/calculate/efficiency-metrics",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Efficiency metrics: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Metrics calculated successfully:")
            print(f"  Time improvement: {result['metrics']['time_improvement']:.2f}%")
            print(f"  Distance reduction: {result['metrics']['distance_reduction']:.2f}%")
            print(f"  Coverage increase: {result['metrics']['passenger_coverage_increase']:.2f}%")
            print(f"  Cost savings: {result['metrics']['cost_savings']:.2f}%")
            print(f"  Overall score: {result['metrics']['overall_score']:.2f}%")
            return True
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Efficiency metrics test failed: {e}")
    return False

def test_generate_optimization_result_endpoint():
    """Test optimization result generation endpoint"""
    try:
        data = {
            "original_route": test_original_route,
            "optimized_route": test_optimized_route
        }
        
        response = requests.post(
            "http://localhost:5000/api/ml/generate/optimization-result",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Generate optimization result: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Optimization result generated successfully:")
            print(f"  Route: {result['optimization_result']['optimized_route']['name']}")
            print(f"  Is improvement: {result['optimization_result']['is_improvement']}")
            return result['optimization_result']
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Generate optimization result test failed: {e}")
    return None

if __name__ == "__main__":
    print("Testing new API endpoints...")
    print("=" * 50)
    
    # Test health first
    if not test_health_endpoint():
        print("Flask server is not running. Please start it first.")
        exit(1)
    
    print("\n" + "=" * 50)
    
    # Test efficiency metrics
    print("Testing efficiency metrics calculation...")
    test_efficiency_metrics_endpoint()
    
    print("\n" + "=" * 50)
    
    # Test optimization result generation
    print("Testing optimization result generation...")
    optimization_result = test_generate_optimization_result_endpoint()
    
    print("\n" + "=" * 50)
    print("API endpoint testing completed!")