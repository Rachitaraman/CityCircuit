"""
Route analysis algorithms for CityCircuit ML Service
Implements TensorFlow-based route optimization and analysis
"""

import numpy as np
import tensorflow as tf
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import logging
from dataclasses import dataclass

from models.route import Route, BusStop
from models.population import PopulationDensityData, DensityPoint
from models.base import Coordinates

logger = logging.getLogger(__name__)


@dataclass
class RouteAnalysisResult:
    """Result of route analysis containing metrics and recommendations"""
    route_id: str
    efficiency_score: float
    coverage_score: float
    accessibility_score: float
    travel_time_estimate: int
    passenger_demand_score: float
    bottlenecks: List[Dict[str, Any]]
    recommendations: List[str]
    analysis_timestamp: datetime
    
    def get_overall_score(self) -> float:
        """Calculate overall route quality score"""
        weights = {
            'efficiency': 0.25,
            'coverage': 0.25, 
            'accessibility': 0.20,
            'demand': 0.30
        }
        
        return (
            self.efficiency_score * weights['efficiency'] +
            self.coverage_score * weights['coverage'] +
            self.accessibility_score * weights['accessibility'] +
            self.passenger_demand_score * weights['demand']
        )


class RouteAnalyzer:
    """
    TensorFlow-based route analyzer for optimization and performance evaluation
    """
    
    def __init__(self):
        """Initialize the route analyzer with TensorFlow models"""
        self.logger = logging.getLogger(__name__)
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize TensorFlow models for route analysis"""
        try:
            # Create a simple neural network for route efficiency prediction
            self.efficiency_model = tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu', input_shape=(10,)),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(16, activation='relu'),
                tf.keras.layers.Dense(1, activation='sigmoid')
            ])
            
            # Compile the model
            self.efficiency_model.compile(
                optimizer='adam',
                loss='mse',
                metrics=['mae']
            )
            
            # Create coverage analysis model
            self.coverage_model = tf.keras.Sequential([
                tf.keras.layers.Dense(32, activation='relu', input_shape=(8,)),
                tf.keras.layers.Dense(16, activation='relu'),
                tf.keras.layers.Dense(1, activation='sigmoid')
            ])
            
            self.coverage_model.compile(
                optimizer='adam',
                loss='mse',
                metrics=['mae']
            )
            
            self.logger.info("TensorFlow models initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize TensorFlow models: {e}")
            # Fallback to rule-based analysis if TensorFlow fails
            self.efficiency_model = None
            self.coverage_model = None
    
    def analyze_route(self, route: Route, population_data: Optional[PopulationDensityData] = None) -> RouteAnalysisResult:
        """
        Perform comprehensive analysis of a route
        
        Args:
            route: Route to analyze
            population_data: Optional population density data for enhanced analysis
            
        Returns:
            RouteAnalysisResult with detailed metrics and recommendations
        """
        try:
            self.logger.info(f"Starting analysis for route: {route.name}")
            
            # Calculate basic route metrics
            efficiency_score = self._calculate_efficiency_score(route)
            coverage_score = self._calculate_coverage_score(route, population_data)
            accessibility_score = self._calculate_accessibility_score(route)
            travel_time_estimate = self._estimate_travel_time(route)
            passenger_demand_score = self._calculate_passenger_demand_score(route, population_data)
            
            # Identify bottlenecks
            bottlenecks = self._identify_bottlenecks(route)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(route, efficiency_score, coverage_score, accessibility_score)
            
            result = RouteAnalysisResult(
                route_id=route.id,
                efficiency_score=efficiency_score,
                coverage_score=coverage_score,
                accessibility_score=accessibility_score,
                travel_time_estimate=travel_time_estimate,
                passenger_demand_score=passenger_demand_score,
                bottlenecks=bottlenecks,
                recommendations=recommendations,
                analysis_timestamp=datetime.now(timezone.utc)
            )
            
            self.logger.info(f"Route analysis completed. Overall score: {result.get_overall_score():.2f}")
            return result
            
        except Exception as e:
            self.logger.error(f"Route analysis failed: {e}")
            raise
    
    def _calculate_efficiency_score(self, route: Route) -> float:
        """Calculate route efficiency using TensorFlow model or rule-based approach"""
        try:
            # Extract features for efficiency analysis
            features = self._extract_efficiency_features(route)
            
            if self.efficiency_model is not None:
                # Use TensorFlow model for prediction
                features_array = np.array([features], dtype=np.float32)
                prediction = self.efficiency_model.predict(features_array, verbose=0)
                score = float(prediction[0][0]) * 100
            else:
                # Fallback to rule-based calculation
                score = self._rule_based_efficiency_score(features)
            
            return max(0.0, min(100.0, score))
            
        except Exception as e:
            self.logger.warning(f"Efficiency calculation failed, using fallback: {e}")
            return 50.0  # Default moderate score
    
    def _extract_efficiency_features(self, route: Route) -> List[float]:
        """Extract numerical features for efficiency analysis"""
        features = []
        
        # Route length (number of stops)
        features.append(len(route.stops))
        
        # Average distance between consecutive stops (approximated)
        if len(route.stops) > 1:
            total_distance = 0
            for i in range(len(route.stops) - 1):
                dist = self._calculate_distance(
                    route.stops[i].coordinates,
                    route.stops[i + 1].coordinates
                )
                total_distance += dist
            avg_distance = total_distance / (len(route.stops) - 1)
            features.append(avg_distance)
        else:
            features.append(0.0)
        
        # Travel time per stop ratio
        if len(route.stops) > 0:
            time_per_stop = route.estimated_travel_time / len(route.stops)
            features.append(time_per_stop)
        else:
            features.append(0.0)
        
        # Accessibility ratio
        accessible_stops = sum(1 for stop in route.stops if stop.is_accessible)
        accessibility_ratio = accessible_stops / len(route.stops) if route.stops else 0
        features.append(accessibility_ratio)
        
        # Average passenger count
        avg_passengers = sum(stop.daily_passenger_count for stop in route.stops) / len(route.stops) if route.stops else 0
        features.append(avg_passengers / 1000)  # Normalize
        
        # Route activity status
        features.append(1.0 if route.is_active else 0.0)
        
        # Current optimization score (normalized)
        features.append(route.optimization_score / 100.0)
        
        # Coordinate spread (route coverage area approximation)
        if len(route.stops) > 1:
            lats = [stop.coordinates.latitude for stop in route.stops]
            lons = [stop.coordinates.longitude for stop in route.stops]
            lat_spread = max(lats) - min(lats)
            lon_spread = max(lons) - min(lons)
            features.extend([lat_spread, lon_spread])
        else:
            features.extend([0.0, 0.0])
        
        # Pad or truncate to exactly 10 features
        while len(features) < 10:
            features.append(0.0)
        
        return features[:10]
    
    def _rule_based_efficiency_score(self, features: List[float]) -> float:
        """Calculate efficiency score using rule-based approach"""
        score = 50.0  # Base score
        
        # Adjust based on route length (optimal around 8-12 stops)
        stop_count = features[0]
        if 8 <= stop_count <= 12:
            score += 15
        elif 5 <= stop_count <= 15:
            score += 10
        else:
            score -= 10
        
        # Adjust based on average distance between stops
        avg_distance = features[1]
        if 0.5 <= avg_distance <= 2.0:  # Optimal distance range
            score += 10
        elif avg_distance > 5.0:  # Too far apart
            score -= 15
        
        # Adjust based on time efficiency
        time_per_stop = features[2]
        if time_per_stop <= 5:  # Efficient timing
            score += 10
        elif time_per_stop > 10:  # Inefficient
            score -= 10
        
        # Adjust based on accessibility
        accessibility_ratio = features[3]
        score += accessibility_ratio * 15  # Up to 15 points for full accessibility
        
        return max(0.0, min(100.0, score))
    
    def _calculate_coverage_score(self, route: Route, population_data: Optional[PopulationDensityData]) -> float:
        """Calculate how well the route covers population density areas"""
        try:
            if not population_data or not population_data.density_points:
                # Fallback to basic coverage calculation
                return self._basic_coverage_score(route)
            
            # Calculate coverage based on population density
            total_population = sum(point.population for point in population_data.density_points)
            if total_population == 0:
                return 50.0
            
            covered_population = 0
            coverage_radius = 0.01  # Approximately 1km in degrees
            
            for density_point in population_data.density_points:
                for stop in route.stops:
                    distance = self._calculate_distance(stop.coordinates, density_point.coordinates)
                    if distance <= coverage_radius:
                        covered_population += density_point.population
                        break  # Don't double count
            
            coverage_ratio = covered_population / total_population
            return min(100.0, coverage_ratio * 100)
            
        except Exception as e:
            self.logger.warning(f"Coverage calculation failed: {e}")
            return self._basic_coverage_score(route)
    
    def _basic_coverage_score(self, route: Route) -> float:
        """Basic coverage score based on route characteristics"""
        if not route.stops:
            return 0.0
        
        # Calculate geographic spread
        lats = [stop.coordinates.latitude for stop in route.stops]
        lons = [stop.coordinates.longitude for stop in route.stops]
        
        lat_range = max(lats) - min(lats)
        lon_range = max(lons) - min(lons)
        
        # Normalize coverage (larger spread = better coverage, up to a point)
        coverage = min(100.0, (lat_range + lon_range) * 1000)  # Scale factor
        return max(10.0, coverage)  # Minimum 10% coverage
    
    def _calculate_accessibility_score(self, route: Route) -> float:
        """Calculate accessibility score based on wheelchair accessible stops"""
        if not route.stops:
            return 0.0
        
        accessible_count = sum(1 for stop in route.stops if stop.is_accessible)
        accessibility_ratio = accessible_count / len(route.stops)
        
        # Bonus for having amenities
        amenity_bonus = 0
        for stop in route.stops:
            if stop.amenities:
                amenity_bonus += len(stop.amenities)
        
        amenity_score = min(20.0, amenity_bonus / len(route.stops))  # Up to 20 points
        
        return (accessibility_ratio * 80) + amenity_score  # Up to 100 points
    
    def _estimate_travel_time(self, route: Route) -> int:
        """Estimate travel time based on route characteristics"""
        if not route.stops or len(route.stops) < 2:
            return route.estimated_travel_time
        
        # Calculate based on distances and typical speeds
        total_distance = 0
        for i in range(len(route.stops) - 1):
            distance = self._calculate_distance(
                route.stops[i].coordinates,
                route.stops[i + 1].coordinates
            )
            total_distance += distance
        
        # Assume average speed of 25 km/h in urban areas
        travel_time_hours = total_distance / 25.0
        travel_time_minutes = int(travel_time_hours * 60)
        
        # Add stop time (2 minutes per stop)
        stop_time = len(route.stops) * 2
        
        estimated_time = travel_time_minutes + stop_time
        
        # Use the maximum of calculated time and provided estimate
        return max(estimated_time, route.estimated_travel_time)
    
    def _calculate_passenger_demand_score(self, route: Route, population_data: Optional[PopulationDensityData]) -> float:
        """Calculate passenger demand score"""
        if not route.stops:
            return 0.0
        
        # Base score from actual passenger counts
        total_passengers = sum(stop.daily_passenger_count for stop in route.stops)
        avg_passengers = total_passengers / len(route.stops)
        
        # Normalize to 0-100 scale (assuming 1000 passengers/day is excellent)
        base_score = min(100.0, (avg_passengers / 1000.0) * 100)
        
        # Adjust based on population density if available
        if population_data and population_data.density_points:
            density_bonus = self._calculate_density_bonus(route, population_data)
            base_score = min(100.0, base_score + density_bonus)
        
        return base_score
    
    def _calculate_density_bonus(self, route: Route, population_data: PopulationDensityData) -> float:
        """Calculate bonus score based on population density coverage"""
        bonus = 0.0
        coverage_radius = 0.01  # Approximately 1km
        
        for stop in route.stops:
            nearby_population = 0
            for density_point in population_data.density_points:
                distance = self._calculate_distance(stop.coordinates, density_point.coordinates)
                if distance <= coverage_radius:
                    nearby_population += density_point.population
            
            # Add bonus based on nearby population (up to 10 points per stop)
            stop_bonus = min(10.0, nearby_population / 1000.0)
            bonus += stop_bonus
        
        return min(20.0, bonus / len(route.stops))  # Cap at 20 points
    
    def _identify_bottlenecks(self, route: Route) -> List[Dict[str, Any]]:
        """Identify potential bottlenecks in the route"""
        bottlenecks = []
        
        if not route.stops or len(route.stops) < 2:
            return bottlenecks
        
        # Check for stops with very high passenger counts
        avg_passengers = sum(stop.daily_passenger_count for stop in route.stops) / len(route.stops)
        high_threshold = avg_passengers * 2
        
        for i, stop in enumerate(route.stops):
            if stop.daily_passenger_count > high_threshold:
                bottlenecks.append({
                    'type': 'high_demand_stop',
                    'stop_index': i,
                    'stop_name': stop.name,
                    'passenger_count': stop.daily_passenger_count,
                    'severity': 'high' if stop.daily_passenger_count > avg_passengers * 3 else 'medium',
                    'description': f"Stop '{stop.name}' has unusually high passenger demand"
                })
        
        # Check for large gaps between stops
        for i in range(len(route.stops) - 1):
            distance = self._calculate_distance(
                route.stops[i].coordinates,
                route.stops[i + 1].coordinates
            )
            if distance > 5.0:  # More than 5km between stops
                bottlenecks.append({
                    'type': 'large_gap',
                    'stop_index': i,
                    'next_stop_index': i + 1,
                    'distance_km': round(distance, 2),
                    'severity': 'high' if distance > 10.0 else 'medium',
                    'description': f"Large gap ({distance:.1f}km) between '{route.stops[i].name}' and '{route.stops[i+1].name}'"
                })
        
        # Check for accessibility issues
        inaccessible_stops = [i for i, stop in enumerate(route.stops) if not stop.is_accessible]
        if len(inaccessible_stops) > len(route.stops) * 0.5:  # More than 50% inaccessible
            bottlenecks.append({
                'type': 'accessibility_issue',
                'affected_stops': inaccessible_stops,
                'severity': 'medium',
                'description': f"{len(inaccessible_stops)} out of {len(route.stops)} stops are not wheelchair accessible"
            })
        
        return bottlenecks
    
    def _generate_recommendations(self, route: Route, efficiency_score: float, 
                                coverage_score: float, accessibility_score: float) -> List[str]:
        """Generate optimization recommendations based on analysis"""
        recommendations = []
        
        # Efficiency recommendations
        if efficiency_score < 60:
            if len(route.stops) > 15:
                recommendations.append("Consider reducing the number of stops to improve efficiency")
            elif len(route.stops) < 5:
                recommendations.append("Consider adding more stops to better serve the area")
            
            recommendations.append("Review stop spacing and timing to optimize travel efficiency")
        
        # Coverage recommendations
        if coverage_score < 50:
            recommendations.append("Consider adjusting route path to cover higher population density areas")
            recommendations.append("Analyze population data to identify underserved areas")
        
        # Accessibility recommendations
        if accessibility_score < 70:
            recommendations.append("Improve wheelchair accessibility at more stops")
            recommendations.append("Add amenities like shelters and seating at stops")
        
        # General recommendations
        if route.estimated_travel_time > 120:  # More than 2 hours
            recommendations.append("Consider splitting this route into shorter segments")
        
        if not route.is_active:
            recommendations.append("Evaluate reactivating this route based on analysis results")
        
        # If no specific issues found
        if not recommendations:
            recommendations.append("Route performance is good - consider minor optimizations for continuous improvement")
        
        return recommendations
    
    def _calculate_distance(self, coord1: Coordinates, coord2: Coordinates) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        # Convert to radians
        lat1, lon1 = np.radians(coord1.latitude), np.radians(coord1.longitude)
        lat2, lon2 = np.radians(coord2.latitude), np.radians(coord2.longitude)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return r * c
    
    def batch_analyze_routes(self, routes: List[Route], 
                           population_data: Optional[PopulationDensityData] = None) -> List[RouteAnalysisResult]:
        """Analyze multiple routes in batch for efficiency"""
        results = []
        
        self.logger.info(f"Starting batch analysis of {len(routes)} routes")
        
        for i, route in enumerate(routes):
            try:
                result = self.analyze_route(route, population_data)
                results.append(result)
                
                if (i + 1) % 10 == 0:  # Log progress every 10 routes
                    self.logger.info(f"Completed analysis for {i + 1}/{len(routes)} routes")
                    
            except Exception as e:
                self.logger.error(f"Failed to analyze route {route.id}: {e}")
                # Continue with other routes
                continue
        
        self.logger.info(f"Batch analysis completed. {len(results)} routes analyzed successfully")
        return results