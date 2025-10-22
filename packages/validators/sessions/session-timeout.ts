/**
 * Medical Session Timeout Management
 * Enforces 20-minute medical session timeout as required by Chilean medical regulations
 * 
 * CRITICAL: Session timeout is legally mandated and cannot be extended beyond 20 minutes
 * Visual warnings must be shown 2 minutes before expiration
 */

import { z } from 'zod';
import { SessionId, DoctorId, MedicalSession } from '../../types/medical/core';

// ============================================================================
// SESSION TIMEOUT CONSTANTS
// ============================================================================

export const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
export const SESSION_WARNING_MS = 2 * 60 * 1000;  // 2 minutes warning before expiration
export const SESSION_EXTENSION_MS = 0; // NO extensions allowed per Chilean law

// ============================================================================
// SESSION STATE MANAGEMENT
// ============================================================================

export interface SessionTimeoutState {
  readonly sessionId: SessionId;
  readonly startTime: Date;
  readonly lastActivity: Date;
  readonly expiresAt: Date;
  readonly remainingTimeMs: number;
  readonly isActive: boolean;
  readonly warningShown: boolean;
  readonly shouldShowWarning: boolean;
  readonly isExpired: boolean;
}

export class MedicalSessionManager {
  private sessions = new Map<SessionId, SessionTimeoutState>();
  private warningCallbacks = new Map<SessionId, () => void>();
  private expirationCallbacks = new Map<SessionId, () => void>();
  private timers = new Map<SessionId, NodeJS.Timeout>();

  /**
   * Creates a new medical session with mandatory 20-minute timeout
   */
  createSession(sessionId: SessionId, doctorId: DoctorId): SessionTimeoutState {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);
    
    const sessionState: SessionTimeoutState = {
      sessionId,
      startTime: now,
      lastActivity: now,
      expiresAt,
      remainingTimeMs: SESSION_TIMEOUT_MS,
      isActive: true,
      warningShown: false,
      shouldShowWarning: false,
      isExpired: false
    };

    this.sessions.set(sessionId, sessionState);
    this.scheduleWarningAndExpiration(sessionId);
    
    return sessionState;
  }

  /**
   * Updates last activity time but DOES NOT extend expiration
   * Chilean medical law requires fixed 20-minute sessions
   */
  updateActivity(sessionId: SessionId): SessionTimeoutState | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.isExpired) {
      return null;
    }

    const now = new Date();
    const updatedSession: SessionTimeoutState = {
      ...session,
      lastActivity: now,
      remainingTimeMs: Math.max(0, session.expiresAt.getTime() - now.getTime()),
      isExpired: now >= session.expiresAt
    };

    if (updatedSession.isExpired) {
      updatedSession.isActive = false;
      this.expireSession(sessionId);
    }

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  /**
   * Gets current session state with real-time calculations
   */
  getSessionState(sessionId: SessionId): SessionTimeoutState | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const now = new Date();
    const remainingTimeMs = Math.max(0, session.expiresAt.getTime() - now.getTime());
    const shouldShowWarning = remainingTimeMs <= SESSION_WARNING_MS && remainingTimeMs > 0;
    const isExpired = now >= session.expiresAt;

    const currentState: SessionTimeoutState = {
      ...session,
      remainingTimeMs,
      shouldShowWarning,
      isExpired,
      isActive: !isExpired && session.isActive
    };

    this.sessions.set(sessionId, currentState);
    
    if (isExpired && session.isActive) {
      this.expireSession(sessionId);
    }

    return currentState;
  }

  /**
   * Manually expires a session
   */
  expireSession(sessionId: SessionId): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const expiredSession: SessionTimeoutState = {
        ...session,
        isActive: false,
        isExpired: true,
        remainingTimeMs: 0
      };
      
      this.sessions.set(sessionId, expiredSession);
      this.clearTimers(sessionId);
      
      const expirationCallback = this.expirationCallbacks.get(sessionId);
      if (expirationCallback) {
        expirationCallback();
      }
    }
  }

  /**
   * Registers callbacks for warning and expiration events
   */
  onSessionWarning(sessionId: SessionId, callback: () => void): void {
    this.warningCallbacks.set(sessionId, callback);
  }

  onSessionExpiration(sessionId: SessionId, callback: () => void): void {
    this.expirationCallbacks.set(sessionId, callback);
  }

  /**
   * Schedules warning and expiration timers
   */
  private scheduleWarningAndExpiration(sessionId: SessionId): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Schedule 2-minute warning
    const warningTimeout = setTimeout(() => {
      const warningCallback = this.warningCallbacks.get(sessionId);
      if (warningCallback) {
        warningCallback();
      }
      
      const currentSession = this.sessions.get(sessionId);
      if (currentSession) {
        this.sessions.set(sessionId, {
          ...currentSession,
          warningShown: true
        });
      }
    }, SESSION_TIMEOUT_MS - SESSION_WARNING_MS);

    // Schedule expiration
    const expirationTimeout = setTimeout(() => {
      this.expireSession(sessionId);
    }, SESSION_TIMEOUT_MS);

    this.timers.set(sessionId, warningTimeout);
    this.timers.set(`${sessionId}_expiration`, expirationTimeout);
  }

  /**
   * Clears all timers for a session
   */
  private clearTimers(sessionId: SessionId): void {
    const warningTimer = this.timers.get(sessionId);
    const expirationTimer = this.timers.get(`${sessionId}_expiration`);
    
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.timers.delete(sessionId);
    }
    
    if (expirationTimer) {
      clearTimeout(expirationTimer);
      this.timers.delete(`${sessionId}_expiration`);
    }
  }

  /**
   * Cleanup session data
   */
  destroySession(sessionId: SessionId): void {
    this.clearTimers(sessionId);
    this.sessions.delete(sessionId);
    this.warningCallbacks.delete(sessionId);
    this.expirationCallbacks.delete(sessionId);
  }

  /**
   * Gets all active sessions (for monitoring)
   */
  getActiveSessions(): SessionTimeoutState[] {
    const activeSessions: SessionTimeoutState[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const currentState = this.getSessionState(sessionId);
      if (currentState && currentState.isActive) {
        activeSessions.push(currentState);
      }
    }
    
    return activeSessions;
  }
}

