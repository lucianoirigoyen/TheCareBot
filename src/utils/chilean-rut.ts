/**
 * Chilean RUT Validation Utilities for TheCareBot
 * Implements mathematical check digit validation for Chilean National IDs
 */

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

/**
 * Masks RUT for audit logging
 */
export const maskRUTForAudit = (rut: string): string => {
  return rut.replace(/-[\dkK]$/, '-*');
};