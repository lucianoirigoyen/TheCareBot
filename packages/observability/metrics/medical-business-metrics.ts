/**
 * Medical Business Metrics for TheCareBot
 * Tracks medical analysis performance, compliance, and quality metrics
 * 
 * CRITICAL: Medical metrics for compliance monitoring and system performance
 * All metrics must support Chilean medical regulatory reporting
 */

import { z } from 'zod';
import { 
  DoctorId, 
  SessionId, 
  AnalysisId,
  MedicalWorkflowIntention,
  ConfidenceLevel,
  ChileanMedicalSpecialty 
} from '../../types/medical/core';

// ============================================================================
// MEDICAL BUSINESS METRICS INTERFACE
// ============================================================================

export interface MedicalBusinessMetrics {
  readonly timestamp: Date;
  readonly analysisAccuracy: number;           // % of analyses confirmed by doctors
  readonly averageAnalysisTime: number;       // seconds to complete medical analysis
  readonly confidenceDistribution: ConfidenceDistribution;
  readonly sessionMetrics: SessionMetrics;
  readonly workflowMetrics: WorkflowMetrics;
  readonly complianceMetrics: ComplianceMetrics;
  readonly performanceMetrics: PerformanceMetrics;
  readonly qualityMetrics: QualityMetrics;
}

export interface ConfidenceDistribution {
  readonly low: number;      // <0.7 (requires manual review)
  readonly medium: number;   // 0.7-0.9
  readonly high: number;     // >0.9
  readonly totalAnalyses: number;
  readonly manualReviewRate: number; // % requiring manual review
}

export interface SessionMetrics {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly averageSessionDuration: number;    // minutes
  readonly sessionTimeoutViolations: number; // 20-minute timeout breaches
  readonly demoModeActivations: number;       // fallback mode usage
  readonly sessionsBySpecialty: Record<ChileanMedicalSpecialty, number>;
}

export interface WorkflowMetrics {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly averageExecutionTime: number;     // milliseconds
  readonly circuitBreakerActivations: number;
  readonly fallbackActivations: number;
  readonly executionsByIntention: Record<MedicalWorkflowIntention, WorkflowIntentionMetrics>;
}

export interface WorkflowIntentionMetrics {
  readonly totalExecutions: number;
  readonly successRate: number;              // 0.0-1.0
  readonly averageExecutionTime: number;
  readonly averageConfidenceScore: number;
  readonly manualReviewRate: number;
  readonly errorRate: number;
}

export interface ComplianceMetrics {
  readonly rutValidationSuccessRate: number;    // % of successful RUT validations
  readonly medicalLicenseVerifications: number; // Number of license checks
  readonly auditLogEntries: number;             // Total compliance log entries
  readonly dataAccessViolations: number;       // Unauthorized access attempts
  readonly sessionTimeoutCompliance: number;   // % of sessions properly timed out
  readonly encryptionCompliance: number;       // % of data properly encrypted
}

export interface PerformanceMetrics {
  readonly databaseQueryTime: number;        // average ms for patient lookup
  readonly fileUploadTime: number;          // average ms for file processing
  readonly aiAnalysisTime: number;          // average ms for AI analysis
  readonly n8nWorkflowAvailability: number; // % uptime
  readonly mobileSyncSuccessRate: number;   // % successful mobile syncs
  readonly systemResponseTime: number;      // average response time
}

export interface QualityMetrics {
  readonly dataQualityScore: number;         // 0.0-1.0 overall data quality
  readonly analysisAccuracyRate: number;    // % of accurate AI analyses
  readonly falsePositiveRate: number;       // % of incorrect positive findings
  readonly falseNegativeRate: number;       // % of missed findings
  readonly doctorSatisfactionScore: number; // User satisfaction rating
  readonly systemReliabilityScore: number; // Overall system reliability
}

// ============================================================================
// MEDICAL SLO/SLI DEFINITIONS
// ============================================================================

export interface MedicalSLO {
  readonly sloName: string;
  readonly sloDescription: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly compliancePercentage: number;
  readonly measurementPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly';
  readonly alertThreshold: number;
  readonly status: 'healthy' | 'warning' | 'critical';
}

