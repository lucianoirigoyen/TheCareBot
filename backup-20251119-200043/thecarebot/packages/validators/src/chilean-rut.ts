/**
 * Chilean RUT Validation System
 * 
 * Implements strict mathematical validation of Chilean National ID (RUT)
 * according to the official algorithm used by Chilean government
 * 
 * Compliant with:
 * - Chilean Law 19.628 (Data Protection)
 * - Medical data handling requirements
 * - Mathematical check digit verification
 * 
 * RUT Format: XXXXXXXX-X (8 digits + check digit)
 * Check digit can be 0-9 or K
 */

import { z } from 'zod';

export interface ValidatedRUT {
  /** Original RUT string as entered */
  original: string;
  /** Normalized RUT (uppercase K, consistent format) */
  normalized: string;
  /** RUT number without check digit */
  number: number;
  /** Check digit (0-9 or K) */
  checkDigit: string;
  /** Whether RUT passed mathematical validation */
  isValid: boolean;
  /** Validation metadata */
  metadata: {
    algorithm: string;
    validatedAt: string;
    normalizedFormat: string;
  };
}

export interface RUTValidationError {
  code: string;
  message: string;
  field: string;
  value: string;
}

/**
 * Chilean RUT Validator Class
 * Implements the official Chilean RUT check digit algorithm
 */
export class ChileanRUTValidator {
  private static readonly RUT_REGEX = /^(\d{1,2}\.?\d{3}\.?\d{3})-?([0-9Kk])$/;
  private static readonly CLEAN_RUT_REGEX = /^(\d{7,8})-?([0-9Kk])$/;
  private static readonly CHECK_DIGIT_SEQUENCE = [3, 2, 7, 6, 5, 4, 3, 2];
  
  /**
   * Validates Chilean RUT using official mathematical algorithm
   * @param rut - RUT string to validate
   * @returns Validation result with detailed information
   */
  static validateRUT(rut: string): ValidatedRUT {
    const errors: RUTValidationError[] = [];
    
    try {
      // Basic format validation
      if (!rut || typeof rut !== 'string') {
        throw new Error('RUT must be a non-empty string');
      }
      
      // Normalize RUT (remove dots, handle formatting)
      const normalized = this.normalizeRUT(rut);
      
      // Extract number and check digit
      const match = normalized.match(this.CLEAN_RUT_REGEX);
      if (!match) {
        throw new Error('RUT format is invalid. Expected format: XXXXXXXX-X');
      }
      
      const [, numberStr, checkDigitStr] = match;
      const number = parseInt(numberStr, 10);
      const providedCheckDigit = checkDigitStr.toUpperCase();
      
      // Validate number range
      if (number < 1000000 || number > 99999999) {
        throw new Error('RUT number must be between 1,000,000 and 99,999,999');
      }
      
      // Calculate expected check digit
      const expectedCheckDigit = this.calculateCheckDigit(number);
      const isValid = providedCheckDigit === expectedCheckDigit;
      
      return {
        original: rut,
        normalized: `${number}-${providedCheckDigit}`,
        number,
        checkDigit: providedCheckDigit,
        isValid,
        metadata: {
          algorithm: 'chilean_rut_modulo_11',
          validatedAt: new Date().toISOString(),
          normalizedFormat: `${number.toLocaleString('es-CL')}-${providedCheckDigit}`,
        },
      };
      
    } catch (error) {
      return {
        original: rut,
        normalized: rut,
        number: 0,
        checkDigit: '',
        isValid: false,
        metadata: {
          algorithm: 'chilean_rut_modulo_11',
          validatedAt: new Date().toISOString(),
          normalizedFormat: rut,
        },
      };
    }
  }
  
