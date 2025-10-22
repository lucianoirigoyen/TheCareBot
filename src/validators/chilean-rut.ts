/**
 * Chilean RUT Validation with Mathematical Check Digit Verification
 * 
 * Implements strict validation per Chilean Government standards
 * Compliant with Chilean Law 19.628
 * 
 * CRITICAL: All RUT validations MUST use mathematical verification
 * CRITICAL: No demo RUTs accepted in production
 * CRITICAL: RUTs must be hashed before database storage
 */

import { z } from 'zod';
import { createHash } from 'crypto';

export function validateRutCheckDigit(rut: string): boolean {
  const [numberStr, checkDigit] = rut.split('-');
  if (!numberStr || !checkDigit) return false;

  const number = parseInt(numberStr, 10);
  if (isNaN(number)) return false;

  let sum = 0;
  let multiplier = 2;

  const digits = numberStr.split('').reverse();
  for (const digit of digits) {
    sum += parseInt(digit, 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const expectedDigit = remainder < 2 
    ? remainder.toString() 
    : (11 - remainder === 10 ? 'K' : (11 - remainder).toString());

  return checkDigit.toUpperCase() === expectedDigit;
}

export const ChileanRUTSchema = z
  .string()
  .regex(/^[0-9]{7,8}-[0-9Kk]$/, 'RUT must be in format XXXXXXXX-X')
  .refine(validateRutCheckDigit, 'Invalid RUT check digit')
  .transform((rut) => rut.toUpperCase());

export function hashRUTForStorage(rut: string, salt: string): string {
  const rutDigits = rut.replace(/[^0-9Kk]/g, '').toUpperCase();
  const saltedRUT = `${rutDigits}:${salt}`;
  return createHash('sha256').update(saltedRUT, 'utf8').digest('hex');
}

export function formatRUTForDisplay(rut: string): string {
  const [numberStr, checkDigit] = rut.split('-');
  if (numberStr.length === 8) {
    return `${numberStr.slice(0, 2)}.${numberStr.slice(2, 5)}.${numberStr.slice(5)}-${checkDigit}`;
  } else if (numberStr.length === 7) {
    return `${numberStr.slice(0, 1)}.${numberStr.slice(1, 4)}.${numberStr.slice(4)}-${checkDigit}`;
  }
  return rut;
}

export function anonymizeRUTForLogging(rut: string): string {
  const [numberStr, checkDigit] = rut.split('-');
  const masked = '*'.repeat(numberStr.length - 2) + numberStr.slice(-2);
  return `${masked}-${checkDigit}`;
}
