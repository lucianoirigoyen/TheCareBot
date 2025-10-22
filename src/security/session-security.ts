/**
 * Advanced Session Security for TheCareBot
 * Implements comprehensive session protection with hijacking detection
 * Complies with Chilean medical data protection requirements
 */

import { randomBytes, createHash, createHmac, pbkdf2Sync } from 'crypto';
import { auditLogger } from './audit';
import { medicalEncryption } from './encryption';

// ============================================================================
// SESSION SECURITY CONFIGURATION
// ============================================================================

const SESSION_CONFIG = {
  // Session timeouts (Chilean medical regulation: 20 minutes)
  MAX_SESSION_DURATION_MS: 20 * 60 * 1000, // 20 minutes
  WARNING_BEFORE_EXPIRY_MS: 2 * 60 * 1000, // 2 minutes warning
  IDLE_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes idle timeout
  
  // Security parameters
  SESSION_ID_LENGTH: 32, // 256 bits
  CSRF_TOKEN_LENGTH: 32, // 256 bits
  DEVICE_FINGERPRINT_LENGTH: 16, // 128 bits
  HMAC_SECRET_LENGTH: 64, // 512 bits
  
  // Anti-hijacking measures
  IP_CHANGE_THRESHOLD: 0, // No IP changes allowed for medical sessions
  MAX_CONCURRENT_SESSIONS: 1, // One session per doctor
  SUSPICIOUS_ACTIVITY_THRESHOLD: 5,
  
  // Renewal and rotation
  TOKEN_ROTATION_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  SESSION_RENEWAL_THRESHOLD_MS: 5 * 60 * 1000, // Renew if less than 5 minutes remain
  
  // Storage encryption
  ENCRYPTED_SESSION_STORAGE: true,
  SESSION_KEY_DERIVATION_ITERATIONS: 50000,
} as const;

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

export interface SecureSession {
  readonly sessionId: string;
  readonly doctorId: string;
  readonly createdAt: Date;
  readonly lastActivity: Date;
  readonly expiresAt: Date;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly deviceFingerprint: string;
  readonly csrfToken: string;
  readonly encryptedData?: string;
  readonly status: SessionStatus;
  readonly securityLevel: SecurityLevel;
  readonly sessionFlags: SessionFlag[];
  readonly renewalCount: number;
  readonly lastTokenRotation: Date;
}

export interface SessionSecurityContext {
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly deviceFingerprint?: string;
  readonly geoLocation?: GeoLocation;
  readonly requestFingerprint: string;
  readonly timestamp: Date;
}

export interface SessionValidationResult {
  readonly valid: boolean;
  readonly session?: SecureSession;
  readonly securityWarnings: SecurityWarning[];
  readonly actionRequired: SessionAction[];
  readonly renewalRecommended: boolean;
  readonly riskScore: number;
  readonly validationTimestamp: Date;
}

export interface GeoLocation {
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly vpnDetected?: boolean;
  readonly proxyDetected?: boolean;
}

export interface SecurityWarning {
  readonly type: 'IP_CHANGE' | 'DEVICE_CHANGE' | 'LOCATION_CHANGE' | 'SUSPICIOUS_ACTIVITY' | 'TOKEN_EXPIRED';
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly message: string;
  readonly timestamp: Date;
  readonly recommendedAction: string;
}

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  SUSPICIOUS = 'suspicious',
  LOCKED = 'locked',
  PENDING_RENEWAL = 'pending_renewal',
}

export enum SecurityLevel {
  BASIC = 'basic',
  ENHANCED = 'enhanced',
  HIGH_SECURITY = 'high_security',
  MAXIMUM = 'maximum',
}

export enum SessionFlag {
  IP_LOCKED = 'ip_locked',
  DEVICE_LOCKED = 'device_locked',
  REQUIRES_2FA = 'requires_2fa',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  FORCE_RENEWAL = 'force_renewal',
  ADMIN_OVERRIDE = 'admin_override',
  MOBILE_SESSION = 'mobile_session',
  API_SESSION = 'api_session',
}

