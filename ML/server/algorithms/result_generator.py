"""
Optimization result generation and ranking algorithms for CityCircuit ML Service
Implements comprehensive efficiency metrics calculation and multi-criteria route ranking
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from enum import Enum
import numpy as np

from models.route import Route, BusStop
from models.optimization import OptimizationResult, OptimizationMetrics
from models.population import PopulationDensityData
from models.base import Coordinates

logger = logging.getLogger(__name__)


class RankingCriteria(Enum):
    """Available criteria for route ranking"""
    TIME_EFFICIENCY = "time_efficiency"
    COST_EFFECTIVENESS = "cost_effectiveness"
    PASSENGER_COVERAGE = "passenger_coverage"
    ACCESSIBILITY = "accessibility"
    ENVIRONMENTAL_IMPACT = "environmental_impact"
    OVERALL_SCORE = "overall_score"


class EfficiencyMetricsCalculator:
    """
    Advanced efficiency metrics calculator for route optimization results
    Implements comprehensive metrics beyond basic time/distance improvements
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_comprehensive_metrics(self, 
                                     original_route: Route,
                                     optimized_route: Route,
                                     population_data: Optional[PopulationDensityData] = None) -> OptimizationMetrics:
        """
        Calculate comprehensive efficiency metrics for route optimization
        
        Args:
            original_route: The original route before optimization
            optimized_route: The optimized route
            population_data: Population density data for enhanced calculations
            
        Returns:
            OptimizationMetrics with detailed efficiency calculations
        """
        try:
            self.logger.info(f"Calculating comprehensive metrics for route optimization")
            
            # Basic metrics
            time_improvement = self._calculate_time_improvement(original_route, optimized_route)
            distance_reduction = self._calculate_distance_reduction(original_route, optimized_route)
            coverage_increase = self._calculate_coverage_increase(original_route, optimized_route, population_data)
            cost_savings = self._calculate_cost_savings(original_route, optimized_route)
            
            # Enhanced metrics
            accessibility_improvement = self._calculate_accessibility_improvement(original_route, optimized_route)
            environmental_impact = self._calculate_environmental_impact(original_route, optimized_route)
            service_quality_improvement = self._calculate_service_quality_improvement(original_route, optimized_route)
            
            # Combine into comprehensive metrics
            enhanced_cost_savings = cost_savings + (accessibility_improvement * 0.1) + (environmental_impact * 0.05)
            
            metrics = OptimizationMetrics(
                time_improvement=time_improvement,
                distance_reduction=distance_reduction,
                passenger_coverage_increase=coverage_increase,
                cost_savings=min(enhanced_cost_savings, 100.0)  # Cap at 100%
            )
            
            self.logger.info(f"Comprehensive metrics calculated. Overall score: {metrics.get_overall_score():.2f}")
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to calculate comprehensive metrics: {e}")
            raise
    
    def _calculate_time_improvement(self, original: Route, optimized: Route) -> float:
        """Calculate time improvement percentage"""
        if original.estimated_travel_time <= 0:
            return 0.0
        
        time_diff = original.estimated_travel_time - optimized.estimated_travel_time
        improvement = max(0, (time_diff / original.estimated_travel_time) * 100)
        
        # Apply bonuses for significant improvements
        if improvement > 20:
            improvement *= 1.1  # 10% bonus for major improvements
        
        return min(improvement, 50.0)  # Cap at 50% improvement
    
    def _calculate_distance_reduction(self, original: Route, optimized: Route) -> float:
        """Calculate distance reduction percentage"""
        original_distance = self._estimate_route_distance(original)
        optimized_distance = self._estimate_route_distance(optimized)
        
        if original_distance <= 0:
            return 0.0
        
        distance_diff = original_distance - optimized_distance
        reduction = max(0, (distance_diff / original_distance) * 100)
        
        return min(reduction, 40.0)  # Cap at 40% reduction
    
    def _calculate_coverage_increase(self, original: Route, optimized: Route, 
                                   population_data: Optional[PopulationDensityData]) -> float:
        """Calculate passenger coverage increase percentage"""
        original_coverage = sum(stop.daily_passenger_count for stop in original.stops)
        optimized_coverage = sum(stop.daily_passenger_count for stop in optimized.stops)
        
        if original_coverage <= 0:
            return 0.0
        
        coverage_diff = optimized_coverage - original_coverage
        increase = max(0, (coverage_diff / original_coverage) * 100)
        
        # Apply population density bonus if available
        if population_data:
            density_bonus = self._calculate_population_density_bonus(optimized, population_data)
            increase += density_bonus
        
        return min(increase, 100.0)  # Cap at 100% increase
    
    def _calculate_cost_savings(self, original: Route, optimized: Route) -> float:
        """Calculate estimated cost savings percentage"""
        # Base cost savings from operational efficiency
        time_factor = max(0, (original.estimated_travel_time - optimized.estimated_travel_time) / 60)  # Hours saved
        distance_factor = self._estimate_route_distance(original) - self._estimate_route_distance(optimized)
        
        # Estimate cost savings (simplified model)
        fuel_savings = distance_factor * 0.5  # $0.5 per km saved
        time_savings = time_factor * 25  # $25 per hour saved
        
        # Calculate percentage based on estimated route cost
        estimated_route_cost = original.estimated_travel_time * 0.5 + self._estimate_route_distance(original) * 0.3
        
        if estimated_route_cost <= 0:
            return 0.0
        
        total_savings = fuel_savings + time_savings
        savings_percentage = (total_savings / estimated_route_cost) * 100
        
        return min(savings_percentage, 30.0)  # Cap at 30% savings
    
    def _calculate_accessibility_improvement(self, original: Route, optimized: Route) -> float:
        """Calculate accessibility improvement score"""
        original_accessible = sum(1 for stop in original.stops if stop.is_accessible)
        optimized_accessible = sum(1 for stop in optimized.stops if stop.is_accessible)
        
        if len(original.stops) == 0:
            return 0.0
        
        original_accessibility = (original_accessible / len(original.stops)) * 100
        optimized_accessibility = (optimized_accessible / len(optimized.stops)) * 100
        
        improvement = optimized_accessibility - original_accessibility
        return max(0, improvement)
    
    def _calculate_environmental_impact(self, original: Route, optimized: Route) -> float:
        """Calculate environmental impact improvement score"""
        # Simplified environmental impact based on distance and efficiency
        original_distance = self._estimate_route_distance(original)
        optimized_distance = self._estimate_route_distance(optimized)
        
        if original_distance <= 0:
            return 0.0
        
        # Assume shorter routes and better stop placement reduce emissions
        distance_impact = max(0, (original_distance - optimized_distance) / original_distance * 100)
        
        # Bonus for accessibility (accessible routes encourage public transport use)
        accessibility_bonus = self._calculate_accessibility_improvement(original, optimized) * 0.1
        
        return min(distance_impact + accessibility_bonus, 25.0)  # Cap at 25%
    
    def _calculate_service_quality_improvement(self, original: Route, optimized: Route) -> float:
        """Calculate service quality improvement score"""
        # Quality factors: stop amenities, accessibility, coverage
        original_quality = self._calculate_route_quality_score(original)
        optimized_quality = self._calculate_route_quality_score(optimized)
        
        improvement = optimized_quality - original_quality
        return max(0, improvement)
    
    def _calculate_route_quality_score(self, route: Route) -> float:
        """Calculate overall quality score for a route"""
        if not route.stops:
            return 0.0
        
        # Accessibility score
        accessible_stops = sum(1 for stop in route.stops if stop.is_accessible)
        accessibility_score = (accessible_stops / len(route.stops)) * 30
        
        # Amenities score
        total_amenities = sum(len(stop.amenities) for stop in route.stops)
        amenities_score = min(total_amenities / len(route.stops) * 5, 20)  # Cap at 20
        
        # Coverage score (based on passenger count)
        avg_passenger_count = sum(stop.daily_passenger_count for stop in route.stops) / len(route.stops)
        coverage_score = min(avg_passenger_count / 1000 * 10, 30)  # Cap at 30
        
        # Optimization score
        optimization_score = min(route.optimization_score / 5, 20)  # Cap at 20
        
        return accessibility_score + amenities_score + coverage_score + optimization_score
    
    def _calculate_population_density_bonus(self, route: Route, 
                                          population_data: PopulationDensityData) -> float:
        """Calculate bonus based on population density coverage"""
        if not population_data.density_points:
            return 0.0
        
        # Calculate how well the route covers high-density areas
        coverage_score = 0.0
        total_population = sum(point.population for point in population_data.density_points)
        
        if total_population <= 0:
            return 0.0
        
        for stop in route.stops:
            # Find nearby density points (within 1km)
            nearby_population = 0
            for point in population_data.density_points:
                distance = self._calculate_distance(stop.coordinates, point.coordinates)
                if distance <= 1.0:  # Within 1km
                    nearby_population += point.population
            
            coverage_score += nearby_population
        
        # Calculate bonus as percentage of total population covered
        bonus = (coverage_score / total_population) * 10  # Up to 10% bonus
        return min(bonus, 10.0)
    
    def _estimate_route_distance(self, route: Route) -> float:
        """Estimate total route distance in kilometers"""
        if len(route.stops) < 2:
            return 0.0
        
        total_distance = 0.0
        for i in range(len(route.stops) - 1):
            distance = self._calculate_distance(
                route.stops[i].coordinates,
                route.stops[i + 1].coordinates
            )
            total_distance += distance
        
        return total_distance
    
    def _calculate_distance(self, coord1: Coordinates, coord2: Coordinates) -> float:
        """Calculate distance between coordinates using Haversine formula"""
        # Convert to radians
        lat1, lon1 = np.radians(coord1.latitude), np.radians(coord1.longitude)
        lat2, lon2 = np.radians(coord2.latitude), np.radians(coord2.longitude)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        return 6371 * c  # Earth's radius in km


