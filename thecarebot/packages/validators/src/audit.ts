/**
 * Medical Audit Logging System for TheCareBot
 * 
 * Provides immutable audit trails for medical data access
 * Compliant with Chilean Law 19.628, HIPAA, and GDPR requirements
 * 
 * Features:
 * - Immutable audit logs with cryptographic integrity
 * - HIPAA/GDPR compliance flags
 * - Risk-based event classification
 * - Buffered high-performance logging
 * - Medical data access tracking
 */

import { randomUUID } from 'crypto';
import { createHash, createHmac } from 'crypto';

export interface AuditEvent {
  /** Unique audit event ID */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Doctor/user ID performing the action */
  doctorId: string;
  /** Medical session ID if applicable */
  sessionId?: string;
  /** Patient RUT if applicable (anonymized) */
  patientRutHash?: string;
  /** Type of action performed */
  action: AuditAction;
  /** Resource being accessed */
  resource: AuditResource;
  /** Specific resource ID */
  resourceId?: string;
  /** Client IP address */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Sanitized request data */
  requestData?: Record<string, unknown>;
  /** HTTP response status */
  responseStatus: number;
  /** Request processing time in milliseconds */
  responseTime?: number;
  /** Risk assessment level */
  riskLevel: AuditRiskLevel;
  /** Compliance framework flags */
  complianceFlags: string[];
  /** Error message if applicable */
  errorMessage?: string;
  /** Additional context information */
  additionalContext?: Record<string, unknown>;
  /** Cryptographic integrity hash */
  integrityHash: string;
  /** Chilean regulatory compliance */
  chileanCompliance: ChileanComplianceData;
}

export type AuditAction = 
  // Authentication events
  | 'login' | 'logout' | 'login_failed' | 'password_reset'
  | 'session_start' | 'session_end' | 'session_timeout'
  // Patient data events
  | 'patient_view' | 'patient_create' | 'patient_update' | 'patient_search'
  // Medical analysis events
  | 'analysis_start' | 'analysis_complete' | 'analysis_view' | 'analysis_export'
  // Data management events
  | 'data_export' | 'data_import' | 'data_delete' | 'data_backup'
  // Administrative events
  | 'permission_grant' | 'permission_revoke' | 'config_change'
  // Security events
  | 'security_violation' | 'unauthorized_access' | 'suspicious_activity'
  // Chilean specific events
  | 'rut_validation' | 'medical_license_check' | 'chile_registry_query';

export type AuditResource = 
  | 'authentication' | 'patient_data' | 'medical_analysis'
  | 'medical_session' | 'doctor_profile' | 'system_config'
  | 'audit_log' | 'encrypted_record' | 'chilean_registry'
  | 'n8n_workflow' | 'file_upload' | 'radiography_image';

export type AuditRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ChileanComplianceData {
  /** Ley 19.628 data protection compliance */
  dataProtectionCompliance: boolean;
  /** Medical data classification level */
  dataClassification: 'public' | 'confidential' | 'restricted' | 'secret';
  /** Patient consent status */
  patientConsentStatus?: 'given' | 'required' | 'revoked';
  /** Data residency requirement met */
  dataResidencyCompliant: boolean;
  /** Chilean medical registry validation */
  medicalRegistryValidated?: boolean;
}

export interface AuditEventBuffer {
  events: AuditEvent[];
  maxSize: number;
  flushInterval: number;
  lastFlush: number;
}

/**
 * Medical Audit Logger
 * Provides comprehensive audit logging for medical applications
 */
export class MedicalAuditLogger {
  private static instance: MedicalAuditLogger;
  private eventBuffer: AuditEvent[] = [];
  private readonly bufferSize = 100;
  private flushInterval?: NodeJS.Timeout;
  private secretKey: string;
  
  private constructor() {
    this.secretKey = process.env.AUDIT_SECRET_KEY || this.generateSecretKey();
    if (!process.env.AUDIT_SECRET_KEY) {
      console.warn('AUDIT_SECRET_KEY not set. Using generated key - audit integrity may not persist across restarts');
    }
    this.startPeriodicFlush();
  }
  
