/**
 * Medical Session Timeout Management for TheCareBot
 * Enforces 20-minute medical session timeout as required by Chilean medical regulations
 */

// ============================================================================
// SESSION TIMEOUT CONSTANTS
// ============================================================================

export const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
export const SESSION_WARNING_MS = 2 * 60 * 1000;  // 2 minutes warning before expiration

// ============================================================================
// SESSION STATE INTERFACE
// ============================================================================

export interface MedicalSessionState {
  readonly sessionId: string;
  readonly startTime: Date;
  readonly lastActivity: Date;
  readonly expiresAt: Date;
  readonly remainingTimeMs: number;
  readonly isActive: boolean;
  readonly warningShown: boolean;
  readonly shouldShowWarning: boolean;
  readonly isExpired: boolean;
}

// ============================================================================
// SESSION MANAGER CLASS
// ============================================================================

export class MedicalSessionManager {
  private sessions = new Map<string, MedicalSessionState>();
  private warningCallbacks = new Map<string, () => void>();
  private expirationCallbacks = new Map<string, () => void>();
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Creates a new medical session with mandatory 20-minute timeout
   */
  createSession(sessionId: string, doctorId: string): MedicalSessionState {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);
    
    const sessionState: MedicalSessionState = {
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
  updateActivity(sessionId: string): MedicalSessionState | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.isExpired) {
      return null;
    }

    const now = new Date();
    const updatedSession: MedicalSessionState = {
      ...session,
      lastActivity: now,
      remainingTimeMs: Math.max(0, session.expiresAt.getTime() - now.getTime()),
      isExpired: now >= session.expiresAt
    };

    if (updatedSession.isExpired) {
      this.expireSession(sessionId);
      return { ...updatedSession, isActive: false };
    }

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  /**
   * Gets current session state with real-time calculations
   */
  getSessionState(sessionId: string): MedicalSessionState | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const now = new Date();
    const remainingTimeMs = Math.max(0, session.expiresAt.getTime() - now.getTime());
    const shouldShowWarning = remainingTimeMs <= SESSION_WARNING_MS && remainingTimeMs > 0;
    const isExpired = now >= session.expiresAt;

    const currentState: MedicalSessionState = {
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
  expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const expiredSession: MedicalSessionState = {
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
  onSessionWarning(sessionId: string, callback: () => void): void {
    this.warningCallbacks.set(sessionId, callback);
  }

  onSessionExpiration(sessionId: string, callback: () => void): void {
    this.expirationCallbacks.set(sessionId, callback);
  }

  /**
   * Schedules warning and expiration timers
   */
  private scheduleWarningAndExpiration(sessionId: string): void {
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
  private clearTimers(sessionId: string): void {
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
  destroySession(sessionId: string): void {
    this.clearTimers(sessionId);
    this.sessions.delete(sessionId);
    this.warningCallbacks.delete(sessionId);
    this.expirationCallbacks.delete(sessionId);
  }

  /**
   * Gets all active sessions (for monitoring)
   */
  getActiveSessions(): MedicalSessionState[] {
    const activeSessions: MedicalSessionState[] = [];
    
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats remaining time for display
 */
export const formatRemainingTime = (remainingMs: number): string => {
  if (remainingMs <= 0) return '00:00';
  
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Validates if a session should still be active
 */
export const isSessionValid = (session: MedicalSessionState): boolean => {
  const now = new Date();
  return session.isActive && now < session.expiresAt;
};

/**
 * Calculates remaining time for a session
 */
export const getSessionRemainingTime = (session: MedicalSessionState): number => {
  const now = new Date();
  return Math.max(0, session.expiresAt.getTime() - now.getTime());
};

/**
 * Determines if session warning should be shown
 */
export const shouldShowSessionWarning = (session: MedicalSessionState): boolean => {
  const remainingMs = getSessionRemainingTime(session);
  return remainingMs <= SESSION_WARNING_MS && remainingMs > 0;
};

// ============================================================================
// GLOBAL SESSION MANAGER INSTANCE
// ============================================================================

export const globalSessionManager = new MedicalSessionManager();