  /**
   * Calculates the check digit for a Chilean RUT number
   * Uses the official modulo 11 algorithm
   * @param rutNumber - RUT number (without check digit)
   * @returns Check digit as string (0-9 or K)
   */
  private static calculateCheckDigit(rutNumber: number): string {
    const digits = rutNumber.toString().split('').reverse().map(Number);
    let sum = 0;
    
    // Apply the Chilean RUT algorithm
    for (let i = 0; i < digits.length; i++) {
      const multiplier = this.CHECK_DIGIT_SEQUENCE[i % this.CHECK_DIGIT_SEQUENCE.length];
      sum += digits[i] * multiplier;
    }
    
    const remainder = sum % 11;
    const checkDigit = 11 - remainder;
    
    // Convert to check digit format
    if (checkDigit === 11) return '0';
    if (checkDigit === 10) return 'K';
    return checkDigit.toString();
  }
  
  /**
   * Normalizes RUT format for consistent processing
   * @param rut - RUT string to normalize
   * @returns Normalized RUT string
   */
  private static normalizeRUT(rut: string): string {
    // Remove all dots and spaces
    let clean = rut.replace(/[\.\s]/g, '');
    
    // Ensure dash before check digit
    if (clean.length >= 2 && !clean.includes('-')) {
      clean = clean.slice(0, -1) + '-' + clean.slice(-1);
    }
    
    // Convert to uppercase for K
    return clean.toUpperCase();
  }
  
  /**
   * Generates a valid Chilean RUT for testing purposes
   * WARNING: Only for testing, never use for real patients
   * @returns Valid RUT string for testing
   */
  static generateValidTestRUT(): string {
    // Generate random number in valid range
    const number = Math.floor(Math.random() * (99999999 - 10000000) + 10000000);
    const checkDigit = this.calculateCheckDigit(number);
    return `${number}-${checkDigit}`;
  }
  
  /**
   * Formats RUT for display in Chilean standard format
   * @param rut - Valid RUT to format
   * @returns Formatted RUT with dots and dash
   */
  static formatForDisplay(rut: string): string {
    const validation = this.validateRUT(rut);
    if (!validation.isValid) {
      return rut; // Return original if invalid
    }
    
    const numberStr = validation.number.toString();
    
    // Add dots for Chilean format
    if (numberStr.length === 8) {
      return `${numberStr.slice(0, 2)}.${numberStr.slice(2, 5)}.${numberStr.slice(5)}-${validation.checkDigit}`;
    } else if (numberStr.length === 7) {
      return `${numberStr.slice(0, 1)}.${numberStr.slice(1, 4)}.${numberStr.slice(4)}-${validation.checkDigit}`;
    }
    
    return `${validation.number}-${validation.checkDigit}`;
  }
  
  /**
   * Anonymizes RUT for logging purposes (keeps format but masks digits)
   * @param rut - RUT to anonymize
   * @returns Anonymized RUT string
   */
  static anonymizeForLogging(rut: string): string {
    const validation = this.validateRUT(rut);
    if (!validation.isValid) {
      return 'INVALID_RUT';
    }
    
    const numberStr = validation.number.toString();
    const masked = '*'.repeat(numberStr.length - 2) + numberStr.slice(-2);
    return `${masked}-${validation.checkDigit}`;
  }
}

/**
 * Zod schema for Chilean RUT validation
 * Provides integration with form validation libraries
 */
export const ChileanRUTSchema = z
  .string()
  .min(9, 'RUT debe tener al menos 9 caracteres')
  .max(12, 'RUT no puede exceder 12 caracteres')
  .regex(
    /^(\d{1,2}\.?\d{3}\.?\d{3})-?([0-9Kk])$/,
    'RUT debe tener formato válido (ej: 12.345.678-9 o 12345678-9)'
  )
  .refine((rut) => {
    const validation = ChileanRUTValidator.validateRUT(rut);
    return validation.isValid;
  }, 'Dígito verificador de RUT inválido')
  .transform((rut) => {
    const validation = ChileanRUTValidator.validateRUT(rut);
    return validation.normalized;
  });

/**
 * Medical Patient RUT Schema
 * Enhanced validation for medical applications
 */