export const MEDICAL_SLO_DEFINITIONS: Record<string, MedicalSLO> = {
  ANALYSIS_COMPLETION_TIME: {
    sloName: 'Medical Analysis Completion Time',
    sloDescription: '95% of medical analyses complete within 30 seconds',
    targetValue: 30000, // 30 seconds in milliseconds
    currentValue: 0,    // Updated by metrics collector
    compliancePercentage: 95,
    measurementPeriod: 'hourly',
    alertThreshold: 90,
    status: 'healthy'
  },
  DATABASE_QUERY_TIME: {
    sloName: 'Patient Lookup Time',
    sloDescription: '99% of patient lookups complete within 3 seconds',
    targetValue: 3000,  // 3 seconds in milliseconds
    currentValue: 0,
    compliancePercentage: 99,
    measurementPeriod: 'hourly',
    alertThreshold: 95,
    status: 'healthy'
  },
  SESSION_TIMEOUT_ACCURACY: {
    sloName: 'Session Timeout Accuracy',
    sloDescription: '100% of sessions timeout at exactly 20 minutes',
    targetValue: 1200000, // 20 minutes in milliseconds
    currentValue: 0,
    compliancePercentage: 100,
    measurementPeriod: 'daily',
    alertThreshold: 99.9,
    status: 'healthy'
  },
  N8N_WORKFLOW_AVAILABILITY: {
    sloName: 'n8n Workflow Availability',
    sloDescription: '99.9% uptime for medical workflow execution',
    targetValue: 99.9,
    currentValue: 0,
    compliancePercentage: 99.9,
    measurementPeriod: 'daily',
    alertThreshold: 99.5,
    status: 'healthy'
  },
  MOBILE_SYNC_SUCCESS: {
    sloName: 'Mobile Sync Success Rate',
    sloDescription: '95% of mobile syncs succeed on first attempt',
    targetValue: 95,
    currentValue: 0,
    compliancePercentage: 95,
    measurementPeriod: 'hourly',
    alertThreshold: 90,
    status: 'healthy'
  }
};

// ============================================================================
// MEDICAL ALERT DEFINITIONS
// ============================================================================

export interface MedicalAlert {
  readonly alertId: string;
  readonly alertType: MedicalAlertType;
  readonly severity: 'info' | 'warning' | 'critical' | 'emergency';
  readonly title: string;
  readonly description: string;
  readonly affectedMetric: string;
  readonly currentValue: number;
  readonly thresholdValue: number;
  readonly sessionId?: SessionId;
  readonly doctorId?: DoctorId;
  readonly analysisId?: AnalysisId;
  readonly timestamp: Date;
  readonly isActive: boolean;
  readonly requiresImmedateAction: boolean;
}

export enum MedicalAlertType {
  SESSION_TIMEOUT_VIOLATION = 'session_timeout_violation',
  DATA_ACCESS_VIOLATION = 'data_access_violation',
  HIGH_MANUAL_REVIEW_RATE = 'high_manual_review_rate',
  WORKFLOW_FAILURE_SPIKE = 'workflow_failure_spike',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SECURITY_BREACH = 'security_breach',
  SYSTEM_UNAVAILABILITY = 'system_unavailability'
}

// ============================================================================
// METRICS COLLECTION INTERFACE
// ============================================================================

export interface MedicalMetricsCollector {
  recordAnalysisCompletion(
    analysisId: AnalysisId,
    sessionId: SessionId,
    intention: MedicalWorkflowIntention,
    confidenceScore: number,
    processingTimeMs: number,
    requiresManualReview: boolean
  ): void;

  recordSessionActivity(
    sessionId: SessionId,
    doctorId: DoctorId,
    activityType: 'created' | 'activity' | 'warning' | 'expired',
    remainingTimeMs: number
  ): void;

  recordWorkflowExecution(
    workflowId: string,
    intention: MedicalWorkflowIntention,
    status: 'success' | 'failure' | 'timeout',
    executionTimeMs: number,
    circuitBreakerTriggered: boolean,
    fallbackActivated: boolean
  ): void;

  recordComplianceEvent(
    eventType: 'rut_validation' | 'license_verification' | 'data_access' | 'audit_log',
    success: boolean,
    doctorId: DoctorId,
    details: Record<string, unknown>
  ): void;

  recordPerformanceMetric(
    metricType: 'db_query' | 'file_upload' | 'ai_analysis' | 'mobile_sync',
    durationMs: number,
    success: boolean
  ): void;

  recordQualityMetric(
    analysisId: AnalysisId,
    accuracyScore: number,
    doctorFeedback: 'accurate' | 'inaccurate' | 'partial',
    improvementSuggestions?: string[]
  ): void;

