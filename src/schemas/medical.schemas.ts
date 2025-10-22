/**
 * Zod Schemas for TheCareBot Medical Data Validation
 * Runtime validation for Chilean healthcare system compliance
 */

import { z } from 'zod';

// === BASE VALIDATION SCHEMAS ===

/**
 * UUID v4 validation schema
 */
export const UUIDSchema = z
  .string()
  .uuid('Invalid UUID format')
  .refine((uuid) => {
    // Validate UUID v4 specifically
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(uuid);
  }, 'Must be a valid UUID v4');

/**
 * Chilean RUT validation with check digit algorithm
 */
export const RUTSchema = z
  .string()
  .regex(/^[0-9]{7,8}-[0-9Kk]$/, 'RUT must be in format XXXXXXXX-X')
  .refine((rut) => validateRutCheckDigit(rut), 'Invalid RUT check digit');

/**
 * Chilean medical license validation (6-10 digits)
 */
export const MedicalLicenseSchema = z
  .string()
  .regex(/^[0-9]{6,10}$/, 'Medical license must be 6-10 digits')
  .refine((license) => {
    // Additional validation for Chilean medical license format
    const length = license.length;
    return length >= 6 && length <= 10;
  }, 'Medical license must be between 6 and 10 digits');

/**
 * ISO 8601 timestamp validation
 */
export const MedicalTimestampSchema = z
  .string()
  .datetime('Must be a valid ISO 8601 datetime')
  .refine((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    // Allow timestamps up to 1 minute in the future (for clock skew)
    return date <= new Date(now.getTime() + 60000);
  }, 'Timestamp cannot be in the future');

/**
 * Confidence score validation (0.0 - 1.0)
 */
export const ConfidenceScoreSchema = z
  .number()
  .min(0, 'Confidence score must be at least 0')
  .max(1, 'Confidence score must be at most 1')
  .refine((score) => Number.isFinite(score), 'Confidence score must be a finite number');

/**
 * Chilean region codes
 */
export const ChileanRegionCodeSchema = z.enum([
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'RM', 'AP'
]);

// === MEDICAL DOMAIN SCHEMAS ===

/**
 * Chilean medical specialties
 */
export const ChileanMedicalSpecialtySchema = z.enum([
  'medicina_interna',
  'cardiologia',
  'dermatologia',
  'neurologia',
  'radiologia',
  'pediatria',
  'ginecologia_obstetricia',
  'traumatologia',
  'psiquiatria',
  'medicina_familiar',
  'cirugia_general',
  'anestesiologia',
  'medicina_intensiva',
  'infectologia',
  'endocrinologia'
]);

/**
 * Gender validation
 */
export const GenderSchema = z.enum(['masculino', 'femenino', 'otro', 'no_especificado']);

/**
 * Blood type validation
 */
export const BloodTypeSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

/**
 * Severity level validation
 */
export const SeverityLevelSchema = z.enum(['leve', 'moderado', 'severo', 'critico']);

/**
 * Urgency level validation
 */
export const UrgencyLevelSchema = z.enum(['rutina', 'prioritario', 'urgente', 'emergencia']);

/**
 * Clinical significance validation
 */
export const ClinicalSignificanceSchema = z.enum(['normal', 'borderline', 'anormal', 'patologico']);

// === DOCTOR VALIDATION SCHEMAS ===

/**
 * Contact preferences validation
 */
export const ContactPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  emergencyContactNumber: z.string().nullable(),
  preferredLanguage: z.enum(['es', 'en'])
});

/**
 * Medical certification validation
 */
export const MedicalCertificationSchema = z.object({
  name: z.string().min(2, 'Certification name must be at least 2 characters'),
  issuingOrganization: z.string().min(2, 'Organization name must be at least 2 characters'),
  issuedDate: MedicalTimestampSchema,
  expiryDate: MedicalTimestampSchema.nullable(),
  credentialId: z.string().min(1, 'Credential ID is required')
});

/**
 * Doctor profile validation
 */
export const DoctorProfileSchema = z.object({
  doctorId: UUIDSchema,
  bio: z.string().max(1000, 'Bio must be at most 1000 characters').nullable(),
  yearsOfExperience: z.number().int().min(0).max(70, 'Years of experience must be between 0 and 70'),
  hospitalAffiliations: z.array(z.string().min(1)).max(10, 'Maximum 10 hospital affiliations'),
  certifications: z.array(MedicalCertificationSchema).max(20, 'Maximum 20 certifications'),
  contactPreferences: ContactPreferencesSchema
});

/**
 * Doctor validation schema
 */
