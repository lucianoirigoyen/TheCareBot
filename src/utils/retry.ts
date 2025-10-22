// src/utils/retry.ts
export interface RetryOptions {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitterMaxMs: number;
  readonly retryCondition?: (error: Error) => boolean;
  readonly onRetry?: (error: Error, attempt: number) => void;
}

export const RETRY_CONFIGS = {
  critical: {
    maxRetries: 5,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    jitterMaxMs: 50,
  },
  normal: {
    maxRetries: 3,
    baseDelayMs: 200,
    maxDelayMs: 3000,
    jitterMaxMs: 100,
  },
  background: {
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    jitterMaxMs: 200,
  },
} as const;

export type RetryConfig = keyof typeof RETRY_CONFIGS;

/**
 * Execute operation with retry logic using exponential backoff and jitter
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if condition fails
      if (options.retryCondition && !options.retryCondition(lastError)) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === options.maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = Math.min(
        options.baseDelayMs * Math.pow(2, attempt),
        options.maxDelayMs
      );
      const jitter = Math.random() * options.jitterMaxMs;
      const totalDelay = exponentialDelay + jitter;
      
      // Callback for retry
      options.onRetry?.(lastError, attempt + 1);
      
      // Log retry attempt
      console.warn(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${totalDelay}ms`, {
        error: lastError.message,
        operation: operation.name || 'anonymous',
        delay: totalDelay,
      });
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError!;
}

/**
 * Utility to determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // HTTP retryable errors (5xx, some 4xx)
  if ('status' in error) {
    const status = (error as any).status as number;
    return (
      status >= 500 || // Server errors
      status === 408 || // Request timeout
      status === 429 || // Too many requests
      status === 503    // Service unavailable
    );
  }
  
  // Network errors
  if ('code' in error) {
    const code = (error as any).code as string;
    return [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNABORTED',
    ].includes(code);
  }
  
  // Database retryable errors
  if (error.message.includes('connection') || 
      error.message.includes('timeout') ||
      error.message.includes('deadlock') ||
      error.message.includes('lock') ||
      error.message.includes('concurrent')) {
    return true;
  }
  
  // Medical API specific errors
  if (error.message.includes('rate limit') ||
      error.message.includes('quota') ||
      error.message.includes('temporary')) {
    return true;
  }
  
  return false;
}

/**
 * Check if error is related to authentication/authorization (not retryable)
 */
export function isAuthError(error: Error): boolean {
  if ('status' in error) {
    const status = (error as any).status as number;
    return status === 401 || status === 403;
  }
  
  return error.message.includes('unauthorized') ||
         error.message.includes('forbidden') ||
         error.message.includes('authentication') ||
         error.message.includes('token');
}

/**
 * Check if error is client-side (usually not retryable)
 */
export function isClientError(error: Error): boolean {
  if ('status' in error) {
    const status = (error as any).status as number;
    return status >= 400 && status < 500 && 
           status !== 408 && status !== 429; // Exclude timeout and rate limit
  }
  
  return false;
}

/**
 * Medical-specific retry condition that never retries on data validation errors
 */
export function isMedicalRetryableError(error: Error): boolean {
  // Never retry on data validation errors
  if (error.message.includes('validation') ||
      error.message.includes('invalid RUT') ||
      error.message.includes('medical license') ||
      error.message.includes('patient not found')) {
    return false;
  }
  
  // Never retry on auth errors
  if (isAuthError(error)) {
    return false;
  }
  
  // Use general retryable logic for other errors
  return isRetryableError(error);
}

/**
 * Convenience function for medical operations with pre-configured retry
 */
export async function withMedicalRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = 'normal'
): Promise<T> {
  const retryOptions: RetryOptions = {
    ...RETRY_CONFIGS[config],
    retryCondition: isMedicalRetryableError,
    onRetry: (error: Error, attempt: number) => {
      console.warn(`Medical operation retry ${attempt}`, {
        error: error.message,
        retryable: isMedicalRetryableError(error),
        operation: operation.name || 'anonymous',
      });
    },
  };
  
  return withRetry(operation, retryOptions);
}