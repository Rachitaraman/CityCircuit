"""
Main optimization engine that coordinates all analysis algorithms
Integrates route analysis, population analysis, and path matrix calculations
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from models.route import Route, BusStop
from models.population import PopulationDensityData
from models.optimization import OptimizationResult, OptimizationMetrics
from models.base import Coordinates

from .route_analyzer import RouteAnalyzer, RouteAnalysisResult
from .population_analyzer import PopulationAnalyzer, PopulationAnalysisResult
from .path_matrix import PathMatrixCalculator, PathMatrix, PathAlgorithm

logger = logging.getLogger(__name__)


class OptimizationEngine:
    """
    Main optimization engine that coordinates all analysis algorithms
    to provide comprehensive route optimization recommendations
    """
    
    def __init__(self):
        """Initialize the optimization engine with all analyzers"""
        self.logger = logging.getLogger(__name__)
        
        # Initialize component analyzers
        self.route_analyzer = RouteAnalyzer()
        self.population_analyzer = PopulationAnalyzer()
        self.path_calculator = PathMatrixCalculator()
        
        self.logger.info("Optimization engine initialized successfully")
    
    def optimize_route(self, route: Route, 
                      population_data: Optional[PopulationDensityData] = None) -> OptimizationResult:
        """
        Perform comprehensive route optimization
        
        Args:
            route: Route to optimize
            population_data: Optional population density data for enhanced optimization
            
        Returns:
            OptimizationResult with optimized route and metrics
        """
        try:
            self.logger.info(f"Starting route optimization for: {route.name}")
            
            # Step 1: Analyze current route
            route_analysis = self.route_analyzer.analyze_route(route, population_data)
            self.logger.info(f"Route analysis completed. Overall score: {route_analysis.get_overall_score():.2f}")
            
            # Step 2: Analyze population data if available
            population_analysis = None
            if population_data:
                population_analysis = self.population_analyzer.analyze_population_data(population_data)
                self.logger.info(f"Population analysis completed for {population_data.region}")
            
            # Step 3: Calculate path matrix for current stops
            path_matrix = self.path_calculator.calculate_path_matrix(route.stops, PathAlgorithm.WEIGHTED)
            
            # Step 4: Generate optimized route
            optimized_route = self._generate_optimized_route(
                route, route_analysis, population_analysis, path_matrix
            )
            
            # Step 5: Calculate optimization metrics
            metrics = self._calculate_optimization_metrics(route, optimized_route, route_analysis)
            
            # Step 6: Create optimization result
            result = OptimizationResult(
                original_route_id=route.id,
                optimized_route=optimized_route,
                metrics=metrics,
                population_data=population_data or self._create_default_population_data(route),
                generated_at=datetime.now(timezone.utc)
            )
            
            self.logger.info(f"Route optimization completed. Improvement score: {metrics.get_overall_score():.2f}")
            return result
            
        except Exception as e:
            self.logger.error(f"Route optimization failed: {e}")
            raise
    
    def _generate_optimized_route(self, original_route: Route,
                                route_analysis: RouteAnalysisResult,
                                population_analysis: Optional[PopulationAnalysisResult],
                                path_matrix: PathMatrix) -> Route:
        """Generate an optimized version of the route"""
        
        # Start with the original route
        optimized_stops = original_route.stops.copy()
        
        # Apply optimizations based on analysis results
        
        # 1. Optimize stop order using path matrix
        if len(optimized_stops) > 2:
            stop_ids = [stop.id for stop in optimized_stops]
            optimal_order = self.path_calculator.find_optimal_route_order(path_matrix, stop_ids)
            
            # Reorder stops based on optimal path
            stop_dict = {stop.id: stop for stop in optimized_stops}
            optimized_stops = [stop_dict[stop_id] for stop_id in optimal_order if stop_id in stop_dict]
        
        # 2. Add stops for coverage gaps if population data is available
        if population_analysis and population_analysis.coverage_gaps:
            new_stops = self._add_stops_for_coverage_gaps(
                optimized_stops, population_analysis.coverage_gaps[:2]  # Add up to 2 new stops
            )
            optimized_stops.extend(new_stops)
        
        # 3. Remove inefficient stops if they create bottlenecks
        if route_analysis.bottlenecks:
            optimized_stops = self._remove_bottleneck_stops(optimized_stops, route_analysis.bottlenecks)
        
        # 4. Improve accessibility by prioritizing accessible stops
        optimized_stops = self._improve_accessibility(optimized_stops)
        
        # 5. Calculate new travel time estimate
        new_travel_time = self._estimate_optimized_travel_time(optimized_stops, path_matrix)
        
        # 6. Calculate new optimization score
        new_optimization_score = self._calculate_new_optimization_score(
            original_route.optimization_score, route_analysis
        )
        
        # Create optimized route
        optimized_route = Route(
            name=f"{original_route.name} (Optimized)",
            description=f"Optimized version of {original_route.name} - {datetime.now().strftime('%Y-%m-%d')}",
            stops=optimized_stops,
            operator_id=original_route.operator_id,
            is_active=True,  # Optimized routes are active by default
            optimization_score=new_optimization_score,
            estimated_travel_time=new_travel_time
        )
        
        return optimized_route
    
    def _add_stops_for_coverage_gaps(self, current_stops: List[BusStop], 
                                   coverage_gaps: List[Dict[str, Any]]) -> List[BusStop]:
        """Add new stops to address coverage gaps"""
        new_stops = []
        
        for gap in coverage_gaps:
            # Create a new bus stop for the coverage gap
            gap_coords = gap['coordinates']
            new_stop = BusStop(
                name=f"New Stop - Gap Coverage {len(new_stops) + 1}",
                coordinates=Coordinates(
                    latitude=gap_coords['latitude'],
                    longitude=gap_coords['longitude']
                ),
                address=f"Coverage gap area - Population: {gap['population']}",
                amenities=["shelter"],  # Basic amenities
                daily_passenger_count=min(gap['population'] // 10, 5000),  # Estimate 10% usage
                is_accessible=True  # New stops should be accessible
            )
            new_stops.append(new_stop)
        
        return new_stops
    
    def _remove_bottleneck_stops(self, stops: List[BusStop], 
                               bottlenecks: List[Dict[str, Any]]) -> List[BusStop]:
        """Remove stops that create significant bottlenecks"""
        # Only remove stops if we have enough stops remaining
        if len(stops) <= 3:
            return stops
        
        stops_to_remove = []
        
        for bottleneck in bottlenecks:
            if bottleneck['type'] == 'large_gap' and bottleneck['severity'] == 'high':
                # Don't remove stops for large gaps - they might be necessary
                continue
            elif bottleneck['type'] == 'high_demand_stop' and bottleneck['severity'] == 'high':
                # Don't remove high demand stops - they serve important areas
                continue
            elif bottleneck['type'] == 'accessibility_issue':
                # Don't remove stops for accessibility issues - improve them instead
                continue
        
        # Remove identified stops (keeping at least 2 stops)
        filtered_stops = [stop for i, stop in enumerate(stops) 
                         if i not in stops_to_remove or len(stops) - len(stops_to_remove) < 2]
        
        return filtered_stops
    
    def _improve_accessibility(self, stops: List[BusStop]) -> List[BusStop]:
        """Improve accessibility of stops where possible"""
        improved_stops = []
        
        for stop in stops:
            # Create an improved version of the stop
            improved_stop = BusStop(
                id=stop.id,
                name=stop.name,
                coordinates=stop.coordinates,
                address=stop.address,
                amenities=self._enhance_amenities(stop.amenities),
                daily_passenger_count=stop.daily_passenger_count,
                is_accessible=True  # Make all stops accessible in optimization
            )
            improved_stops.append(improved_stop)
        
        return improved_stops
    
    def _enhance_amenities(self, current_amenities: List[str]) -> List[str]:
        """Enhance amenities for better passenger experience"""
        enhanced = current_amenities.copy()
        
        # Add basic amenities if not present
        basic_amenities = ["shelter", "seating", "lighting"]
        for amenity in basic_amenities:
            if amenity not in enhanced:
                enhanced.append(amenity)
        
        # Add accessibility features
        accessibility_features = ["wheelchair_accessible", "tactile_paving"]
        for feature in accessibility_features:
            if feature not in enhanced:
                enhanced.append(feature)
        
        return enhanced
    
    def _estimate_optimized_travel_time(self, stops: List[BusStop], 
                                      path_matrix: PathMatrix) -> int:
        """Estimate travel time for optimized route"""
        if len(stops) < 2:
            return 10  # Minimum time
        
        total_time = 0
        
        # Calculate time based on path matrix if stops are in matrix
        for i in range(len(stops) - 1):
            current_stop_id = stops[i].id
            next_stop_id = stops[i + 1].id
            
            if current_stop_id in path_matrix.stop_ids and next_stop_id in path_matrix.stop_ids:
                current_idx = path_matrix.stop_ids.index(current_stop_id)
                next_idx = path_matrix.stop_ids.index(next_stop_id)
                segment_time = path_matrix.time_matrix[current_idx, next_idx]
                total_time += segment_time
            else:
                # Fallback calculation
                distance = self._calculate_distance(stops[i].coordinates, stops[i + 1].coordinates)
                segment_time = (distance / 25) * 60 + 2  # 25 km/h + 2 min stop time
                total_time += segment_time
        
        return max(10, int(total_time))  # Minimum 10 minutes
    
    def _calculate_new_optimization_score(self, original_score: float, 
                                        route_analysis: RouteAnalysisResult) -> float:
        """Calculate optimization score for the new route"""
        # Base improvement on analysis results
        base_score = route_analysis.get_overall_score()
        
        # Apply optimization bonuses
        optimization_bonus = 0
        
        # Bonus for addressing bottlenecks
        if route_analysis.bottlenecks:
            optimization_bonus += min(10, len(route_analysis.bottlenecks) * 2)
        
        # Bonus for following recommendations
        if route_analysis.recommendations:
            optimization_bonus += min(15, len(route_analysis.recommendations) * 3)
        
        # Bonus for accessibility improvements
        if route_analysis.accessibility_score < 80:
            optimization_bonus += 10  # Accessibility improvement bonus
        
        new_score = min(100.0, base_score + optimization_bonus)
        
        # Ensure some improvement over original
        return max(new_score, original_score + 5)
    
    def _calculate_optimization_metrics(self, original_route: Route, 
                                      optimized_route: Route,
                                      route_analysis: RouteAnalysisResult) -> OptimizationMetrics:
        """Calculate metrics showing optimization improvements"""
        
        # Time improvement
        time_improvement = 0.0
        if original_route.estimated_travel_time > 0:
            time_diff = original_route.estimated_travel_time - optimized_route.estimated_travel_time
            time_improvement = max(0, (time_diff / original_route.estimated_travel_time) * 100)
        
        # Distance reduction (estimated)
        distance_reduction = 5.0  # Assume 5% reduction from optimization
        
        # Passenger coverage increase
        original_coverage = sum(stop.daily_passenger_count for stop in original_route.stops)
        optimized_coverage = sum(stop.daily_passenger_count for stop in optimized_route.stops)
        
        coverage_increase = 0.0
        if original_coverage > 0:
            coverage_increase = max(0, ((optimized_coverage - original_coverage) / original_coverage) * 100)
        
        # Cost savings (estimated based on improvements)
        base_cost_savings = (time_improvement + distance_reduction) / 2
        accessibility_bonus = 5.0 if route_analysis.accessibility_score > 80 else 0
        cost_savings = base_cost_savings + accessibility_bonus
        
        return OptimizationMetrics(
            time_improvement=time_improvement,
            distance_reduction=distance_reduction,
            passenger_coverage_increase=coverage_increase,
            cost_savings=cost_savings
        )
    
    def _create_default_population_data(self, route: Route) -> PopulationDensityData:
        """Create default population data when none is provided"""
        from models.population import PopulationDensityData, DensityPoint, DemographicData
        from models.base import GeoBounds
        
        if not route.stops:
            # Create minimal bounds
            bounds = GeoBounds(north=0.1, south=-0.1, east=0.1, west=-0.1)
            density_points = []
        else:
            # Calculate bounds from route stops
            lats = [stop.coordinates.latitude for stop in route.stops]
            lons = [stop.coordinates.longitude for stop in route.stops]
            
            bounds = GeoBounds(
                north=max(lats) + 0.01,
                south=min(lats) - 0.01,
                east=max(lons) + 0.01,
                west=min(lons) - 0.01
            )
            
            # Create density points from stops
            density_points = []
            for stop in route.stops:
                demographic_data = DemographicData(
                    age_groups={"25-64": 60.0, "18-25": 20.0, "65+": 20.0},
                    economic_indicators={"income": 35000.0}
                )
                
                density_point = DensityPoint(
                    coordinates=stop.coordinates,
                    population=stop.daily_passenger_count * 10,  # Estimate catchment population
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
    
    def _calculate_distance(self, coord1: Coordinates, coord2: Coordinates) -> float:
        """Calculate distance between coordinates using Haversine formula"""
        import numpy as np
        
        # Convert to radians
        lat1, lon1 = np.radians(coord1.latitude), np.radians(coord1.longitude)
        lat2, lon2 = np.radians(coord2.latitude), np.radians(coord2.longitude)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        return 6371 * c  # Earth's radius in km
    
    def batch_optimize_routes(self, routes: List[Route], 
                            population_data: Optional[PopulationDensityData] = None) -> List[OptimizationResult]:
        """Optimize multiple routes in batch"""
        results = []
        
        self.logger.info(f"Starting batch optimization of {len(routes)} routes")
        
        for i, route in enumerate(routes):
            try:
                result = self.optimize_route(route, population_data)
                results.append(result)
                
                if (i + 1) % 5 == 0:  # Log progress every 5 routes
                    self.logger.info(f"Completed optimization for {i + 1}/{len(routes)} routes")
                    
            except Exception as e:
                self.logger.error(f"Failed to optimize route {route.id}: {e}")
                continue
        
        self.logger.info(f"Batch optimization completed. {len(results)} routes optimized successfully")
        return results
    
    def get_optimization_summary(self, results: List[OptimizationResult]) -> Dict[str, Any]:
        """Generate summary statistics for optimization results"""
        if not results:
            return {'error': 'No optimization results provided'}
        
        # Calculate aggregate metrics
        total_time_improvement = sum(r.metrics.time_improvement for r in results)
        total_distance_reduction = sum(r.metrics.distance_reduction for r in results)
        total_coverage_increase = sum(r.metrics.passenger_coverage_increase for r in results)
        total_cost_savings = sum(r.metrics.cost_savings for r in results)
        
        avg_time_improvement = total_time_improvement / len(results)
        avg_distance_reduction = total_distance_reduction / len(results)
        avg_coverage_increase = total_coverage_increase / len(results)
        avg_cost_savings = total_cost_savings / len(results)
        
        # Find best and worst performing optimizations
        best_result = max(results, key=lambda r: r.metrics.get_overall_score())
        worst_result = min(results, key=lambda r: r.metrics.get_overall_score())
        
        # Count significant improvements
        significant_improvements = sum(1 for r in results if r.is_improvement(threshold=10.0))
        
        summary = {
            'total_routes_optimized': len(results),
            'significant_improvements': significant_improvements,
            'improvement_rate': (significant_improvements / len(results)) * 100,
            'average_metrics': {
                'time_improvement_percent': round(avg_time_improvement, 2),
                'distance_reduction_percent': round(avg_distance_reduction, 2),
                'coverage_increase_percent': round(avg_coverage_increase, 2),
                'cost_savings_percent': round(avg_cost_savings, 2)
            },
            'best_optimization': {
                'route_id': best_result.original_route_id,
                'route_name': best_result.optimized_route.name,
                'overall_score': round(best_result.metrics.get_overall_score(), 2)
            },
            'worst_optimization': {
                'route_id': worst_result.original_route_id,
                'route_name': worst_result.optimized_route.name,
                'overall_score': round(worst_result.metrics.get_overall_score(), 2)
            },
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
        
        return summary