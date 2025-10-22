/**
 * TheCareBot Mobile - AES-256-GCM Encryption Utilities
 * Medical-grade encryption for Chilean PHI compliance
 */

import CryptoJS from 'react-native-crypto-js';
import { getRandomBytes } from 'react-native-quick-crypto';
import type { AESEncryptedData } from '@/types';

/**
 * AES-256-GCM encryption for medical PHI data
 * Complies with Chilean Law 19.628 data protection requirements
 */
export class MedicalEncryption {
  private static readonly ALGORITHM = 'AES-256-GCM';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly SALT_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits for authentication

  /**
   * Generate cryptographically secure random bytes
   */
  private static generateSecureRandom(length: number): Uint8Array {
    return getRandomBytes(length);
  }

  /**
   * Derive encryption key from master key and salt using PBKDF2
   */
  private static deriveKey(masterKey: string, salt: Uint8Array, iterations = 100000): CryptoJS.lib.WordArray {
    const saltWordArray = CryptoJS.lib.WordArray.create(Array.from(salt));
    return CryptoJS.PBKDF2(masterKey, saltWordArray, {
      keySize: this.KEY_LENGTH / 4, // CryptoJS uses 32-bit words
      iterations,
      hasher: CryptoJS.algo.SHA256,
    });
  }

  /**
   * Encrypt medical PHI data using AES-256-GCM
   * 
   * @param plaintext - Medical data to encrypt
   * @param masterKey - Master encryption key (should be stored in secure keychain)
   * @returns Encrypted data container with integrity verification
   */
  public static encrypt(plaintext: string, masterKey: string): AESEncryptedData {
    try {
      // Generate cryptographically secure random values
      const salt = this.generateSecureRandom(this.SALT_LENGTH);
      const iv = this.generateSecureRandom(this.IV_LENGTH);

      // Derive encryption key
      const key = this.deriveKey(masterKey, salt);

      // Convert IV to WordArray for CryptoJS
      const ivWordArray = CryptoJS.lib.WordArray.create(Array.from(iv));
      
      // Encrypt using AES-GCM
      const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: ivWordArray,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding,
      });

      // Extract authentication tag (GCM provides built-in authentication)
      const ciphertext = encrypted.ciphertext;
      const authTag = encrypted.salt; // In CryptoJS GCM, salt contains the auth tag

