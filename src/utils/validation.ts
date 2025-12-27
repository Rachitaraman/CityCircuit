/**
 * Validation utilities and helper functions for CityCircuit
 * Provides common validation patterns and data transformation utilities
 */

import { z } from 'zod';
import {
  BusStopSchema,
  RouteSchema,
  UserSchema,
  OptimizationResultSchema,
  CoordinatesSchema,
  type BusStop,
  type Route,
  type User,
  type Coordinates,
} from '@/types';

// =============================================================================
// CUSTOM VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating Mumbai coordinates (approximate bounds)
 */
export const MumbaiCoordinatesSchema = CoordinatesSchema.refine(
  (coords) => {
    // Mumbai approximate bounds: 18.8°N to 19.3°N, 72.7°E to 73.1°E
    return (
      coords.latitude >= 18.8 && coords.latitude <= 19.3 &&
      coords.longitude >= 72.7 && coords.longitude <= 73.1
    );
  },
  { message: "Coordinates must be within Mumbai city bounds" }
);

/**
 * Schema for validating route names (Mumbai bus route patterns)
 */
export const MumbaiRouteNameSchema = z.string()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9\s\-\/]+$/i, "Route name must contain only letters, numbers, spaces, hyphens, and slashes");

/**
 * Schema for validating Indian phone numbers
 */
export const IndianPhoneSchema = z.string()
  .regex(/^(\+91|91)?[6-9]\d{9}$/, "Invalid Indian phone number format");

/**
 * Schema for validating Indian postal codes (PIN codes)
 */
export const IndianPinCodeSchema = z.string()
  .regex(/^[1-9]\d{5}$/, "Invalid Indian PIN code format");

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Validates if coordinates are within Mumbai city bounds
 */
export function isValidMumbaiCoordinates(latitude: number, longitude: number): boolean {
  // Mumbai approximate bounds: 18.8°N to 19.3°N, 72.7°E to 73.1°E
  return (
    latitude >= 18.8 && latitude <= 19.3 &&
    longitude >= 72.7 && longitude <= 73.1
  );
}

/**
 * Validates if a route has valid stop sequence (no duplicate stops)
 */
export function hasValidStopSequence(stops: BusStop[]): boolean {
  if (stops.length < 2) return false;
  
  const stopNames = stops.map(stop => stop.name);
  const uniqueStopNames = new Set(stopNames);
  
  return stopNames.length === uniqueStopNames.size;
}

/**
 * Validates if route stops form a reasonable geographic path
 */
export function hasReasonableGeographicPath(stops: BusStop[]): boolean {
  if (stops.length < 2) return false;
  
  // Check if any two consecutive stops are too far apart (> 50km)
  const MAX_DISTANCE_KM = 50;
  
  for (let i = 0; i < stops.length - 1; i++) {
    const distance = calculateDistance(
      { latitude: stops[i].latitude, longitude: stops[i].longitude },
      { latitude: stops[i + 1].latitude, longitude: stops[i + 1].longitude }
    );
    
    if (distance > MAX_DISTANCE_KM) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates if user email domain is allowed
 */
export function isAllowedEmailDomain(email: string): boolean {
  const allowedDomains = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'gov.in',
    'best.gov.in', // BEST (Brihanmumbai Electric Supply and Transport)
    'mmrda.maharashtra.gov.in', // MMRDA
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(domain || '');
}

// =============================================================================
// DATA TRANSFORMATION UTILITIES
// =============================================================================

/**
 * Calculates distance between two coordinates using Haversine formula
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates total route distance
 */
export function calculateRouteDistance(stops: BusStop[]): number {
  if (stops.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    totalDistance += calculateDistance(
      { latitude: stops[i].latitude, longitude: stops[i].longitude },
      { latitude: stops[i + 1].latitude, longitude: stops[i + 1].longitude }
    );
  }
  
  return totalDistance;
}

/**
 * Estimates travel time based on distance and average speed
 */
export function estimateTravelTime(distanceKm: number, averageSpeedKmh: number = 25): number {
  // Returns time in minutes
  return Math.round((distanceKm / averageSpeedKmh) * 60);
}

/**
 * Formats coordinates for display
 */
export function formatCoordinates(coords: Coordinates, precision: number = 6): string {
  return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
}

/**
 * Sanitizes route name for URL usage
 */
export function sanitizeRouteNameForUrl(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// =============================================================================
// FORM VALIDATION HELPERS
// =============================================================================

/**
 * Creates a validation schema for route creation forms
 */
export function createRouteFormSchema() {
  return z.object({
    name: MumbaiRouteNameSchema,
    description: z.string().max(1000).optional(),
    stops: z.array(z.string().uuid()).min(2).max(50),
    operatorId: z.string().uuid(),
  });
}

/**
 * Creates a validation schema for bus stop creation forms
 */
export function createBusStopFormSchema() {
  return z.object({
    name: z.string().min(1).max(200),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    ward: z.string().min(1).max(50),
    styleUrl: z.number().int().default(0),
  });
}

/**
 * Creates a validation schema for user registration forms
 */
export function createUserRegistrationSchema() {
  return z.object({
    email: z.string().email().refine(isAllowedEmailDomain, {
      message: "Email domain not allowed",
    }),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
    name: z.string().min(1).max(100),
    role: z.enum(['operator', 'passenger']),
    organization: z.string().max(200).optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
}

// =============================================================================
// ERROR FORMATTING
// =============================================================================

/**
 * Formats Zod validation errors for user-friendly display
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });
  
  return formattedErrors;
}

/**
 * Checks if validation error contains specific field error
 */
export function hasFieldError(error: z.ZodError, fieldPath: string): boolean {
  return error.errors.some(err => err.path.join('.') === fieldPath);
}

/**
 * Gets specific field error message
 */
export function getFieldError(error: z.ZodError, fieldPath: string): string | undefined {
  const fieldError = error.errors.find(err => err.path.join('.') === fieldPath);
  return fieldError?.message;
}