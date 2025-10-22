/**
 * Chilean Medical License Validation System for TheCareBot
 * Integrates with Chilean medical registry for license verification
 * Supports multiple specialties and validation workflows
 */

import { z } from 'zod';
import { createHash, pbkdf2Sync } from 'crypto';
import { auditLogger } from '@/security/audit';

// ============================================================================
// CHILEAN MEDICAL REGISTRY CONFIGURATION
// ============================================================================

const MEDICAL_REGISTRY_CONFIG = {
  // Chilean medical registry endpoints (mock for demo)
  REGISTRY_API_BASE: process.env.CHILEAN_MEDICAL_REGISTRY_API || 'https://registro.minsal.cl/api',
  API_KEY: process.env.MEDICAL_REGISTRY_API_KEY || '',
  
  // Validation timeouts
  VALIDATION_TIMEOUT_MS: 10000, // 10 seconds
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // Rate limiting for registry API
  MAX_VALIDATIONS_PER_MINUTE: 30,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// ============================================================================
// MEDICAL SPECIALTIES AND CLASSIFICATIONS
// ============================================================================

export enum ChileanMedicalSpecialty {
  // Primary Care
  MEDICINA_GENERAL = 'medicina_general',
  MEDICINA_FAMILIAR = 'medicina_familiar',
  MEDICINA_INTERNA = 'medicina_interna',
  
  // Surgical Specialties
  CIRUGIA_GENERAL = 'cirugia_general',
  CIRUGIA_CARDIOVASCULAR = 'cirugia_cardiovascular',
  CIRUGIA_PEDIATRICA = 'cirugia_pediatrica',
  NEUROCIRUGIA = 'neurocirugia',
  TRAUMATOLOGIA = 'traumatologia',
  UROLOGIA = 'urologia',
  
  // Medical Specialties
  CARDIOLOGIA = 'cardiologia',
  NEUROLOGIA = 'neurologia',
  GASTROENTEROLOGIA = 'gastroenterologia',
  ENDOCRINOLOGIA = 'endocrinologia',
  NEFROLOGIA = 'nefrologia',
  NEUMOLOGIA = 'neumologia',
  REUMATOLOGIA = 'reumatologia',
  INFECTOLOGIA = 'infectologia',
  HEMATOLOGIA = 'hematologia',
  ONCOLOGIA = 'oncologia',
  
  // Emergency & Critical Care
  MEDICINA_URGENCIA = 'medicina_urgencia',
  MEDICINA_INTENSIVA = 'medicina_intensiva',
  ANESTESIOLOGIA = 'anestesiologia',
  
  // Diagnostic Specialties
  RADIOLOGIA = 'radiologia',
  PATOLOGIA = 'patologia',
  MEDICINA_NUCLEAR = 'medicina_nuclear',
  MEDICINA_LABORATORIO = 'medicina_laboratorio',
  
  // Pediatrics & Women's Health
  PEDIATRIA = 'pediatria',
  NEONATOLOGIA = 'neonatologia',
  GINECOLOGIA = 'ginecologia',
  OBSTETRICIA = 'obstetricia',
  
  // Mental Health & Neurosciences
  PSIQUIATRIA = 'psiquiatria',
  NEUROLOGIA_PEDIATRICA = 'neurologia_pediatrica',
  
  // Other Specialties
  DERMATOLOGIA = 'dermatologia',
  OFTALMOLOGIA = 'oftalmologia',
  OTORRINOLARINGOLOGIA = 'otorrinolaringologia',
  REHABILITACION = 'rehabilitacion',
  GERIATRIA = 'geriatria',
  MEDICINA_DEPORTIVA = 'medicina_deportiva',
}

export enum MedicalLicenseStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING_RENEWAL = 'pending_renewal',
  UNDER_INVESTIGATION = 'under_investigation',
}

