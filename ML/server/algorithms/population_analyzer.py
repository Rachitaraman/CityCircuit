"""
Population density analysis algorithms for CityCircuit ML Service
Analyzes population density data to inform route optimization decisions
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import logging
from dataclasses import dataclass

from models.population import PopulationDensityData, DensityPoint, DemographicData
from models.base import Coordinates, GeoBounds

logger = logging.getLogger(__name__)


@dataclass
class PopulationAnalysisResult:
    """Result of population density analysis"""
    region: str
    total_population: int
    population_density: float  # people per km²
    high_density_areas: List[Dict[str, Any]]
    demographic_insights: Dict[str, Any]
    optimal_stop_locations: List[Coordinates]
    coverage_gaps: List[Dict[str, Any]]
    analysis_timestamp: datetime


class PopulationAnalyzer:
    """
    Analyzes population density data to identify optimal route locations
    and understand demographic patterns for transportation planning
    """
    
    def __init__(self):
        """Initialize the population analyzer"""
        self.logger = logging.getLogger(__name__)
    
    def analyze_population_data(self, population_data: PopulationDensityData) -> PopulationAnalysisResult:
        """
        Perform comprehensive analysis of population density data
        
        Args:
            population_data: Population density data to analyze
            
        Returns:
            PopulationAnalysisResult with insights and recommendations
        """
        try:
            self.logger.info(f"Starting population analysis for region: {population_data.region}")
            
            # Calculate basic metrics
            total_population = population_data.get_total_population()
            area_km2 = self._calculate_area(population_data.coordinates)
            population_density = total_population / area_km2 if area_km2 > 0 else 0
            
            # Identify high density areas
            high_density_areas = self._identify_high_density_areas(population_data)
            
            # Analyze demographics
            demographic_insights = self._analyze_demographics(population_data)
            
            # Find optimal stop locations
            optimal_stops = self._find_optimal_stop_locations(population_data)
            
            # Identify coverage gaps
            coverage_gaps = self._identify_coverage_gaps(population_data, optimal_stops)
            
            result = PopulationAnalysisResult(
                region=population_data.region,
                total_population=total_population,
                population_density=population_density,
                high_density_areas=high_density_areas,
                demographic_insights=demographic_insights,
                optimal_stop_locations=optimal_stops,
                coverage_gaps=coverage_gaps,
                analysis_timestamp=datetime.now(timezone.utc)
            )
            
            self.logger.info(f"Population analysis completed for {population_data.region}")
            return result
            
        except Exception as e:
            self.logger.error(f"Population analysis failed: {e}")
            raise
    
    def _calculate_area(self, bounds: GeoBounds) -> float:
        """Calculate approximate area in km² from geographic bounds"""
        # Approximate calculation using degrees to km conversion
        # 1 degree latitude ≈ 111 km
        # 1 degree longitude ≈ 111 km * cos(latitude)
        
        lat_diff = bounds.north - bounds.south
        lon_diff = bounds.east - bounds.west
        
        # Use average latitude for longitude conversion
        avg_lat = (bounds.north + bounds.south) / 2
        lat_km = lat_diff * 111
        lon_km = lon_diff * 111 * np.cos(np.radians(avg_lat))
        
        return abs(lat_km * lon_km)
    
    def _identify_high_density_areas(self, population_data: PopulationDensityData) -> List[Dict[str, Any]]:
        """Identify areas with high population density"""
        if not population_data.density_points:
            return []
        
        # Calculate population threshold for high density (top 20%)
        populations = [point.population for point in population_data.density_points]
        populations.sort(reverse=True)
        threshold_index = max(1, len(populations) // 5)  # Top 20%
        high_density_threshold = populations[threshold_index - 1]
        
        high_density_areas = []
        
        for point in population_data.density_points:
            if point.population >= high_density_threshold:
                # Calculate local density (population in nearby area)
                local_density = self._calculate_local_density(point, population_data.density_points)
                
                high_density_areas.append({
                    'coordinates': {
                        'latitude': point.coordinates.latitude,
                        'longitude': point.coordinates.longitude
                    },
                    'population': point.population,
                    'local_density': local_density,
                    'demographic_profile': self._summarize_demographics(point.demographic_data),
                    'priority_score': self._calculate_priority_score(point, local_density)
                })
        
        # Sort by priority score
        high_density_areas.sort(key=lambda x: x['priority_score'], reverse=True)
        
        return high_density_areas
    
    def _calculate_local_density(self, center_point: DensityPoint, all_points: List[DensityPoint], 
                                radius_km: float = 1.0) -> float:
        """Calculate population density within radius of a point"""
        total_population = 0
        
        for point in all_points:
            distance = self._calculate_distance(center_point.coordinates, point.coordinates)
            if distance <= radius_km:
                total_population += point.population
        
        # Calculate area of circle
        area_km2 = np.pi * (radius_km ** 2)
        
        return total_population / area_km2
    
    def _summarize_demographics(self, demographic_data: DemographicData) -> Dict[str, Any]:
        """Summarize demographic data for a point"""
        summary = {
            'age_groups': dict(demographic_data.age_groups),
            'economic_indicators': dict(demographic_data.economic_indicators)
        }
        
        # Calculate dominant age group
        if demographic_data.age_groups:
            dominant_age_group = max(demographic_data.age_groups.items(), key=lambda x: x[1])
            summary['dominant_age_group'] = dominant_age_group[0]
            summary['dominant_age_percentage'] = dominant_age_group[1]
        
        # Calculate average income if available
        if 'income' in demographic_data.economic_indicators:
            summary['average_income'] = demographic_data.economic_indicators['income']
        
        return summary
    
    def _calculate_priority_score(self, point: DensityPoint, local_density: float) -> float:
        """Calculate priority score for a location based on multiple factors"""
        score = 0.0
        
        # Base score from population
        score += min(50.0, point.population / 1000.0)  # Up to 50 points
        
        # Local density bonus
        score += min(30.0, local_density / 1000.0)  # Up to 30 points
        
        # Demographic factors
        if point.demographic_data.age_groups:
            # Higher score for working age population (likely to use public transport)
            working_age_pop = point.demographic_data.age_groups.get('25-64', 0)
            score += working_age_pop * 0.2  # Up to 20 points if 100% working age
        
        # Economic factors
        if 'income' in point.demographic_data.economic_indicators:
            income = point.demographic_data.economic_indicators['income']
            # Moderate income areas often have higher public transport usage
            if 20000 <= income <= 60000:
                score += 10.0
            elif income < 20000:
                score += 15.0  # Lower income areas may rely more on public transport
        
        return min(100.0, score)
    
    def _analyze_demographics(self, population_data: PopulationDensityData) -> Dict[str, Any]:
        """Analyze demographic patterns across the region"""
        if not population_data.density_points:
            return {}
        
        # Aggregate demographic data
        total_age_groups = {}
        total_economic_indicators = {}
        point_count = len(population_data.density_points)
        
        for point in population_data.density_points:
            # Aggregate age groups
            for age_group, percentage in point.demographic_data.age_groups.items():
                if age_group not in total_age_groups:
                    total_age_groups[age_group] = 0
                total_age_groups[age_group] += percentage
            
            # Aggregate economic indicators
            for indicator, value in point.demographic_data.economic_indicators.items():
                if indicator not in total_economic_indicators:
                    total_economic_indicators[indicator] = []
                total_economic_indicators[indicator].append(value)
        
        # Calculate averages
        avg_age_groups = {k: v / point_count for k, v in total_age_groups.items()}
        avg_economic_indicators = {k: np.mean(v) for k, v in total_economic_indicators.items()}
        
        # Identify dominant demographics
        dominant_age_group = max(avg_age_groups.items(), key=lambda x: x[1]) if avg_age_groups else None
        
        insights = {
            'average_age_distribution': avg_age_groups,
            'average_economic_indicators': avg_economic_indicators,
            'dominant_age_group': dominant_age_group[0] if dominant_age_group else None,
            'dominant_age_percentage': dominant_age_group[1] if dominant_age_group else 0,
            'total_data_points': point_count,
            'demographic_diversity': self._calculate_diversity_index(avg_age_groups)
        }
        
        # Add transportation-relevant insights
        if 'income' in avg_economic_indicators:
            avg_income = avg_economic_indicators['income']
            if avg_income < 30000:
                insights['transport_dependency'] = 'high'
                insights['transport_notes'] = 'Lower income areas typically have higher public transport dependency'
            elif avg_income > 80000:
                insights['transport_dependency'] = 'low'
                insights['transport_notes'] = 'Higher income areas may prefer private transport'
            else:
                insights['transport_dependency'] = 'moderate'
                insights['transport_notes'] = 'Mixed transport preferences expected'
        
        return insights
    
    def _calculate_diversity_index(self, age_groups: Dict[str, float]) -> float:
        """Calculate demographic diversity using Shannon diversity index"""
        if not age_groups:
            return 0.0
        
        total = sum(age_groups.values())
        if total == 0:
            return 0.0
        
        # Normalize to probabilities
        probabilities = [v / total for v in age_groups.values()]
        
        # Calculate Shannon diversity index
        diversity = -sum(p * np.log(p) for p in probabilities if p > 0)
        
        # Normalize to 0-1 scale
        max_diversity = np.log(len(age_groups))
        return diversity / max_diversity if max_diversity > 0 else 0.0
    
    def _find_optimal_stop_locations(self, population_data: PopulationDensityData, 
                                   max_stops: int = 20) -> List[Coordinates]:
        """Find optimal locations for bus stops based on population density"""
        if not population_data.density_points:
            return []
        
        # Use k-means clustering approach to find optimal stop locations
        points = [(point.coordinates.latitude, point.coordinates.longitude, point.population) 
                 for point in population_data.density_points]
        
        if len(points) <= max_stops:
            # If we have fewer points than desired stops, use all high-population points
            return [Coordinates(latitude=lat, longitude=lon) 
                   for lat, lon, pop in points if pop > 0]
        
        # Simple clustering algorithm to find optimal locations
        optimal_locations = []
        remaining_points = points.copy()
        
        for _ in range(min(max_stops, len(points))):
            if not remaining_points:
                break
            
            # Find the point with highest weighted score
            best_point = max(remaining_points, key=lambda p: self._calculate_stop_score(p, remaining_points))
            optimal_locations.append(Coordinates(latitude=best_point[0], longitude=best_point[1]))
            
            # Remove nearby points to avoid clustering
            remaining_points = [p for p in remaining_points 
                              if self._calculate_distance(
                                  Coordinates(latitude=p[0], longitude=p[1]),
                                  Coordinates(latitude=best_point[0], longitude=best_point[1])
                              ) > 0.5]  # Minimum 500m between stops
        
        return optimal_locations
    
    def _calculate_stop_score(self, point: Tuple[float, float, int], 
                            all_points: List[Tuple[float, float, int]]) -> float:
        """Calculate score for a potential stop location"""
        lat, lon, population = point
        score = population  # Base score from population
        
        # Add bonus for nearby population
        coords = Coordinates(latitude=lat, longitude=lon)
        for other_lat, other_lon, other_pop in all_points:
            if (other_lat, other_lon) != (lat, lon):
                other_coords = Coordinates(latitude=other_lat, longitude=other_lon)
                distance = self._calculate_distance(coords, other_coords)
                
                # Add weighted population based on distance
                if distance <= 1.0:  # Within 1km
                    weight = max(0, 1.0 - distance)  # Linear decay
                    score += other_pop * weight
        
        return score
    
    def _identify_coverage_gaps(self, population_data: PopulationDensityData, 
                              optimal_stops: List[Coordinates], 
                              coverage_radius: float = 1.0) -> List[Dict[str, Any]]:
        """Identify areas with poor coverage by optimal stop locations"""
        if not population_data.density_points or not optimal_stops:
            return []
        
        coverage_gaps = []
        
        for point in population_data.density_points:
            # Check if point is covered by any optimal stop
            is_covered = False
            min_distance = float('inf')
            
            for stop in optimal_stops:
                distance = self._calculate_distance(point.coordinates, stop)
                min_distance = min(min_distance, distance)
                
                if distance <= coverage_radius:
                    is_covered = True
                    break
            
            # If not covered and has significant population, it's a gap
            if not is_covered and point.population > 500:  # Threshold for significant population
                coverage_gaps.append({
                    'coordinates': {
                        'latitude': point.coordinates.latitude,
                        'longitude': point.coordinates.longitude
                    },
                    'population': point.population,
                    'distance_to_nearest_stop': min_distance,
                    'severity': 'high' if point.population > 2000 else 'medium',
                    'demographic_profile': self._summarize_demographics(point.demographic_data)
                })
        
        # Sort by population (highest first)
        coverage_gaps.sort(key=lambda x: x['population'], reverse=True)
        
        return coverage_gaps
    
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
    
    def generate_route_recommendations(self, analysis_result: PopulationAnalysisResult) -> List[Dict[str, Any]]:
        """Generate route recommendations based on population analysis"""
        recommendations = []
        
        # Recommend routes connecting high density areas
        if len(analysis_result.high_density_areas) >= 2:
            # Sort by priority score
            top_areas = analysis_result.high_density_areas[:5]  # Top 5 areas
            
            for i in range(len(top_areas) - 1):
                for j in range(i + 1, len(top_areas)):
                    area1 = top_areas[i]
                    area2 = top_areas[j]
                    
                    coord1 = Coordinates(
                        latitude=area1['coordinates']['latitude'],
                        longitude=area1['coordinates']['longitude']
                    )
                    coord2 = Coordinates(
                        latitude=area2['coordinates']['latitude'],
                        longitude=area2['coordinates']['longitude']
                    )
                    
                    distance = self._calculate_distance(coord1, coord2)
                    
                    # Recommend routes for areas 2-15km apart
                    if 2.0 <= distance <= 15.0:
                        recommendations.append({
                            'type': 'new_route',
                            'priority': 'high',
                            'origin': area1['coordinates'],
                            'destination': area2['coordinates'],
                            'distance_km': round(distance, 2),
                            'combined_population': area1['population'] + area2['population'],
                            'description': f"Connect high-density areas with {area1['population'] + area2['population']} total population"
                        })
        
        # Recommend stops for coverage gaps
        for gap in analysis_result.coverage_gaps[:3]:  # Top 3 gaps
            recommendations.append({
                'type': 'new_stop',
                'priority': gap['severity'],
                'location': gap['coordinates'],
                'population_served': gap['population'],
                'description': f"Add stop to serve {gap['population']} people in underserved area"
            })
        
        # Sort recommendations by priority and population impact
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        recommendations.sort(
            key=lambda x: (priority_order.get(x['priority'], 0), 
                          x.get('combined_population', x.get('population_served', 0))),
            reverse=True
        )
        
        return recommendations[:10]  # Return top 10 recommendations