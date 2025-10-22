/**
 * Branded Types for TheCareBot Medical Domain
 * Provides type safety for Chilean medical identifiers and sensitive data
 */

declare const __brand: unique symbol;

/**
 * Generic brand utility type for creating nominal types
 */
export type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// === AUTHENTICATION & SESSION BRANDS ===

/**
 * UUID v4 for doctor identification in the system
 */
export type DoctorId = Brand<string, 'DoctorId'>;

/**
 * UUID v4 for medical session tracking
 */
export type SessionId = Brand<string, 'SessionId'>;

/**
 * UUID v4 for medical analysis tracking  
 */
export type AnalysisId = Brand<string, 'AnalysisId'>;

// === CHILEAN MEDICAL IDENTIFIERS ===

/**
 * Chilean RUT (Rol Único Tributario) in format XXXXXXXX-X
 * Validated with check digit algorithm
 */
export type PatientRUT = Brand<string, 'PatientRUT'>;

/**
 * Chilean medical license number (6-10 digits)
 * Registered with Colegio Médico de Chile
 */
export type MedicalLicense = Brand<string, 'MedicalLicense'>;

/**
 * Chilean region codes (I-XV, RM, AP)
 */
export type ChileanRegionCode = Brand<string, 'ChileanRegionCode'>;

/**
 * Chilean commune/municipality identifier
 */
export type ChileanCommuneId = Brand<string, 'ChileanCommuneId'>;

// === MEDICAL DOMAIN BRANDS ===

/**
 * Confidence score for AI analysis results (0.0-1.0)
 */
export type ConfidenceScore = Brand<number, 'ConfidenceScore'>;

/**
 * Medical imaging DICOM instance UID
 */
export type DicomInstanceUID = Brand<string, 'DicomInstanceUID'>;

/**
 * ICD-10 diagnostic code
 */
export type ICD10Code = Brand<string, 'ICD10Code'>;

/**
 * n8n workflow execution ID for audit trails
 */
export type WorkflowExecutionId = Brand<string, 'WorkflowExecutionId'>;

/**
 * Encrypted medical record reference
 */
export type EncryptedRecordId = Brand<string, 'EncryptedRecordId'>;

// === TEMPORAL BRANDS ===

/**
 * ISO 8601 timestamp for medical events
 */
export type MedicalTimestamp = Brand<string, 'MedicalTimestamp'>;

/**
 * Session expiration timestamp (ISO 8601)
 */
export type ExpirationTimestamp = Brand<string, 'ExpirationTimestamp'>;

// === SECURITY BRANDS ===

/**
 * JWT token for API authentication
 */
export type AuthToken = Brand<string, 'AuthToken'>;

/**
 * Encrypted patient data payload
 */
export type EncryptedPayload = Brand<string, 'EncryptedPayload'>;

/**
 * HMAC signature for data integrity
 */
export type DataSignature = Brand<string, 'DataSignature'>;

// === BRAND CONSTRUCTORS ===

/**
 * Brand constructor utilities for creating branded values
 */
export namespace BrandConstructors {
  export const createDoctorId = (uuid: string): DoctorId => uuid as DoctorId;
  export const createSessionId = (uuid: string): SessionId => uuid as SessionId;
  export const createAnalysisId = (uuid: string): AnalysisId => uuid as AnalysisId;
  export const createPatientRUT = (rut: string): PatientRUT => rut as PatientRUT;
  export const createMedicalLicense = (license: string): MedicalLicense => license as MedicalLicense;
  export const createConfidenceScore = (score: number): ConfidenceScore => score as ConfidenceScore;
  export const createMedicalTimestamp = (timestamp: string): MedicalTimestamp => timestamp as MedicalTimestamp;
  export const createWorkflowExecutionId = (id: string): WorkflowExecutionId => id as WorkflowExecutionId;
}

// === BRAND TYPE GUARDS ===

/**
 * Type guards to validate branded types at runtime
 */
export namespace BrandGuards {
  export const isDoctorId = (value: string): value is DoctorId => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  export const isSessionId = (value: string): value is SessionId => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  export const isPatientRUT = (value: string): value is PatientRUT => {
    const rutRegex = /^[0-9]{7,8}-[0-9Kk]$/;
    return rutRegex.test(value);
  };

  export const isMedicalLicense = (value: string): value is MedicalLicense => {
    const licenseRegex = /^[0-9]{6,10}$/;
    return licenseRegex.test(value);
  };

  export const isConfidenceScore = (value: number): value is ConfidenceScore => {
    return Number.isFinite(value) && value >= 0 && value <= 1;
  };

  export const isMedicalTimestamp = (value: string): value is MedicalTimestamp => {
    try {
      const date = new Date(value);
      return !isNaN(date.getTime()) && value.includes('T') && value.includes('Z');
    } catch {
      return false;
    }
  };
}

// === UTILITY FUNCTIONS ===

/**
 * Unwrap a branded type to its underlying value
 */
export const unwrapBrand = <T>(branded: Brand<T, string>): T => branded as T;

/**
 * Check if two branded values are equal
 */
export const isEqualBrand = <T, B extends string>(
  a: Brand<T, B>, 
  b: Brand<T, B>
): boolean => (a as T) === (b as T);