export const DoctorSchema = z.object({
  id: UUIDSchema,
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Name too long'),
  medicalLicense: MedicalLicenseSchema,
  specialty: ChileanMedicalSpecialtySchema,
  regionCode: ChileanRegionCodeSchema,
  isActive: z.boolean(),
  lastLoginAt: MedicalTimestampSchema.nullable(),
  profileImage: z.string().url('Invalid profile image URL').nullable(),
  createdAt: MedicalTimestampSchema,
  updatedAt: MedicalTimestampSchema
});

// === PATIENT VALIDATION SCHEMAS ===

/**
 * Emergency contact validation
 */
export const EmergencyContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  relationship: z.string().min(1, 'Relationship is required').max(50, 'Relationship too long'),
  phoneNumber: z.string().regex(/^\+?[0-9\s\-\(\)]{8,15}$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email format').nullable()
});

/**
 * Chronic condition validation
 */
export const ChronicConditionSchema = z.object({
  condition: z.string().min(1, 'Condition name is required').max(200, 'Condition name too long'),
  icd10Code: z.string().regex(/^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/, 'Invalid ICD-10 code format').nullable(),
  diagnosedDate: MedicalTimestampSchema,
  severity: SeverityLevelSchema,
  currentTreatment: z.string().max(500, 'Treatment description too long').nullable()
});

/**
 * Patient validation schema
 */
export const PatientSchema = z.object({
  rut: RUTSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  dateOfBirth: MedicalTimestampSchema.refine((date) => {
    const birthDate = new Date(date);
    const now = new Date();
    const age = now.getFullYear() - birthDate.getFullYear();
    return age >= 0 && age <= 150;
  }, 'Invalid date of birth - patient age must be between 0 and 150 years'),
  gender: GenderSchema,
  bloodType: BloodTypeSchema.nullable(),
  emergencyContact: EmergencyContactSchema.nullable(),
  allergies: z.array(z.string().min(1)).max(50, 'Maximum 50 allergies'),
  chronicConditions: z.array(ChronicConditionSchema).max(20, 'Maximum 20 chronic conditions')
});

// === SESSION VALIDATION SCHEMAS ===

/**
 * Device info validation
 */
export const DeviceInfoSchema = z.object({
  platform: z.enum(['web', 'ios', 'android']),
  version: z.string().min(1, 'Version is required'),
  userAgent: z.string().max(500, 'User agent too long').nullable(),
  screenResolution: z.string().regex(/^[0-9]+x[0-9]+$/, 'Invalid screen resolution format').nullable(),
  timezone: z.string().min(1, 'Timezone is required')
});

/**
 * Geolocation data validation
 */
export const GeolocationDataSchema = z.object({
  latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
  accuracy: z.number().positive('Accuracy must be positive'),
  timestamp: MedicalTimestampSchema,
  regionCode: ChileanRegionCodeSchema.nullable()
});

/**
 * Session metadata validation
 */
export const SessionMetadataSchema = z.object({
  deviceInfo: DeviceInfoSchema.nullable(),
  location: GeolocationDataSchema.nullable(),
  referenceImages: z.array(z.string().url()).max(10, 'Maximum 10 reference images'),
  clinicalNotes: z.string().max(2000, 'Clinical notes too long').nullable(),
  consentGiven: z.boolean(),
  dataRetentionPeriod: z.number().int().min(1).max(365, 'Data retention must be between 1 and 365 days')
});

/**
 * Medical session validation
 */
export const MedicalSessionSchema = z.object({
  id: UUIDSchema,
  doctorId: UUIDSchema,
  patientRut: RUTSchema,
  sessionType: z.enum(['consulta_inicial', 'seguimiento', 'analisis_imagen', 'interpretacion_examenes', 'urgencia']),
  status: z.enum(['activa', 'completada', 'expirada', 'cancelada', 'suspendida']),
  expiresAt: MedicalTimestampSchema.refine((timestamp) => {
    const expiry = new Date(timestamp);
    const now = new Date();
    // Session can expire up to 24 hours in the future
    return expiry > now && expiry <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }, 'Session expiry must be within 24 hours'),
  completedAt: MedicalTimestampSchema.nullable(),
  metadata: SessionMetadataSchema,
  analysesCount: z.number().int().min(0).max(100, 'Maximum 100 analyses per session'),
  createdAt: MedicalTimestampSchema,
  updatedAt: MedicalTimestampSchema
});

// === ANALYSIS VALIDATION SCHEMAS ===

/**
 * Bounding box validation
 */