export const MedicalPatientRUTSchema = ChileanRUTSchema
  .refine((rut) => {
    const validation = ChileanRUTValidator.validateRUT(rut);
    // Additional medical validations
    if (validation.number < 5000000) {
      return false; // Likely too old for modern medical system
    }
    return true;
  }, 'RUT no válido para registros médicos modernos')
  .transform((rut) => {
    // Always return normalized format for medical records
    const validation = ChileanRUTValidator.validateRUT(rut);
    return validation.normalized;
  });

/**
 * Doctor RUT Schema
 * Special validation for medical professionals
 */
export const DoctorRUTSchema = ChileanRUTSchema
  .refine((rut) => {
    const validation = ChileanRUTValidator.validateRUT(rut);
    // Doctors must have RUT in reasonable range
    if (validation.number < 8000000) {
      return false; // Likely too old for active medical practice
    }
    return true;
  }, 'RUT de doctor debe estar en rango válido para profesionales activos');

/**
 * Utility functions for medical applications
 */
export class MedicalRUTUtils {
  /**
   * Creates a searchable hash of RUT for database indexing
   * @param rut - Valid RUT to hash
   * @returns Base64 hash suitable for database indexing
   */
  static createSearchHash(rut: string): string {
    const validation = ChileanRUTValidator.validateRUT(rut);
    if (!validation.isValid) {
      throw new Error('Cannot create search hash for invalid RUT');
    }
    
    // Use normalized format for consistent hashing
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(validation.normalized)
      .digest('base64');
  }
  
  /**
   * Validates RUT and returns medical-safe format
   * @param rut - RUT to validate and format
   * @returns Medical-safe RUT format or throws error
   */
  static validateAndFormatForMedical(rut: string): string {
    const validation = ChileanRUTValidator.validateRUT(rut);
    
    if (!validation.isValid) {
      throw new Error(`Invalid Chilean RUT: ${rut}`);
    }
    
    // Additional medical validations
    if (validation.number < 1000000) {
      throw new Error('RUT too low for medical records');
    }
    
    if (validation.number > 99999999) {
      throw new Error('RUT exceeds maximum valid range');
    }
    
    return validation.normalized;
  }
  
  /**
   * Batch validates multiple RUTs for medical import
   * @param ruts - Array of RUTs to validate
   * @returns Validation results for each RUT
   */
  static batchValidate(ruts: string[]): Array<{
    original: string;
    validation: ValidatedRUT;
    errors: string[];
  }> {
    return ruts.map(rut => {
      const validation = ChileanRUTValidator.validateRUT(rut);
      const errors: string[] = [];
      
      if (!validation.isValid) {
        errors.push('Invalid check digit');
      }
      
      if (validation.number < 5000000) {
        errors.push('RUT may be too old for modern medical records');
      }
      
      return {
        original: rut,
        validation,
        errors,
      };
    });
  }
  
  /**
   * Extracts age estimate from RUT (approximate, for validation only)
   * @param rut - Valid RUT
   * @returns Estimated age range for validation purposes
   */
  static estimateAgeRange(rut: string): {
    minAge: number;
    maxAge: number;
    confidence: 'low' | 'medium' | 'high';
  } {
    const validation = ChileanRUTValidator.validateRUT(rut);
    if (!validation.isValid) {
      throw new Error('Cannot estimate age for invalid RUT');
    }
    
    // Very rough estimation based on RUT assignment patterns
    // This is NOT precise and only for basic validation
    if (validation.number < 8000000) {
      return { minAge: 60, maxAge: 100, confidence: 'low' };
    } else if (validation.number < 15000000) {
      return { minAge: 40, maxAge: 80, confidence: 'low' };
    } else if (validation.number < 20000000) {
      return { minAge: 20, maxAge: 60, confidence: 'low' };
    } else {
      return { minAge: 0, maxAge: 40, confidence: 'low' };
    }
  }
}

/**
 * Export main validator and utilities
 */
export const validateChileanRUT = ChileanRUTValidator.validateRUT;
export const formatChileanRUT = ChileanRUTValidator.formatForDisplay;
export const generateTestRUT = ChileanRUTValidator.generateValidTestRUT;