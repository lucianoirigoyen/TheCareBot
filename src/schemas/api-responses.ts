/**
 * API Response Schemas
 *
 * Runtime validation schemas for API responses using Zod.
 * Prevents unsafe type assertions and provides type safety at runtime.
 *
 * Following Clean Code principles:
 * - Fail fast with clear error messages
 * - Type safety without `as` casts
 * - Self-documenting schemas
 *
 * Usage:
 *   const response = await fetch('/api/patient/search');
 *   const data = await response.json();
 *   const validated = PatientSearchResponseSchema.parse(data); // Runtime validation
 */

import { z } from 'zod';

// ============================================================================
// PATIENT SEARCH SCHEMAS
// ============================================================================

export const PatientDataSchema = z.object({
  rut: z.string().min(1),
  name: z.string().min(1),
  age: z.number().int().positive(),
  medicalHistory: z.array(z.string()),
  lastVisit: z.string().optional(),
});

export const PatientSearchResponseSchema = z.object({
  found: z.boolean(),
  patient: PatientDataSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  executionTime: z.number().optional(),
});

export type PatientSearchResponse = z.infer<typeof PatientSearchResponseSchema>;
export type PatientData = z.infer<typeof PatientDataSchema>;

// ============================================================================
// EXCEL ANALYSIS SCHEMAS
// ============================================================================

export const ExcelFindingSchema = z.object({
  parametro: z.string(),
  valor: z.union([z.string(), z.number()]),
  unidad: z.string().optional(),
  rangoNormal: z.string().optional(),
  interpretacion: z.string(),
  severidad: z.enum(['normal', 'leve', 'moderado', 'grave', 'crítico']),
});

export const ExcelAnalysisResponseSchema = z.object({
  success: z.boolean(),
  interpretation: z.string().optional(),
  findings: z.array(ExcelFindingSchema).optional(),
  recommendations: z.array(z.string()).optional(),
  requiresUrgentAttention: z.boolean().optional(),
  error: z.string().optional(),
});

export type ExcelAnalysisResponse = z.infer<typeof ExcelAnalysisResponseSchema>;
export type ExcelFinding = z.infer<typeof ExcelFindingSchema>;

// ============================================================================
// RADIOGRAPHY ANALYSIS SCHEMAS
// ============================================================================

export const RadiographyFindingSchema = z.object({
  area: z.string(),
  observation: z.string(),
  severity: z.enum(['normal', 'leve', 'moderada', 'grave']),
  confidence: z.number().min(0).max(1),
});

export const RadiographyAnalysisResponseSchema = z.object({
  success: z.boolean(),
  analysis: z.string().optional(),
  findings: z.array(RadiographyFindingSchema).optional(),
  diagnosis: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  requiresSpecialistReview: z.boolean().optional(),
  error: z.string().optional(),
});

export type RadiographyAnalysisResponse = z.infer<typeof RadiographyAnalysisResponseSchema>;
export type RadiographyFinding = z.infer<typeof RadiographyFindingSchema>;

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const InvoiceDetalleSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().int().positive(),
  precio: z.number().positive(),
  total: z.number().positive(),
});

export const InvoiceDataSchema = z.object({
  doctor_id: z.string().uuid(),
  tipo_dte: z.number().int(),
  receptor_rut: z.string().min(1),
  receptor_razon_social: z.string().min(1),
  receptor_direccion: z.string().min(1),
  detalles: z.array(InvoiceDetalleSchema).min(1),
});

export const InvoiceResultSchema = z.object({
  success: z.boolean(),
  folio: z.string().optional(),
  track_id: z.string().optional(),
  monto_total: z.number().optional(),
  estado_sii: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

export type InvoiceData = z.infer<typeof InvoiceDataSchema>;
export type InvoiceDetalle = z.infer<typeof InvoiceDetalleSchema>;
export type InvoiceResult = z.infer<typeof InvoiceResultSchema>;

// ============================================================================
// ERROR RESPONSE SCHEMA
// ============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
  statusCode: z.number().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// GENERIC API RESPONSE WRAPPER
// ============================================================================

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string().datetime().optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Safely parse API response with detailed error logging
 */
export function safeParseApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessage = `API response validation failed for ${context}: ${result.error.message}`;

    // In development, log the full validation error
    if (process.env.NODE_ENV === 'development') {
      /* eslint-disable no-console */
      console.error('Validation error details:', result.error.flatten());
      console.error('Received data:', data);
      /* eslint-enable no-console */
    }

    return {
      success: false,
      error: errorMessage,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Parse API response and throw on validation failure
 * Use for critical operations where invalid data should halt execution
 */
export function parseApiResponseOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): T {
  const result = safeParseApiResponse(schema, data, context);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
