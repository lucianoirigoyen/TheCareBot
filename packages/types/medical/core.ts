/**
 * Core Medical Domain Types for TheCareBot
 * Chilean Healthcare AI Assistant with Regulatory Compliance
 * 
 * CRITICAL: Zero-any policy enforced. All types must be strictly typed.
 * Medical data requires Chilean Law 19.628 compliance.
 */

import { z } from 'zod';

// ============================================================================
// BRANDED TYPES FOR MEDICAL COMPLIANCE
// ============================================================================

export type DoctorId = string & { readonly __brand: 'DoctorId' };
export type PatientRUT = string & { readonly __brand: 'PatientRUT' };
export type MedicalLicense = string & { readonly __brand: 'MedicalLicense' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type AnalysisId = string & { readonly __brand: 'AnalysisId' };
export type WorkflowExecutionId = string & { readonly __brand: 'WorkflowExecutionId' };

// ============================================================================
// CHILEAN MEDICAL SPECIALTIES (OFFICIAL)
// ============================================================================

export enum ChileanMedicalSpecialty {
  // Primary Care
  MEDICINA_GENERAL = 'medicina_general',
  MEDICINA_FAMILIAR = 'medicina_familiar',
  MEDICINA_INTERNA = 'medicina_interna',
  
  // Surgical Specialties
  CIRUGIA_GENERAL = 'cirugia_general',
  CIRUGIA_CARDIOVASCULAR = 'cirugia_cardiovascular',
  NEUROCIRUGLA = 'neurocirugia',
  TRAUMATOLOGIA = 'traumatologia',
  
  // Medical Specialties
  CARDIOLOGIA = 'cardiologia',
  NEUROLOGIA = 'neurologia',
  GASTROENTEROLOGIA = 'gastroenterologia',
  ENDOCRINOLOGIA = 'endocrinologia',
  NEFROLOGIA = 'nefrologia',
  
  // Emergency & Critical Care
  MEDICINA_URGENCIA = 'medicina_urgencia',
  MEDICINA_INTENSIVA = 'medicina_intensiva',
  
  // Diagnostic Specialties
  RADIOLOGIA = 'radiologia',
  PATOLOGIA = 'patologia',
  MEDICINA_NUCLEAR = 'medicina_nuclear',
  
  // Other Specialties
  PEDIATRIA = 'pediatria',
  GINECOLOGIA = 'ginecologia',
  PSIQUIATRIA = 'psiquiatria',
  DERMATOLOGIA = 'dermatologia'
}

// ============================================================================
// MEDICAL WORKFLOW INTENTIONS
// ============================================================================

export enum MedicalWorkflowIntention {
  BUSCAR_PACIENTE = 'buscar_paciente',
  ANALIZAR_EXCEL = 'analizar_excel',
  ANALIZAR_RADIOGRAFIA = 'analizar_radiografia'
}

// ============================================================================
// MEDICAL ANALYSIS CONFIDENCE LEVELS
// ============================================================================

export enum ConfidenceLevel {
  LOW = 'low',        // <0.7 - Requires manual physician review
  MEDIUM = 'medium',  // 0.7-0.9 - Acceptable with physician oversight
  HIGH = 'high'       // >0.9 - High confidence AI analysis
}

export const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score < 0.7) return ConfidenceLevel.LOW;
  if (score < 0.9) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.HIGH;
};

// ============================================================================
// MEDICAL DATA CLASSIFICATION (CHILEAN COMPLIANCE)
// ============================================================================

export enum MedicalDataClassification {
  PUBLIC = 'public',           // Non-sensitive medical information
  INTERNAL = 'internal',       // Internal medical workflows
  CONFIDENTIAL = 'confidential', // Patient demographics
  RESTRICTED = 'restricted',    // Medical diagnoses and results
  TOP_SECRET = 'top_secret'    // Chilean medical license validations
}

// ============================================================================
// MEDICAL OPERATION INTERFACE
// ============================================================================

export interface MedicalOperation {
  readonly doctorId: DoctorId;
  readonly patientRut: PatientRUT;
  readonly sessionId: SessionId;
  readonly auditTrail: readonly AuditEvent[];
  readonly classification: MedicalDataClassification;
  readonly timestamp: Date;
}

// ============================================================================
// AUDIT EVENT FOR COMPLIANCE LOGGING
// ============================================================================

export interface AuditEvent {
  readonly eventId: string;
  readonly eventType: 'access' | 'modify' | 'delete' | 'export' | 'view';
  readonly doctorId: DoctorId;
  readonly patientRut?: PatientRUT;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly timestamp: Date;
  readonly purpose: string;
  readonly dataClassification: MedicalDataClassification;
  readonly success: boolean;
  readonly errorMessage?: string;
}

// ============================================================================
// MEDICAL ANALYSIS RESULT
// ============================================================================

export interface MedicalAnalysisResult {
  readonly analysisId: AnalysisId;
  readonly workflowExecutionId: WorkflowExecutionId;
  readonly intention: MedicalWorkflowIntention;
  readonly confidenceScore: number; // 0.0 to 1.0
  readonly confidenceLevel: ConfidenceLevel;
  readonly findings: readonly string[];
  readonly recommendations: readonly string[];
  readonly requiresManualReview: boolean;
  readonly processingTimeMs: number;
  readonly fallbackMode: boolean;
  readonly timestamp: Date;
}

// ============================================================================
// MEDICAL SESSION STATE
// ============================================================================

export interface MedicalSession {
  readonly sessionId: SessionId;
  readonly doctorId: DoctorId;
  readonly startTime: Date;
  readonly lastActivity: Date;
  readonly expiresAt: Date; // 20-minute timeout enforced
  readonly remainingTimeMs: number;
  readonly isActive: boolean;
  readonly warningShown: boolean; // 2-minute warning displayed
  readonly demoMode: boolean;
}

// ============================================================================
// ZOD SCHEMAS FOR RUNTIME VALIDATION
// ============================================================================

export const MedicalOperationSchema = z.object({
  doctorId: z.string().uuid().transform(id => id as DoctorId),
  patientRut: z.string().regex(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/).transform(rut => rut as PatientRUT),
  sessionId: z.string().uuid().transform(id => id as SessionId),
  classification: z.nativeEnum(MedicalDataClassification),
  timestamp: z.date()
});

export const MedicalAnalysisResultSchema = z.object({
  analysisId: z.string().uuid().transform(id => id as AnalysisId),
  workflowExecutionId: z.string().transform(id => id as WorkflowExecutionId),
  intention: z.nativeEnum(MedicalWorkflowIntention),
  confidenceScore: z.number().min(0).max(1),
  findings: z.array(z.string()),
  recommendations: z.array(z.string()),
  requiresManualReview: z.boolean(),
  processingTimeMs: z.number().positive(),
  fallbackMode: z.boolean(),
  timestamp: z.date()
});

// ============================================================================
// TYPE GUARDS FOR RUNTIME SAFETY
// ============================================================================

export const isDoctorId = (value: string): value is DoctorId => {
  return z.string().uuid().safeParse(value).success;
};

export const isPatientRUT = (value: string): value is PatientRUT => {
  return z.string().regex(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/).safeParse(value).success;
};

export const isSessionId = (value: string): value is SessionId => {
  return z.string().uuid().safeParse(value).success;
};

export const requiresManualReview = (confidenceScore: number): boolean => {
  return confidenceScore < 0.7;
};