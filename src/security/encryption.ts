/**
 * Medical Data Encryption System for TheCareBot
 *
 * Implements AES-256-GCM encryption with PBKDF2 key derivation
 * Compliant with Chilean Law 19.628 and HIPAA requirements
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 key derivation with unique salts (100,000 iterations)
 * - Medical data classification support
 * - Cryptographic integrity protection
 * - NO demo mode bypasses - production-ready only
 *
 * CRITICAL: All medical data MUST be encrypted at rest
 * CRITICAL: Master encryption key MUST be set in environment
 * CRITICAL: No plaintext medical data allowed in production
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

export interface EncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded authentication tag for integrity */
  authTag: string;
  /** Base64 encoded salt for key derivation */
  keyDerivationSalt: string;
  /** Encryption algorithm identifier */
  algorithm: string;
  /** Version for future migration support */
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

/**
 * Medical Data Encryption Class
 * Provides AES-256-GCM encryption for all medical data
 */
export class MedicalDataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private static readonly PBKDF2_ITERATIONS = 100000; // OWASP 2023 recommendation
  private static readonly VERSION = 1;

  private masterKey: string;

  constructor() {
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY || '';

    if (!this.masterKey) {
      throw new Error(
        'MASTER_ENCRYPTION_KEY environment variable is required for medical data protection. ' +
        'This is a legal requirement under Chilean Law 19.628.'
      );
    }

    if (this.masterKey.length < 32) {
      throw new Error(
        'Master encryption key must be at least 32 characters for AES-256 security. ' +
        'Current length: ' + this.masterKey.length
      );
    }

    // Prevent demo/test keys in production
    if (process.env.NODE_ENV === 'production') {
      if (this.masterKey.includes('demo') || this.masterKey.includes('test')) {
        throw new Error('Demo/test encryption keys are not allowed in production');
      }
    }
  }

  /**
   * Encrypts medical data with AES-256-GCM
   */
  encryptMedicalData(plaintext: string, context: MedicalDataContext): EncryptedData {
    const keyDerivationSalt = randomBytes(MedicalDataEncryption.SALT_LENGTH);
    const derivedKey = pbkdf2Sync(
      this.masterKey,
      keyDerivationSalt,
      MedicalDataEncryption.PBKDF2_ITERATIONS,
      MedicalDataEncryption.KEY_LENGTH,
      'sha512'
    );

    const iv = randomBytes(MedicalDataEncryption.IV_LENGTH);
    const cipher = createCipheriv(MedicalDataEncryption.ALGORITHM, derivedKey, iv);

    const aad = this.createAAD(context);
    cipher.setAAD(Buffer.from(aad, 'utf8'));

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyDerivationSalt: keyDerivationSalt.toString('base64'),
      algorithm: MedicalDataEncryption.ALGORITHM,
      version: MedicalDataEncryption.VERSION,
    };
  }

  /**
   * Decrypts medical data with integrity verification
   */
  decryptMedicalData(encryptedData: EncryptedData, context: MedicalDataContext): string {
    const keyDerivationSalt = Buffer.from(encryptedData.keyDerivationSalt, 'base64');
    const derivedKey = pbkdf2Sync(
      this.masterKey,
      keyDerivationSalt,
      MedicalDataEncryption.PBKDF2_ITERATIONS,
      MedicalDataEncryption.KEY_LENGTH,
      'sha512'
    );

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    const decipher = createDecipheriv(MedicalDataEncryption.ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    const aad = this.createAAD(context);
    decipher.setAAD(Buffer.from(aad, 'utf8'));

    let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  private createAAD(context: MedicalDataContext): string {
    return JSON.stringify({
      classification: context.classification,
      sessionId: context.sessionId || 'no_session',
      doctorId: context.doctorId || 'unknown',
      analysisType: context.analysisType || 'general',
    });
  }
}

export const medicalEncryption = new MedicalDataEncryption();