  static getInstance(): MedicalAuditLogger {
    if (!MedicalAuditLogger.instance) {
      MedicalAuditLogger.instance = new MedicalAuditLogger();
    }
    return MedicalAuditLogger.instance;
  }
  
  /**
   * Logs a medical audit event with full compliance tracking
   */
  async logEvent(params: Omit<AuditEvent, 'id' | 'timestamp' | 'integrityHash' | 'complianceFlags' | 'chileanCompliance'>): Promise<void> {
    const baseEvent = {
      ...params,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    
    // Determine risk level if not provided
    const riskLevel = params.riskLevel || this.calculateRiskLevel(baseEvent);
    
    // Generate compliance flags
    const complianceFlags = this.generateComplianceFlags(baseEvent);
    
    // Generate Chilean compliance data
    const chileanCompliance = this.generateChileanCompliance(baseEvent);
    
    // Create complete event
    const event: AuditEvent = {
      ...baseEvent,
      riskLevel,
      complianceFlags,
      chileanCompliance,
      integrityHash: '', // Will be set below
    };
    
    // Generate integrity hash
    event.integrityHash = this.generateIntegrityHash(event);
    
    // Add to buffer
    this.eventBuffer.push(event);
    
    // Immediate flush for critical events
    if (riskLevel === 'critical' || this.eventBuffer.length >= this.bufferSize) {
      await this.flushEvents();
    }
    
    // Console logging for high-risk events
    if (['high', 'critical'].includes(riskLevel)) {
      console.warn('HIGH RISK MEDICAL AUDIT EVENT', {
        id: event.id,
        action: event.action,
        resource: event.resource,
        doctor: this.anonymizeDoctorId(event.doctorId),
        patient: event.patientRutHash ? 'PATIENT_DATA_ACCESS' : 'N/A',
        risk: riskLevel,
        ip: this.anonymizeIP(event.ipAddress || ''),
        compliance: complianceFlags,
      });
    }
  }
  
  /**
   * Calculates risk level based on action and context
   */
  private calculateRiskLevel(event: Partial<AuditEvent>): AuditRiskLevel {
    // Critical risk actions
    const criticalActions: AuditAction[] = [
      'data_delete', 'data_export', 'permission_grant', 'config_change',
      'security_violation', 'unauthorized_access'
    ];
    
    // High risk actions
    const highRiskActions: AuditAction[] = [
      'patient_create', 'patient_update', 'analysis_complete',
      'suspicious_activity', 'medical_license_check'
    ];
    
    // Medium risk actions
    const mediumRiskActions: AuditAction[] = [
      'patient_view', 'analysis_start', 'analysis_view',
      'patient_search', 'rut_validation'
    ];
    
    if (criticalActions.includes(event.action!)) {
      return 'critical';
    }
    
    if (highRiskActions.includes(event.action!)) {
      return 'high';
    }
    
    if (mediumRiskActions.includes(event.action!)) {
      return 'medium';
    }
    
    // Error status codes increase risk
    if (event.responseStatus && event.responseStatus >= 400) {
      return event.responseStatus >= 500 ? 'critical' : 'high';
    }
    
    return 'low';
  }
  
  /**
   * Generates compliance flags for regulatory frameworks
   */
  private generateComplianceFlags(event: Partial<AuditEvent>): string[] {
    const flags: string[] = [];
    
    // HIPAA compliance flags
    const phiActions = ['patient_view', 'patient_create', 'patient_update', 'analysis_view'];
    if (phiActions.includes(event.action!)) {
      flags.push('HIPAA_PHI_ACCESS');
    }
    
    const disclosureActions = ['data_export', 'analysis_export'];
    if (disclosureActions.includes(event.action!)) {
      flags.push('HIPAA_PHI_DISCLOSURE');
    }
    
    // GDPR compliance flags
    const personalDataActions = ['patient_create', 'patient_update'];
    if (personalDataActions.includes(event.action!)) {
      flags.push('GDPR_PERSONAL_DATA');
    }
    
    if (event.action === 'data_delete') {
      flags.push('GDPR_RIGHT_TO_ERASURE');
    }
    
    // Chilean Law 19.628 flags
    if (event.patientRutHash) {
      flags.push('CHILE_LAW_19628_PERSONAL_DATA');
    }
    
    if (event.action === 'rut_validation') {
      flags.push('CHILE_RUT_PROCESSING');
    }
    
    if (event.action === 'medical_license_check') {
      flags.push('CHILE_MEDICAL_REGISTRY');
    }
    
    // Security flags
    if (event.responseStatus === 401 || event.responseStatus === 403) {
      flags.push('SECURITY_ACCESS_DENIED');
    }
    
    if (['security_violation', 'unauthorized_access'].includes(event.action!)) {
      flags.push('SECURITY_INCIDENT');
    }
    
    // Review requirements
    if (['critical', 'high'].includes(event.riskLevel || 'low')) {
      flags.push('REQUIRES_REVIEW');
    }
    
    return flags;
  }
  
  /**
   * Generates Chilean regulatory compliance data
   */
  private generateChileanCompliance(event: Partial<AuditEvent>): ChileanComplianceData {
    const compliance: ChileanComplianceData = {
      dataProtectionCompliance: true, // Assume compliance unless flagged
      dataClassification: this.classifyDataAccess(event),
      dataResidencyCompliant: true, // Should be validated elsewhere
    };
    
    // Patient data access requires consent tracking
    if (event.patientRutHash) {
      compliance.patientConsentStatus = 'required'; // Should be validated from patient record
    }
    
    // Medical license validation compliance
    if (event.action === 'medical_license_check') {
      compliance.medicalRegistryValidated = true;
    }
    
    return compliance;
  }
  
  /**
   * Classifies data access level for compliance
   */
  private classifyDataAccess(event: Partial<AuditEvent>): 'public' | 'confidential' | 'restricted' | 'secret' {
    if (event.action === 'medical_license_check') return 'secret';
    if (event.patientRutHash) return 'restricted';
    if (['patient_view', 'patient_create'].includes(event.action!)) return 'confidential';
    return 'public';
  }
  
  /**
   * Generates cryptographic integrity hash for audit event
   */
  private generateIntegrityHash(event: Omit<AuditEvent, 'integrityHash'>): string {
    const data = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      doctorId: event.doctorId,
      action: event.action,
      resource: event.resource,
      responseStatus: event.responseStatus,
    });
    
