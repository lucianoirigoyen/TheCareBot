// Distributed tracing types for TheCareBot medical workflows
// End-to-end tracing for medical analysis compliance and performance

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags: number;
  baggage?: Record<string, string>;
  // Medical-specific context
  medicalContext?: MedicalTraceContext;
}

export interface MedicalTraceContext {
  sessionId?: string;
  doctorRut?: string;
  analysisType?: string;
  patientIdentifier?: string; // Anonymized for compliance
  urgencyLevel?: 'routine' | 'urgent' | 'emergency';
  complianceFlags?: string[]; // Chilean medical compliance markers
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string | number | boolean>;
  logs: Array<SpanLog>;
  status: SpanStatus;
  // Medical-specific fields
  medicalData?: MedicalSpanData;
}

export interface SpanLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  fields?: Record<string, unknown>;
}

export type SpanStatus = 'ok' | 'error' | 'timeout' | 'cancelled';

export interface MedicalSpanData {
  analysisType?: string;
  confidence?: number;
  processingStage?: string;
  complianceChecks?: ComplianceCheck[];
  medicalValidation?: MedicalValidation;
}

export interface ComplianceCheck {
  type: 'rut_validation' | 'license_check' | 'data_residency' | 'audit_log';
  passed: boolean;
  details?: string;
  timestamp: number;
}

export interface MedicalValidation {
  rutValid?: boolean;
  licenseValid?: boolean;
  sessionValid?: boolean;
  dataEncrypted?: boolean;
}

// Medical workflow operation names
export const MEDICAL_OPERATIONS = {
  // Session management
  SESSION_START: 'medical.session.start',
  SESSION_VALIDATE: 'medical.session.validate',
  SESSION_EXTEND: 'medical.session.extend',
  SESSION_END: 'medical.session.end',
  
  // Medical analysis
  ANALYSIS_REQUEST: 'medical.analysis.request',
  ANALYSIS_VALIDATE: 'medical.analysis.validate',
  ANALYSIS_EXECUTE: 'medical.analysis.execute',
  ANALYSIS_COMPLETE: 'medical.analysis.complete',
  
  // n8n workflow operations
  N8N_WORKFLOW_START: 'n8n.workflow.start',
  N8N_WORKFLOW_EXECUTE: 'n8n.workflow.execute',
  N8N_WORKFLOW_COMPLETE: 'n8n.workflow.complete',
  
  // Database operations
  DB_QUERY: 'database.query',
  DB_INSERT: 'database.insert',
  DB_UPDATE: 'database.update',
  
  // External API calls
  GOOGLE_HEALTHCARE_API: 'external.google_healthcare',
  SUPABASE_OPERATION: 'external.supabase',
  
  // File processing
  FILE_UPLOAD: 'file.upload',
  FILE_ANALYZE: 'file.analyze',
  FILE_ENCRYPT: 'file.encrypt',
  
  // Compliance operations
  RUT_VALIDATE: 'compliance.rut.validate',
  LICENSE_CHECK: 'compliance.license.check',
  AUDIT_LOG: 'compliance.audit.log',
} as const;

export type MedicalOperationType = typeof MEDICAL_OPERATIONS[keyof typeof MEDICAL_OPERATIONS];

// Trace sampling strategies for medical compliance
export interface SamplingStrategy {
  type: 'always' | 'probabilistic' | 'rate_limiting' | 'adaptive';
  rate?: number; // For probabilistic sampling (0.0 - 1.0)
  maxTracesPerSecond?: number; // For rate limiting
  // Medical-specific sampling rules
  medicalRules?: {
    alwaysSampleEmergency?: boolean; // Always trace emergency cases
    alwaysSampleCompliance?: boolean; // Always trace compliance operations
    reducedSamplingDemo?: boolean; // Lower sampling for demo mode
  };
}

// Trace export configuration
export interface TraceExportConfig {
  jaeger?: {
    endpoint: string;
    serviceName: string;
    tags?: Record<string, string>;
  };
  zipkin?: {
    endpoint: string;
    serviceName: string;
  };
  cloudTrace?: {
    projectId: string;
    credentials?: string;
  };
  customExporter?: {
    endpoint: string;
    headers?: Record<string, string>;
  };
}

// Medical trace analysis
export interface TraceAnalysis {
  traceId: string;
  totalDuration: number;
  spanCount: number;
  errorCount: number;
  // Medical-specific analysis
  medicalMetrics: {
    analysisCompletionTime?: number;
    complianceChecksPassed: number;
    complianceChecksFailed: number;
    confidenceScores: number[];
    criticalPath: string[]; // Most important spans for medical workflow
  };
  performanceIssues: PerformanceIssue[];
  complianceIssues: ComplianceIssue[];
}

export interface PerformanceIssue {
  type: 'slow_span' | 'high_error_rate' | 'timeout';
  spanId: string;
  operationName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction?: string;
}

export interface ComplianceIssue {
  type: 'missing_audit' | 'invalid_rut' | 'session_timeout' | 'data_residency';
  spanId: string;
  operationName: string;
  severity: 'warning' | 'violation' | 'critical';
  description: string;
  regulatoryReference?: string; // Reference to Chilean law or regulation
}