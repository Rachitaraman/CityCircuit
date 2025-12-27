"""
Path matrix calculation algorithms for CityCircuit ML Service
Calculates optimal paths between bus stops using various algorithms
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

from models.route import Route, BusStop
from models.base import Coordinates

logger = logging.getLogger(__name__)


class PathAlgorithm(Enum):
    """Available path calculation algorithms"""
    HAVERSINE = "haversine"  # Great circle distance
    MANHATTAN = "manhattan"  # Manhattan distance approximation
    EUCLIDEAN = "euclidean"  # Euclidean distance
    WEIGHTED = "weighted"    # Weighted distance considering traffic patterns


@dataclass
class PathSegment:
    """Represents a segment between two stops"""
    origin_stop_id: str
    destination_stop_id: str
    distance_km: float
    estimated_time_minutes: int
    traffic_factor: float
    difficulty_score: float  # Based on terrain, traffic, etc.


@dataclass
class PathMatrix:
    """Matrix containing distances and travel times between all stop pairs"""
    stop_ids: List[str]
    distance_matrix: np.ndarray  # Distance in km
    time_matrix: np.ndarray      # Time in minutes
    segments: List[PathSegment]
    algorithm_used: PathAlgorithm
    calculation_timestamp: str


class PathMatrixCalculator:
    """
    Calculates path matrices for route optimization using various algorithms
    """
    
    def __init__(self):
        """Initialize the path matrix calculator"""
        self.logger = logging.getLogger(__name__)
        
        # Traffic patterns (simplified - could be enhanced with real traffic data)
        self.traffic_patterns = {
            'peak_morning': {'start': 7, 'end': 9, 'factor': 1.5},
            'peak_evening': {'start': 17, 'end': 19, 'factor': 1.4},
            'midday': {'start': 11, 'end': 14, 'factor': 1.1},
            'off_peak': {'factor': 1.0}
        }
    
    def calculate_path_matrix(self, stops: List[BusStop], 
                            algorithm: PathAlgorithm = PathAlgorithm.HAVERSINE) -> PathMatrix:
        """
        Calculate path matrix between all pairs of stops
        
        Args:
            stops: List of bus stops
            algorithm: Algorithm to use for path calculation
            
        Returns:
            PathMatrix with distances and travel times
        """
        try:
            self.logger.info(f"Calculating path matrix for {len(stops)} stops using {algorithm.value}")
            
            n_stops = len(stops)
            stop_ids = [stop.id for stop in stops]
            
            # Initialize matrices
            distance_matrix = np.zeros((n_stops, n_stops))
            time_matrix = np.zeros((n_stops, n_stops))
            segments = []
            
            # Calculate distances and times for all pairs
            for i in range(n_stops):
                for j in range(n_stops):
                    if i != j:
                        distance = self._calculate_distance(stops[i], stops[j], algorithm)
                        time = self._estimate_travel_time(stops[i], stops[j], distance)
                        traffic_factor = self._get_traffic_factor(stops[i], stops[j])
                        difficulty = self._calculate_difficulty_score(stops[i], stops[j])
                        
                        distance_matrix[i, j] = distance
                        time_matrix[i, j] = time * traffic_factor
                        
                        # Create segment
                        segment = PathSegment(
                            origin_stop_id=stops[i].id,
                            destination_stop_id=stops[j].id,
                            distance_km=distance,
                            estimated_time_minutes=int(time * traffic_factor),
                            traffic_factor=traffic_factor,
                            difficulty_score=difficulty
                        )
                        segments.append(segment)
            
            matrix = PathMatrix(
                stop_ids=stop_ids,
                distance_matrix=distance_matrix,
                time_matrix=time_matrix,
                segments=segments,
                algorithm_used=algorithm,
                calculation_timestamp=str(np.datetime64('now'))
            )
            
            self.logger.info(f"Path matrix calculation completed. {len(segments)} segments calculated")
            return matrix
            
        except Exception as e:
            self.logger.error(f"Path matrix calculation failed: {e}")
            raise
    
    def _calculate_distance(self, stop1: BusStop, stop2: BusStop, 
                          algorithm: PathAlgorithm) -> float:
        """Calculate distance between two stops using specified algorithm"""
        
        if algorithm == PathAlgorithm.HAVERSINE:
            return self._haversine_distance(stop1.coordinates, stop2.coordinates)
        elif algorithm == PathAlgorithm.MANHATTAN:
            return self._manhattan_distance(stop1.coordinates, stop2.coordinates)
        elif algorithm == PathAlgorithm.EUCLIDEAN:
            return self._euclidean_distance(stop1.coordinates, stop2.coordinates)
        elif algorithm == PathAlgorithm.WEIGHTED:
            return self._weighted_distance(stop1, stop2)
        else:
            # Default to Haversine
            return self._haversine_distance(stop1.coordinates, stop2.coordinates)
    
    def _haversine_distance(self, coord1: Coordinates, coord2: Coordinates) -> float:
        """Calculate great circle distance using Haversine formula"""
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
    
    def _manhattan_distance(self, coord1: Coordinates, coord2: Coordinates) -> float:
        """Calculate Manhattan distance approximation"""
        # Convert degrees to approximate km
        lat_diff = abs(coord2.latitude - coord1.latitude) * 111  # 1 degree lat ≈ 111 km
        
        # Longitude distance depends on latitude
        avg_lat = (coord1.latitude + coord2.latitude) / 2
        lon_diff = abs(coord2.longitude - coord1.longitude) * 111 * np.cos(np.radians(avg_lat))
        
        return lat_diff + lon_diff
    
    def _euclidean_distance(self, coord1: Coordinates, coord2: Coordinates) -> float:
        """Calculate Euclidean distance approximation"""
        # Convert degrees to approximate km
        lat_diff = (coord2.latitude - coord1.latitude) * 111
        
        # Longitude distance depends on latitude
        avg_lat = (coord1.latitude + coord2.latitude) / 2
        lon_diff = (coord2.longitude - coord1.longitude) * 111 * np.cos(np.radians(avg_lat))
        
        return np.sqrt(lat_diff**2 + lon_diff**2)
    
    def _weighted_distance(self, stop1: BusStop, stop2: BusStop) -> float:
        """Calculate weighted distance considering various factors"""
        # Base distance using Haversine
        base_distance = self._haversine_distance(stop1.coordinates, stop2.coordinates)
        
        # Apply weights based on stop characteristics
        weight_factor = 1.0
        
        # Accessibility factor - prefer accessible routes
        if stop1.is_accessible and stop2.is_accessible:
            weight_factor *= 0.95  # 5% reduction for accessible routes
        elif not stop1.is_accessible or not stop2.is_accessible:
            weight_factor *= 1.1   # 10% increase for non-accessible routes
        
        # Passenger volume factor - prefer high-volume connections
        avg_passengers = (stop1.daily_passenger_count + stop2.daily_passenger_count) / 2
        if avg_passengers > 5000:
            weight_factor *= 0.9   # 10% reduction for high-volume routes
        elif avg_passengers < 1000:
            weight_factor *= 1.15  # 15% increase for low-volume routes
        
        # Amenities factor - prefer stops with better amenities
        total_amenities = len(stop1.amenities) + len(stop2.amenities)
        if total_amenities > 4:
            weight_factor *= 0.95  # 5% reduction for well-equipped stops
        
        return base_distance * weight_factor
    
    def _estimate_travel_time(self, stop1: BusStop, stop2: BusStop, distance_km: float) -> float:
        """Estimate travel time between stops"""
        # Base speed assumptions (km/h)
        base_speed = 25  # Urban bus average speed
        
        # Adjust speed based on passenger volume (more stops = slower)
        avg_passengers = (stop1.daily_passenger_count + stop2.daily_passenger_count) / 2
        if avg_passengers > 5000:
            speed = base_speed * 0.8  # 20% slower for high-volume areas
        elif avg_passengers < 1000:
            speed = base_speed * 1.1  # 10% faster for low-volume areas
        else:
            speed = base_speed
        
        # Calculate time in minutes
        time_hours = distance_km / speed
        time_minutes = time_hours * 60
        
        # Add stop time (boarding/alighting)
        stop_time = 2  # 2 minutes per stop
        
        return time_minutes + stop_time
    
    def _get_traffic_factor(self, stop1: BusStop, stop2: BusStop) -> float:
        """Get traffic factor based on route characteristics"""
        # Simplified traffic factor - in real implementation, this would use
        # actual traffic data, time of day, day of week, etc.
        
        # Base factor
        factor = 1.0
        
        # High passenger volume areas likely have more traffic
        avg_passengers = (stop1.daily_passenger_count + stop2.daily_passenger_count) / 2
        if avg_passengers > 8000:
            factor = 1.3  # 30% increase for very high-volume areas
        elif avg_passengers > 5000:
            factor = 1.2  # 20% increase for high-volume areas
        elif avg_passengers > 2000:
            factor = 1.1  # 10% increase for moderate-volume areas
        
        return factor
    
    def _calculate_difficulty_score(self, stop1: BusStop, stop2: BusStop) -> float:
        """Calculate difficulty score for the route segment"""
        score = 0.0
        
        # Distance factor
        distance = self._haversine_distance(stop1.coordinates, stop2.coordinates)
        if distance > 10:
            score += 20  # Long distances are more difficult
        elif distance > 5:
            score += 10
        
        # Accessibility factor
        if not stop1.is_accessible or not stop2.is_accessible:
            score += 15  # Non-accessible stops increase difficulty
        
        # Passenger volume factor
        avg_passengers = (stop1.daily_passenger_count + stop2.daily_passenger_count) / 2
        if avg_passengers > 8000:
            score += 25  # Very high volume increases difficulty
        elif avg_passengers > 5000:
            score += 15
        elif avg_passengers < 500:
            score += 10  # Very low volume may indicate poor connectivity
        
        # Amenities factor (lack of amenities increases difficulty)
        total_amenities = len(stop1.amenities) + len(stop2.amenities)
        if total_amenities == 0:
            score += 20
        elif total_amenities < 3:
            score += 10
        
        return min(100.0, score)  # Cap at 100
    
    def find_shortest_path(self, matrix: PathMatrix, origin_id: str, 
                          destination_id: str) -> Optional[List[str]]:
        """Find shortest path between two stops using Dijkstra's algorithm"""
        try:
            if origin_id not in matrix.stop_ids or destination_id not in matrix.stop_ids:
                return None
            
            origin_idx = matrix.stop_ids.index(origin_id)
            destination_idx = matrix.stop_ids.index(destination_id)
            
            # Use distance matrix for shortest path calculation
            distances = matrix.distance_matrix.copy()
            n_stops = len(matrix.stop_ids)
            
            # Dijkstra's algorithm
            visited = [False] * n_stops
            dist = [float('inf')] * n_stops
            parent = [-1] * n_stops
            
            dist[origin_idx] = 0
            
            for _ in range(n_stops):
                # Find minimum distance vertex
                min_dist = float('inf')
                min_idx = -1
                
                for v in range(n_stops):
                    if not visited[v] and dist[v] < min_dist:
                        min_dist = dist[v]
                        min_idx = v
                
                if min_idx == -1:
                    break
                
                visited[min_idx] = True
                
                # Update distances to neighbors
                for v in range(n_stops):
                    if (not visited[v] and distances[min_idx, v] > 0 and
                        dist[min_idx] + distances[min_idx, v] < dist[v]):
                        dist[v] = dist[min_idx] + distances[min_idx, v]
                        parent[v] = min_idx
            
            # Reconstruct path
            if dist[destination_idx] == float('inf'):
                return None  # No path found
            
            path = []
            current = destination_idx
            while current != -1:
                path.append(matrix.stop_ids[current])
                current = parent[current]
            
            path.reverse()
            return path
            
        except Exception as e:
            self.logger.error(f"Shortest path calculation failed: {e}")
            return None
    
    def find_optimal_route_order(self, matrix: PathMatrix, stop_ids: List[str]) -> List[str]:
        """Find optimal order to visit a set of stops (simplified TSP)"""
        try:
            if len(stop_ids) <= 2:
                return stop_ids
            
            # For small sets, use brute force approach
            if len(stop_ids) <= 8:
                return self._brute_force_tsp(matrix, stop_ids)
            else:
                # For larger sets, use nearest neighbor heuristic
                return self._nearest_neighbor_tsp(matrix, stop_ids)
                
        except Exception as e:
            self.logger.error(f"Route optimization failed: {e}")
            return stop_ids  # Return original order as fallback
    
    def _brute_force_tsp(self, matrix: PathMatrix, stop_ids: List[str]) -> List[str]:
        """Solve TSP using brute force for small sets"""
        from itertools import permutations
        
        if not stop_ids:
            return []
        
        # Get indices for the stops
        indices = [matrix.stop_ids.index(stop_id) for stop_id in stop_ids if stop_id in matrix.stop_ids]
        
        if len(indices) != len(stop_ids):
            return stop_ids  # Some stops not found in matrix
        
        best_distance = float('inf')
        best_order = indices
        
        # Try all permutations starting from the first stop
        first_stop = indices[0]
        remaining_stops = indices[1:]
        
        for perm in permutations(remaining_stops):
            order = [first_stop] + list(perm)
            total_distance = 0
            
            for i in range(len(order) - 1):
                total_distance += matrix.distance_matrix[order[i], order[i + 1]]
            
            if total_distance < best_distance:
                best_distance = total_distance
                best_order = order
        
        # Convert back to stop IDs
        return [matrix.stop_ids[idx] for idx in best_order]
    
    def _nearest_neighbor_tsp(self, matrix: PathMatrix, stop_ids: List[str]) -> List[str]:
        """Solve TSP using nearest neighbor heuristic"""
        if not stop_ids:
            return []
        
        # Get indices for the stops
        indices = [matrix.stop_ids.index(stop_id) for stop_id in stop_ids if stop_id in matrix.stop_ids]
        
        if len(indices) != len(stop_ids):
            return stop_ids  # Some stops not found in matrix
        
        # Start from the first stop
        current = indices[0]
        unvisited = set(indices[1:])
        route = [current]
        
        while unvisited:
            # Find nearest unvisited stop
            nearest = min(unvisited, key=lambda x: matrix.distance_matrix[current, x])
            route.append(nearest)
            unvisited.remove(nearest)
            current = nearest
        
        # Convert back to stop IDs
        return [matrix.stop_ids[idx] for idx in route]
    
    def analyze_connectivity(self, matrix: PathMatrix) -> Dict[str, Any]:
        """Analyze connectivity patterns in the path matrix"""
        try:
            n_stops = len(matrix.stop_ids)
            
            # Calculate average distances
            distances = matrix.distance_matrix[matrix.distance_matrix > 0]  # Exclude zeros (same stop)
            avg_distance = np.mean(distances)
            max_distance = np.max(distances)
            min_distance = np.min(distances)
            
            # Calculate average times
            times = matrix.time_matrix[matrix.time_matrix > 0]
            avg_time = np.mean(times)
            max_time = np.max(times)
            min_time = np.min(times)
            
            # Find most connected stops (shortest average distance to all others)
            connectivity_scores = []
            for i in range(n_stops):
                avg_dist_from_stop = np.mean(matrix.distance_matrix[i, matrix.distance_matrix[i] > 0])
                connectivity_scores.append((matrix.stop_ids[i], avg_dist_from_stop))
            
            connectivity_scores.sort(key=lambda x: x[1])  # Sort by average distance (ascending)
            
            # Identify potential bottlenecks (stops that are far from others)
            bottlenecks = connectivity_scores[-3:]  # Top 3 least connected
            hubs = connectivity_scores[:3]  # Top 3 most connected
            
            analysis = {
                'total_stops': n_stops,
                'total_segments': len(matrix.segments),
                'distance_stats': {
                    'average_km': round(avg_distance, 2),
                    'maximum_km': round(max_distance, 2),
                    'minimum_km': round(min_distance, 2)
                },
                'time_stats': {
                    'average_minutes': round(avg_time, 1),
                    'maximum_minutes': round(max_time, 1),
                    'minimum_minutes': round(min_time, 1)
                },
                'connectivity_hubs': [{'stop_id': stop_id, 'avg_distance_km': round(dist, 2)} 
                                     for stop_id, dist in hubs],
                'potential_bottlenecks': [{'stop_id': stop_id, 'avg_distance_km': round(dist, 2)} 
                                        for stop_id, dist in bottlenecks],
                'algorithm_used': matrix.algorithm_used.value,
                'calculation_timestamp': matrix.calculation_timestamp
            }
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Connectivity analysis failed: {e}")
            return {'error': str(e)}