class RouteRankingEngine:
    """
    Multi-criteria route ranking engine for optimization results
    Implements various ranking algorithms based on different criteria
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metrics_calculator = EfficiencyMetricsCalculator()
    
    def rank_optimization_results(self, 
                                results: List[OptimizationResult],
                                criteria: RankingCriteria = RankingCriteria.OVERALL_SCORE,
                                weights: Optional[Dict[str, float]] = None) -> List[OptimizationResult]:
        """
        Rank optimization results based on specified criteria
        
        Args:
            results: List of optimization results to rank
            criteria: Primary ranking criteria
            weights: Optional custom weights for multi-criteria ranking
            
        Returns:
            List of optimization results sorted by ranking (best first)
        """
        try:
            self.logger.info(f"Ranking {len(results)} optimization results by {criteria.value}")
            
            if not results:
                return []
            
            # Calculate ranking scores for each result
            scored_results = []
            for result in results:
                score = self._calculate_ranking_score(result, criteria, weights)
                scored_results.append((result, score))
            
            # Sort by score (descending - higher is better) with stable tie-breaking
            # First sort by route ID for stability, then by score (stable sort)
            scored_results.sort(key=lambda x: x[0].original_route_id)  # Secondary sort first
            scored_results.sort(key=lambda x: x[1], reverse=True)      # Primary sort (stable)
            
            # Extract sorted results
            ranked_results = [result for result, score in scored_results]
            
            self.logger.info(f"Ranking completed. Best result: {ranked_results[0].optimized_route.name}")
            return ranked_results
            
        except Exception as e:
            self.logger.error(f"Failed to rank optimization results: {e}")
            raise
    
    def _calculate_ranking_score(self, 
                               result: OptimizationResult,
                               criteria: RankingCriteria,
                               weights: Optional[Dict[str, float]] = None) -> float:
        """Calculate ranking score for a single optimization result"""
        
        if criteria == RankingCriteria.TIME_EFFICIENCY:
            return result.metrics.time_improvement
        
        elif criteria == RankingCriteria.COST_EFFECTIVENESS:
            return result.metrics.cost_savings
        
        elif criteria == RankingCriteria.PASSENGER_COVERAGE:
            return result.metrics.passenger_coverage_increase
        
        elif criteria == RankingCriteria.ACCESSIBILITY:
            return self._calculate_accessibility_score(result.optimized_route)
        
        elif criteria == RankingCriteria.ENVIRONMENTAL_IMPACT:
            return self._calculate_environmental_score(result)
        
        elif criteria == RankingCriteria.OVERALL_SCORE:
            return result.metrics.get_overall_score()
        
        else:
            return result.metrics.get_overall_score()
    
    def _calculate_accessibility_score(self, route: Route) -> float:
        """Calculate accessibility score for a route"""
        if not route.stops:
            return 0.0
        
        accessible_stops = sum(1 for stop in route.stops if stop.is_accessible)
        accessibility_ratio = accessible_stops / len(route.stops)
        
        # Bonus for amenities that improve accessibility
        accessibility_amenities = ['wheelchair_accessible', 'tactile_paving', 'audio_announcements']
        amenity_score = 0
        
        for stop in route.stops:
            stop_amenity_score = sum(1 for amenity in stop.amenities if amenity in accessibility_amenities)
            amenity_score += stop_amenity_score
        
        avg_amenity_score = amenity_score / len(route.stops) if route.stops else 0
        
        # Combine accessibility ratio and amenity score
        total_score = (accessibility_ratio * 70) + (min(avg_amenity_score, 3) * 10)
        
        return min(total_score, 100.0)
    
    def _calculate_environmental_score(self, result: OptimizationResult) -> float:
        """Calculate environmental impact score for optimization result"""
        # Base score from distance reduction
        distance_score = result.metrics.distance_reduction * 0.6
        
        # Bonus for passenger coverage (more passengers = less individual transport)
        coverage_score = min(result.metrics.passenger_coverage_increase * 0.3, 20)
        
        # Bonus for accessibility (accessible transport encourages usage)
        accessibility_score = self._calculate_accessibility_score(result.optimized_route) * 0.1
        
        total_score = distance_score + coverage_score + accessibility_score
        return min(total_score, 100.0)
    
    def _calculate_weighted_overall_score(self, 
                                        result: OptimizationResult,
                                        weights: Optional[Dict[str, float]] = None) -> float:
        """Calculate weighted overall score using custom or default weights"""
        
        # Default weights if none provided
        if weights is None:
            weights = {
                'time_improvement': 0.25,
                'distance_reduction': 0.20,
                'passenger_coverage': 0.25,
                'cost_savings': 0.15,
                'accessibility': 0.10,
                'environmental': 0.05
            }
        
        # Normalize weights to sum to 1.0
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        
        # Calculate weighted score
        score = 0.0
        
        if 'time_improvement' in weights:
            score += result.metrics.time_improvement * weights['time_improvement']
        
        if 'distance_reduction' in weights:
            score += result.metrics.distance_reduction * weights['distance_reduction']
        
        if 'passenger_coverage' in weights:
            score += result.metrics.passenger_coverage_increase * weights['passenger_coverage']
        
        if 'cost_savings' in weights:
            score += result.metrics.cost_savings * weights['cost_savings']
        
        if 'accessibility' in weights:
            accessibility_score = self._calculate_accessibility_score(result.optimized_route)
            score += accessibility_score * weights['accessibility']
        
        if 'environmental' in weights:
            environmental_score = self._calculate_environmental_score(result)
            score += environmental_score * weights['environmental']
        
        return min(score, 100.0)
    
    def generate_ranking_report(self, 
                              results: List[OptimizationResult],
                              criteria: RankingCriteria = RankingCriteria.OVERALL_SCORE) -> Dict[str, Any]:
        """
        Generate a comprehensive ranking report for optimization results
        
        Args:
            results: List of optimization results
            criteria: Ranking criteria used
            
        Returns:
            Dictionary containing ranking report with statistics and insights
        """
        try:
            if not results:
                return {'error': 'No optimization results provided'}
            
            # Rank the results
            ranked_results = self.rank_optimization_results(results, criteria)
            
            # Calculate statistics
            scores = [self._calculate_ranking_score(result, criteria) for result in ranked_results]
            
            report = {
                'ranking_criteria': criteria.value,
                'total_routes': len(ranked_results),
                'statistics': {
                    'best_score': max(scores) if scores else 0,
                    'worst_score': min(scores) if scores else 0,
                    'average_score': sum(scores) / len(scores) if scores else 0,
                    'median_score': sorted(scores)[len(scores) // 2] if scores else 0
                },
                'top_routes': [
                    {
                        'rank': i + 1,
                        'route_id': result.original_route_id,
                        'route_name': result.optimized_route.name,
                        'score': scores[i],
                        'metrics': {
                            'time_improvement': result.metrics.time_improvement,
                            'distance_reduction': result.metrics.distance_reduction,
                            'passenger_coverage_increase': result.metrics.passenger_coverage_increase,
                            'cost_savings': result.metrics.cost_savings
                        }
                    }
                    for i, result in enumerate(ranked_results[:10])  # Top 10
                ],
                'insights': self._generate_ranking_insights(ranked_results, scores, criteria),
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
            return report
            
        except Exception as e:
            self.logger.error(f"Failed to generate ranking report: {e}")
            return {'error': f'Failed to generate ranking report: {str(e)}'}
    
    def _generate_ranking_insights(self, 
                                 ranked_results: List[OptimizationResult],
                                 scores: List[float],
                                 criteria: RankingCriteria) -> List[str]:
        """Generate insights from ranking analysis"""
        insights = []
        
        if not ranked_results or not scores:
            return insights
        
        # Performance distribution insights
        high_performers = sum(1 for score in scores if score >= 70)
        medium_performers = sum(1 for score in scores if 40 <= score < 70)
        low_performers = sum(1 for score in scores if score < 40)
        
        insights.append(f"Performance distribution: {high_performers} high performers (≥70%), "
                       f"{medium_performers} medium performers (40-70%), "
                       f"{low_performers} low performers (<40%)")
        
        # Best performing route insight
        best_result = ranked_results[0]
        insights.append(f"Best performing route: '{best_result.optimized_route.name}' "
                       f"with {scores[0]:.1f}% score in {criteria.value}")
        
        # Criteria-specific insights
        if criteria == RankingCriteria.TIME_EFFICIENCY:
            avg_time_improvement = sum(r.metrics.time_improvement for r in ranked_results) / len(ranked_results)
            insights.append(f"Average time improvement across all routes: {avg_time_improvement:.1f}%")
        
        elif criteria == RankingCriteria.PASSENGER_COVERAGE:
            avg_coverage_increase = sum(r.metrics.passenger_coverage_increase for r in ranked_results) / len(ranked_results)
            insights.append(f"Average passenger coverage increase: {avg_coverage_increase:.1f}%")
        
        elif criteria == RankingCriteria.COST_EFFECTIVENESS:
            avg_cost_savings = sum(r.metrics.cost_savings for r in ranked_results) / len(ranked_results)
            insights.append(f"Average cost savings across all routes: {avg_cost_savings:.1f}%")
        
        # Improvement potential insight
        improvement_potential = sum(1 for r in ranked_results if r.is_improvement(threshold=10.0))
        improvement_rate = (improvement_potential / len(ranked_results)) * 100
        insights.append(f"Routes showing significant improvement (≥10%): {improvement_potential} "
                       f"({improvement_rate:.1f}% of total)")
        
        return insights


class OptimizationResultGenerator:
    """
    Main class for generating and managing optimization results with ranking
    Combines efficiency metrics calculation and ranking functionality
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metrics_calculator = EfficiencyMetricsCalculator()
        self.ranking_engine = RouteRankingEngine()
    
    def generate_optimization_result(self,
                                   original_route: Route,
                                   optimized_route: Route,
                                   population_data: Optional[PopulationDensityData] = None) -> OptimizationResult:
        """
        Generate a complete optimization result with comprehensive metrics
        
        Args:
            original_route: The original route before optimization
            optimized_route: The optimized route
            population_data: Optional population density data
            
        Returns:
            OptimizationResult with detailed metrics and analysis
        """
        try:
            self.logger.info(f"Generating optimization result for route: {original_route.name}")
            
            # Calculate comprehensive metrics
            metrics = self.metrics_calculator.calculate_comprehensive_metrics(
                original_route, optimized_route, population_data
            )
            
            # Create optimization result
            result = OptimizationResult(
                original_route_id=original_route.id,
                optimized_route=optimized_route,
                metrics=metrics,
                population_data=population_data or self._create_default_population_data(original_route),
                generated_at=datetime.now(timezone.utc)
            )
            
            self.logger.info(f"Optimization result generated successfully. Overall score: {metrics.get_overall_score():.2f}")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to generate optimization result: {e}")
            raise
    
    def generate_and_rank_results(self,
                                route_pairs: List[Tuple[Route, Route]],
                                population_data: Optional[PopulationDensityData] = None,
                                ranking_criteria: RankingCriteria = RankingCriteria.OVERALL_SCORE) -> List[OptimizationResult]:
        """
        Generate optimization results for multiple route pairs and rank them
        
        Args:
            route_pairs: List of (original_route, optimized_route) tuples
            population_data: Optional population density data
            ranking_criteria: Criteria for ranking results
            
        Returns:
            List of ranked optimization results (best first)
        """
        try:
            self.logger.info(f"Generating and ranking {len(route_pairs)} optimization results")
            
            # Generate results for all route pairs
            results = []
            for original, optimized in route_pairs:
                result = self.generate_optimization_result(original, optimized, population_data)
                results.append(result)
            
            # Rank the results
            ranked_results = self.ranking_engine.rank_optimization_results(results, ranking_criteria)
            
            self.logger.info(f"Generated and ranked {len(ranked_results)} optimization results")
            return ranked_results
            
        except Exception as e:
            self.logger.error(f"Failed to generate and rank results: {e}")
            raise
    
    def _create_default_population_data(self, route: Route) -> PopulationDensityData:
        """Create default population data when none is provided"""
        from models.population import PopulationDensityData, DensityPoint, DemographicData
        from models.base import GeoBounds
        
        if not route.stops:
            bounds = GeoBounds(north=0.1, south=-0.1, east=0.1, west=-0.1)
            density_points = []
        else:
            lats = [stop.coordinates.latitude for stop in route.stops]
            lons = [stop.coordinates.longitude for stop in route.stops]
            
            bounds = GeoBounds(
                north=max(lats) + 0.01,
                south=min(lats) - 0.01,
                east=max(lons) + 0.01,
                west=min(lons) - 0.01
            )
            
            density_points = []
            for stop in route.stops:
                demographic_data = DemographicData(
                    age_groups={"25-64": 60.0, "18-25": 20.0, "65+": 20.0},
                    economic_indicators={"income": 35000.0}
                )
                
                density_point = DensityPoint(
                    coordinates=stop.coordinates,
                    population=stop.daily_passenger_count * 10,
                    demographic_data=demographic_data
                )
                density_points.append(density_point)
        
        return PopulationDensityData(
            region=f"Route {route.name} Area",
            coordinates=bounds,
            density_points=density_points,
            data_source="Estimated from route data",
            collected_at=datetime.now(timezone.utc)
        )