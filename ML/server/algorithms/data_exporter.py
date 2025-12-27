"""
Data export functionality for CityCircuit ML Service
Implements route data export in standard transportation formats with validation and import capabilities.
"""

import json
import csv
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone
from enum import Enum
from io import StringIO
import zipfile
import tempfile
import os

from models import Route, BusStop, OptimizationResult, PopulationDensityData, Coordinates


class ExportFormat(Enum):
    """Supported export formats for transportation data"""
    GTFS = "gtfs"  # General Transit Feed Specification
    JSON = "json"  # JSON format
    CSV = "csv"    # Comma-separated values
    XML = "xml"    # XML format
    GEOJSON = "geojson"  # GeoJSON for geographic data


class DataExporter:
    """
    Handles export of route and transportation data in standard formats
    """
    
    def __init__(self):
        self.supported_formats = list(ExportFormat)
    
    def export_route_data(self, routes: List[Route], format_type: ExportFormat, 
                         include_metadata: bool = True) -> Dict[str, Any]:
        """
        Export route data in the specified format
        
        Args:
            routes: List of Route objects to export
            format_type: Target export format
            include_metadata: Whether to include export metadata
            
        Returns:
            Dictionary containing exported data and metadata
        """
        if format_type == ExportFormat.GTFS:
            return self._export_gtfs(routes, include_metadata)
        elif format_type == ExportFormat.JSON:
            return self._export_json(routes, include_metadata)
        elif format_type == ExportFormat.CSV:
            return self._export_csv(routes, include_metadata)
        elif format_type == ExportFormat.XML:
            return self._export_xml(routes, include_metadata)
        elif format_type == ExportFormat.GEOJSON:
            return self._export_geojson(routes, include_metadata)
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    def export_optimization_results(self, results: List[OptimizationResult], 
                                  format_type: ExportFormat) -> Dict[str, Any]:
        """
        Export optimization results in the specified format
        
        Args:
            results: List of OptimizationResult objects to export
            format_type: Target export format
            
        Returns:
            Dictionary containing exported data and metadata
        """
        if format_type == ExportFormat.JSON:
            return self._export_optimization_results_json(results)
        elif format_type == ExportFormat.CSV:
            return self._export_optimization_results_csv(results)
        else:
            raise ValueError(f"Optimization results export not supported for format: {format_type}")
    
    def _export_gtfs(self, routes: List[Route], include_metadata: bool) -> Dict[str, Any]:
        """Export routes in GTFS format"""
        # GTFS requires multiple files: agency.txt, routes.txt, stops.txt, stop_times.txt, trips.txt
        
        # Collect all unique stops
        all_stops = {}
        for route in routes:
            for stop in route.stops:
                all_stops[stop.id] = stop
        
        # Generate GTFS files
        gtfs_files = {}
        
        # agency.txt
        agency_data = [
            ["agency_id", "agency_name", "agency_url", "agency_timezone"],
            ["citycircuit", "CityCircuit Transport", "https://citycircuit.com", "Asia/Kolkata"]
        ]
        gtfs_files["agency.txt"] = self._list_to_csv(agency_data)
        
        # routes.txt
        routes_data = [["route_id", "agency_id", "route_short_name", "route_long_name", "route_type"]]
        for route in routes:
            routes_data.append([
                route.id,
                "citycircuit",
                route.name,
                route.description,
                "3"  # Bus route type in GTFS
            ])
        gtfs_files["routes.txt"] = self._list_to_csv(routes_data)
        
        # stops.txt
        stops_data = [["stop_id", "stop_name", "stop_lat", "stop_lon", "wheelchair_boarding"]]
        for stop in all_stops.values():
            stops_data.append([
                stop.id,
                stop.name,
                str(stop.coordinates.latitude),
                str(stop.coordinates.longitude),
                "1" if stop.is_accessible else "0"
            ])
        gtfs_files["stops.txt"] = self._list_to_csv(stops_data)
        
        # trips.txt
        trips_data = [["route_id", "service_id", "trip_id", "trip_headsign"]]
        for route in routes:
            trips_data.append([
                route.id,
                "weekday",  # Simplified service
                f"{route.id}_trip_1",
                route.stops[-1].name if route.stops else ""
            ])
        gtfs_files["trips.txt"] = self._list_to_csv(trips_data)
        
        # stop_times.txt
        stop_times_data = [["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"]]
        for route in routes:
            trip_id = f"{route.id}_trip_1"
            for i, stop in enumerate(route.stops):
                # Simplified timing - assume 5 minutes between stops
                minutes = i * 5
                time_str = f"08:{minutes:02d}:00"
                stop_times_data.append([
                    trip_id,
                    time_str,
                    time_str,
                    stop.id,
                    str(i + 1)
                ])
        gtfs_files["stop_times.txt"] = self._list_to_csv(stop_times_data)
        
        # calendar.txt (simplified)
        calendar_data = [
            ["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"],
            ["weekday", "1", "1", "1", "1", "1", "0", "0", "20240101", "20241231"]
        ]
        gtfs_files["calendar.txt"] = self._list_to_csv(calendar_data)
        
        result = {
            "format": ExportFormat.GTFS.value,
            "files": gtfs_files,
            "file_count": len(gtfs_files)
        }
        
        if include_metadata:
            result["metadata"] = self._generate_export_metadata(routes, ExportFormat.GTFS)
        
        return result
    
    def _export_json(self, routes: List[Route], include_metadata: bool) -> Dict[str, Any]:
        """Export routes in JSON format"""
        from models import serialize_model
        
        routes_data = []
        for route in routes:
            route_dict = serialize_model(route, 'dict')
            routes_data.append(route_dict)
        
        result = {
            "format": ExportFormat.JSON.value,
            "data": {
                "routes": routes_data,
                "export_info": {
                    "total_routes": len(routes),
                    "total_stops": sum(len(route.stops) for route in routes)
                }
            }
        }
        
        if include_metadata:
            result["metadata"] = self._generate_export_metadata(routes, ExportFormat.JSON)
        
        return result
    
    def _export_csv(self, routes: List[Route], include_metadata: bool) -> Dict[str, Any]:
        """Export routes in CSV format"""
        # Routes CSV
        routes_csv_data = [
            ["route_id", "name", "description", "operator_id", "estimated_travel_time", "optimization_score", "stop_count"]
        ]
        
        for route in routes:
            routes_csv_data.append([
                route.id,
                route.name,
                route.description,
                route.operator_id,
                str(route.estimated_travel_time),
                str(route.optimization_score),
                str(len(route.stops))
            ])
        
        # Stops CSV
        stops_csv_data = [
            ["stop_id", "route_id", "stop_name", "latitude", "longitude", "address", "amenities", "daily_passenger_count", "is_accessible", "stop_sequence"]
        ]
        
        for route in routes:
            for i, stop in enumerate(route.stops):
                stops_csv_data.append([
                    stop.id,
                    route.id,
                    stop.name,
                    str(stop.coordinates.latitude),
                    str(stop.coordinates.longitude),
                    stop.address,
                    ";".join(stop.amenities),
                    str(stop.daily_passenger_count),
                    str(stop.is_accessible),
                    str(i + 1)
                ])
        
        result = {
            "format": ExportFormat.CSV.value,
            "files": {
                "routes.csv": self._list_to_csv(routes_csv_data),
                "stops.csv": self._list_to_csv(stops_csv_data)
            }
        }
        
        if include_metadata:
            result["metadata"] = self._generate_export_metadata(routes, ExportFormat.CSV)
        
        return result
    
    def _sanitize_xml_text(self, text: str) -> str:
        """Sanitize text for XML by removing invalid characters"""
        if not text:
            return ""
        
        # Remove or replace invalid XML characters
        # Valid XML characters: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
        valid_chars = []
        for char in text:
            code = ord(char)
            if (code == 0x09 or code == 0x0A or code == 0x0D or 
                (0x20 <= code <= 0xD7FF) or 
                (0xE000 <= code <= 0xFFFD) or 
                (0x10000 <= code <= 0x10FFFF)):
                valid_chars.append(char)
            else:
                valid_chars.append('?')  # Replace invalid chars with ?
        
        return ''.join(valid_chars)

    def _export_xml(self, routes: List[Route], include_metadata: bool) -> Dict[str, Any]:
        """Export routes in XML format"""
        root = ET.Element("transportation_data")
        
        if include_metadata:
            metadata_elem = ET.SubElement(root, "metadata")
            ET.SubElement(metadata_elem, "export_timestamp").text = datetime.now(timezone.utc).isoformat()
            ET.SubElement(metadata_elem, "total_routes").text = str(len(routes))
            ET.SubElement(metadata_elem, "format").text = ExportFormat.XML.value
        
        routes_elem = ET.SubElement(root, "routes")
        
        for route in routes:
            route_elem = ET.SubElement(routes_elem, "route")
            route_elem.set("id", self._sanitize_xml_text(route.id))
            
            ET.SubElement(route_elem, "name").text = self._sanitize_xml_text(route.name)
            ET.SubElement(route_elem, "description").text = self._sanitize_xml_text(route.description)
            ET.SubElement(route_elem, "operator_id").text = self._sanitize_xml_text(route.operator_id)
            ET.SubElement(route_elem, "estimated_travel_time").text = str(route.estimated_travel_time)
            ET.SubElement(route_elem, "optimization_score").text = str(route.optimization_score)
            
            stops_elem = ET.SubElement(route_elem, "stops")
            for i, stop in enumerate(route.stops):
                stop_elem = ET.SubElement(stops_elem, "stop")
                stop_elem.set("id", self._sanitize_xml_text(stop.id))
                stop_elem.set("sequence", str(i + 1))
                
                ET.SubElement(stop_elem, "name").text = self._sanitize_xml_text(stop.name)
                ET.SubElement(stop_elem, "latitude").text = str(stop.coordinates.latitude)
                ET.SubElement(stop_elem, "longitude").text = str(stop.coordinates.longitude)
                ET.SubElement(stop_elem, "address").text = self._sanitize_xml_text(stop.address)
                ET.SubElement(stop_elem, "daily_passenger_count").text = str(stop.daily_passenger_count)
                ET.SubElement(stop_elem, "is_accessible").text = str(stop.is_accessible)
                
                amenities_elem = ET.SubElement(stop_elem, "amenities")
                for amenity in stop.amenities:
                    ET.SubElement(amenities_elem, "amenity").text = self._sanitize_xml_text(amenity)
        
        xml_string = ET.tostring(root, encoding='unicode', method='xml')
        
        result = {
            "format": ExportFormat.XML.value,
            "data": xml_string
        }
        
        if include_metadata:
            result["metadata"] = self._generate_export_metadata(routes, ExportFormat.XML)
        
        return result
    
    def _export_geojson(self, routes: List[Route], include_metadata: bool) -> Dict[str, Any]:
        """Export routes in GeoJSON format"""
        features = []
        
        # Export routes as LineString features
        for route in routes:
            if len(route.stops) < 2:
                continue
            
            coordinates = []
            for stop in route.stops:
                coordinates.append([stop.coordinates.longitude, stop.coordinates.latitude])
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                },
                "properties": {
                    "route_id": route.id,
                    "name": route.name,
                    "description": route.description,
                    "operator_id": route.operator_id,
                    "estimated_travel_time": route.estimated_travel_time,
                    "optimization_score": route.optimization_score,
                    "stop_count": len(route.stops)
                }
            }
            features.append(feature)
        
        # Export stops as Point features
        all_stops = {}
        for route in routes:
            for stop in route.stops:
                if stop.id not in all_stops:
                    all_stops[stop.id] = stop
        
        for stop in all_stops.values():
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [stop.coordinates.longitude, stop.coordinates.latitude]
                },
                "properties": {
                    "stop_id": stop.id,
                    "name": stop.name,
                    "address": stop.address,
                    "amenities": stop.amenities,
                    "daily_passenger_count": stop.daily_passenger_count,
                    "is_accessible": stop.is_accessible
                }
            }
            features.append(feature)
        
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        result = {
            "format": ExportFormat.GEOJSON.value,
            "data": geojson_data
        }
        
        if include_metadata:
            result["metadata"] = self._generate_export_metadata(routes, ExportFormat.GEOJSON)
        
        return result
    
    def _export_optimization_results_json(self, results: List[OptimizationResult]) -> Dict[str, Any]:
        """Export optimization results in JSON format"""
        from models import serialize_model
        
        results_data = []
        for result in results:
            result_dict = serialize_model(result, 'dict')
            results_data.append(result_dict)
        
        return {
            "format": ExportFormat.JSON.value,
            "data": {
                "optimization_results": results_data,
                "export_info": {
                    "total_results": len(results),
                    "export_timestamp": datetime.now(timezone.utc).isoformat()
                }
            },
            "metadata": {
                "export_timestamp": datetime.now(timezone.utc).isoformat(),
                "format": ExportFormat.JSON.value,
                "data_type": "optimization_results",
                "total_records": len(results)
            }
        }
    
    def _export_optimization_results_csv(self, results: List[OptimizationResult]) -> Dict[str, Any]:
        """Export optimization results in CSV format"""
        csv_data = [
            ["original_route_id", "optimized_route_id", "time_improvement", "distance_reduction", 
             "passenger_coverage_increase", "cost_savings", "overall_score", "generated_at", "is_improvement"]
        ]
        
        for result in results:
            csv_data.append([
                result.original_route_id,
                result.optimized_route.id,
                str(result.metrics.time_improvement),
                str(result.metrics.distance_reduction),
                str(result.metrics.passenger_coverage_increase),
                str(result.metrics.cost_savings),
                str(result.metrics.get_overall_score()),
                result.generated_at.isoformat(),
                str(result.is_improvement())
            ])
        
        return {
            "format": ExportFormat.CSV.value,
            "data": self._list_to_csv(csv_data),
            "metadata": {
                "export_timestamp": datetime.now(timezone.utc).isoformat(),
                "format": ExportFormat.CSV.value,
                "data_type": "optimization_results",
                "total_records": len(results)
            }
        }
    
    def _list_to_csv(self, data: List[List[str]]) -> str:
        """Convert list of lists to CSV string"""
        output = StringIO()
        writer = csv.writer(output)
        writer.writerows(data)
        return output.getvalue()
    
    def _generate_export_metadata(self, routes: List[Route], format_type: ExportFormat) -> Dict[str, Any]:
        """Generate metadata for exported data"""
        total_stops = sum(len(route.stops) for route in routes)
        
        return {
            "export_timestamp": datetime.now(timezone.utc).isoformat(),
            "format": format_type.value,
            "data_type": "routes",
            "total_routes": len(routes),
            "total_stops": total_stops,
            "exporter_version": "1.0.0",
            "specification_compliance": self._get_format_compliance(format_type)
        }
    
    def _get_format_compliance(self, format_type: ExportFormat) -> Dict[str, Any]:
        """Get format compliance information"""
        compliance_info = {
            ExportFormat.GTFS: {
                "specification": "GTFS Static",
                "version": "1.0",
                "compliance_level": "basic",
                "required_files": ["agency.txt", "routes.txt", "stops.txt", "trips.txt", "stop_times.txt", "calendar.txt"]
            },
            ExportFormat.JSON: {
                "specification": "CityCircuit JSON Schema",
                "version": "1.0",
                "compliance_level": "full"
            },
            ExportFormat.CSV: {
                "specification": "CityCircuit CSV Format",
                "version": "1.0",
                "compliance_level": "full",
                "files": ["routes.csv", "stops.csv"]
            },
            ExportFormat.XML: {
                "specification": "CityCircuit XML Schema",
                "version": "1.0",
                "compliance_level": "full"
            },
            ExportFormat.GEOJSON: {
                "specification": "GeoJSON RFC 7946",
                "version": "1.0",
                "compliance_level": "full"
            }
        }
        
        return compliance_info.get(format_type, {})


