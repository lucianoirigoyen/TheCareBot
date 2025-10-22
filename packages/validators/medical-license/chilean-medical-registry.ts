/**
 * Chilean Medical License Validation
 * Integration with Chilean Medical Registry for license verification
 * 
 * CRITICAL: All doctors must have valid Chilean medical licenses
 * Integration with official Chilean medical registry required
 */

import { z } from 'zod';
import { MedicalLicense, DoctorId, ChileanMedicalSpecialty } from '../../types/medical/core';

// ============================================================================
// CHILEAN MEDICAL REGISTRY INTEGRATION
// ============================================================================

export interface ChileanMedicalRegistryEntry {
  readonly licenseNumber: MedicalLicense;
  readonly doctorId: DoctorId;
  readonly firstName: string;
  readonly lastName: string;
  readonly specialty: ChileanMedicalSpecialty;
  readonly registrationDate: Date;
  readonly expirationDate: Date;
  readonly isActive: boolean;
  readonly institutionAffiliation?: string;
  readonly region: ChileanRegion;
}

export enum ChileanRegion {
  ARICA_PARINACOTA = 'arica_parinacota',
  TARAPACA = 'tarapaca', 
  ANTOFAGASTA = 'antofagasta',
  ATACAMA = 'atacama',
  COQUIMBO = 'coquimbo',
  VALPARAISO = 'valparaiso',
  METROPOLITANA = 'metropolitana',
  OHIGGINS = 'ohiggins',
  MAULE = 'maule',
  NUBLE = 'nuble',
  BIOBIO = 'biobio',
  ARAUCANIA = 'araucania',
  LOS_RIOS = 'los_rios',
  LOS_LAGOS = 'los_lagos',
  AYSEN = 'aysen',
  MAGALLANES = 'magallanes'
}

// ============================================================================
// MEDICAL LICENSE VALIDATION PATTERNS
// ============================================================================

/**
 * Chilean medical license format: MED-XXXXXXX-CL
 * Where X is numeric and CL indicates Chile
 */
export const CHILEAN_MEDICAL_LICENSE_PATTERN = /^MED-\d{7}-CL$/;

/**
 * Validates Chilean medical license format
 */
export const validateMedicalLicenseFormat = (license: string): boolean => {
  return CHILEAN_MEDICAL_LICENSE_PATTERN.test(license);
};

/**
 * Generates medical license number (for testing/demo purposes only)
 */
export const generateMedicalLicenseNumber = (): MedicalLicense => {
  const randomNumber = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
  return `MED-${randomNumber}-CL` as MedicalLicense;
};

// ============================================================================
// REGISTRY API INTEGRATION
// ============================================================================

export interface MedicalRegistryApiResponse {
  readonly success: boolean;
  readonly data?: ChileanMedicalRegistryEntry;
  readonly error?: string;
  readonly verificationTimestamp: Date;
}

/**
 * Mock integration with Chilean Medical Registry
 * In production, this would connect to the official government API
 */
export const verifyMedicalLicense = async (
  licenseNumber: MedicalLicense
): Promise<MedicalRegistryApiResponse> => {
  // Format validation first
  if (!validateMedicalLicenseFormat(licenseNumber)) {
    return {
      success: false,
      error: 'Invalid medical license format',
      verificationTimestamp: new Date()
    };
  }
  
  // Simulate API call to Chilean Medical Registry
  // In production: await fetch('https://api.ministeriosalud.cl/registro-medico/verify')
  const simulatedDelay = new Promise(resolve => setTimeout(resolve, 500));
  await simulatedDelay;
  
  // Mock verification result
  const isValid = licenseNumber.includes('123') || licenseNumber.includes('456');
  
  if (!isValid) {
    return {
      success: false,
      error: 'Medical license not found in Chilean registry',
      verificationTimestamp: new Date()
    };
  }
  
  return {
    success: true,
    data: {
      licenseNumber,
      doctorId: `doctor-${Date.now()}` as DoctorId,
      firstName: 'Dr. Juan',
      lastName: 'Pérez González',
      specialty: ChileanMedicalSpecialty.MEDICINA_INTERNA,
      registrationDate: new Date('2010-01-15'),
      expirationDate: new Date('2026-01-15'),
      isActive: true,
      institutionAffiliation: 'Hospital Salvador',
      region: ChileanRegion.METROPOLITANA
    },
    verificationTimestamp: new Date()
  };
};

