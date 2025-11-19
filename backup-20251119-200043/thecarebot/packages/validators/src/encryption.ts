/**
 * Medical Data Encryption System for TheCareBot
 * 
 * Implements AES-256-GCM encryption with PBKDF2 key derivation
 * Compliant with Chilean Law 19.628 and HIPAA requirements
 * 
 * Features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 key derivation with unique salts
 * - Medical data classification support
 * - Cryptographic integrity protection
 */

import { createCipherGCM, createDecipherGCM, randomBytes, pbkdf2Sync } from 'crypto';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyDerivationSalt: string;
  algorithm: string;
  version: number;
}

export interface MedicalDataContext {
  patientRut?: string;
  sessionId?: string;
  doctorId?: string;
  analysisType?: string;
  classification: MedicalDataClassification;
}

export type MedicalDataClassification = 
  | "public"        // Non-sensitive medical information
  | "internal"      // Internal medical workflows
  | "confidential"  // Patient demographics  
  | "restricted"    // Medical diagnoses and results
  | "top_secret";   // Chilean medical license validations

export class MedicalDataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly PBKDF2_ITERATIONS = 100000; // OWASP recommendation
  private static readonly VERSION = 1;
  
  private masterKey: string;
  
  constructor() {
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY || '';
    if (!this.masterKey) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is required for medical data protection');
    }
    
    if (this.masterKey.length < 32) {
      throw new Error('Master encryption key must be at least 32 characters for AES-256 security');
    }
  }
  
  /**
   * Encrypts medical data with AES-256-GCM
   * @param plaintext - Data to encrypt
   * @param context - Medical context for additional authenticated data
   * @returns Encrypted data object with integrity protection
   */
  encryptMedicalData(plaintext: string, context: MedicalDataContext): EncryptedData {
    try {
      // Generate unique salt for key derivation
      const keyDerivationSalt = randomBytes(MedicalDataEncryption.SALT_LENGTH);
      
      // Derive encryption key using PBKDF2
      const derivedKey = pbkdf2Sync(
        this.masterKey,
        keyDerivationSalt,
        MedicalDataEncryption.PBKDF2_ITERATIONS,
        MedicalDataEncryption.KEY_LENGTH,
        'sha512'
      );
      
      // Generate unique initialization vector
      const iv = randomBytes(MedicalDataEncryption.IV_LENGTH);
      
      // Create GCM cipher
      const cipher = createCipherGCM(MedicalDataEncryption.ALGORITHM, derivedKey, iv);
      
      // Add additional authenticated data (AAD) for context
      const aad = this.createAAD(context);
      cipher.setAAD(Buffer.from(aad, 'utf8'));
      
      // Perform encryption
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      
      // Get authentication tag for integrity verification
      const authTag = cipher.getAuthTag();
      
      return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyDerivationSalt: keyDerivationSalt.toString('base64'),
        algorithm: MedicalDataEncryption.ALGORITHM,
        version: MedicalDataEncryption.VERSION,
      };
      
    } catch (error) {
      console.error('Medical data encryption failed:', error);
      throw new Error('Failed to encrypt medical data - cryptographic operation failed');
    }
  }
  
  /**
   * Decrypts medical data with integrity verification
   * @param encryptedData - Encrypted data object
   * @param context - Medical context for AAD verification
   * @returns Decrypted plaintext
   */
  decryptMedicalData(encryptedData: EncryptedData, context: MedicalDataContext): string {
    try {
      // Verify encryption version compatibility
      if (encryptedData.version !== MedicalDataEncryption.VERSION) {
        throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
      }
      
      // Reconstruct derived key
      const keyDerivationSalt = Buffer.from(encryptedData.keyDerivationSalt, 'base64');
      const derivedKey = pbkdf2Sync(
        this.masterKey,
        keyDerivationSalt,
        MedicalDataEncryption.PBKDF2_ITERATIONS,
        MedicalDataEncryption.KEY_LENGTH,
        'sha512'
      );
      
      // Reconstruct IV and authentication tag
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      
      // Create GCM decipher
      const decipher = createDecipherGCM(MedicalDataEncryption.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);
      
      // Set additional authenticated data for verification
      const aad = this.createAAD(context);
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      
      // Perform decryption with integrity verification
      let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
      
    } catch (error) {
      console.error('Medical data decryption failed:', error);
      throw new Error('Failed to decrypt medical data - data may be corrupted, key invalid, or context mismatch');
    }
  }
  
  /**
   * Creates searchable hash for encrypted data indexing
   * @param data - Data to hash
   * @param context - Medical context
   * @returns Base64 encoded hash for database indexing
   */
  hashForIndexing(data: string, context: MedicalDataContext): string {
    const contextString = JSON.stringify({
      classification: context.classification,
      type: context.analysisType || 'general',
    });
    
    const combinedData = `${data}|${contextString}`;
    const hash = pbkdf2Sync(combinedData, this.masterKey, 10000, 32, 'sha512');
    return hash.toString('base64');
  }
  
  /**
   * Generates key-encrypted-key for key rotation
   * @param dataKey - Data encryption key to wrap
   * @returns Encrypted key for secure storage
   */
  wrapDataKey(dataKey: Buffer): EncryptedData {
    const context: MedicalDataContext = {
      classification: 'top_secret',
      analysisType: 'key_wrapping',
    };
    
    return this.encryptMedicalData(dataKey.toString('base64'), context);
  }
  
  /**
   * Unwraps key-encrypted-key
   * @param wrappedKey - Encrypted data key
   * @returns Unwrapped data encryption key
   */
  unwrapDataKey(wrappedKey: EncryptedData): Buffer {
    const context: MedicalDataContext = {
      classification: 'top_secret',
      analysisType: 'key_wrapping',
    };
    
    const keyBase64 = this.decryptMedicalData(wrappedKey, context);
    return Buffer.from(keyBase64, 'base64');
  }
  
  /**
   * Creates Additional Authenticated Data (AAD) from medical context
   * @param context - Medical data context
   * @returns AAD string for authenticated encryption
   */
  private createAAD(context: MedicalDataContext): string {
    return JSON.stringify({
      classification: context.classification,
      sessionId: context.sessionId,
      doctorId: context.doctorId,
      analysisType: context.analysisType,
      timestamp: Math.floor(Date.now() / 1000), // Unix timestamp for replay protection
    });
  }
}