export enum MedicalInstitutionType {
  PUBLIC_HOSPITAL = 'hospital_publico',
  PRIVATE_CLINIC = 'clinica_privada',
  PRIMARY_CARE_CENTER = 'centro_atencion_primaria',
  UNIVERSITY_HOSPITAL = 'hospital_universitario',
  SPECIALIZED_CENTER = 'centro_especializado',
  EMERGENCY_SERVICE = 'servicio_urgencia',
  INDEPENDENT_PRACTICE = 'consulta_independiente',
}

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

export interface ChileanMedicalLicense {
  readonly licenseNumber: string;
  readonly rut: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly specialties: readonly ChileanMedicalSpecialty[];
  readonly status: MedicalLicenseStatus;
  readonly issueDate: Date;
  readonly expirationDate: Date;
  readonly institutionAffiliations: readonly MedicalInstitution[];
  readonly lastValidated: Date;
  readonly validationSource: 'MINSAL' | 'COLMED' | 'CACHE' | 'MANUAL';
}

export interface MedicalInstitution {
  readonly institutionId: string;
  readonly name: string;
  readonly type: MedicalInstitutionType;
  readonly region: string;
  readonly city: string;
  readonly address?: string;
  readonly phone?: string;
  readonly isActive: boolean;
}

export interface LicenseValidationResult {
  readonly isValid: boolean;
  readonly license?: ChileanMedicalLicense;
  readonly validationId: string;
  readonly timestamp: Date;
  readonly source: 'REGISTRY' | 'CACHE';
  readonly responseTimeMs: number;
  readonly errors?: readonly string[];
  readonly warnings?: readonly string[];
  readonly complianceFlags: readonly string[];
}

export interface ValidationContext {
  readonly requestingDoctorId?: string;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly purpose: 'LOGIN' | 'REGISTRATION' | 'PROFILE_UPDATE' | 'AUDIT' | 'VERIFICATION';
  readonly skipCache?: boolean;
  readonly requireLiveValidation?: boolean;
}

// ============================================================================
// VALIDATION CACHE
// ============================================================================

interface CachedValidation {
  result: LicenseValidationResult;
  cachedAt: Date;
  expiresAt: Date;
  validationCount: number;
}

const validationCache = new Map<string, CachedValidation>();

// ============================================================================
// MEDICAL LICENSE VALIDATOR CLASS
// ============================================================================

export class ChileanMedicalLicenseValidator {
  private static instance: ChileanMedicalLicenseValidator;
  private validationCount = 0;
  private lastMinuteReset = Date.now();
  
  private constructor() {
    this.startCacheCleanup();
  }
  
  static getInstance(): ChileanMedicalLicenseValidator {
    if (!ChileanMedicalLicenseValidator.instance) {
      ChileanMedicalLicenseValidator.instance = new ChileanMedicalLicenseValidator();
    }
    return ChileanMedicalLicenseValidator.instance;
  }
  
  /**
   * Validates a Chilean medical license
   */
  async validateLicense(
    licenseNumber: string,
    doctorRut?: string,
    context?: ValidationContext
  ): Promise<LicenseValidationResult> {
    const startTime = Date.now();
    const validationId = this.generateValidationId(licenseNumber, doctorRut);
    
    try {
      // Rate limiting check
      if (!this.checkRateLimit()) {
        throw new Error('Medical license validation rate limit exceeded');
      }
      
      // Input validation
      const sanitizedLicense = this.sanitizeLicenseNumber(licenseNumber);
      if (!sanitizedLicense) {
        return this.createErrorResult(
          validationId,
          startTime,
          ['Invalid license number format'],
          []
        );
      }
      
      // Check cache first (unless skipping cache or requiring live validation)
      if (!context?.skipCache && !context?.requireLiveValidation) {
        const cachedResult = this.getCachedValidation(sanitizedLicense);
        if (cachedResult) {
          await this.logValidationAttempt(cachedResult.result, context, 'CACHE');
          return {
            ...cachedResult.result,
            source: 'CACHE',
            responseTimeMs: Date.now() - startTime,
          };
        }
      }
      
      // Perform live validation
      const validationResult = await this.performLiveValidation(
        sanitizedLicense,
        doctorRut,
        context
      );
      
      // Cache the result if successful
      if (validationResult.isValid && validationResult.license) {
        this.cacheValidation(sanitizedLicense, validationResult);
      }
      
      // Log the validation attempt
      await this.logValidationAttempt(validationResult, context, 'REGISTRY');
      
      return {
        ...validationResult,
        responseTimeMs: Date.now() - startTime,
      };
      
    } catch (error) {
      console.error('License validation error:', error);
      
      const errorResult = this.createErrorResult(
        validationId,
        startTime,
        [error instanceof Error ? error.message : 'Validation failed'],
        ['VALIDATION_ERROR']
      );
      
      await this.logValidationAttempt(errorResult, context, 'ERROR');
      return errorResult;
    }
  }
  
