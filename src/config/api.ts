/**
 * API Configuration
 *
 * Centralized API endpoints and configuration
 * NO hardcoded URLs - all from environment variables
 *
 * IMPORTANT: Some values (serviceRoleKey, apiKey) are server-only
 * and will be undefined on the client side
 */

import { env } from './env';

// Check if we're on the server
const isServer = typeof window === 'undefined';

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_CONFIG = {
  python: {
    baseUrl: env.NEXT_PUBLIC_PYTHON_API_URL,
    timeout: 30000, // 30 seconds
    endpoints: {
      generateInvoice: '/api/invoke/generate-invoice',
      generateInvoicePDF: '/api/invoke/generate-invoice-pdf',
      sendInvoiceEmail: '/api/invoke/send-invoice-email',
      autofill: '/api/invoke/autofill',
      learn: '/api/invoke/learn',
    },
  },
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Server-only: will be undefined on client
    serviceRoleKey: isServer ? (env as unknown as { SUPABASE_SERVICE_ROLE_KEY: string }).SUPABASE_SERVICE_ROLE_KEY : undefined,
  },
  anthropic: {
    // Server-only: will be undefined on client
    apiKey: isServer ? (env as unknown as { ANTHROPIC_API_KEY: string }).ANTHROPIC_API_KEY : undefined,
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type APIConfig = typeof API_CONFIG;