export const BoundingBoxSchema = z.object({
  x: z.number().min(0, 'X coordinate must be non-negative'),
  y: z.number().min(0, 'Y coordinate must be non-negative'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  confidence: ConfidenceScoreSchema
});

/**
 * DICOM metadata validation
 */
export const DicomMetadataSchema = z.object({
  studyInstanceUID: z.string().min(1, 'Study instance UID is required'),
  seriesInstanceUID: z.string().min(1, 'Series instance UID is required'),
  sopInstanceUID: z.string().min(1, 'SOP instance UID is required'),
  modality: z.string().min(1, 'Modality is required').max(10, 'Modality too long'),
  studyDate: MedicalTimestampSchema,
  patientID: z.string().min(1, 'Patient ID is required').max(50, 'Patient ID too long'),
  institutionName: z.string().max(200, 'Institution name too long').nullable()
});

/**
 * Image analysis input validation
 */
export const ImageAnalysisInputSchema = z.object({
  type: z.literal('analisis_imagen_medica'),
  imageUrls: z.array(z.string().url()).min(1, 'At least one image URL required').max(10, 'Maximum 10 images'),
  imageType: z.enum([
    'radiografia_torax', 'radiografia_abdomen', 'tomografia_computada', 
    'resonancia_magnetica', 'ecografia', 'mamografia', 'dermatoscopia', 
    'endoscopia', 'retinografia'
  ]),
  bodyRegion: z.enum([
    'cabeza_cuello', 'torax', 'abdomen', 'pelvis', 'extremidades_superiores', 
    'extremidades_inferiores', 'columna_vertebral', 'corazon', 'pulmones', 'cerebro'
  ]),
  clinicalContext: z.string().max(1000, 'Clinical context too long').nullable(),
  patientSymptoms: z.array(z.string().min(1)).max(20, 'Maximum 20 symptoms'),
  urgencyLevel: UrgencyLevelSchema,
  dicomMetadata: DicomMetadataSchema.nullable()
});

/**
 * Medical finding validation
 */
export const MedicalFindingSchema = z.object({
  description: z.string().min(1, 'Finding description is required').max(500, 'Description too long'),
  confidence: ConfidenceScoreSchema,
  severity: SeverityLevelSchema,
  location: BoundingBoxSchema.nullable(),
  clinicalSignificance: ClinicalSignificanceSchema,
  icd10Codes: z.array(z.string().regex(/^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/, 'Invalid ICD-10 code')).max(5, 'Maximum 5 ICD-10 codes')
});

/**
 * Differential diagnosis validation
 */
export const DifferentialDiagnosisSchema = z.object({
  condition: z.string().min(1, 'Condition name is required').max(200, 'Condition name too long'),
  probability: ConfidenceScoreSchema,
  supportingEvidence: z.array(z.string().min(1)).max(10, 'Maximum 10 supporting evidence items'),
  requiredTests: z.array(z.string().min(1)).max(10, 'Maximum 10 required tests'),
  icd10Code: z.string().regex(/^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/, 'Invalid ICD-10 code').nullable()
});

/**
 * Image analysis results validation
 */
export const ImageAnalysisResultsSchema = z.object({
  type: z.literal('analisis_imagen_medica'),
  findings: z.array(MedicalFindingSchema).max(20, 'Maximum 20 findings'),
  recommendations: z.array(z.string().min(1)).max(10, 'Maximum 10 recommendations'),
  urgencyLevel: UrgencyLevelSchema,
  differentialDiagnosis: z.array(DifferentialDiagnosisSchema).max(5, 'Maximum 5 differential diagnoses'),
  followUpRequired: z.boolean(),
  additionalTestsSuggested: z.array(z.string().min(1)).max(10, 'Maximum 10 additional tests')
});

/**
 * Medical analysis validation
 */
export const MedicalAnalysisSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema,
  analysisType: z.enum([
    'analisis_imagen_medica', 'interpretacion_radiografia', 'analisis_dermatologico',
    'evaluacion_sintomas', 'interpretacion_examenes_laboratorio', 
    'analisis_electrocardiograma', 'evaluacion_riesgo_cardiovascular'
  ]),
  inputData: z.union([ImageAnalysisInputSchema]), // Extend with other input types
  results: z.union([ImageAnalysisResultsSchema]).nullable(), // Extend with other result types
  confidenceScore: ConfidenceScoreSchema.nullable(),
  processingTimeMs: z.number().int().min(0).max(300000, 'Processing time cannot exceed 5 minutes'),
  status: z.enum(['pendiente', 'procesando', 'completado', 'fallido', 'requiere_revision', 'aprobado', 'rechazado']),
  workflowExecutionId: z.string().uuid().nullable(),
  reviewedBy: UUIDSchema.nullable(),
  reviewNotes: z.string().max(1000, 'Review notes too long').nullable(),
  createdAt: MedicalTimestampSchema,
  updatedAt: MedicalTimestampSchema
});