  /**
   * Validates multiple licenses in batch
   */
  async validateLicensesBatch(
    licenses: Array<{ licenseNumber: string; doctorRut?: string }>,
    context?: ValidationContext
  ): Promise<LicenseValidationResult[]> {
    const results: LicenseValidationResult[] = [];
    
    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < licenses.length; i += batchSize) {
      const batch = licenses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(({ licenseNumber, doctorRut }) =>
        this.validateLicense(licenseNumber, doctorRut, context)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < licenses.length) {
        await this.delay(1000); // 1 second delay between batches
      }
    }
    
    return results;
  }
  
  /**
   * Validates license specialties for specific medical procedures
   */
  async validateSpecialtyAuthorization(
    licenseNumber: string,
    requiredSpecialty: ChileanMedicalSpecialty,
    context?: ValidationContext
  ): Promise<{
    authorized: boolean;
    license?: ChileanMedicalLicense;
    authorizationLevel: 'FULL' | 'SUPERVISED' | 'DENIED';
    reason?: string;
  }> {
    const validationResult = await this.validateLicense(licenseNumber, undefined, context);
    
    if (!validationResult.isValid || !validationResult.license) {
      return {
        authorized: false,
        authorizationLevel: 'DENIED',
        reason: 'Invalid or inactive medical license',
      };
    }
    
    const license = validationResult.license;
    
    // Check if doctor has the required specialty
    const hasSpecialty = license.specialties.includes(requiredSpecialty);
    
    if (hasSpecialty) {
      return {
        authorized: true,
        license,
        authorizationLevel: 'FULL',
      };
    }
    
    // Check for related specialties that might allow supervised practice
    const relatedSpecialties = this.getRelatedSpecialties(requiredSpecialty);
    const hasRelatedSpecialty = license.specialties.some(specialty =>
      relatedSpecialties.includes(specialty)
    );
    
    if (hasRelatedSpecialty) {
      return {
        authorized: true,
        license,
        authorizationLevel: 'SUPERVISED',
        reason: 'Authorized under related specialty with supervision',
      };
    }
    
    return {
      authorized: false,
      license,
      authorizationLevel: 'DENIED',
      reason: `Doctor does not have required specialty: ${requiredSpecialty}`,
    };
  }
  
  /**
   * Gets license renewal information
   */
  async getLicenseRenewalInfo(
    licenseNumber: string,
    context?: ValidationContext
  ): Promise<{
    renewalRequired: boolean;
    expirationDate: Date;
    daysUntilExpiration: number;
    renewalUrl?: string;
    requirements?: string[];
  }> {
    const validationResult = await this.validateLicense(licenseNumber, undefined, context);
    
    if (!validationResult.isValid || !validationResult.license) {
      throw new Error('Cannot get renewal info for invalid license');
    }
    
    const license = validationResult.license;
    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (license.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const renewalRequired = daysUntilExpiration <= 90; // 90 days before expiration
    
    return {
      renewalRequired,
      expirationDate: license.expirationDate,
      daysUntilExpiration,
      renewalUrl: this.getRenewalUrl(license),
      requirements: this.getRenewalRequirements(license),
    };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private async performLiveValidation(
    licenseNumber: string,
    doctorRut?: string,
    context?: ValidationContext
  ): Promise<LicenseValidationResult> {
    const validationId = this.generateValidationId(licenseNumber, doctorRut);
    const startTime = Date.now();
    
    try {
      // In production, make actual API calls to Chilean medical registry
      // For demo, we'll return mock data
      
      if (process.env.NODE_ENV === 'production' && MEDICAL_REGISTRY_CONFIG.API_KEY) {
        return await this.validateWithMINSAL(licenseNumber, doctorRut, context);
      } else {
        return await this.validateWithMockData(licenseNumber, doctorRut, validationId, startTime);
      }
      
    } catch (error) {
      console.error('Live validation failed:', error);
      throw error;
    }
  }
  
  private async validateWithMINSAL(
    licenseNumber: string,
    doctorRut?: string,
    context?: ValidationContext
  ): Promise<LicenseValidationResult> {
    const startTime = Date.now();
    const validationId = this.generateValidationId(licenseNumber, doctorRut);
    
    // Mock implementation - in production, replace with actual API calls
    const url = `${MEDICAL_REGISTRY_CONFIG.REGISTRY_API_BASE}/validate-license`;
    const requestBody = {
      licenseNumber,
      doctorRut,
      requestId: validationId,
      source: 'TheCareBot',
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MEDICAL_REGISTRY_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(MEDICAL_REGISTRY_CONFIG.VALIDATION_TIMEOUT_MS),
      });
      
      if (!response.ok) {
        throw new Error(`Registry API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseMINSALResponse(data, validationId, startTime);
      
    } catch (error) {
      console.error('MINSAL API error:', error);
      
      // Fallback to cached data or return error
      const cachedResult = this.getCachedValidation(licenseNumber);
      if (cachedResult) {
        return {
          ...cachedResult.result,
          source: 'CACHE',
          warnings: ['Live validation failed, using cached data'],
        };
      }
      
      throw error;
    }
  }
  
  private async validateWithMockData(
    licenseNumber: string,
    doctorRut: string | undefined,
    validationId: string,
    startTime: number
  ): Promise<LicenseValidationResult> {
    // Mock validation logic for development/testing
    await this.delay(200); // Simulate API delay
    
    // Mock license data - in production, this comes from the registry
    const mockLicense: ChileanMedicalLicense = {
      licenseNumber,
      rut: doctorRut || '12.345.678-9',
      firstName: 'Dr. María',
      lastName: 'González Silva',
      specialties: [ChileanMedicalSpecialty.MEDICINA_INTERNA, ChileanMedicalSpecialty.CARDIOLOGIA],
      status: MedicalLicenseStatus.ACTIVE,
      issueDate: new Date('2015-03-15'),
      expirationDate: new Date('2025-03-15'),
      institutionAffiliations: [
        {
          institutionId: 'INST001',
          name: 'Hospital Salvador',
          type: MedicalInstitutionType.PUBLIC_HOSPITAL,
          region: 'Región Metropolitana',
          city: 'Santiago',
          address: 'Av. Salvador 364, Providencia',
          phone: '+56 2 2570 2000',
          isActive: true,
        },
      ],
      lastValidated: new Date(),
      validationSource: 'MINSAL',
    };
    
    // Simple validation logic
    const isValidFormat = /^[0-9]{6,8}$/.test(licenseNumber);
    const isActive = mockLicense.status === MedicalLicenseStatus.ACTIVE;
    const notExpired = mockLicense.expirationDate > new Date();
    
    const isValid = isValidFormat && isActive && notExpired;
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!isValidFormat) {
      errors.push('Invalid license number format');
    }
    
    if (!isActive) {
      errors.push(`License status: ${mockLicense.status}`);
    }
    
    if (!notExpired) {
      errors.push('License has expired');
    }
    
    // Check for upcoming expiration
    const daysUntilExpiration = Math.ceil(
      (mockLicense.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiration <= 30) {
      warnings.push(`License expires in ${daysUntilExpiration} days`);
    }
    
    return {
      isValid,
      license: isValid ? mockLicense : undefined,
      validationId,
      timestamp: new Date(),
      source: 'REGISTRY',
      responseTimeMs: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      complianceFlags: this.generateComplianceFlags(mockLicense, isValid),
    };
  }
  
  private parseMINSALResponse(
    data: any,
    validationId: string,
    startTime: number
  ): LicenseValidationResult {
    // Parse the actual MINSAL response format
    // This is a placeholder implementation
    
    try {
      const license: ChileanMedicalLicense = {
        licenseNumber: data.licenseNumber,
        rut: data.doctorRut,
        firstName: data.firstName,
        lastName: data.lastName,
        specialties: data.specialties || [],
        status: data.status,
        issueDate: new Date(data.issueDate),
        expirationDate: new Date(data.expirationDate),
        institutionAffiliations: data.institutions || [],
        lastValidated: new Date(),
        validationSource: 'MINSAL',
      };
      
      return {
        isValid: data.isValid,
        license: data.isValid ? license : undefined,
        validationId,
        timestamp: new Date(),
        source: 'REGISTRY',
        responseTimeMs: Date.now() - startTime,
        errors: data.errors,
        warnings: data.warnings,
        complianceFlags: this.generateComplianceFlags(license, data.isValid),
      };
      
    } catch (error) {
      throw new Error(`Failed to parse MINSAL response: ${error}`);
    }
  }
  
  private generateComplianceFlags(
    license: ChileanMedicalLicense,
    isValid: boolean
  ): string[] {
    const flags: string[] = [];
    
    if (isValid) {
      flags.push('MINSAL_VERIFIED');
      flags.push('CHILEAN_MEDICAL_LICENSE');
    }
    
    if (license.status === MedicalLicenseStatus.ACTIVE) {
      flags.push('LICENSE_ACTIVE');
    }
    
    if (license.expirationDate > new Date()) {
      flags.push('LICENSE_CURRENT');
    }
    
    // Check for upcoming expiration
    const daysUntilExpiration = Math.ceil(
      (license.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiration <= 90) {
      flags.push('RENEWAL_REQUIRED');
    }
    
    if (daysUntilExpiration <= 30) {
      flags.push('URGENT_RENEWAL');
    }
    
    // Specialty flags
    if (license.specialties.length > 0) {
      flags.push('SPECIALTY_CERTIFIED');
    }
    
    // Institution flags
    if (license.institutionAffiliations.length > 0) {
      flags.push('INSTITUTIONAL_AFFILIATION');
    }
    
    return flags;
  }
  
  private sanitizeLicenseNumber(licenseNumber: string): string | null {
    if (!licenseNumber || typeof licenseNumber !== 'string') {
      return null;
    }
    
    // Remove non-digits
    const cleaned = licenseNumber.replace(/\D/g, '');
    
    // Chilean medical licenses are typically 6-8 digits
    if (cleaned.length < 6 || cleaned.length > 8) {
      return null;
    }
    
    return cleaned;
  }
  
  private generateValidationId(licenseNumber: string, doctorRut?: string): string {
    const hash = createHash('sha256');
    hash.update(`${licenseNumber}:${doctorRut || ''}:${Date.now()}`);
    return hash.digest('hex').slice(0, 16);
  }
  
  private checkRateLimit(): boolean {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const lastMinute = Math.floor(this.lastMinuteReset / 60000);
    
    if (currentMinute > lastMinute) {
      this.validationCount = 0;
      this.lastMinuteReset = now;
    }
    
    this.validationCount++;
    return this.validationCount <= MEDICAL_REGISTRY_CONFIG.MAX_VALIDATIONS_PER_MINUTE;
  }
  
  private getCachedValidation(licenseNumber: string): CachedValidation | null {
    const cached = validationCache.get(licenseNumber);
    
    if (!cached) return null;
    
    if (new Date() > cached.expiresAt) {
      validationCache.delete(licenseNumber);
      return null;
    }
    
    cached.validationCount++;
    return cached;
  }
  
  private cacheValidation(licenseNumber: string, result: LicenseValidationResult): void {
    const cachedValidation: CachedValidation = {
      result,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + MEDICAL_REGISTRY_CONFIG.CACHE_DURATION_MS),
      validationCount: 1,
    };
    
    validationCache.set(licenseNumber, cachedValidation);
  }
  
  private createErrorResult(
    validationId: string,
    startTime: number,
    errors: string[],
    complianceFlags: string[]
  ): LicenseValidationResult {
    return {
      isValid: false,
      validationId,
      timestamp: new Date(),
      source: 'REGISTRY',
      responseTimeMs: Date.now() - startTime,
      errors,
      complianceFlags,
    };
  }
  
  private getRelatedSpecialties(specialty: ChileanMedicalSpecialty): ChileanMedicalSpecialty[] {
    const relatedSpecialties: Record<ChileanMedicalSpecialty, ChileanMedicalSpecialty[]> = {
      [ChileanMedicalSpecialty.CARDIOLOGIA]: [ChileanMedicalSpecialty.MEDICINA_INTERNA],
      [ChileanMedicalSpecialty.GASTROENTEROLOGIA]: [ChileanMedicalSpecialty.MEDICINA_INTERNA],
      [ChileanMedicalSpecialty.ENDOCRINOLOGIA]: [ChileanMedicalSpecialty.MEDICINA_INTERNA],
      [ChileanMedicalSpecialty.NEFROLOGIA]: [ChileanMedicalSpecialty.MEDICINA_INTERNA],
      [ChileanMedicalSpecialty.NEUMOLOGIA]: [ChileanMedicalSpecialty.MEDICINA_INTERNA],
      [ChileanMedicalSpecialty.REUMATOLOGIA]: [ChileanMedicalSpecialty.MEDICINA_INTERNA],
      [ChileanMedicalSpecialty.CIRUGIA_CARDIOVASCULAR]: [ChileanMedicalSpecialty.CIRUGIA_GENERAL],
      [ChileanMedicalSpecialty.NEUROCIRUGIA]: [ChileanMedicalSpecialty.CIRUGIA_GENERAL],
      [ChileanMedicalSpecialty.UROLOGIA]: [ChileanMedicalSpecialty.CIRUGIA_GENERAL],
      // Add more relationships as needed
    } as any;
    
    return relatedSpecialties[specialty] || [];
  }
  
  private getRenewalUrl(license: ChileanMedicalLicense): string {
    return `https://registro.minsal.cl/renovacion?license=${license.licenseNumber}`;
  }
  
  private getRenewalRequirements(license: ChileanMedicalLicense): string[] {
    return [
      'Certificado de antecedentes',
      'Comprobante de educación médica continua',
      'Pago de derechos de renovación',
      'Formulario de renovación completo',
    ];
  }
  
  private async logValidationAttempt(
    result: LicenseValidationResult,
    context?: ValidationContext,
    source?: string
  ): Promise<void> {
    await auditLogger.logEvent({
      doctorId: context?.requestingDoctorId || 'unknown',
      sessionId: context?.sessionId,
      action: 'medical_license_validation',
      resource: 'medical_license',
      resourceId: result.license?.licenseNumber,
      ipAddress: context?.ipAddress,
      responseStatus: result.isValid ? 200 : 400,
      responseTime: result.responseTimeMs,
      riskLevel: result.isValid ? 'low' : 'high',
      dataClassification: 'RESTRICTED',
      additionalContext: {
        purpose: context?.purpose,
        source: source || result.source,
        validationId: result.validationId,
        hasErrors: !!result.errors?.length,
        hasWarnings: !!result.warnings?.length,
        complianceFlags: result.complianceFlags,
      },
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 60 * 1000); // Every hour
  }
  
  private cleanupExpiredCache(): void {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    for (const [key, cached] of validationCache.entries()) {
      if (now > cached.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => validationCache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired license validation cache entries`);
    }
  }
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ChileanMedicalLicenseSchema = z.object({
  licenseNumber: z.string()
    .min(6, 'License number must be at least 6 digits')
    .max(8, 'License number cannot exceed 8 digits')
    .regex(/^[0-9]+$/, 'License number must contain only digits'),
  
  doctorRut: z.string()
    .regex(/^[0-9]{7,8}-[0-9kK]$/, 'Invalid Chilean RUT format')
    .optional(),
    
  purpose: z.enum(['LOGIN', 'REGISTRATION', 'PROFILE_UPDATE', 'AUDIT', 'VERIFICATION']),
  
  skipCache: z.boolean().optional(),
  requireLiveValidation: z.boolean().optional(),
});

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const medicalLicenseValidator = ChileanMedicalLicenseValidator.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick license validation
 */
export async function validateMedicalLicense(
  licenseNumber: string,
  doctorRut?: string,
  context?: Partial<ValidationContext>
): Promise<LicenseValidationResult> {
  return medicalLicenseValidator.validateLicense(licenseNumber, doctorRut, {
    purpose: 'VERIFICATION',
    ...context,
  });
}

/**
 * Check if doctor can perform specific procedure
 */
export async function canPerformProcedure(
  licenseNumber: string,
  requiredSpecialty: ChileanMedicalSpecialty,
  context?: Partial<ValidationContext>
): Promise<boolean> {
  const result = await medicalLicenseValidator.validateSpecialtyAuthorization(
    licenseNumber,
    requiredSpecialty,
    { purpose: 'VERIFICATION', ...context }
  );
  
  return result.authorized && result.authorizationLevel !== 'DENIED';
}

/**
 * Get specialty display names in Spanish
 */
export function getSpecialtyDisplayName(specialty: ChileanMedicalSpecialty): string {
  const displayNames: Record<ChileanMedicalSpecialty, string> = {
    [ChileanMedicalSpecialty.MEDICINA_GENERAL]: 'Medicina General',
    [ChileanMedicalSpecialty.MEDICINA_FAMILIAR]: 'Medicina Familiar',
    [ChileanMedicalSpecialty.MEDICINA_INTERNA]: 'Medicina Interna',
    [ChileanMedicalSpecialty.CARDIOLOGIA]: 'Cardiología',
    [ChileanMedicalSpecialty.NEUROLOGIA]: 'Neurología',
    [ChileanMedicalSpecialty.GASTROENTEROLOGIA]: 'Gastroenterología',
    [ChileanMedicalSpecialty.ENDOCRINOLOGIA]: 'Endocrinología',
    [ChileanMedicalSpecialty.NEFROLOGIA]: 'Nefrología',
    [ChileanMedicalSpecialty.NEUMOLOGIA]: 'Neumología',
    [ChileanMedicalSpecialty.CIRUGIA_GENERAL]: 'Cirugía General',
    [ChileanMedicalSpecialty.CIRUGIA_CARDIOVASCULAR]: 'Cirugía Cardiovascular',
    [ChileanMedicalSpecialty.NEUROCIRUGIA]: 'Neurocirugía',
    [ChileanMedicalSpecialty.TRAUMATOLOGIA]: 'Traumatología',
    [ChileanMedicalSpecialty.RADIOLOGIA]: 'Radiología',
    [ChileanMedicalSpecialty.PATOLOGIA]: 'Patología',
    [ChileanMedicalSpecialty.MEDICINA_URGENCIA]: 'Medicina de Urgencia',
    [ChileanMedicalSpecialty.MEDICINA_INTENSIVA]: 'Medicina Intensiva',
    [ChileanMedicalSpecialty.PEDIATRIA]: 'Pediatría',
    [ChileanMedicalSpecialty.GINECOLOGIA]: 'Ginecología y Obstetricia',
    [ChileanMedicalSpecialty.PSIQUIATRIA]: 'Psiquiatría',
    [ChileanMedicalSpecialty.DERMATOLOGIA]: 'Dermatología',
    // Add more as needed
  } as any;
  
  return displayNames[specialty] || specialty.replace(/_/g, ' ');
}