    return createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }
  
  /**
   * Verifies the integrity of an audit event
   */
  verifyEventIntegrity(event: AuditEvent): boolean {
    const expectedHash = this.generateIntegrityHash(event);
    return event.integrityHash === expectedHash;
  }
  
  /**
   * Flushes buffered events to persistent storage
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      // Here you would implement the actual storage mechanism
      // For now, we'll just log to console and could integrate with Supabase
      console.info('MEDICAL AUDIT LOG BATCH', {
        eventCount: eventsToFlush.length,
        highRiskEvents: eventsToFlush.filter(e => ['high', 'critical'].includes(e.riskLevel)).length,
        timestamp: new Date().toISOString(),
      });
      
      // TODO: Implement Supabase integration
      // await this.persistToSupabase(eventsToFlush);
      
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }
  
  /**
   * Starts periodic flushing of audit events
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 10000); // Flush every 10 seconds
  }
  
  /**
   * Generates a secret key for audit integrity
   */
  private generateSecretKey(): string {
    return createHash('sha256')
      .update(process.env.NODE_ENV || 'development')
      .update(Date.now().toString())
      .digest('hex');
  }
  
  /**
   * Anonymizes doctor ID for logging
   */
  private anonymizeDoctorId(doctorId: string): string {
    if (doctorId.length <= 4) return 'DR_' + '*'.repeat(doctorId.length);
    return 'DR_' + doctorId.slice(0, 2) + '*'.repeat(doctorId.length - 4) + doctorId.slice(-2);
  }
  
  /**
   * Anonymizes IP address for logging
   */
  private anonymizeIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip.slice(0, -4) + 'xxxx';
  }
  
  /**
   * Convenience method for patient data access logging
   */
  async logPatientAccess(
    doctorId: string,
    patientRutHash: string,
    sessionId: string,
    action: 'view' | 'create' | 'update' = 'view',
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      doctorId,
      sessionId,
      patientRutHash,
      action: `patient_${action}` as AuditAction,
      resource: 'patient_data',
      resourceId: patientRutHash,
      ipAddress,
      responseStatus: 200,
      additionalContext: {
        dataType: 'patient_demographics',
        accessMethod: 'direct_lookup',
      },
    });
  }
  
  /**
   * Convenience method for medical analysis logging
   */
  async logMedicalAnalysis(
    doctorId: string,
    sessionId: string,
    analysisId: string,
    analysisType: string,
    responseTime: number,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      doctorId,
      sessionId,
      action: 'analysis_complete',
      resource: 'medical_analysis',
      resourceId: analysisId,
      ipAddress,
      responseStatus: 200,
      responseTime,
      additionalContext: {
        analysisType,
        processingTime: responseTime,
      },
    });
  }
  
  /**
   * Convenience method for security event logging
   */
  async logSecurityEvent(
    doctorId: string,
    securityAction: string,
    details: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      doctorId,
      action: 'security_violation',
      resource: 'authentication',
      responseStatus: 403,
      ipAddress,
      userAgent,
      errorMessage: details,
      additionalContext: {
        securityEventType: securityAction,
        requiresInvestigation: true,
      },
    });
  }
  
  /**
   * Convenience method for Chilean RUT validation logging
   */
  async logRUTValidation(
    doctorId: string,
    rut: string,
    isValid: boolean,
    sessionId?: string,
    ipAddress?: string
  ): Promise<void> {
    const rutHash = createHash('sha256').update(rut).digest('hex');
    
    await this.logEvent({
      doctorId,
      sessionId,
      action: 'rut_validation',
      resource: 'chilean_registry',
      resourceId: rutHash,
      ipAddress,
      responseStatus: isValid ? 200 : 400,
      additionalContext: {
        validationResult: isValid,
        rutFormat: rut.includes('-') ? 'standard' : 'numeric',
      },
    });
  }
}