export enum SessionAction {
  RENEW_SESSION = 'renew_session',
  ROTATE_TOKENS = 'rotate_tokens',
  REQUIRE_REAUTH = 'require_reauth',
  TERMINATE_SESSION = 'terminate_session',
  ENABLE_2FA = 'enable_2fa',
  LOCK_ACCOUNT = 'lock_account',
}

// ============================================================================
// SESSION STORAGE
// ============================================================================

interface StoredSession {
  session: SecureSession;
  encryptedPayload?: string;
  integrityHash: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

const sessionStore = new Map<string, StoredSession>();
const doctorSessionMap = new Map<string, Set<string>>(); // Doctor ID -> Session IDs
const ipSessionMap = new Map<string, Set<string>>(); // IP Address -> Session IDs

// ============================================================================
// ADVANCED SESSION MANAGER
// ============================================================================

export class AdvancedSessionManager {
  private static instance: AdvancedSessionManager;
  private readonly hmacSecret: Buffer;
  
  private constructor() {
    this.hmacSecret = this.generateHMACSecret();
    this.startSecurityMonitoring();
    this.startCleanupTask();
  }
  
  static getInstance(): AdvancedSessionManager {
    if (!AdvancedSessionManager.instance) {
      AdvancedSessionManager.instance = new AdvancedSessionManager();
    }
    return AdvancedSessionManager.instance;
  }
  
  /**
   * Creates a new secure medical session
   */
  async createSession(
    doctorId: string,
    securityContext: SessionSecurityContext,
    securityLevel: SecurityLevel = SecurityLevel.HIGH_SECURITY
  ): Promise<SecureSession> {
    try {
      // Check for existing sessions and enforce single session policy
      await this.enforceSingleSessionPolicy(doctorId);
      
      // Generate secure session identifiers
      const sessionId = this.generateSecureSessionId();
      const csrfToken = this.generateCSRFToken();
      const deviceFingerprint = this.generateDeviceFingerprint(securityContext);
      
      // Create session object
      const session: SecureSession = {
        sessionId,
        doctorId,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + SESSION_CONFIG.MAX_SESSION_DURATION_MS),
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        deviceFingerprint,
        csrfToken,
        status: SessionStatus.ACTIVE,
        securityLevel,
        sessionFlags: this.determineSessionFlags(securityContext, securityLevel),
        renewalCount: 0,
        lastTokenRotation: new Date(),
      };
      
      // Encrypt session data if required
      if (SESSION_CONFIG.ENCRYPTED_SESSION_STORAGE) {
        session.encryptedData = await this.encryptSessionData(session);
      }
      
      // Store session with integrity protection
      await this.storeSession(session);
      
      // Update tracking maps
      this.updateSessionTracking(session);
      
      // Log session creation
      await auditLogger.logEvent({
        doctorId,
        sessionId,
        action: 'session_start',
        resource: 'medical_session',
        resourceId: sessionId,
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        responseStatus: 200,
        riskLevel: 'medium',
        dataClassification: 'RESTRICTED',
        additionalContext: {
          securityLevel,
          deviceFingerprint,
          sessionFlags: session.sessionFlags,
          geoLocation: securityContext.geoLocation,
        },
      });
      
      console.log(`Created secure session ${sessionId} for doctor ${doctorId}`);
      return session;
      
    } catch (error) {
      console.error('Session creation failed:', error);
      
      await auditLogger.logSecurityViolation(
        doctorId,
        'session_creation_failed',
        `Session creation failed: ${error}`,
        securityContext.ipAddress,
        securityContext.userAgent
      );
      
      throw error;
    }
  }
  
