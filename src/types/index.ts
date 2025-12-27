/**
 * Core data types and validation schemas for CityCircuit application
 * Uses Zod for runtime validation and TypeScript inference
 */

import { z } from 'zod';

// =============================================================================
// COORDINATE AND GEOGRAPHIC TYPES
// =============================================================================

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const GeoBoundsSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
}).refine(
  (data) => data.north > data.south && data.east > data.west,
  { message: "Invalid geographic bounds" }
);

export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type GeoBounds = z.infer<typeof GeoBoundsSchema>;

// =============================================================================
// USER TYPES
// =============================================================================

export const UserRoleSchema = z.enum(['operator', 'passenger', 'admin']);

export const UserPreferencesSchema = z.object({
  language: z.string().min(2).max(5).default('en'),
  theme: z.enum(['light', 'dark']).default('light'),
  notifications: z.boolean().default(true),
  mapStyle: z.enum(['default', 'satellite', 'terrain']).default('default'),
});

export const UserProfileSchema = z.object({
  name: z.string().min(1).max(100),
  organization: z.string().max(200).optional(),
  preferences: UserPreferencesSchema,
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  profile: UserProfileSchema,
  createdAt: z.date(),
  lastLoginAt: z.date(),
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type User = z.infer<typeof UserSchema>;

// =============================================================================
// BUS STOP TYPES
// =============================================================================

export const BusStopSchema = z.object({
  name: z.string().min(1).max(200),
  styleUrl: z.number().int().default(0),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  ward: z.string().min(1).max(50),
});

export type BusStop = z.infer<typeof BusStopSchema>;

// =============================================================================
// ROUTE TYPES
// =============================================================================

export const RouteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  stops: z.array(BusStopSchema).min(2), // A route must have at least 2 stops
  operatorId: z.string().uuid(),
  isActive: z.boolean().default(true),
  optimizationScore: z.number().min(0).max(100).default(0),
  estimatedTravelTime: z.number().int().min(1).max(1440), // in minutes, max 24 hours for transportation standard
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Route = z.infer<typeof RouteSchema>;

// =============================================================================
// POPULATION DENSITY TYPES
// =============================================================================

export const DemographicDataSchema = z.object({
  ageGroups: z.record(z.string(), z.number().min(0)),
  economicIndicators: z.record(z.string(), z.number()),
});

export const DensityPointSchema = z.object({
  coordinates: CoordinatesSchema,
  population: z.number().int().min(0),
  demographicData: DemographicDataSchema,
});

export const PopulationDensityDataSchema = z.object({
  id: z.string().uuid(),
  region: z.string().min(1).max(200),
  coordinates: GeoBoundsSchema,
  densityPoints: z.array(DensityPointSchema),
  dataSource: z.string().min(1).max(200),
  collectedAt: z.date(),
});

export type DemographicData = z.infer<typeof DemographicDataSchema>;
export type DensityPoint = z.infer<typeof DensityPointSchema>;
export type PopulationDensityData = z.infer<typeof PopulationDensityDataSchema>;

// =============================================================================
// OPTIMIZATION RESULT TYPES
// =============================================================================

export const OptimizationMetricsSchema = z.object({
  timeImprovement: z.number().min(0), // percentage improvement
  distanceReduction: z.number().min(0), // percentage reduction
  passengerCoverageIncrease: z.number().min(0), // percentage increase
  costSavings: z.number().min(0), // monetary savings
});

export const OptimizationResultSchema = z.object({
  id: z.string().uuid(),
  originalRouteId: z.string().uuid(),
  optimizedRoute: RouteSchema,
  metrics: OptimizationMetricsSchema,
  populationData: PopulationDensityDataSchema,
  generatedAt: z.date(),
});

export type OptimizationMetrics = z.infer<typeof OptimizationMetricsSchema>;
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export const CreateRouteRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  stops: z.array(z.string().uuid()).min(2), // Array of bus stop IDs
  operatorId: z.string().uuid(),
});

export const UpdateRouteRequestSchema = CreateRouteRequestSchema.partial().extend({
  id: z.string().uuid(),
});

export const RouteSearchRequestSchema = z.object({
  origin: z.string().uuid(), // Bus stop ID
  destination: z.string().uuid(), // Bus stop ID
  departureTime: z.date().optional(),
  maxTransfers: z.number().int().min(0).max(5).default(2),
});

export const OptimizeRouteRequestSchema = z.object({
  routeId: z.string().uuid(),
  populationDataId: z.string().uuid().optional(),
  optimizationGoals: z.array(z.enum(['time', 'distance', 'coverage', 'cost'])).default(['time']),
});

export type CreateRouteRequest = z.infer<typeof CreateRouteRequestSchema>;
export type UpdateRouteRequest = z.infer<typeof UpdateRouteRequestSchema>;
export type RouteSearchRequest = z.infer<typeof RouteSearchRequestSchema>;
export type OptimizeRouteRequest = z.infer<typeof OptimizeRouteRequestSchema>;

// =============================================================================
// CHATBOT TYPES
// =============================================================================

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  role: z.enum(['user', 'assistant']),
  timestamp: z.date(),
  context: z.record(z.string(), z.any()).optional(),
});

export const ChatSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  messages: z.array(ChatMessageSchema),
  language: z.string().min(2).max(5).default('en'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;

// =============================================================================
// ERROR TYPES
// =============================================================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.date(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates data against a Zod schema and returns typed result
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Creates a validation function for a specific schema
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => validateData(schema, data);
}

// Pre-created validators for common use cases
export const validateUser = createValidator(UserSchema);
export const validateBusStop = createValidator(BusStopSchema);
export const validateRoute = createValidator(RouteSchema);
export const validateOptimizationResult = createValidator(OptimizationResultSchema);
export const validateCreateRouteRequest = createValidator(CreateRouteRequestSchema);
export const validateRouteSearchRequest = createValidator(RouteSearchRequestSchema);