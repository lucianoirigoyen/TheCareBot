/**
 * Core Medical Domain Types for TheCareBot
 * Chilean Healthcare AI Assistant with Regulatory Compliance
 */

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
  NEUROCIRUGIA = 'neurocirugia',
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
// MEDICAL ANALYSIS RESULT
// ============================================================================

export interface MedicalAnalysisResult {
  readonly analysisId: string;
  readonly workflowExecutionId: string;
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
// AUDIT EVENT FOR COMPLIANCE LOGGING
// ============================================================================

export interface AuditEvent {
  readonly eventId: string;
  readonly eventType: 'access' | 'modify' | 'delete' | 'export' | 'view';
  readonly doctorId: string;
  readonly patientRut?: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly timestamp: Date;
  readonly purpose: string;
  readonly dataClassification: MedicalDataClassification;
  readonly success: boolean;
  readonly errorMessage?: string;
}

// ============================================================================
// TYPE GUARDS FOR RUNTIME SAFETY
// ============================================================================

export const requiresManualReview = (confidenceScore: number): boolean => {
  return confidenceScore < 0.7;
};