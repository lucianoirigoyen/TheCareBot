/**
 * Chilean RUT Validation Utilities
 * Implements mathematical check digit validation for Chilean National IDs
 * 
 * CRITICAL: Chilean Law 19.628 compliance requires strict RUT validation
 * All patient operations must validate RUT with check digit algorithm
 */

import { z } from 'zod';
import { PatientRUT } from '../../types/medical/core';

// ============================================================================
// RUT VALIDATION ALGORITHM (CHILEAN GOVERNMENT STANDARD)
// ============================================================================

/**
 * Validates Chilean RUT check digit using official algorithm
 * Algorithm: 11 - (sum of (digit * weight) % 11)
 * Weights: [2,3,4,5,6,7,2,3,4,5,6,7...] cycling
 */
export const calculateRUTCheckDigit = (rutNumber: string): string => {
  const cleanRut = rutNumber.replace(/\D/g, '');
  const weights = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  
  for (let i = 0; i < cleanRut.length; i++) {
    const digit = parseInt(cleanRut[cleanRut.length - 1 - i], 10);
    const weight = weights[i % weights.length];
    sum += digit * weight;
  }
  
  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  
  if (checkDigit === 11) return '0';
  if (checkDigit === 10) return 'k';
  return checkDigit.toString();
};

/**
 * Validates complete Chilean RUT format and check digit
 * Format: XX.XXX.XXX-Y where Y is the check digit
 */
export const validateChileanRUT = (rut: string): boolean => {
  // Format validation: XX.XXX.XXX-Y
  const rutRegex = /^(\d{1,2})\.(\d{3})\.(\d{3})-([0-9kK])$/;
  const match = rut.match(rutRegex);
  
  if (!match) return false;
  
  const rutBody = `${match[1]}${match[2]}${match[3]}`;
  const providedCheckDigit = match[4].toLowerCase();
  const calculatedCheckDigit = calculateRUTCheckDigit(rutBody);
  
  return providedCheckDigit === calculatedCheckDigit;
};

/**
 * Formats RUT number with dots and dash
 * Input: "12345678" + "9" -> Output: "12.345.678-9"
 */
export const formatRUT = (rutNumber: string, checkDigit: string): string => {
  const cleanRut = rutNumber.replace(/\D/g, '');
  
  if (cleanRut.length < 7 || cleanRut.length > 8) {
    throw new Error('RUT number must be 7 or 8 digits');
  }
  
  const formatted = cleanRut.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return `${formatted}-${checkDigit.toLowerCase()}`;
};

/**
 * Extracts numeric part from formatted RUT for hashing
 * Input: "12.345.678-9" -> Output: "123456789"
 */
export const extractRUTDigits = (formattedRUT: string): string => {
  return formattedRUT.replace(/[^0-9kK]/g, '').toLowerCase();
};

// ============================================================================
// RUT HASHING FOR DATABASE STORAGE (PRIVACY PROTECTION)
// ============================================================================

/**
 * Creates salted hash of RUT for database storage
 * CRITICAL: Never store raw RUTs in database per Chilean Law 19.628
 */
export const hashRUTForStorage = async (rut: PatientRUT, salt: string): Promise<string> => {
  const crypto = await import('crypto');
  const rutDigits = extractRUTDigits(rut);
  const saltedRUT = `${rutDigits}:${salt}`;
  
  return crypto
    .createHash('sha256')
    .update(saltedRUT, 'utf8')
    .digest('hex');
};

/**
 * Verifies RUT against stored hash
 */
export const verifyRUTHash = async (rut: PatientRUT, hash: string, salt: string): Promise<boolean> => {
  const calculatedHash = await hashRUTForStorage(rut, salt);
  return calculatedHash === hash;
};

// ============================================================================
// ZOD SCHEMAS FOR RUT VALIDATION
// ============================================================================

export const ChileanRUTSchema = z
  .string()
  .regex(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, 'RUT must be in format XX.XXX.XXX-Y')
  .refine(validateChileanRUT, 'Invalid RUT check digit')
  .transform(rut => rut as PatientRUT);

export const RUTNumberSchema = z
  .string()
  .regex(/^\d{7,8}$/, 'RUT number must be 7 or 8 digits')
  .refine(num => {
    const checkDigit = calculateRUTCheckDigit(num);
    return checkDigit !== null;
  }, 'Invalid RUT number');

// ============================================================================
// PATIENT RUT OPERATIONS
// ============================================================================

export interface PatientRUTValidation {
  readonly rut: PatientRUT;
  readonly isValid: boolean;
  readonly checkDigit: string;
  readonly formattedRUT: string;
  readonly rutHash: string;
}

export const createPatientRUT = (rutNumber: string): PatientRUTValidation => {
  const cleanNumber = rutNumber.replace(/\D/g, '');
  const checkDigit = calculateRUTCheckDigit(cleanNumber);
  const formattedRUT = formatRUT(cleanNumber, checkDigit);
  const isValid = validateChileanRUT(formattedRUT);
  
  if (!isValid) {
    throw new Error(`Invalid Chilean RUT: ${formattedRUT}`);
  }
  
  return {
    rut: formattedRUT as PatientRUT,
    isValid,
    checkDigit,
    formattedRUT,
    rutHash: '' // Will be populated when salt is provided
  };
};

// ============================================================================
// AUDIT LOGGING FOR RUT OPERATIONS
// ============================================================================

export interface RUTAuditEvent {
  readonly eventType: 'validate' | 'hash' | 'verify';
  readonly rutFormat: string; // Masked: XX.XXX.XXX-*
  readonly success: boolean;
  readonly timestamp: Date;
  readonly ipAddress: string;
  readonly purpose: string;
}

export const maskRUTForAudit = (rut: PatientRUT): string => {
  return rut.replace(/-[\dkK]$/, '-*');
};

export const auditRUTOperation = (
  operation: RUTAuditEvent['eventType'],
  rut: PatientRUT,
  success: boolean,
  ipAddress: string,
  purpose: string
): RUTAuditEvent => {
  return {
    eventType: operation,
    rutFormat: maskRUTForAudit(rut),
    success,
    timestamp: new Date(),
    ipAddress,
    purpose
  };
};