class DataValidator:
    """
    Validates exported data for format compliance and integrity
    """
    
    def __init__(self):
        self.validation_rules = {
            ExportFormat.GTFS: self._validate_gtfs,
            ExportFormat.JSON: self._validate_json,
            ExportFormat.CSV: self._validate_csv,
            ExportFormat.XML: self._validate_xml,
            ExportFormat.GEOJSON: self._validate_geojson
        }
    
    def validate_export(self, export_data: Dict[str, Any], format_type: ExportFormat) -> Dict[str, Any]:
        """
        Validate exported data for format compliance
        
        Args:
            export_data: The exported data to validate
            format_type: The format to validate against
            
        Returns:
            Validation result with status and details
        """
        if format_type not in self.validation_rules:
            return {
                "valid": False,
                "errors": [f"Validation not supported for format: {format_type}"]
            }
        
        try:
            return self.validation_rules[format_type](export_data)
        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Validation failed: {str(e)}"]
            }
    
    def _validate_gtfs(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate GTFS format compliance"""
        errors = []
        warnings = []
        
        required_files = ["agency.txt", "routes.txt", "stops.txt", "trips.txt", "stop_times.txt"]
        files = export_data.get("files", {})
        
        # Check required files
        for required_file in required_files:
            if required_file not in files:
                errors.append(f"Missing required GTFS file: {required_file}")
        
        # Validate file contents
        if "routes.txt" in files:
            routes_content = files["routes.txt"]
            if not routes_content.startswith("route_id,agency_id"):
                errors.append("routes.txt missing required headers")
        
        if "stops.txt" in files:
            stops_content = files["stops.txt"]
            if not stops_content.startswith("stop_id,stop_name"):
                errors.append("stops.txt missing required headers")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "format": ExportFormat.GTFS.value
        }
    
    def _validate_json(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate JSON format compliance"""
        errors = []
        warnings = []
        
        # Check required fields
        if "data" not in export_data:
            errors.append("Missing 'data' field in JSON export")
        else:
            data = export_data["data"]
            # Check for either routes or optimization_results
            if "routes" not in data and "optimization_results" not in data:
                errors.append("Missing 'routes' or 'optimization_results' field in JSON data")
            else:
                # Validate routes if present
                if "routes" in data:
                    routes = data["routes"]
                    if not isinstance(routes, list):
                        errors.append("'routes' field must be a list")
                    elif len(routes) == 0:
                        warnings.append("No routes found in export data")
                
                # Validate optimization_results if present
                if "optimization_results" in data:
                    results = data["optimization_results"]
                    if not isinstance(results, list):
                        errors.append("'optimization_results' field must be a list")
                    elif len(results) == 0:
                        warnings.append("No optimization results found in export data")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "format": ExportFormat.JSON.value
        }
    
    def _validate_csv(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate CSV format compliance"""
        errors = []
        warnings = []
        
        # Check if it's a multi-file CSV export (routes) or single CSV export (optimization results)
        files = export_data.get("files", {})
        data = export_data.get("data", "")
        
        if files:
            # Multi-file CSV export (routes)
            if "routes.csv" not in files:
                errors.append("Missing routes.csv file")
            if "stops.csv" not in files:
                errors.append("Missing stops.csv file")
            
            # Validate CSV headers
            if "routes.csv" in files:
                routes_csv = files["routes.csv"]
                if not routes_csv.startswith("route_id,name"):
                    errors.append("routes.csv missing required headers")
        elif data:
            # Single CSV export (optimization results)
            if not isinstance(data, str):
                errors.append("CSV data must be a string")
            elif len(data.strip()) == 0:
                errors.append("CSV data is empty")
            else:
                # Check if it has some CSV structure
                lines = data.strip().split('\n')
                if len(lines) < 1:
                    errors.append("CSV data has no content")
                elif ',' not in lines[0]:
                    errors.append("CSV data appears to be malformed (no commas in header)")
        else:
            errors.append("Missing CSV data or files")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "format": ExportFormat.CSV.value
        }
    
    def _validate_xml(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate XML format compliance"""
        errors = []
        warnings = []
        
        if "data" not in export_data:
            errors.append("Missing XML data")
        else:
            xml_data = export_data["data"]
            try:
                root = ET.fromstring(xml_data)
                if root.tag != "transportation_data":
                    errors.append("Invalid XML root element")
                
                routes_elem = root.find("routes")
                if routes_elem is None:
                    errors.append("Missing routes element in XML")
                
            except ET.ParseError as e:
                errors.append(f"Invalid XML format: {str(e)}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "format": ExportFormat.XML.value
        }
    
    def _validate_geojson(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate GeoJSON format compliance"""
        errors = []
        warnings = []
        
        if "data" not in export_data:
            errors.append("Missing GeoJSON data")
        else:
            geojson_data = export_data["data"]
            
            if not isinstance(geojson_data, dict):
                errors.append("GeoJSON data must be an object")
            else:
                if geojson_data.get("type") != "FeatureCollection":
                    errors.append("GeoJSON must be a FeatureCollection")
                
                features = geojson_data.get("features", [])
                if not isinstance(features, list):
                    errors.append("Features must be a list")
                elif len(features) == 0:
                    warnings.append("No features found in GeoJSON")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "format": ExportFormat.GEOJSON.value
        }


class DataImporter:
    """
    Imports data from exported formats for round-trip testing
    """
    
    def __init__(self):
        self.import_handlers = {
            ExportFormat.JSON: self._import_json,
            ExportFormat.CSV: self._import_csv,
            ExportFormat.XML: self._import_xml,
            ExportFormat.GEOJSON: self._import_geojson
        }
    
    def import_route_data(self, export_data: Dict[str, Any], format_type: ExportFormat) -> List[Route]:
        """
        Import route data from exported format
        
        Args:
            export_data: The exported data to import
            format_type: The format to import from
            
        Returns:
            List of Route objects
        """
        if format_type not in self.import_handlers:
            raise ValueError(f"Import not supported for format: {format_type}")
        
        return self.import_handlers[format_type](export_data)
    
    def _import_json(self, export_data: Dict[str, Any]) -> List[Route]:
        """Import routes from JSON format"""
        from models import deserialize_model
        
        data = export_data.get("data", {})
        routes_data = data.get("routes", [])
        
        routes = []
        for route_data in routes_data:
            route = deserialize_model(Route, route_data, 'dict')
            routes.append(route)
        
        return routes
    
    def _import_csv(self, export_data: Dict[str, Any]) -> List[Route]:
        """Import routes from CSV format"""
        files = export_data.get("files", {})
        
        if "routes.csv" not in files or "stops.csv" not in files:
            raise ValueError("Missing required CSV files for import")
        
        # Parse routes CSV
        routes_csv = files["routes.csv"]
        routes_reader = csv.DictReader(StringIO(routes_csv))
        routes_dict = {}
        
        for row in routes_reader:
            route_id = row["route_id"]
            routes_dict[route_id] = {
                "id": route_id,
                "name": row["name"],
                "description": row["description"],
                "operator_id": row["operator_id"],
                "estimated_travel_time": int(row["estimated_travel_time"]),
                "optimization_score": float(row["optimization_score"]),
                "stops": []
            }
        
        # Parse stops CSV and associate with routes
        stops_csv = files["stops.csv"]
        stops_reader = csv.DictReader(StringIO(stops_csv))
        
        for row in stops_reader:
            route_id = row["route_id"]
            if route_id in routes_dict:
                stop = BusStop(
                    name=row["stop_name"],
                    coordinates=Coordinates(
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"])
                    ),
                    address=row["address"],
                    amenities=row["amenities"].split(";") if row["amenities"] else [],
                    daily_passenger_count=int(row["daily_passenger_count"]),
                    is_accessible=row["is_accessible"].lower() == "true"
                )
                routes_dict[route_id]["stops"].append(stop)
        
        # Create Route objects
        routes = []
        for route_data in routes_dict.values():
            route = Route(
                name=route_data["name"],
                description=route_data["description"],
                stops=route_data["stops"],
                operator_id=route_data["operator_id"],
                estimated_travel_time=route_data["estimated_travel_time"],
                optimization_score=route_data["optimization_score"]
            )
            routes.append(route)
        
        return routes
    
    def _import_xml(self, export_data: Dict[str, Any]) -> List[Route]:
        """Import routes from XML format"""
        xml_data = export_data.get("data", "")
        root = ET.fromstring(xml_data)
        
        routes = []
        routes_elem = root.find("routes")
        
        if routes_elem is not None:
            for route_elem in routes_elem.findall("route"):
                stops = []
                stops_elem = route_elem.find("stops")
                
                if stops_elem is not None:
                    for stop_elem in stops_elem.findall("stop"):
                        amenities = []
                        amenities_elem = stop_elem.find("amenities")
                        if amenities_elem is not None:
                            amenities = [amenity.text for amenity in amenities_elem.findall("amenity")]
                        
                        stop = BusStop(
                            name=stop_elem.find("name").text,
                            coordinates=Coordinates(
                                latitude=float(stop_elem.find("latitude").text),
                                longitude=float(stop_elem.find("longitude").text)
                            ),
                            address=stop_elem.find("address").text,
                            amenities=amenities,
                            daily_passenger_count=int(stop_elem.find("daily_passenger_count").text),
                            is_accessible=stop_elem.find("is_accessible").text.lower() == "true"
                        )
                        stops.append(stop)
                
                route = Route(
                    name=route_elem.find("name").text or "",
                    description=route_elem.find("description").text or "",
                    stops=stops,
                    operator_id=route_elem.find("operator_id").text or "unknown",
                    estimated_travel_time=int(route_elem.find("estimated_travel_time").text or "0"),
                    optimization_score=float(route_elem.find("optimization_score").text or "0.0")
                )
                routes.append(route)
        
        return routes
    
    def _import_geojson(self, export_data: Dict[str, Any]) -> List[Route]:
        """Import routes from GeoJSON format (limited support)"""
        geojson_data = export_data.get("data", {})
        features = geojson_data.get("features", [])
        
        # Group features by route
        route_features = {}
        stop_features = {}
        
        for feature in features:
            geometry_type = feature.get("geometry", {}).get("type")
            properties = feature.get("properties", {})
            
            if geometry_type == "LineString" and "route_id" in properties:
                route_id = properties["route_id"]
                route_features[route_id] = feature
            elif geometry_type == "Point" and "stop_id" in properties:
                stop_id = properties["stop_id"]
                stop_features[stop_id] = feature
        
        # Create routes (simplified - assumes stops are in coordinate order)
        routes = []
        for route_id, route_feature in route_features.items():
            properties = route_feature["properties"]
            coordinates = route_feature["geometry"]["coordinates"]
            
            # Create stops from coordinates (simplified)
            stops = []
            for i, coord in enumerate(coordinates):
                stop = BusStop(
                    name=f"Stop {i+1}",
                    coordinates=Coordinates(latitude=coord[1], longitude=coord[0]),
                    address=f"Address {i+1}",
                    amenities=[],
                    daily_passenger_count=1000,
                    is_accessible=True
                )
                stops.append(stop)
            
            route = Route(
                name=properties.get("name", f"Route {route_id}"),
                description=properties.get("description", ""),
                stops=stops,
                operator_id=properties.get("operator_id", "unknown"),
                estimated_travel_time=properties.get("estimated_travel_time", 30),
                optimization_score=properties.get("optimization_score", 75.0)
            )
            routes.append(route)
        
        return routes