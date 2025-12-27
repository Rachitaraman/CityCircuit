#!/usr/bin/env python3
"""
CityCircuit Flask ML Service
Main application entry point for the machine learning route optimization service.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from datetime import datetime

# Import our data models
from models import (
    Coordinates, BusStop, Route, PopulationDensityData, DensityPoint,
    OptimizationResult, OptimizationMetrics, User, UserRole,
    DataSerializer, serialize_model, deserialize_model
)

# Import route analysis algorithms
from algorithms import (
    RouteAnalyzer, PopulationAnalyzer, PathMatrixCalculator, 
    OptimizationEngine, PathAlgorithm, OptimizationResultGenerator,
    EfficiencyMetricsCalculator, RouteRankingEngine, RankingCriteria,
    DataExporter, DataValidator, DataImporter, ExportFormat
)

# Load environment variables
load_dotenv()

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret-key')
    app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    # Enable CORS
    CORS(app)
    
    # Initialize optimization engine
    optimization_engine = OptimizationEngine()
    
    # Initialize result generator and ranking engine
    result_generator = OptimizationResultGenerator()
    ranking_engine = RouteRankingEngine()
    metrics_calculator = EfficiencyMetricsCalculator()
    
    # Initialize data export components
    data_exporter = DataExporter()
    data_validator = DataValidator()
    data_importer = DataImporter()
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'service': 'CityCircuit ML Service',
            'version': '1.0.0'
        })
    
    @app.route('/api/ml/status', methods=['GET'])
    def ml_status():
        """ML service status endpoint."""
        return jsonify({
            'status': 'ready',
            'tensorflow_available': True,
            'models_loaded': True,  # Updated to reflect model availability
            'message': 'ML service is ready for route optimization',
            'available_models': [
                'Route', 'BusStop', 'PopulationDensityData', 
                'OptimizationResult', 'User'
            ]
        })
    
    @app.route('/api/ml/models/demo', methods=['GET'])
    def demo_models():
        """Demonstrate the data models with sample data."""
        try:
            # Create sample coordinates (Mumbai)
            coords = Coordinates(latitude=19.0760, longitude=72.8777)
            
            # Create sample bus stops
            stop1 = BusStop(
                name="Chhatrapati Shivaji Terminus",
                coordinates=Coordinates(latitude=18.9398, longitude=72.8355),
                address="Dr Dadabhai Naoroji Rd, Fort, Mumbai",
                amenities=["wheelchair_accessible", "shelter", "seating"],
                daily_passenger_count=50000,
                is_accessible=True
            )
            
            stop2 = BusStop(
                name="Gateway of India",
                coordinates=Coordinates(latitude=18.9220, longitude=72.8347),
                address="Apollo Bandar, Colaba, Mumbai",
                amenities=["shelter", "seating"],
                daily_passenger_count=25000,
                is_accessible=False
            )
            
            # Create sample route
            route = Route(
                name="CST to Gateway Express",
                description="Historic route connecting CST to Gateway of India",
                stops=[stop1, stop2],
                operator_id="mumbai-transport-001",
                estimated_travel_time=30,
                optimization_score=75.5
            )
            
            # Create sample user
            user = User(
                email="operator@mumbaitransport.gov.in",
                role=UserRole.OPERATOR,
                profile={
                    "name": "Mumbai Transport Operator",
                    "organization": "Mumbai Metropolitan Region Development Authority",
                    "preferences": {
                        "language": "en",
                        "theme": "light",
                        "notifications": True,
                        "mapStyle": "default"
                    }
                }
            )
            
            # Serialize models to demonstrate serialization
            serialized_data = {
                'coordinates': serialize_model(coords, 'dict'),
                'route': serialize_model(route, 'dict'),
                'user': serialize_model(user, 'dict'),
                'serialization_timestamp': datetime.utcnow().isoformat()
            }
            
            return jsonify({
                'status': 'success',
                'message': 'Data models demonstration',
                'data': serialized_data
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to demonstrate models: {str(e)}'
            }), 500
    
    @app.route('/api/ml/models/validate', methods=['POST'])
    def validate_model_data():
        """Validate incoming data against our models."""
        try:
            data = request.get_json()
            model_type = data.get('model_type')
            model_data = data.get('data')
            
            if not model_type or not model_data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing model_type or data fields'
                }), 400
            
            # Map model types to classes
            model_classes = {
                'coordinates': Coordinates,
                'bus_stop': BusStop,
                'route': Route,
                'user': User
            }
            
            if model_type not in model_classes:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported model type: {model_type}',
                    'supported_types': list(model_classes.keys())
                }), 400
            
            # Validate the data
            model_class = model_classes[model_type]
            validated_model = deserialize_model(model_class, model_data, 'dict')
            
            return jsonify({
                'status': 'success',
                'message': f'{model_type} data is valid',
                'validated_data': serialize_model(validated_model, 'dict')
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Validation failed: {str(e)}'
            }), 400
    
    @app.route('/api/ml/analyze/route', methods=['POST'])
    def analyze_route():
        """Analyze a route for optimization opportunities."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'route' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing route data'
                }), 400
            
            # Deserialize route data
            route = deserialize_model(Route, data['route'], 'dict')
            
            # Deserialize population data if provided
            population_data = None
            if 'population_data' in data:
                population_data = deserialize_model(PopulationDensityData, data['population_data'], 'dict')
            
            # Perform route analysis
            route_analyzer = RouteAnalyzer()
            analysis_result = route_analyzer.analyze_route(route, population_data)
            
            # Convert result to dict for JSON response
            result_dict = {
                'route_id': analysis_result.route_id,
                'efficiency_score': analysis_result.efficiency_score,
                'coverage_score': analysis_result.coverage_score,
                'accessibility_score': analysis_result.accessibility_score,
                'travel_time_estimate': analysis_result.travel_time_estimate,
                'passenger_demand_score': analysis_result.passenger_demand_score,
                'overall_score': analysis_result.get_overall_score(),
                'bottlenecks': analysis_result.bottlenecks,
                'recommendations': analysis_result.recommendations,
                'analysis_timestamp': analysis_result.analysis_timestamp.isoformat()
            }
            
            return jsonify({
                'status': 'success',
                'message': 'Route analysis completed',
                'analysis_result': result_dict
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Route analysis failed: {str(e)}'
            }), 500
    
    @app.route('/api/ml/optimize/route', methods=['POST'])
    def optimize_route():
        """Optimize a route using the optimization engine."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'route' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing route data'
                }), 400
            
            # Deserialize route data
            route = deserialize_model(Route, data['route'], 'dict')
            
            # Deserialize population data if provided
            population_data = None
            if 'population_data' in data:
                population_data = deserialize_model(PopulationDensityData, data['population_data'], 'dict')
            
            # Perform route optimization
            optimization_result = optimization_engine.optimize_route(route, population_data)
            
            # Serialize result for JSON response
            result_dict = {
                'original_route_id': optimization_result.original_route_id,
                'optimized_route': serialize_model(optimization_result.optimized_route, 'dict'),
                'metrics': serialize_model(optimization_result.metrics, 'dict'),
                'population_data': serialize_model(optimization_result.population_data, 'dict'),
                'generated_at': optimization_result.generated_at.isoformat(),
                'is_improvement': optimization_result.is_improvement(),
                'summary': optimization_result.get_summary()
            }
            
            return jsonify({
                'status': 'success',
                'message': 'Route optimization completed',
                'optimization_result': result_dict
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Route optimization failed: {str(e)}'
            }), 500
    
    @app.route('/api/ml/analyze/population', methods=['POST'])
    def analyze_population():
        """Analyze population density data."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'population_data' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing population_data'
                }), 400
            
            # Deserialize population data
            population_data = deserialize_model(PopulationDensityData, data['population_data'], 'dict')
            
            # Perform population analysis
            population_analyzer = PopulationAnalyzer()
            analysis_result = population_analyzer.analyze_population_data(population_data)
            
            # Convert result to dict for JSON response
            result_dict = {
                'region': analysis_result.region,
                'total_population': analysis_result.total_population,
                'population_density': analysis_result.population_density,
                'high_density_areas': analysis_result.high_density_areas,
                'demographic_insights': analysis_result.demographic_insights,
                'optimal_stop_locations': [
                    {'latitude': coord.latitude, 'longitude': coord.longitude}
                    for coord in analysis_result.optimal_stop_locations
                ],
                'coverage_gaps': analysis_result.coverage_gaps,
                'analysis_timestamp': analysis_result.analysis_timestamp.isoformat()
            }
            
            # Generate route recommendations
            recommendations = population_analyzer.generate_route_recommendations(analysis_result)
            result_dict['route_recommendations'] = recommendations
            
            return jsonify({
                'status': 'success',
                'message': 'Population analysis completed',
                'analysis_result': result_dict
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Population analysis failed: {str(e)}'
            }), 500
    
    @app.route('/api/ml/calculate/path-matrix', methods=['POST'])
    def calculate_path_matrix():
        """Calculate path matrix for a set of bus stops."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'stops' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing stops data'
                }), 400
            
            # Deserialize stops data
            stops = [deserialize_model(BusStop, stop_data, 'dict') for stop_data in data['stops']]
            
            # Get algorithm preference
            algorithm_name = data.get('algorithm', 'haversine')
            try:
                algorithm = PathAlgorithm(algorithm_name)
            except ValueError:
                algorithm = PathAlgorithm.HAVERSINE
            
            # Calculate path matrix
            path_calculator = PathMatrixCalculator()
            path_matrix = path_calculator.calculate_path_matrix(stops, algorithm)
            
            # Convert matrices to lists for JSON serialization
            result_dict = {
                'stop_ids': path_matrix.stop_ids,
                'distance_matrix': path_matrix.distance_matrix.tolist(),
                'time_matrix': path_matrix.time_matrix.tolist(),
                'algorithm_used': path_matrix.algorithm_used.value,
                'calculation_timestamp': path_matrix.calculation_timestamp,
                'connectivity_analysis': path_calculator.analyze_connectivity(path_matrix)
            }
            
            return jsonify({
                'status': 'success',
                'message': 'Path matrix calculation completed',
                'path_matrix': result_dict
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Path matrix calculation failed: {str(e)}'
            }), 500
    
    @app.route('/api/ml/batch/optimize', methods=['POST'])
    def batch_optimize_routes():
        """Optimize multiple routes in batch."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'routes' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing routes data'
                }), 400
            
            # Deserialize routes data
            routes = [deserialize_model(Route, route_data, 'dict') for route_data in data['routes']]
            
            # Deserialize population data if provided
            population_data = None
            if 'population_data' in data:
                population_data = deserialize_model(PopulationDensityData, data['population_data'], 'dict')
            
            # Perform batch optimization
            optimization_results = optimization_engine.batch_optimize_routes(routes, population_data)
            
            # Serialize results
            results_list = []
            for result in optimization_results:
                result_dict = {
                    'original_route_id': result.original_route_id,
                    'optimized_route': serialize_model(result.optimized_route, 'dict'),
                    'metrics': serialize_model(result.metrics, 'dict'),
                    'generated_at': result.generated_at.isoformat(),
                    'is_improvement': result.is_improvement(),
                    'summary': result.get_summary()
                }
                results_list.append(result_dict)
            
            # Generate optimization summary
            summary = optimization_engine.get_optimization_summary(optimization_results)
            
            return jsonify({
                'status': 'success',
                'message': f'Batch optimization completed for {len(optimization_results)} routes',
                'optimization_results': results_list,
                'summary': summary
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Batch optimization failed: {str(e)}'
            }), 500
    
    @app.route('/api/ml/generate/optimization-result', methods=['POST'])
    def generate_optimization_result():
        """Generate comprehensive optimization result with enhanced metrics."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'original_route' not in data or 'optimized_route' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing original_route or optimized_route data'
                }), 400
            
            # Deserialize route data
            original_route = deserialize_model(Route, data['original_route'], 'dict')
            optimized_route = deserialize_model(Route, data['optimized_route'], 'dict')
            
            # Deserialize population data if provided
            population_data = None
            if 'population_data' in data:
                population_data = deserialize_model(PopulationDensityData, data['population_data'], 'dict')
            
            # Generate comprehensive optimization result
            result = result_generator.generate_optimization_result(
                original_route, optimized_route, population_data
            )
            
            # Serialize result for JSON response
            result_dict = {
                'original_route_id': result.original_route_id,
                'optimized_route': serialize_model(result.optimized_route, 'dict'),
                'metrics': serialize_model(result.metrics, 'dict'),
                'population_data': serialize_model(result.population_data, 'dict'),
                'generated_at': result.generated_at.isoformat(),
                'is_improvement': result.is_improvement(),
                'summary': result.get_summary()
            }
            
            return jsonify({
                'status': 'success',
                'message': 'Optimization result generated with comprehensive metrics',
                'optimization_result': result_dict
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to generate optimization result: {str(e)}'
            }), 500
    
    @app.route('/api/ml/calculate/efficiency-metrics', methods=['POST'])
    def calculate_efficiency_metrics():
        """Calculate comprehensive efficiency metrics for route comparison."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'original_route' not in data or 'optimized_route' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing original_route or optimized_route data'
                }), 400
            
            # Deserialize route data
            original_route = deserialize_model(Route, data['original_route'], 'dict')
            optimized_route = deserialize_model(Route, data['optimized_route'], 'dict')
            
            # Deserialize population data if provided
            population_data = None
            if 'population_data' in data:
                population_data = deserialize_model(PopulationDensityData, data['population_data'], 'dict')
            
            # Calculate comprehensive metrics
            metrics = metrics_calculator.calculate_comprehensive_metrics(
                original_route, optimized_route, population_data
            )
            
            # Serialize metrics for JSON response
            metrics_dict = serialize_model(metrics, 'dict')
            metrics_dict['overall_score'] = metrics.get_overall_score()
            
            return jsonify({
                'status': 'success',
                'message': 'Comprehensive efficiency metrics calculated',
                'metrics': metrics_dict
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to calculate efficiency metrics: {str(e)}'
            }), 500
    
    @app.route('/api/ml/rank/optimization-results', methods=['POST'])
    def rank_optimization_results():
        """Rank optimization results based on specified criteria."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'optimization_results' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing optimization_results data'
                }), 400
            
            # Deserialize optimization results
            results = []
            for result_data in data['optimization_results']:
                result = deserialize_model(OptimizationResult, result_data, 'dict')
                results.append(result)
            
            # Get ranking criteria
            criteria_name = data.get('criteria', 'overall_score')
            try:
                criteria = RankingCriteria(criteria_name)
            except ValueError:
                criteria = RankingCriteria.OVERALL_SCORE
            
            # Get custom weights if provided
            weights = data.get('weights')
            
            # Rank the results
            ranked_results = ranking_engine.rank_optimization_results(results, criteria, weights)
            
            # Serialize ranked results
            ranked_results_list = []
            for i, result in enumerate(ranked_results):
                result_dict = {
                    'rank': i + 1,
                    'original_route_id': result.original_route_id,
                    'optimized_route': serialize_model(result.optimized_route, 'dict'),
                    'metrics': serialize_model(result.metrics, 'dict'),
                    'generated_at': result.generated_at.isoformat(),
                    'is_improvement': result.is_improvement(),
                    'summary': result.get_summary()
                }
                ranked_results_list.append(result_dict)
            
            return jsonify({
                'status': 'success',
                'message': f'Ranked {len(ranked_results)} optimization results by {criteria.value}',
                'ranking_criteria': criteria.value,
                'ranked_results': ranked_results_list
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to rank optimization results: {str(e)}'
            }), 500
    
    @app.route('/api/ml/generate/ranking-report', methods=['POST'])
    def generate_ranking_report():
        """Generate comprehensive ranking report for optimization results."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'optimization_results' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing optimization_results data'
                }), 400
            
            # Deserialize optimization results
            results = []
            for result_data in data['optimization_results']:
                result = deserialize_model(OptimizationResult, result_data, 'dict')
                results.append(result)
            
            # Get ranking criteria
            criteria_name = data.get('criteria', 'overall_score')
            try:
                criteria = RankingCriteria(criteria_name)
            except ValueError:
                criteria = RankingCriteria.OVERALL_SCORE
            
            # Generate ranking report
            report = ranking_engine.generate_ranking_report(results, criteria)
            
            return jsonify({
                'status': 'success',
                'message': 'Ranking report generated successfully',
                'report': report
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to generate ranking report: {str(e)}'
            }), 500
    
    @app.route('/api/ml/batch/generate-and-rank', methods=['POST'])
    def batch_generate_and_rank():
        """Generate optimization results for multiple route pairs and rank them."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'route_pairs' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing route_pairs data'
                }), 400
            
            # Deserialize route pairs
            route_pairs = []
            for pair_data in data['route_pairs']:
                if 'original_route' not in pair_data or 'optimized_route' not in pair_data:
                    continue
                
                original = deserialize_model(Route, pair_data['original_route'], 'dict')
                optimized = deserialize_model(Route, pair_data['optimized_route'], 'dict')
                route_pairs.append((original, optimized))
            
            if not route_pairs:
                return jsonify({
                    'status': 'error',
                    'message': 'No valid route pairs found in request'
                }), 400
            
            # Deserialize population data if provided
            population_data = None
            if 'population_data' in data:
                population_data = deserialize_model(PopulationDensityData, data['population_data'], 'dict')
            
            # Get ranking criteria
            criteria_name = data.get('criteria', 'overall_score')
            try:
                criteria = RankingCriteria(criteria_name)
            except ValueError:
                criteria = RankingCriteria.OVERALL_SCORE
            
            # Generate and rank results
            ranked_results = result_generator.generate_and_rank_results(
                route_pairs, population_data, criteria
            )
            
            # Serialize results
            results_list = []
            for i, result in enumerate(ranked_results):
                result_dict = {
                    'rank': i + 1,
                    'original_route_id': result.original_route_id,
                    'optimized_route': serialize_model(result.optimized_route, 'dict'),
                    'metrics': serialize_model(result.metrics, 'dict'),
                    'generated_at': result.generated_at.isoformat(),
                    'is_improvement': result.is_improvement(),
                    'summary': result.get_summary()
                }
                results_list.append(result_dict)
            
            # Generate summary report
            report = ranking_engine.generate_ranking_report(ranked_results, criteria)
            
            return jsonify({
                'status': 'success',
                'message': f'Generated and ranked {len(ranked_results)} optimization results',
                'ranking_criteria': criteria.value,
                'ranked_results': results_list,
                'summary_report': report
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to generate and rank results: {str(e)}'
            }), 500
    
    @app.route('/api/ml/export/routes', methods=['POST'])
    def export_route_data():
        """Export route data in specified format."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'routes' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing routes data'
                }), 400
            
            # Deserialize routes data
            routes = [deserialize_model(Route, route_data, 'dict') for route_data in data['routes']]
            
            # Get export format
            format_name = data.get('format', 'json')
            try:
                export_format = ExportFormat(format_name)
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported export format: {format_name}',
                    'supported_formats': [f.value for f in ExportFormat]
                }), 400
            
            # Get export options
            include_metadata = data.get('include_metadata', True)
            
            # Export the data
            export_result = data_exporter.export_route_data(routes, export_format, include_metadata)
            
            # Validate the exported data
            validation_result = data_validator.validate_export(export_result, export_format)
            
            return jsonify({
                'status': 'success',
                'message': f'Route data exported in {export_format.value} format',
                'export_result': export_result,
                'validation': validation_result
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to export route data: {str(e)}'
            }), 500
    
    @app.route('/api/ml/export/optimization-results', methods=['POST'])
    def export_optimization_results():
        """Export optimization results in specified format."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'optimization_results' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing optimization_results data'
                }), 400
            
            # Deserialize optimization results
            results = []
            for result_data in data['optimization_results']:
                result = deserialize_model(OptimizationResult, result_data, 'dict')
                results.append(result)
            
            # Get export format
            format_name = data.get('format', 'json')
            try:
                export_format = ExportFormat(format_name)
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported export format: {format_name}',
                    'supported_formats': ['json', 'csv']
                }), 400
            
            # Export the data
            export_result = data_exporter.export_optimization_results(results, export_format)
            
            # Validate the exported data
            validation_result = data_validator.validate_export(export_result, export_format)
            
            return jsonify({
                'status': 'success',
                'message': f'Optimization results exported in {export_format.value} format',
                'export_result': export_result,
                'validation': validation_result
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to export optimization results: {str(e)}'
            }), 500
    
    @app.route('/api/ml/import/routes', methods=['POST'])
    def import_route_data():
        """Import route data from exported format for round-trip testing."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'export_data' not in data or 'format' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing export_data or format fields'
                }), 400
            
            # Get import format
            format_name = data['format']
            try:
                import_format = ExportFormat(format_name)
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported import format: {format_name}',
                    'supported_formats': ['json', 'csv', 'xml', 'geojson']
                }), 400
            
            # Import the data
            imported_routes = data_importer.import_route_data(data['export_data'], import_format)
            
            # Serialize imported routes for response
            routes_data = []
            for route in imported_routes:
                route_dict = serialize_model(route, 'dict')
                routes_data.append(route_dict)
            
            return jsonify({
                'status': 'success',
                'message': f'Successfully imported {len(imported_routes)} routes from {import_format.value} format',
                'imported_routes': routes_data,
                'import_summary': {
                    'total_routes': len(imported_routes),
                    'total_stops': sum(len(route.stops) for route in imported_routes),
                    'format': import_format.value
                }
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to import route data: {str(e)}'
            }), 500
    
    @app.route('/api/ml/validate/export', methods=['POST'])
    def validate_export_data():
        """Validate exported data for format compliance."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'export_data' not in data or 'format' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing export_data or format fields'
                }), 400
            
            # Get validation format
            format_name = data['format']
            try:
                validation_format = ExportFormat(format_name)
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported validation format: {format_name}',
                    'supported_formats': [f.value for f in ExportFormat]
                }), 400
            
            # Validate the data
            validation_result = data_validator.validate_export(data['export_data'], validation_format)
            
            return jsonify({
                'status': 'success',
                'message': 'Export data validation completed',
                'validation_result': validation_result
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to validate export data: {str(e)}'
            }), 500
    
    @app.route('/api/ml/export/formats', methods=['GET'])
    def get_supported_export_formats():
        """Get list of supported export formats and their specifications."""
        try:
            formats_info = {}
            
            for export_format in ExportFormat:
                formats_info[export_format.value] = {
                    'name': export_format.value.upper(),
                    'description': self._get_format_description(export_format),
                    'supports_routes': True,
                    'supports_optimization_results': export_format in [ExportFormat.JSON, ExportFormat.CSV],
                    'compliance_info': data_exporter._get_format_compliance(export_format)
                }
            
            return jsonify({
                'status': 'success',
                'message': 'Supported export formats retrieved',
                'supported_formats': formats_info,
                'total_formats': len(formats_info)
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to get export formats: {str(e)}'
            }), 500
    
    def _get_format_description(self, export_format: ExportFormat) -> str:
        """Get description for export format"""
        descriptions = {
            ExportFormat.GTFS: "General Transit Feed Specification - Industry standard for public transportation schedules",
            ExportFormat.JSON: "JavaScript Object Notation - Lightweight data interchange format",
            ExportFormat.CSV: "Comma-Separated Values - Simple tabular data format",
            ExportFormat.XML: "Extensible Markup Language - Structured document format",
            ExportFormat.GEOJSON: "Geographic JSON - Format for encoding geographic data structures"
        }
        return descriptions.get(export_format, "Unknown format")
    
    @app.route('/api/ml/test/round-trip', methods=['POST'])
    def test_round_trip_export_import():
        """Test round-trip export and import to verify data integrity."""
        try:
            data = request.get_json()
            
            # Validate required fields
            if 'routes' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing routes data'
                }), 400
            
            # Deserialize original routes
            original_routes = [deserialize_model(Route, route_data, 'dict') for route_data in data['routes']]
            
            # Get test format
            format_name = data.get('format', 'json')
            try:
                test_format = ExportFormat(format_name)
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported test format: {format_name}',
                    'supported_formats': ['json', 'csv', 'xml', 'geojson']
                }), 400
            
            # Export the data
            export_result = data_exporter.export_route_data(original_routes, test_format, True)
            
            # Validate exported data
            validation_result = data_validator.validate_export(export_result, test_format)
            
            if not validation_result.get('valid', False):
                return jsonify({
                    'status': 'error',
                    'message': 'Export validation failed',
                    'validation_errors': validation_result.get('errors', [])
                }), 400
            
            # Import the exported data
            imported_routes = data_importer.import_route_data(export_result, test_format)
            
            # Compare original and imported data
            comparison_result = self._compare_routes(original_routes, imported_routes)
            
            return jsonify({
                'status': 'success',
                'message': f'Round-trip test completed for {test_format.value} format',
                'original_count': len(original_routes),
                'imported_count': len(imported_routes),
                'validation_result': validation_result,
                'comparison_result': comparison_result,
                'round_trip_successful': comparison_result.get('data_integrity_preserved', False)
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Round-trip test failed: {str(e)}'
            }), 500
    
    def _compare_routes(self, original_routes: List[Route], imported_routes: List[Route]) -> Dict[str, Any]:
        """Compare original and imported routes for data integrity"""
        comparison = {
            'data_integrity_preserved': True,
            'route_count_match': len(original_routes) == len(imported_routes),
            'differences': [],
            'summary': {
                'original_routes': len(original_routes),
                'imported_routes': len(imported_routes),
                'total_differences': 0
            }
        }
        
        if not comparison['route_count_match']:
            comparison['data_integrity_preserved'] = False
            comparison['differences'].append({
                'type': 'count_mismatch',
                'message': f"Route count mismatch: {len(original_routes)} vs {len(imported_routes)}"
            })
        
        # Compare routes by name (simplified comparison)
        original_names = {route.name for route in original_routes}
        imported_names = {route.name for route in imported_routes}
        
        missing_routes = original_names - imported_names
        extra_routes = imported_names - original_names
        
        if missing_routes:
            comparison['data_integrity_preserved'] = False
            comparison['differences'].append({
                'type': 'missing_routes',
                'routes': list(missing_routes)
            })
        
        if extra_routes:
            comparison['data_integrity_preserved'] = False
            comparison['differences'].append({
                'type': 'extra_routes',
                'routes': list(extra_routes)
            })
        
        comparison['summary']['total_differences'] = len(comparison['differences'])
        
        return comparison
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])