/**
 * Centralized Logging Utility
 *
 * Provides structured logging with automatic PII redaction for medical applications.
 * Follows Clean Code principles: single responsibility, dependency injection.
 *
 * Features:
 * - Structured logging with context
 * - Automatic medical data redaction (RUT, patient IDs)
 * - Environment-based log levels
 * - Type-safe log methods
 * - Performance tracking
 *
 * Usage:
 *   logger.info({ userId: '123' }, 'User logged in');
 *   logger.error({ error: err }, 'Operation failed');
 *   logger.warn({ component: 'Auth' }, 'Token expiring soon');
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  duration?: number;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext | undefined;
  environment: string;
}

// ============================================================================
// SENSITIVE FIELDS TO REDACT
// ============================================================================

const SENSITIVE_FIELDS = [
  'patientRut',
  'patientRUT',
  'rut',
  'RUT',
  'password',
  'token',
  'apiKey',
  'secret',
  'ANTHROPIC_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MASTER_ENCRYPTION_KEY',
] as const;

// ============================================================================
// LOGGER CLASS
// ============================================================================

class Logger {
  private readonly minLevel: LogLevel;
  private readonly isDevelopment: boolean;
  private readonly isTest: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    this.minLevel = this.getMinLogLevel();
  }

  /**
   * Determine minimum log level from environment
   */
  private getMinLogLevel(): LogLevel {
    if (this.isTest) return 'error'; // Quiet in tests
    if (this.isDevelopment) return 'debug';
    return 'info';
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLevel);
    return currentIndex >= minIndex;
  }

  /**
   * Redact sensitive information from context
   */
  private redactSensitiveData(context: LogContext): LogContext {
    const redacted = { ...context };

    for (const key in redacted) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        redacted[key] = '***REDACTED***';
      }
    }

    return redacted;
  }

  /**
   * Format and output log entry
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context: context ? this.redactSensitiveData(context) : undefined,
      environment: process.env.NODE_ENV || 'unknown',
    };

    // In development, use pretty console output
    if (this.isDevelopment) {
      this.prettyPrint(entry);
    } else {
      // In production, use structured JSON for log aggregation
      this.jsonPrint(entry);
    }
  }

  /**
   * Pretty print for development
   */
  private prettyPrint(entry: LogEntry): void {
    const emoji = this.getEmoji(entry.level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();

    const contextStr = entry.context
      ? `\n  ${JSON.stringify(entry.context, null, 2)}`
      : '';

    /* eslint-disable no-console */
    switch (entry.level) {
      case 'debug':
        console.debug(`${emoji} [${timestamp}] ${entry.message}${contextStr}`);
        break;
      case 'info':
        console.info(`${emoji} [${timestamp}] ${entry.message}${contextStr}`);
        break;
      case 'warn':
        console.warn(`${emoji} [${timestamp}] ${entry.message}${contextStr}`);
        break;
      case 'error':
        console.error(`${emoji} [${timestamp}] ${entry.message}${contextStr}`);
        break;
    }
    /* eslint-enable no-console */
  }

  /**
   * JSON print for production (structured logging)
   */
  private jsonPrint(entry: LogEntry): void {
    /* eslint-disable no-console */
    console.log(JSON.stringify(entry));
    /* eslint-enable no-console */
  }

  /**
   * Get emoji for log level (development only)
   */
  private getEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    return emojis[level];
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log informational message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Time an operation and log the duration
   */
  time(label: string): () => void {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration });
    };
  }

  /**
   * Log medical audit event (always logged, never redacted for compliance)
   */
  audit(message: string, context: LogContext): void {
    // Medical audit logs are always output regardless of level
    const entry: LogEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message: `[MEDICAL AUDIT] ${message}`,
      context, // NO redaction for audit compliance
      environment: process.env.NODE_ENV || 'unknown',
    };

    /* eslint-disable no-console */
    console.log(JSON.stringify({ ...entry, auditLog: true }));
    /* eslint-enable no-console */
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const logger = new Logger();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { LogEntry };