  /**
   * Validates session with comprehensive security checks
   */
  async validateSession(
    sessionId: string,
    securityContext: SessionSecurityContext
  ): Promise<SessionValidationResult> {
    const validationTimestamp = new Date();
    const warnings: SecurityWarning[] = [];
    const actionsRequired: SessionAction[] = [];
    let riskScore = 0;
    
    try {
      // Retrieve session
      const storedSession = sessionStore.get(sessionId);
      if (!storedSession) {
        return {
          valid: false,
          securityWarnings: [{
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            message: 'Session not found',
            timestamp: validationTimestamp,
            recommendedAction: 'Require re-authentication',
          }],
          actionRequired: [SessionAction.REQUIRE_REAUTH],
          renewalRecommended: false,
          riskScore: 100,
          validationTimestamp,
        };
      }
      
      const session = storedSession.session;
      
      // Basic expiration check
      if (validationTimestamp > session.expiresAt) {
        await this.terminateSession(sessionId, 'expired');
        return {
          valid: false,
          securityWarnings: [{
            type: 'TOKEN_EXPIRED',
            severity: 'MEDIUM',
            message: 'Session expired',
            timestamp: validationTimestamp,
            recommendedAction: 'Start new session',
          }],
          actionRequired: [SessionAction.REQUIRE_REAUTH],
          renewalRecommended: false,
          riskScore: 50,
          validationTimestamp,
        };
      }
      
      // Integrity verification
      if (!this.verifySessionIntegrity(storedSession)) {
        await this.terminateSession(sessionId, 'integrity_violation');
        warnings.push({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'CRITICAL',
          message: 'Session integrity check failed',
          timestamp: validationTimestamp,
          recommendedAction: 'Terminate session immediately',
        });
        riskScore += 80;
      }
      
      // IP address validation
      const ipValidation = this.validateIPAddress(session, securityContext);
      if (!ipValidation.valid) {
        warnings.push({
          type: 'IP_CHANGE',
          severity: 'HIGH',
          message: 'IP address changed during session',
          timestamp: validationTimestamp,
          recommendedAction: 'Require re-authentication',
        });
        riskScore += 60;
        actionsRequired.push(SessionAction.REQUIRE_REAUTH);
      }
      
      // Device fingerprint validation
      const deviceValidation = this.validateDeviceFingerprint(session, securityContext);
      if (!deviceValidation.valid) {
        warnings.push({
          type: 'DEVICE_CHANGE',
          severity: 'HIGH',
          message: 'Device characteristics changed',
          timestamp: validationTimestamp,
          recommendedAction: 'Verify device and user identity',
        });
        riskScore += 50;
        actionsRequired.push(SessionAction.REQUIRE_REAUTH);
      }
      
      // Geographic location validation
      if (securityContext.geoLocation) {
        const geoValidation = this.validateGeographicLocation(session, securityContext);
        if (!geoValidation.valid) {
          warnings.push({
            type: 'LOCATION_CHANGE',
            severity: geoValidation.severity,
            message: geoValidation.message,
            timestamp: validationTimestamp,
            recommendedAction: 'Verify user location',
          });
          riskScore += geoValidation.riskIncrease;
        }
      }
      
      // Idle timeout check
      const idleTime = validationTimestamp.getTime() - session.lastActivity.getTime();
      if (idleTime > SESSION_CONFIG.IDLE_TIMEOUT_MS) {
        warnings.push({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          message: 'Session idle timeout exceeded',
          timestamp: validationTimestamp,
          recommendedAction: 'Require activity confirmation',
        });
        riskScore += 20;
        actionsRequired.push(SessionAction.RENEW_SESSION);
      }
      
      // Token rotation check
      const tokenAge = validationTimestamp.getTime() - session.lastTokenRotation.getTime();
      if (tokenAge > SESSION_CONFIG.TOKEN_ROTATION_INTERVAL_MS) {
        actionsRequired.push(SessionAction.ROTATE_TOKENS);
      }
      
      // Session renewal recommendation
      const remainingTime = session.expiresAt.getTime() - validationTimestamp.getTime();
      const renewalRecommended = remainingTime < SESSION_CONFIG.SESSION_RENEWAL_THRESHOLD_MS;
      if (renewalRecommended) {
        actionsRequired.push(SessionAction.RENEW_SESSION);
      }
      
      // Update session activity
      if (riskScore < 60) { // Only update if not too risky
        await this.updateSessionActivity(session, securityContext);
      }
      
      // Log validation
      await this.logSessionValidation(session, securityContext, warnings, riskScore);
      
      const isValid = riskScore < 60 && warnings.every(w => w.severity !== 'CRITICAL');
      
      return {
        valid: isValid,
        session: isValid ? session : undefined,
        securityWarnings: warnings,
        actionRequired: actionsRequired,
        renewalRecommended,
        riskScore,
        validationTimestamp,
      };
      
    } catch (error) {
      console.error('Session validation error:', error);
      
      return {
        valid: false,
        securityWarnings: [{
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'CRITICAL',
          message: 'Session validation failed',
          timestamp: validationTimestamp,
          recommendedAction: 'Terminate session and require re-authentication',
        }],
        actionRequired: [SessionAction.TERMINATE_SESSION],
        renewalRecommended: false,
        riskScore: 100,
        validationTimestamp,
      };
    }
  }
  