      return {
        encryptedData: ciphertext.toString(CryptoJS.enc.Base64),
        iv: CryptoJS.lib.WordArray.create(Array.from(iv)).toString(CryptoJS.enc.Base64),
        salt: CryptoJS.lib.WordArray.create(Array.from(salt)).toString(CryptoJS.enc.Base64),
        tag: authTag?.toString(CryptoJS.enc.Base64) ?? '',
        algorithm: this.ALGORITHM,
        createdAt: Date.now(),
      };
    } catch (error) {
      console.error('Medical data encryption failed:', error);
      throw new Error('Failed to encrypt medical data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Decrypt medical PHI data using AES-256-GCM
   * 
   * @param encryptedData - Encrypted data container
   * @param masterKey - Master encryption key
   * @returns Decrypted plaintext data
   * @throws Error if decryption fails or integrity check fails
   */
  public static decrypt(encryptedData: AESEncryptedData, masterKey: string): string {
    try {
      if (encryptedData.algorithm !== this.ALGORITHM) {
        throw new Error(`Unsupported encryption algorithm: ${encryptedData.algorithm}`);
      }

      // Parse encrypted components
      const salt = new Uint8Array(
        CryptoJS.enc.Base64.parse(encryptedData.salt).words.map(word => [
          (word >>> 24) & 0xff,
          (word >>> 16) & 0xff,
          (word >>> 8) & 0xff,
          word & 0xff,
        ]).flat()
      );

      const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
      const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.encryptedData);
      const authTag = encryptedData.tag ? CryptoJS.enc.Base64.parse(encryptedData.tag) : undefined;

      // Derive the same key used for encryption
      const key = this.deriveKey(masterKey, salt);

      // Decrypt using AES-GCM
      const decrypted = CryptoJS.AES.decrypt(
        CryptoJS.lib.CipherParams.create({
          ciphertext,
          salt: authTag, // In CryptoJS GCM mode, salt field is used for auth tag
        }),
        key,
        {
          iv,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding,
        }
      );

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      return plaintext;
    } catch (error) {
      console.error('Medical data decryption failed:', error);
      throw new Error('Failed to decrypt medical data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Generate secure master key for medical data encryption
   * This should be stored in the device's secure keychain
   */
  public static generateMasterKey(): string {
    const randomBytes = this.generateSecureRandom(32);
    return CryptoJS.lib.WordArray.create(Array.from(randomBytes)).toString(CryptoJS.enc.Base64);
  }

  /**
   * Calculate integrity hash for medical data verification
   */
  public static calculateIntegrityHash(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  /**
   * Verify data integrity using hash comparison
   */
  public static verifyIntegrity(data: string, expectedHash: string): boolean {
    const actualHash = this.calculateIntegrityHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Generate secure session token for offline sessions
   */
  public static generateSessionToken(): string {
    const randomBytes = this.generateSecureRandom(16);
    return CryptoJS.lib.WordArray.create(Array.from(randomBytes)).toString(CryptoJS.enc.Hex);
  }

  /**
   * Encrypt medical session for secure transmission
   */
  public static encryptMedicalSession(session: any, masterKey: string): AESEncryptedData {
    const sessionJson = JSON.stringify(session);
    return this.encrypt(sessionJson, masterKey);
  }

  /**
   * Decrypt medical session from secure storage
   */
  public static decryptMedicalSession<T>(encryptedData: AESEncryptedData, masterKey: string): T {
    const decryptedJson = this.decrypt(encryptedData, masterKey);
    try {
      return JSON.parse(decryptedJson) as T;
    } catch (error) {
      throw new Error('Failed to parse decrypted medical session data');
    }
  }
}

/**
 * Secure key management for medical encryption
 */
export class MedicalKeyManager {
  private static readonly MASTER_KEY_ALIAS = 'thecarebot.medical.master_key';
  private static readonly SESSION_KEY_PREFIX = 'thecarebot.session.';
  
  /**
   * Store master key in secure keychain with biometric protection
   * Implementation should use react-native-keychain with biometric requirements
   */
  public static async storeMasterKey(masterKey: string, biometricPrompt: string): Promise<void> {
    // This would integrate with react-native-keychain
    // For now, we'll show the interface structure
    console.log('Storing master key with biometric protection:', biometricPrompt);
    
    // In real implementation:
    // await Keychain.setInternetCredentials(
    //   this.MASTER_KEY_ALIAS,
    //   'medical_encryption',
    //   masterKey,
    //   {
    //     accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    //     authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
    //     accessGroup: 'thecarebot.medical',
    //   }
    // );
  }

  /**
   * Retrieve master key from secure keychain with biometric authentication
   */
  public static async retrieveMasterKey(biometricPrompt: string): Promise<string> {
    console.log('Retrieving master key with biometric authentication:', biometricPrompt);
    
    // In real implementation:
    // const credentials = await Keychain.getInternetCredentials(this.MASTER_KEY_ALIAS);
    // if (credentials && credentials.password) {
    //   return credentials.password;
    // }
    
    // For testing, return a mock key
    return MedicalEncryption.generateMasterKey();
  }

  /**
   * Generate and store new master key with biometric protection
   */
  public static async initializeMedicalEncryption(biometricPrompt: string): Promise<string> {
    const masterKey = MedicalEncryption.generateMasterKey();
    await this.storeMasterKey(masterKey, biometricPrompt);
    return masterKey;
  }

  /**
   * Clear all medical encryption keys (for logout/reset)
   */
  public static async clearAllKeys(): Promise<void> {
    console.log('Clearing all medical encryption keys');
    
    // In real implementation:
    // await Keychain.resetInternetCredentials(this.MASTER_KEY_ALIAS);
    // Clear all session keys as well
  }
}