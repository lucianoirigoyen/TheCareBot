// src/config/timeouts.ts
export const TIMEOUT_CONFIG = {
  database: {
    query: 3000,          // Simple queries
    transaction: 10000,   // Complex transactions
    migration: 30000,     // Schema migrations
  },
  externalApis: {
    googleHealthcare: 8000,
    imageAnalysis: 30000, // Medical image processing (increased from doc for realistic use)
    authentication: 3000,
  },
  cache: {
    read: 500,
    write: 1000,
  },
  fileOperations: {
    upload: 30000,
    download: 10000,
    processing: 60000,
  },
} as const;

export type TimeoutCategory = keyof typeof TIMEOUT_CONFIG;
export type TimeoutOperation<T extends TimeoutCategory> = keyof typeof TIMEOUT_CONFIG[T];

/**
 * Get timeout value for specific operation
 */
export function getTimeout<T extends TimeoutCategory>(
  category: T,
  operation: TimeoutOperation<T>
): number {
  return TIMEOUT_CONFIG[category][operation];
}

/**
 * Medical-specific timeout configurations
 */
export const MEDICAL_TIMEOUTS = {
  // Patient data operations
  patientLookup: TIMEOUT_CONFIG.database.query,
  patientUpdate: TIMEOUT_CONFIG.database.transaction,
  
  // Medical analysis operations
  excelAnalysis: TIMEOUT_CONFIG.externalApis.imageAnalysis,
  radiographyAnalysis: TIMEOUT_CONFIG.externalApis.imageAnalysis,
  
  // Chilean RUT validation
  rutValidation: 1000, // Fast local validation
  
  // Session management
  sessionCreation: TIMEOUT_CONFIG.database.query,
  sessionValidation: TIMEOUT_CONFIG.database.query,
} as const;

export type MedicalOperation = keyof typeof MEDICAL_TIMEOUTS;

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
export function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
      timeoutMs
    )
  );
}

/**
 * Wrap an operation with a timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([operation(), createTimeoutPromise(timeoutMs)]);
}