  /**
   * Renews session with security checks
   */
  async renewSession(
    sessionId: string,
    securityContext: SessionSecurityContext
  ): Promise<SecureSession> {
    const storedSession = sessionStore.get(sessionId);
    if (!storedSession) {
      throw new Error('Session not found for renewal');
    }
    
    const session = storedSession.session;
    
    // Validate that renewal is allowed
    const validation = await this.validateSession(sessionId, securityContext);
    if (!validation.valid || validation.riskScore > 40) {
      throw new Error('Session cannot be renewed due to security concerns');
    }
    
    // Create renewed session
    const renewedSession: SecureSession = {
      ...session,
      expiresAt: new Date(Date.now() + SESSION_CONFIG.MAX_SESSION_DURATION_MS),
      lastActivity: new Date(),
      renewalCount: session.renewalCount + 1,
      lastTokenRotation: new Date(),
      csrfToken: this.generateCSRFToken(), // New CSRF token
    };
    
    // Re-encrypt session data
    if (SESSION_CONFIG.ENCRYPTED_SESSION_STORAGE) {
      renewedSession.encryptedData = await this.encryptSessionData(renewedSession);
    }
    
    // Update storage
    await this.storeSession(renewedSession);
    
    // Log renewal
    await auditLogger.logEvent({
      doctorId: session.doctorId,
      sessionId,
      action: 'session_renewal',
      resource: 'medical_session',
      resourceId: sessionId,
      ipAddress: securityContext.ipAddress,
      responseStatus: 200,
      riskLevel: 'low',
      dataClassification: 'INTERNAL',
      additionalContext: {
        renewalCount: renewedSession.renewalCount,
        previousExpiration: session.expiresAt.toISOString(),
        newExpiration: renewedSession.expiresAt.toISOString(),
      },
    });
    
    return renewedSession;
  }
  
  /**
   * Rotates session tokens for enhanced security
   */
  async rotateTokens(
    sessionId: string,
    securityContext: SessionSecurityContext
  ): Promise<{ newCsrfToken: string; newSessionId?: string }> {
    const storedSession = sessionStore.get(sessionId);
    if (!storedSession) {
      throw new Error('Session not found for token rotation');
    }
    
    const session = storedSession.session;
    const newCsrfToken = this.generateCSRFToken();
    
    // For high-security sessions, also rotate session ID
    let newSessionId: string | undefined;
    if (session.securityLevel === SecurityLevel.MAXIMUM) {
      newSessionId = this.generateSecureSessionId();
      
      // Update tracking maps
      this.removeSessionFromTracking(session);
      
      const updatedSession: SecureSession = {
        ...session,
        sessionId: newSessionId,
        csrfToken: newCsrfToken,
        lastTokenRotation: new Date(),
        lastActivity: new Date(),
      };
      
      // Remove old session and store new one
      sessionStore.delete(sessionId);
      await this.storeSession(updatedSession);
      this.updateSessionTracking(updatedSession);
    } else {
      // Just update CSRF token
      const updatedSession: SecureSession = {
        ...session,
        csrfToken: newCsrfToken,
        lastTokenRotation: new Date(),
        lastActivity: new Date(),
      };
      
      await this.storeSession(updatedSession);
    }
    
    // Log token rotation
    await auditLogger.logEvent({
      doctorId: session.doctorId,
      sessionId: newSessionId || sessionId,
      action: 'token_rotation',
      resource: 'medical_session',
      resourceId: newSessionId || sessionId,
      ipAddress: securityContext.ipAddress,
      responseStatus: 200,
      riskLevel: 'low',
      dataClassification: 'INTERNAL',
      additionalContext: {
        rotationType: newSessionId ? 'full_rotation' : 'csrf_only',
        securityLevel: session.securityLevel,
      },
    });
    
    return { newCsrfToken, newSessionId };
  }
  