// === API RESPONSE SCHEMAS ===

/**
 * API error validation
 */
export const ApiErrorSchema = z.object({
  code: z.string().min(1, 'Error code is required').max(50, 'Error code too long'),
  message: z.string().min(1, 'Error message is required').max(500, 'Error message too long'),
  details: z.record(z.unknown()).optional()
});

/**
 * Generic API response validation
 */
export const createApiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => 
  z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: ApiErrorSchema.nullable(),
    timestamp: MedicalTimestampSchema
  }).refine((response) => {
    // If success is true, data should not be null and error should be null
    if (response.success) {
      return response.data !== null && response.error === null;
    }
    // If success is false, error should not be null
    return response.error !== null;
  }, 'Response structure must be consistent with success status');

// === UTILITY VALIDATION FUNCTIONS ===

/**
 * Chilean RUT check digit validation
 */
export function validateRutCheckDigit(rut: string): boolean {
  const [numberPart, checkDigit] = rut.split('-');
  if (!numberPart || !checkDigit) return false;
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = numberPart.length - 1; i >= 0; i--) {
    const digit = parseInt(numberPart[i]!);
    if (isNaN(digit)) return false;
    
    sum += digit * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const expectedDigit = remainder < 2 ? remainder.toString() : (11 - remainder).toString().replace('10', 'K');
  
  return checkDigit.toUpperCase() === expectedDigit;
}

/**
 * Type guards using Zod schemas
 */
export namespace SchemaGuards {
  export const isValidDoctor = (data: unknown): data is z.infer<typeof DoctorSchema> => {
    const result = DoctorSchema.safeParse(data);
    return result.success;
  };

  export const isValidPatient = (data: unknown): data is z.infer<typeof PatientSchema> => {
    const result = PatientSchema.safeParse(data);
    return result.success;
  };

  export const isValidSession = (data: unknown): data is z.infer<typeof MedicalSessionSchema> => {
    const result = MedicalSessionSchema.safeParse(data);
    return result.success;
  };

  export const isValidAnalysis = (data: unknown): data is z.infer<typeof MedicalAnalysisSchema> => {
    const result = MedicalAnalysisSchema.safeParse(data);
    return result.success;
  };

  export const isValidRUT = (rut: string): boolean => {
    const result = RUTSchema.safeParse(rut);
    return result.success;
  };

  export const isValidMedicalLicense = (license: string): boolean => {
    const result = MedicalLicenseSchema.safeParse(license);
    return result.success;
  };
}

// === CREATION SCHEMAS (for API endpoints) ===

export const CreateDoctorSchema = DoctorSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  lastLoginAt: true 
});

export const CreatePatientSchema = PatientSchema;

export const CreateSessionSchema = MedicalSessionSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  completedAt: true, 
  analysesCount: true 
});

export const CreateAnalysisSchema = MedicalAnalysisSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  results: true, 
  confidenceScore: true, 
  processingTimeMs: true, 
  workflowExecutionId: true,
  reviewedBy: true,
  reviewNotes: true
});

// === UPDATE SCHEMAS ===

export const UpdateDoctorSchema = DoctorSchema.pick({ 
  fullName: true, 
  specialty: true, 
  profileImage: true 
}).partial();

export const UpdateSessionSchema = MedicalSessionSchema.pick({ 
  status: true, 
  completedAt: true, 
  metadata: true 
}).partial();

export const UpdateAnalysisSchema = MedicalAnalysisSchema.pick({ 
  status: true, 
  reviewedBy: true, 
  reviewNotes: true 
}).partial();

// === EXPORT TYPE INFERENCES ===

export type ValidatedDoctor = z.infer<typeof DoctorSchema>;
export type ValidatedPatient = z.infer<typeof PatientSchema>;
export type ValidatedSession = z.infer<typeof MedicalSessionSchema>;
export type ValidatedAnalysis = z.infer<typeof MedicalAnalysisSchema>;

export type CreateDoctorRequest = z.infer<typeof CreateDoctorSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
export type CreateAnalysisRequest = z.infer<typeof CreateAnalysisSchema>;

export type UpdateDoctorRequest = z.infer<typeof UpdateDoctorSchema>;
export type UpdateSessionRequest = z.infer<typeof UpdateSessionSchema>;
export type UpdateAnalysisRequest = z.infer<typeof UpdateAnalysisSchema>;