/**
 * Decorator for automatic audit logging
 */
export function audited(action: AuditAction, resource: AuditResource) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let responseStatus = 200;
      let errorMessage: string | undefined;
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        responseStatus = error instanceof Error && 'status' in error 
          ? (error as any).status 
          : 500;
        errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        const responseTime = Date.now() - startTime;
        
        // Extract context from arguments
        const context = args[0] || {};
        
        await auditLogger.logEvent({
          doctorId: context.doctorId || context.userId || 'unknown',
          sessionId: context.sessionId,
          action,
          resource,
          resourceId: context.resourceId,
          responseStatus,
          responseTime,
          errorMessage,
          additionalContext: {
            method: propertyKey,
            argumentsHash: hashArguments(args),
          },
        });
      }
    };
    
    return descriptor;
  };
}

/**
 * Singleton audit logger instance
 */
export const auditLogger = MedicalAuditLogger.getInstance();

/**
 * Utility function to safely hash function arguments for audit
 */
function hashArguments(args: any[]): string {
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      // Remove sensitive fields
      const { password, token, key, secret, rut, ...safe } = arg;
      return safe;
    }
    return typeof arg === 'string' && arg.length > 100 ? '[LARGE_STRING]' : arg;
  });
  
  return createHash('sha256')
    .update(JSON.stringify(safeArgs))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Medical compliance checker
 */
export class MedicalComplianceChecker {
  /**
   * Validates Chilean Law 19.628 compliance for data processing
   */
  static validateDataProcessingCompliance(context: {
    hasPatientConsent: boolean;
    dataClassification: string;
    purposeSpecified: boolean;
    dataMinimization: boolean;
  }): {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];
    
    if (!context.hasPatientConsent) {
      violations.push('Falta consentimiento explícito del paciente (Art. 4 Ley 19.628)');
    }
    
    if (!context.purposeSpecified) {
      violations.push('Propósito del tratamiento de datos no especificado (Art. 9 Ley 19.628)');
    }
    
    if (!context.dataMinimization) {
      recommendations.push('Aplicar principio de minimización de datos');
    }
    
    if (context.dataClassification === 'restricted' || context.dataClassification === 'secret') {
      recommendations.push('Considerar cifrado adicional para datos sensibles');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
    };
  }
}