  /**
   * Terminates session with specified reason
   */
  async terminateSession(
    sessionId: string,
    reason: 'logout' | 'expired' | 'security_violation' | 'admin_action' | 'integrity_violation'
  ): Promise<void> {
    const storedSession = sessionStore.get(sessionId);
    if (!storedSession) {
      return; // Already terminated or doesn't exist
    }
    
    const session = storedSession.session;
    
    // Update session status
    const terminatedSession: SecureSession = {
      ...session,
      status: SessionStatus.TERMINATED,
      lastActivity: new Date(),
    };
    
    // Remove from active storage but keep for audit trail
    this.removeSessionFromTracking(session);
    sessionStore.delete(sessionId);
    
    // Log termination
    const riskLevel = reason === 'security_violation' || reason === 'integrity_violation' ? 'high' : 'low';
    
    await auditLogger.logEvent({
      doctorId: session.doctorId,
      sessionId,
      action: 'session_end',
      resource: 'medical_session',
      resourceId: sessionId,
      ipAddress: session.ipAddress,
      responseStatus: 200,
      riskLevel,
      dataClassification: 'INTERNAL',
      additionalContext: {
        terminationReason: reason,
        sessionDuration: Date.now() - session.createdAt.getTime(),
        renewalCount: session.renewalCount,
        isSecurityRelated: reason.includes('security') || reason.includes('violation'),
      },
    });
    
    console.log(`Terminated session ${sessionId} for doctor ${session.doctorId} (reason: ${reason})`);
  }
  
