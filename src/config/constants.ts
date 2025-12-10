/**
 * Application Constants
 *
 * Centralized constants to avoid magic strings and numbers throughout the codebase.
 * Following Clean Code principles: no magic values, explicit naming.
 */

// ============================================================================
// DEMO/DEVELOPMENT CONSTANTS
// ============================================================================

/**
 * Demo doctor ID for development and testing
 * @todo Replace with authentication context in production
 */
export const DEMO_DOCTOR_ID = 'demo-doctor-001' as const;

/**
 * Demo doctor UUID for invoice generation
 * @todo Replace with authenticated user's UUID in production
 */
export const DEMO_DOCTOR_UUID = '550e8400-e29b-41d4-a716-446655440000' as const;

// ============================================================================
// MEDICAL SESSION CONSTANTS
// ============================================================================

/**
 * Session timeout duration in milliseconds (20 minutes)
 * Required by Chilean Law 19.628 for medical data protection
 */
export const MEDICAL_SESSION_TIMEOUT_MS = 20 * 60 * 1000;

/**
 * Session warning time before expiry (2 minutes)
 */
export const SESSION_WARNING_TIME_MS = 2 * 60 * 1000;

/**
 * Creates a unique session ID with timestamp
 */
export const createSessionId = (): string => `session-${Date.now()}`;

// ============================================================================
// CHILEAN TAX CONSTANTS (SII)
// ============================================================================

/**
 * Chilean VAT rate (IVA)
 */
export const CHILEAN_VAT_RATE = 0.19;

/**
 * Document types for Chilean invoicing (SII)
 */
export const DOCUMENT_TYPES = {
  BOLETA_ELECTRONICA: 39,
  FACTURA_ELECTRONICA: 33,
  NOTA_CREDITO: 61,
  NOTA_DEBITO: 56,
} as const;

// ============================================================================
// FILE UPLOAD CONSTANTS
// ============================================================================

/**
 * Maximum file size for uploads (10MB)
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Accepted file types for medical image uploads
 */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/dicom',
] as const;

/**
 * Accepted file types for Excel analysis
 */
export const ACCEPTED_EXCEL_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

// ============================================================================
// API TIMEOUT CONSTANTS
// ============================================================================

/**
 * Default API timeout in milliseconds
 */
export const DEFAULT_API_TIMEOUT_MS = 30000;

/**
 * Database query timeout in milliseconds
 */
export const DB_QUERY_TIMEOUT_MS = 3000;

/**
 * Image analysis timeout in milliseconds
 */
export const IMAGE_ANALYSIS_TIMEOUT_MS = 30000;

// ============================================================================
// MEDICAL CONFIDENCE THRESHOLDS
// ============================================================================

/**
 * Minimum confidence score for auto-approval (0.7 = 70%)
 * Results below this threshold require manual physician review
 */
export const MEDICAL_CONFIDENCE_THRESHOLD = 0.7;

/**
 * High confidence threshold for priority flagging (0.9 = 90%)
 */
export const HIGH_CONFIDENCE_THRESHOLD = 0.9;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];
export type AcceptedImageType = typeof ACCEPTED_IMAGE_TYPES[number];
export type AcceptedExcelType = typeof ACCEPTED_EXCEL_TYPES[number];