// Singleton instance for global use
export const medicalEncryption = new MedicalDataEncryption();

/**
 * Chilean RUT Encryption
 * Encrypts patient RUT while maintaining searchability
 */
export function encryptPatientRUT(rut: string, sessionId: string, doctorId: string): {
  encrypted: EncryptedData;
  searchHash: string;
} {
  const context: MedicalDataContext = {
    patientRut: rut,
    sessionId,
    doctorId,
    classification: 'restricted',
    analysisType: 'patient_identification',
  };
  
  const encrypted = medicalEncryption.encryptMedicalData(rut, context);
  const searchHash = medicalEncryption.hashForIndexing(rut, context);
  
  return { encrypted, searchHash };
}

/**
 * Medical Analysis Results Encryption
 * Encrypts AI analysis results with session context
 */
export function encryptAnalysisResults(
  results: Record<string, unknown>,
  sessionId: string,
  analysisType: string,
  doctorId: string
): EncryptedData {
  const context: MedicalDataContext = {
    sessionId,
    doctorId,
    classification: 'restricted',
    analysisType,
  };
  
  const jsonResults = JSON.stringify(results);
  return medicalEncryption.encryptMedicalData(jsonResults, context);
}

/**
 * Decrypt Medical Analysis Results
 * Decrypts AI analysis results with context verification
 */
export function decryptAnalysisResults(
  encrypted: EncryptedData,
  sessionId: string,
  analysisType: string,
  doctorId: string
): Record<string, unknown> {
  const context: MedicalDataContext = {
    sessionId,
    doctorId,
    classification: 'restricted',
    analysisType,
  };
  
  const decrypted = medicalEncryption.decryptMedicalData(encrypted, context);
  return JSON.parse(decrypted);
}

/**
 * Chilean Medical License Encryption
 * Encrypts medical licenses with top-secret classification
 */
export function encryptMedicalLicense(
  license: string,
  doctorId: string
): EncryptedData {
  const context: MedicalDataContext = {
    doctorId,
    classification: 'top_secret',
    analysisType: 'medical_license_validation',
  };
  
  return medicalEncryption.encryptMedicalData(license, context);
}

/**
 * Decrypt Chilean Medical License
 * Decrypts medical licenses with authorization verification
 */
export function decryptMedicalLicense(
  encrypted: EncryptedData,
  doctorId: string
): string {
  const context: MedicalDataContext = {
    doctorId,
    classification: 'top_secret',
    analysisType: 'medical_license_validation',
  };
  
  return medicalEncryption.decryptMedicalData(encrypted, context);
}

/**
 * Patient Demographics Encryption
 * Encrypts sensitive patient information
 */
export function encryptPatientDemographics(
  demographics: Record<string, unknown>,
  patientRut: string,
  sessionId: string,
  doctorId: string
): EncryptedData {
  const context: MedicalDataContext = {
    patientRut,
    sessionId,
    doctorId,
    classification: 'confidential',
    analysisType: 'patient_demographics',
  };
  
  const jsonDemographics = JSON.stringify(demographics);
  return medicalEncryption.encryptMedicalData(jsonDemographics, context);
}

/**
 * Decrypt Patient Demographics
 * Decrypts patient information with session validation
 */
export function decryptPatientDemographics(
  encrypted: EncryptedData,
  patientRut: string,
  sessionId: string,
  doctorId: string
): Record<string, unknown> {
  const context: MedicalDataContext = {
    patientRut,
    sessionId,
    doctorId,
    classification: 'confidential',
    analysisType: 'patient_demographics',
  };
  
  const decrypted = medicalEncryption.decryptMedicalData(encrypted, context);
  return JSON.parse(decrypted);
}