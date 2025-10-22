// Medical observability types for TheCareBot
// Comprehensive metrics structure for medical AI assistant compliance

export interface SystemMetrics {
  // Resilience metrics for medical system reliability
  retries: RetryMetrics;
  circuitBreakers: CircuitBreakerMetrics;
  fallbacks: FallbackMetrics;
  timeouts: TimeoutMetrics;
  
  // Performance metrics for medical workflows
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  errorRates: ErrorRateMetrics;
  
  // Medical business metrics for clinical quality
  medical: MedicalBusinessMetrics;
  
  // Infrastructure metrics for system health
  infrastructure: InfrastructureMetrics;
}

export interface RetryMetrics {
  totalRetries: number;
  retriesByService: Record<string, number>;
  retrySuccessRate: number;
  avgRetriesPerOperation: number;
  maxConsecutiveRetries: number;
  retryLatencyImpact: number; // ms adicionales por retry
}

export interface CircuitBreakerMetrics {
  breakerStates: Record<string, CircuitState>;
  totalTrips: number;
  tripsByService: Record<string, number>;
  recoverySuccessRate: number;
  avgTripDuration: number;
  preventedRequests: number; // Requests bloqueados por breaker abierto
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface FallbackMetrics {
  totalFallbacks: number;
  fallbacksByService: Record<string, number>;
  fallbackSuccessRate: number;
  demoModeActivations: number; // Critical for medical compliance
}

export interface TimeoutMetrics {
  totalTimeouts: number;
  timeoutsByService: Record<string, number>;
  avgTimeoutDuration: number;
  sessionTimeoutViolations: number; // 20-minute medical session limit
}

export interface LatencyMetrics {
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  medicalAnalysesPerHour: number;
  concurrentSessions: number;
  peakConcurrentSessions: number;
}

export interface ErrorRateMetrics {
  totalErrors: number;
  errorRate: number; // percentage
  errorsByType: Record<string, number>;
  criticalErrors: number; // Medical safety-critical errors
}

// Medical-specific business metrics for healthcare compliance
export interface MedicalBusinessMetrics {
  analysisMetrics: {
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
    avgAnalysisTime: number;
    analysisTimePercentiles: {
      p50: number;
      p95: number;
      p99: number;
    };
    // AI confidence distribution for medical analysis
    confidenceScoreDistribution: Record<string, number>;
    analysisTypeBreakdown: Record<MedicalAnalysisType, number>;
  };
  
  sessionMetrics: {
    activeSessions: number;
    totalSessions: number;
    avgSessionDuration: number;
    sessionCompletionRate: number;
    concurrentSessionsMax: number;
    sessionTimeoutViolations: number; // Critical for 20-minute limit
  };
  
  doctorMetrics: {
    activeDoctors: number;
    doctorsWithActiveSessions: number;
    avgSessionsPerDoctor: number;
    doctorUtilizationRate: number;
    uniqueDoctorsToday: number;
  };
  
  qualityMetrics: {
    analysisAccuracy: number; // Based on medical professional feedback
    falsePositiveRate: number;
    falseNegativeRate: number;
    criticalCasesDetected: number;
    emergencyResponseTime: number;
    confidenceBelowThreshold: number; // < 0.7 requires manual review
  };
  
  complianceMetrics: {
    rutValidationFailures: number; // Chilean RUT validation
    dataResidencyViolations: number; // Chilean data laws
    sessionTimeoutCompliance: number; // 20-minute enforcement
    auditLogIntegrity: number; // Immutable medical logs
    demoModeUsage: number; // Never real patient data
  };
}

export type MedicalAnalysisType = 
  | 'buscar_paciente'
  | 'analizar_excel' 
  | 'analizar_radiografia'
  | 'consulta_general'
  | 'emergencia_medica';

export interface InfrastructureMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  supabaseConnections: number;
  n8nWorkflowHealth: number;
}

export interface MetricEvent {
  type: 'counter' | 'timing' | 'gauge' | 'histogram';
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
  priority?: 'normal' | 'high' | 'critical';
}

// Medical analysis tracking for compliance
export interface MedicalAnalysisEvent {
  sessionId: string;
  analysisType: MedicalAnalysisType;
  duration: number;
  success: boolean;
  confidenceScore?: number;
  errorType?: string;
  doctorRut?: string; // Chilean medical professional identifier
  n8nExecutionId?: string; // Workflow traceability
}

// Chilean compliance-specific metrics
export interface ChileanComplianceMetrics {
  rutValidations: {
    total: number;
    successful: number;
    failed: number;
    invalidFormat: number;
  };
  
  medicalLicenseChecks: {
    total: number;
    verified: number;
    expired: number;
    suspended: number;
  };
  
  dataProtection: {
    dataResidencyCompliance: number; // % of data staying in Chile
    encryptionCompliance: number; // % of PHI encrypted
    auditTrailCompleteness: number; // % of medical actions logged
  };
  
  sessionCompliance: {
    timeoutEnforcement: number; // % of 20-minute timeouts enforced
    concurrentSessionLimits: number; // Max sessions per doctor
    unauthorizedAccess: number; // Security violations
  };
}