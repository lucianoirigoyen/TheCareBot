/**
 * Environment Variables Validation
 *
 * CRITICAL: Validates all required environment variables at startup
 * Prevents runtime errors from missing configuration
 *
 * Usage:
 *   import { env } from '@/config/env';
 *   const apiKey = env.ANTHROPIC_API_KEY;
 */

import { z } from 'zod';

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

// Check if we're running on the server
const isServer = typeof window === 'undefined';

// Client-side schema (only NEXT_PUBLIC_ variables)
// Note: On client, Next.js replaces process.env at build time
const clientEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(''),
  NEXT_PUBLIC_PYTHON_API_URL: z.string().default('http://localhost:8000'),
});

// Server-side schema (all variables including secrets)
const serverEnvSchema = clientEnvSchema.extend({
  ANTHROPIC_API_KEY: z.string()
    .min(1, 'ANTHROPIC_API_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  MASTER_ENCRYPTION_KEY: z.string()
    .min(1, 'MASTER_ENCRYPTION_KEY is required'),
  AUDIT_SECRET_KEY: z.string()
    .min(1, 'AUDIT_SECRET_KEY is required'),
});

// Use appropriate schema based on environment
const envSchema = isServer ? serverEnvSchema : clientEnvSchema;

// ============================================================================
// VALIDATION
// ============================================================================

function validateEnv() {
  // Diagnostic: Log what we're working with
  if (isServer) {
    console.log('🔧 Server-side environment validation');
  } else {
    console.log('🌐 Client-side environment validation');
    console.log('📋 Available env keys:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
  }

  // On client, validation is relaxed (uses defaults)
  // On server, strict validation is enforced
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(`❌ Invalid environment variables (${isServer ? 'server' : 'client'}):`);
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));

    // Only throw on server, on client just warn and use defaults
    if (isServer) {
      throw new Error(
        'Invalid environment variables. Check .env file and compare with .env.example'
      );
    } else {
      console.warn('⚠️  Client-side environment validation failed, using defaults');
      // Return safe defaults for client
      return {
        NODE_ENV: (process.env['NODE_ENV'] as 'development' | 'production' | 'test') || 'development',
        NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'] || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '',
        NEXT_PUBLIC_PYTHON_API_URL: process.env['NEXT_PUBLIC_PYTHON_API_URL'] || 'http://localhost:8000',
      } as z.infer<typeof clientEnvSchema>;
    }
  }

  console.log(`✅ Environment validation passed (${isServer ? 'server' : 'client'})`);


  // Server-side checks for placeholder values in development
  if (isServer && parsed.data.NODE_ENV === 'development') {
    const serverData = parsed.data as z.infer<typeof serverEnvSchema>;
    const hasPlaceholders =
      serverData.ANTHROPIC_API_KEY?.includes('YOUR_KEY_HERE') ||
      serverData.NEXT_PUBLIC_SUPABASE_URL?.includes('YOUR_PROJECT') ||
      serverData.MASTER_ENCRYPTION_KEY?.includes('YOUR_MASTER');

    if (hasPlaceholders) {
      console.warn('⚠️  WARNING: Using placeholder environment variables');
      console.warn('⚠️  Copy .env.example to .env and fill in your actual values');
      console.warn('⚠️  Some features may not work correctly');
    }
  }

  // Production-specific validations (server-side only)
  if (isServer && parsed.data.NODE_ENV === 'production') {
    // Type assertion for server-side data
    const serverData = parsed.data as z.infer<typeof serverEnvSchema>;

    // Validate API key format in production
    if (!serverData.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      throw new Error('ANTHROPIC_API_KEY must start with sk-ant- in production');
    }

    // Validate Supabase URL format in production
    try {
      new URL(serverData.NEXT_PUBLIC_SUPABASE_URL);
      if (!serverData.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL in production');
      }
    } catch {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL in production');
    }

    // Validate Python API URL
    try {
      new URL(serverData.NEXT_PUBLIC_PYTHON_API_URL);
    } catch {
      throw new Error('NEXT_PUBLIC_PYTHON_API_URL must be a valid URL in production');
    }

    // Validate key lengths in production
    if (serverData.MASTER_ENCRYPTION_KEY.length < 32) {
      throw new Error('MASTER_ENCRYPTION_KEY must be at least 32 characters in production');
    }

    if (serverData.AUDIT_SECRET_KEY.length < 32) {
      throw new Error('AUDIT_SECRET_KEY must be at least 32 characters in production');
    }

    // Ensure no demo/test keys in production
    if (
      serverData.MASTER_ENCRYPTION_KEY.toLowerCase().includes('demo') ||
      serverData.MASTER_ENCRYPTION_KEY.toLowerCase().includes('test') ||
      serverData.MASTER_ENCRYPTION_KEY.includes('YOUR_') ||
      serverData.AUDIT_SECRET_KEY.toLowerCase().includes('demo') ||
      serverData.AUDIT_SECRET_KEY.toLowerCase().includes('test') ||
      serverData.AUDIT_SECRET_KEY.includes('YOUR_')
    ) {
      throw new Error(
        'CRITICAL: Demo/test encryption keys are not allowed in production environment'
      );
    }

    // Ensure HTTPS in production
    if (!serverData.NEXT_PUBLIC_PYTHON_API_URL.startsWith('https://')) {
      console.warn('⚠️  WARNING: PYTHON_API_URL should use HTTPS in production');
    }
  }

  return parsed.data;
}

// ============================================================================
// EXPORT
// ============================================================================

export const env = validateEnv();

// Type-safe environment variables (use server schema for complete type safety)
export type Env = z.infer<typeof serverEnvSchema>;