  /**
   * Gets active sessions for a doctor
   */
  getActiveSessions(doctorId: string): SecureSession[] {
    const sessionIds = doctorSessionMap.get(doctorId) || new Set();
    const activeSessions: SecureSession[] = [];
    
    for (const sessionId of sessionIds) {
      const stored = sessionStore.get(sessionId);
      if (stored && stored.session.status === SessionStatus.ACTIVE) {
        activeSessions.push(stored.session);
      }
    }
    
    return activeSessions;
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private generateHMACSecret(): Buffer {
    const secret = process.env.SESSION_HMAC_SECRET;
    if (secret) {
      return Buffer.from(secret, 'base64');
    }
    
    // Generate new secret (in production, store this securely)
    const newSecret = randomBytes(SESSION_CONFIG.HMAC_SECRET_LENGTH);
    console.warn('Generated new HMAC secret - store this securely in production');
    return newSecret;
  }
  
  private generateSecureSessionId(): string {
    return randomBytes(SESSION_CONFIG.SESSION_ID_LENGTH).toString('base64url');
  }
  
  private generateCSRFToken(): string {
    return randomBytes(SESSION_CONFIG.CSRF_TOKEN_LENGTH).toString('base64url');
  }
  
  private generateDeviceFingerprint(context: SessionSecurityContext): string {
    const hash = createHash('sha256');
    hash.update(context.userAgent || '');
    hash.update(context.ipAddress);
    hash.update(context.requestFingerprint);
    return hash.digest('hex').slice(0, SESSION_CONFIG.DEVICE_FINGERPRINT_LENGTH);
  }
  
  private determineSessionFlags(
    context: SessionSecurityContext,
    securityLevel: SecurityLevel
  ): SessionFlag[] {
    const flags: SessionFlag[] = [];
    
    // Always lock IP for medical sessions
    flags.push(SessionFlag.IP_LOCKED);
    
    // High security sessions lock device
    if (securityLevel === SecurityLevel.HIGH_SECURITY || securityLevel === SecurityLevel.MAXIMUM) {
      flags.push(SessionFlag.DEVICE_LOCKED);
    }
    
    // Maximum security requires 2FA
    if (securityLevel === SecurityLevel.MAXIMUM) {
      flags.push(SessionFlag.REQUIRES_2FA);
    }
    
    // Detect mobile sessions
    if (context.userAgent?.toLowerCase().includes('mobile')) {
      flags.push(SessionFlag.MOBILE_SESSION);
    }
    
    return flags;
  }
  
  private async encryptSessionData(session: SecureSession): Promise<string> {
    const sessionData = {
      doctorId: session.doctorId,
      securityLevel: session.securityLevel,
      sessionFlags: session.sessionFlags,
      deviceFingerprint: session.deviceFingerprint,
    };
    
    const encrypted = medicalEncryption.encryptMedicalData(
      JSON.stringify(sessionData),
      {
        purpose: 'session_data',
        sessionId: session.sessionId,
        doctorId: session.doctorId,
      },
      {
        dataType: 'medical_session',
        classification: 'RESTRICTED',
      }
    );
    
    return JSON.stringify(encrypted);
  }
  
  private async storeSession(session: SecureSession): Promise<void> {
    const integrityHash = this.calculateIntegrityHash(session);
    
    const storedSession: StoredSession = {
      session,
      encryptedPayload: session.encryptedData,
      integrityHash,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
    };
    
    sessionStore.set(session.sessionId, storedSession);
  }
  
  private calculateIntegrityHash(session: SecureSession): string {
    const hmac = createHmac('sha256', this.hmacSecret);
    hmac.update(JSON.stringify({
      sessionId: session.sessionId,
      doctorId: session.doctorId,
      createdAt: session.createdAt.toISOString(),
      deviceFingerprint: session.deviceFingerprint,
    }));
    return hmac.digest('hex');
  }
  
  private verifySessionIntegrity(stored: StoredSession): boolean {
    const expectedHash = this.calculateIntegrityHash(stored.session);
    return expectedHash === stored.integrityHash;
  }
  
  private updateSessionTracking(session: SecureSession): void {
    // Update doctor -> sessions mapping
    let doctorSessions = doctorSessionMap.get(session.doctorId);
    if (!doctorSessions) {
      doctorSessions = new Set();
      doctorSessionMap.set(session.doctorId, doctorSessions);
    }
    doctorSessions.add(session.sessionId);
    
    // Update IP -> sessions mapping
    let ipSessions = ipSessionMap.get(session.ipAddress);
    if (!ipSessions) {
      ipSessions = new Set();
      ipSessionMap.set(session.ipAddress, ipSessions);
    }
    ipSessions.add(session.sessionId);
  }
  
  private removeSessionFromTracking(session: SecureSession): void {
    // Remove from doctor mapping
    const doctorSessions = doctorSessionMap.get(session.doctorId);
    if (doctorSessions) {
      doctorSessions.delete(session.sessionId);
      if (doctorSessions.size === 0) {
        doctorSessionMap.delete(session.doctorId);
      }
    }
    
    // Remove from IP mapping
    const ipSessions = ipSessionMap.get(session.ipAddress);
    if (ipSessions) {
      ipSessions.delete(session.sessionId);
      if (ipSessions.size === 0) {
        ipSessionMap.delete(session.ipAddress);
      }
    }
  }
  
  private async enforceSingleSessionPolicy(doctorId: string): Promise<void> {
    const existingSessions = this.getActiveSessions(doctorId);
    
    if (existingSessions.length >= SESSION_CONFIG.MAX_CONCURRENT_SESSIONS) {
      // Terminate existing sessions
      for (const existingSession of existingSessions) {
        await this.terminateSession(existingSession.sessionId, 'admin_action');
      }
      
      await auditLogger.logEvent({
        doctorId,
        action: 'session_limit_enforced',
        resource: 'medical_session',
        responseStatus: 200,
        riskLevel: 'medium',
        dataClassification: 'INTERNAL',
        additionalContext: {
          terminatedSessions: existingSessions.length,
          reason: 'single_session_policy',
        },
      });
    }
  }
  
  private validateIPAddress(
    session: SecureSession,
    context: SessionSecurityContext
  ): { valid: boolean; riskIncrease: number } {
    if (session.sessionFlags.includes(SessionFlag.IP_LOCKED)) {
      const ipMatches = session.ipAddress === context.ipAddress;
      return {
        valid: ipMatches,
        riskIncrease: ipMatches ? 0 : 60,
      };
    }
    
    return { valid: true, riskIncrease: 0 };
  }
  
  private validateDeviceFingerprint(
    session: SecureSession,
    context: SessionSecurityContext
  ): { valid: boolean; riskIncrease: number } {
    if (session.sessionFlags.includes(SessionFlag.DEVICE_LOCKED)) {
      const currentFingerprint = this.generateDeviceFingerprint(context);
      const fingerprintMatches = session.deviceFingerprint === currentFingerprint;
      
      return {
        valid: fingerprintMatches,
        riskIncrease: fingerprintMatches ? 0 : 40,
      };
    }
    
    return { valid: true, riskIncrease: 0 };
  }
  
  private validateGeographicLocation(
    session: SecureSession,
    context: SessionSecurityContext
  ): { valid: boolean; severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string; riskIncrease: number } {
    if (!context.geoLocation) {
      return { valid: true, severity: 'LOW', message: '', riskIncrease: 0 };
    }
    
    // Check for VPN/Proxy usage (high risk for medical data)
    if (context.geoLocation.vpnDetected || context.geoLocation.proxyDetected) {
      return {
        valid: false,
        severity: 'HIGH',
        message: 'VPN or proxy usage detected',
        riskIncrease: 70,
      };
    }
    
    // For now, accept any location (implement geo-fencing in production if needed)
    return { valid: true, severity: 'LOW', message: '', riskIncrease: 0 };
  }
  
  private async updateSessionActivity(
    session: SecureSession,
    context: SessionSecurityContext
  ): Promise<void> {
    const updatedSession: SecureSession = {
      ...session,
      lastActivity: new Date(),
    };
    
    await this.storeSession(updatedSession);
    
    // Update access tracking
    const stored = sessionStore.get(session.sessionId);
    if (stored) {
      stored.lastAccessed = new Date();
      stored.accessCount++;
    }
  }
  
  private async logSessionValidation(
    session: SecureSession,
    context: SessionSecurityContext,
    warnings: SecurityWarning[],
    riskScore: number
  ): Promise<void> {
    if (warnings.length > 0 || riskScore > 30) {
      await auditLogger.logEvent({
        doctorId: session.doctorId,
        sessionId: session.sessionId,
        action: 'session_validation',
        resource: 'medical_session',
        resourceId: session.sessionId,
        ipAddress: context.ipAddress,
        responseStatus: riskScore < 60 ? 200 : 403,
        riskLevel: riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low',
        dataClassification: 'INTERNAL',
        additionalContext: {
          riskScore,
          warningCount: warnings.length,
          warningTypes: warnings.map(w => w.type),
          sessionAge: Date.now() - session.createdAt.getTime(),
        },
      });
    }
  }
  
  private startSecurityMonitoring(): void {
    setInterval(async () => {
      await this.performSecurityScan();
    }, 60000); // Every minute
  }
  
  private async performSecurityScan(): Promise<void> {
    const now = new Date();
    const suspiciousSessions: string[] = [];
    
    for (const [sessionId, stored] of sessionStore.entries()) {
      const session = stored.session;
      
      // Check for expired sessions
      if (now > session.expiresAt) {
        await this.terminateSession(sessionId, 'expired');
        continue;
      }
      
      // Check for idle sessions
      const idleTime = now.getTime() - session.lastActivity.getTime();
      if (idleTime > SESSION_CONFIG.IDLE_TIMEOUT_MS * 2) {
        await this.terminateSession(sessionId, 'security_violation');
        suspiciousSessions.push(sessionId);
        continue;
      }
      
      // Check access patterns
      if (stored.accessCount > 1000) { // Suspicious access count
        suspiciousSessions.push(sessionId);
      }
    }
    
    if (suspiciousSessions.length > 0) {
      console.warn(`Security scan found ${suspiciousSessions.length} suspicious sessions`);
    }
  }
  
  private startCleanupTask(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, stored] of sessionStore.entries()) {
      // Clean up sessions expired for more than 1 hour
      if ((now.getTime() - stored.session.expiresAt.getTime()) > 60 * 60 * 1000) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      const stored = sessionStore.get(sessionId);
      if (stored) {
        this.removeSessionFromTracking(stored.session);
        sessionStore.delete(sessionId);
      }
    });
    
    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const advancedSessionManager = AdvancedSessionManager.getInstance();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates session security context from request
 */