// ============================================================================
// SESSION VALIDATION UTILITIES
// ============================================================================

/**
 * Validates if a session should still be active
 */
export const isSessionValid = (session: MedicalSession): boolean => {
  const now = new Date();
  return session.isActive && now < session.expiresAt;
};

/**
 * Calculates remaining time for a session
 */
export const getSessionRemainingTime = (session: MedicalSession): number => {
  const now = new Date();
  return Math.max(0, session.expiresAt.getTime() - now.getTime());
};

/**
 * Determines if session warning should be shown
 */
export const shouldShowSessionWarning = (session: MedicalSession): boolean => {
  const remainingMs = getSessionRemainingTime(session);
  return remainingMs <= SESSION_WARNING_MS && remainingMs > 0;
};

/**
 * Formats remaining time for display
 */
export const formatRemainingTime = (remainingMs: number): string => {
  if (remainingMs <= 0) return '00:00';
  
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// ============================================================================
// ZOD SCHEMAS FOR SESSION VALIDATION
// ============================================================================

export const SessionTimeoutConfigSchema = z.object({
  timeoutMs: z.number().positive().max(SESSION_TIMEOUT_MS),
  warningMs: z.number().positive().max(SESSION_WARNING_MS),
  extensionMs: z.literal(0) // No extensions allowed
});

export const SessionStateSchema = z.object({
  sessionId: z.string().uuid(),
  startTime: z.date(),
  lastActivity: z.date(),
  expiresAt: z.date(),
  remainingTimeMs: z.number().min(0),
  isActive: z.boolean(),
  warningShown: z.boolean(),
  shouldShowWarning: z.boolean(),
  isExpired: z.boolean()
});

// ============================================================================
// SESSION AUDIT EVENTS
// ============================================================================

export interface SessionAuditEvent {
  readonly eventType: 'created' | 'activity_updated' | 'warning_shown' | 'expired' | 'destroyed';
  readonly sessionId: SessionId;
  readonly doctorId: DoctorId;
  readonly timestamp: Date;
  readonly remainingTimeMs: number;
  readonly ipAddress: string;
  readonly userAgent: string;
}

export const createSessionAuditEvent = (
  eventType: SessionAuditEvent['eventType'],
  sessionId: SessionId,
  doctorId: DoctorId,
  remainingTimeMs: number,
  ipAddress: string,
  userAgent: string
): SessionAuditEvent => ({
  eventType,
  sessionId,
  doctorId,
  timestamp: new Date(),
  remainingTimeMs,
  ipAddress,
  userAgent
});

// ============================================================================
// GLOBAL SESSION MANAGER INSTANCE
// ============================================================================

export const globalSessionManager = new MedicalSessionManager();