// ============================================================================
// LICENSE RENEWAL AND EXPIRATION CHECKING
// ============================================================================

export const isLicenseExpired = (entry: ChileanMedicalRegistryEntry): boolean => {
  return new Date() > entry.expirationDate;
};

export const isLicenseExpiringSoon = (entry: ChileanMedicalRegistryEntry, daysThreshold = 90): boolean => {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + (daysThreshold * 24 * 60 * 60 * 1000));
  return entry.expirationDate <= thresholdDate;
};

export const getDaysUntilExpiration = (entry: ChileanMedicalRegistryEntry): number => {
  const now = new Date();
  const diffTime = entry.expirationDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ============================================================================
// ZOD SCHEMAS FOR MEDICAL LICENSE VALIDATION
// ============================================================================

export const MedicalLicenseSchema = z
  .string()
  .regex(CHILEAN_MEDICAL_LICENSE_PATTERN, 'Medical license must be in format MED-XXXXXXX-CL')
  .transform(license => license as MedicalLicense);

export const ChileanMedicalRegistryEntrySchema = z.object({
  licenseNumber: MedicalLicenseSchema,
  doctorId: z.string().uuid().transform(id => id as DoctorId),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  specialty: z.nativeEnum(ChileanMedicalSpecialty),
  registrationDate: z.date(),
  expirationDate: z.date(),
  isActive: z.boolean(),
  institutionAffiliation: z.string().optional(),
  region: z.nativeEnum(ChileanRegion)
});

// ============================================================================
// DOCTOR PROFILE VALIDATION
// ============================================================================

export interface DoctorProfile {
  readonly doctorId: DoctorId;
  readonly licenseNumber: MedicalLicense;
  readonly fullName: string;
  readonly specialty: ChileanMedicalSpecialty;
  readonly isLicenseValid: boolean;
  readonly isLicenseExpired: boolean;
  readonly isLicenseExpiringSoon: boolean;
  readonly daysUntilExpiration: number;
  readonly lastVerificationDate: Date;
  readonly region: ChileanRegion;
}

export const createDoctorProfile = async (
  licenseNumber: MedicalLicense
): Promise<DoctorProfile> => {
  const verification = await verifyMedicalLicense(licenseNumber);
  
  if (!verification.success || !verification.data) {
    throw new Error(`Invalid medical license: ${verification.error}`);
  }
  
  const registryEntry = verification.data;
  
  return {
    doctorId: registryEntry.doctorId,
    licenseNumber: registryEntry.licenseNumber,
    fullName: `${registryEntry.firstName} ${registryEntry.lastName}`,
    specialty: registryEntry.specialty,
    isLicenseValid: registryEntry.isActive,
    isLicenseExpired: isLicenseExpired(registryEntry),
    isLicenseExpiringSoon: isLicenseExpiringSoon(registryEntry),
    daysUntilExpiration: getDaysUntilExpiration(registryEntry),
    lastVerificationDate: verification.verificationTimestamp,
    region: registryEntry.region
  };
};

// ============================================================================
// AUDIT LOGGING FOR MEDICAL LICENSE OPERATIONS
// ============================================================================

export interface MedicalLicenseAuditEvent {
  readonly eventType: 'verify' | 'create_profile' | 'check_expiration';
  readonly licenseNumber: MedicalLicense;
  readonly success: boolean;
  readonly doctorId?: DoctorId;
  readonly specialty?: ChileanMedicalSpecialty;
  readonly timestamp: Date;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly error?: string;
}

export const auditMedicalLicenseOperation = (
  operation: MedicalLicenseAuditEvent['eventType'],
  licenseNumber: MedicalLicense,
  success: boolean,
  ipAddress: string,
  userAgent: string,
  doctorId?: DoctorId,
  specialty?: ChileanMedicalSpecialty,
  error?: string
): MedicalLicenseAuditEvent => {
  return {
    eventType: operation,
    licenseNumber,
    success,
    doctorId,
    specialty,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    error
  };
};