export function createSessionContext(
  ipAddress: string,
  userAgent: string,
  additionalHeaders?: Record<string, string>
): SessionSecurityContext {
  const hash = createHash('sha256');
  hash.update(JSON.stringify({ ipAddress, userAgent, additionalHeaders }));
  
  return {
    ipAddress,
    userAgent,
    requestFingerprint: hash.digest('hex').slice(0, 32),
    timestamp: new Date(),
    // geoLocation would be populated by IP geolocation service
  };
}

/**
 * Validates CSRF token
 */
export function validateCSRFToken(session: SecureSession, providedToken: string): boolean {
  return session.csrfToken === providedToken;
}

/**
 * Checks if session requires renewal
 */
export function sessionRequiresRenewal(session: SecureSession): boolean {
  const remainingTime = session.expiresAt.getTime() - Date.now();
  return remainingTime < SESSION_CONFIG.SESSION_RENEWAL_THRESHOLD_MS;
}

/**
 * Gets session risk assessment
 */
export function assessSessionRisk(session: SecureSession): {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  recommendation: string;
} {
  const factors: string[] = [];
  let riskScore = 0;
  
  // Age factor
  const sessionAge = Date.now() - session.createdAt.getTime();
  if (sessionAge > SESSION_CONFIG.MAX_SESSION_DURATION_MS * 0.8) {
    factors.push('Session approaching expiration');
    riskScore += 20;
  }
  
  // Renewal count factor
  if (session.renewalCount > 3) {
    factors.push('Multiple session renewals');
    riskScore += 15;
  }
  
  // Security flags factor
  if (session.sessionFlags.includes(SessionFlag.SUSPICIOUS_ACTIVITY)) {
    factors.push('Flagged for suspicious activity');
    riskScore += 40;
  }
  
  // Status factor
  if (session.status !== SessionStatus.ACTIVE) {
    factors.push('Session not in active status');
    riskScore += 30;
  }
  
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  let recommendation: string;
  
  if (riskScore >= 70) {
    riskLevel = 'CRITICAL';
    recommendation = 'Terminate session immediately';
  } else if (riskScore >= 50) {
    riskLevel = 'HIGH';
    recommendation = 'Require re-authentication';
  } else if (riskScore >= 25) {
    riskLevel = 'MEDIUM';
    recommendation = 'Monitor closely and consider renewal';
  } else {
    riskLevel = 'LOW';
    recommendation = 'Session appears secure';
  }
  
  return { riskLevel, riskFactors: factors, recommendation };
}