  generateMetricsReport(
    startDate: Date,
    endDate: Date,
    includeCompliance: boolean
  ): Promise<MedicalBusinessMetrics>;

  checkSLOCompliance(): Promise<Record<string, MedicalSLO>>;

  generateAlerts(): Promise<MedicalAlert[]>;
}

// ============================================================================
// MEDICAL DASHBOARD METRICS
// ============================================================================

export interface MedicalDashboardMetrics {
  readonly currentActiveSessions: number;
  readonly todaysAnalyses: number;
  readonly averageConfidenceScore: number;
  readonly manualReviewQueue: number;
  readonly systemHealthScore: number;
  readonly complianceScore: number;
  readonly topAlerts: MedicalAlert[];
  readonly recentAnalyses: RecentAnalysisMetric[];
  readonly performanceTrends: PerformanceTrend[];
}

export interface RecentAnalysisMetric {
  readonly analysisId: AnalysisId;
  readonly intention: MedicalWorkflowIntention;
  readonly confidenceScore: number;
  readonly processingTime: number;
  readonly requiresReview: boolean;
  readonly timestamp: Date;
}

export interface PerformanceTrend {
  readonly metricName: string;
  readonly currentValue: number;
  readonly previousValue: number;
  readonly trendDirection: 'up' | 'down' | 'stable';
  readonly changePercentage: number;
}

// ============================================================================
// CHILEAN COMPLIANCE REPORTING
// ============================================================================

export interface ChileanComplianceReport {
  readonly reportId: string;
  readonly reportPeriod: {
    readonly startDate: Date;
    readonly endDate: Date;
  };
  readonly medicalDataAccess: {
    readonly totalAccess: number;
    readonly unauthorizedAttempts: number;
    readonly auditLogEntries: number;
  };
  readonly sessionCompliance: {
    readonly totalSessions: number;
    readonly properTimeouts: number;
    readonly timeoutViolations: number;
    readonly complianceRate: number;
  };
  readonly dataProtection: {
    readonly encryptedDataPercentage: number;
    readonly rutHashingCompliance: number;
    readonly licenseValidationRate: number;
  };
  readonly medicalAnalyses: {
    readonly totalAnalyses: number;
    readonly manualReviewRate: number;
    readonly averageConfidence: number;
    readonly qualityScore: number;
  };
  readonly systemReliability: {
    readonly uptime: number;
    readonly errorRate: number;
    readonly performanceScore: number;
  };
  readonly regulatoryCompliance: 'compliant' | 'non_compliant' | 'under_review';
  readonly generatedAt: Date;
  readonly generatedBy: DoctorId;
}

// ============================================================================
// ZOD SCHEMAS FOR METRICS VALIDATION
// ============================================================================

export const MedicalBusinessMetricsSchema = z.object({
  timestamp: z.date(),
  analysisAccuracy: z.number().min(0).max(100),
  averageAnalysisTime: z.number().positive(),
  confidenceDistribution: z.object({
    low: z.number().min(0),
    medium: z.number().min(0),
    high: z.number().min(0),
    totalAnalyses: z.number().min(0),
    manualReviewRate: z.number().min(0).max(100)
  }),
  sessionMetrics: z.object({
    totalSessions: z.number().min(0),
    activeSessions: z.number().min(0),
    averageSessionDuration: z.number().positive(),
    sessionTimeoutViolations: z.number().min(0),
    demoModeActivations: z.number().min(0)
  })
});

export const MedicalAlertSchema = z.object({
  alertId: z.string().uuid(),
  alertType: z.nativeEnum(MedicalAlertType),
  severity: z.enum(['info', 'warning', 'critical', 'emergency']),
  title: z.string().min(1),
  description: z.string().min(1),
  affectedMetric: z.string(),
  currentValue: z.number(),
  thresholdValue: z.number(),
  timestamp: z.date(),
  isActive: z.boolean(),
  requiresImmedateAction: z.boolean()
});

export const ChileanComplianceReportSchema = z.object({
  reportId: z.string().uuid(),
  reportPeriod: z.object({
    startDate: z.date(),
    endDate: z.date()
  }),
  regulatoryCompliance: z.enum(['compliant', 'non_compliant', 'under_review']),
  generatedAt: z.date(),
  generatedBy: z.string().uuid()
});