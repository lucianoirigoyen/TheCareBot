// Distributed tracing service for TheCareBot medical workflows
// End-to-end tracing with medical compliance and performance monitoring

import { randomUUID } from 'crypto';
import { 
  TraceContext, 
  Span, 
  SpanLog, 
  SpanStatus, 
  MedicalTraceContext,
  MedicalSpanData,
  ComplianceCheck,
  MEDICAL_OPERATIONS,
  MedicalOperationType,
  SamplingStrategy,
  TraceExportConfig,
  TraceAnalysis
} from './types.js';
import { metricsCollector } from '../metrics/collector.js';

export class TracingService {
  private static instance: TracingService;
  private activeSpans = new Map<string, Span>();
  private completedSpans: Span[] = [];
  private readonly maxSpansBuffer = 10000;
  private readonly serviceName = 'thecarebot-medical';
  private samplingStrategy: SamplingStrategy = { type: 'always' };
  private exportConfig?: TraceExportConfig;
  
  private constructor() {
    this.setupDefaultSampling();
  }
  
  static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }
  
  private setupDefaultSampling(): void {
    this.samplingStrategy = {
      type: 'adaptive',
      rate: 0.1, // 10% default sampling
      medicalRules: {
        alwaysSampleEmergency: true,
        alwaysSampleCompliance: true,
        reducedSamplingDemo: true,
      },
    };
  }
  
  // Start a new trace for medical workflow
  startTrace(
    operationName: MedicalOperationType | string,
    tags: Record<string, string | number | boolean> = {},
    medicalContext?: MedicalTraceContext
  ): TraceContext {
    const traceId = randomUUID();
    const spanId = randomUUID();
    
    // Apply sampling strategy
    if (!this.shouldSample(operationName, medicalContext)) {
      return this.createNoOpContext(traceId, spanId);
    }
    
    const span: Span = {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      tags: {
        ...tags,
        'service.name': this.serviceName,
        'service.version': process.env.NEXT_PUBLIC_VERSION || 'unknown',
        'span.kind': 'server',
      },
      logs: [],
      status: 'ok',
      medicalData: medicalContext ? {
        analysisType: medicalContext.analysisType,
        complianceChecks: [],
      } : undefined,
    };
    
    // Add medical context tags
    if (medicalContext) {
      if (medicalContext.sessionId) span.tags['medical.session_id'] = medicalContext.sessionId;
      if (medicalContext.doctorRut) span.tags['medical.doctor_rut'] = medicalContext.doctorRut;
      if (medicalContext.analysisType) span.tags['medical.analysis_type'] = medicalContext.analysisType;
      if (medicalContext.urgencyLevel) span.tags['medical.urgency'] = medicalContext.urgencyLevel;
    }
    
    this.activeSpans.set(spanId, span);
    
    // Record trace start metric
    metricsCollector.increment('tracing.traces_started', 1, {
      operation: operationName,
      urgency: medicalContext?.urgencyLevel || 'routine',
    });
    
    return {
      traceId,
      spanId,
      flags: 1,
      medicalContext,
    };
  }
  
  // Start a child span
  startChildSpan(
    parentContext: TraceContext,
    operationName: MedicalOperationType | string,
    tags: Record<string, string | number | boolean> = {}
  ): TraceContext {
    if (this.isNoOp(parentContext)) {
      return parentContext;
    }
    
    const spanId = randomUUID();
    
    const span: Span = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      operationName,
      startTime: Date.now(),
      tags: {
        ...tags,
        'service.name': this.serviceName,
      },
      logs: [],
      status: 'ok',
      medicalData: {
        complianceChecks: [],
      },
    };
    
    this.activeSpans.set(spanId, span);
    
    return {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      flags: parentContext.flags,
      medicalContext: parentContext.medicalContext,
    };
  }
  
  // Finish a span
  finishSpan(
    context: TraceContext,
    status: SpanStatus = 'ok',
    finalTags: Record<string, string | number | boolean> = {}
  ): void {
    if (this.isNoOp(context)) return;
    
    const span = this.activeSpans.get(context.spanId);
    if (!span) return;
    
    span.endTime = Date.now();
    span.status = status;
    span.tags = { ...span.tags, ...finalTags };
    
    // Calculate duration
    const duration = span.endTime - span.startTime;
    span.tags['duration_ms'] = duration;
    
    // Medical SLA checking
    this.checkMedicalSLAs(span, duration);
    
    // Move to completed spans
    this.activeSpans.delete(context.spanId);
    this.completedSpans.push(span);
    
    // Maintain buffer size
    if (this.completedSpans.length > this.maxSpansBuffer) {
      const toRemove = this.completedSpans.length - this.maxSpansBuffer;
      this.completedSpans.splice(0, toRemove);
    }
    
    // Export span
    this.exportSpan(span);
    
    // Generate metrics from span
    this.generateMetricsFromSpan(span);
  }
  
  // Add log to active span
  addLog(
    context: TraceContext,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    fields?: Record<string, unknown>
  ): void {
    if (this.isNoOp(context)) return;
    
    const span = this.activeSpans.get(context.spanId);
    if (!span) return;
    
    const log: SpanLog = {
      timestamp: Date.now(),
      level,
      message,
      fields,
    };
    
    span.logs.push(log);
    
    // If error log, mark span as error
    if (level === 'error') {
      span.status = 'error';
    }
  }
  
  // Add tags to active span
  addTags(context: TraceContext, tags: Record<string, string | number | boolean>): void {
    if (this.isNoOp(context)) return;
    
    const span = this.activeSpans.get(context.spanId);
    if (!span) return;
    
    span.tags = { ...span.tags, ...tags };
  }
  
  // Add medical compliance check to span
  addComplianceCheck(
    context: TraceContext,
    check: ComplianceCheck
  ): void {
    if (this.isNoOp(context)) return;
    
    const span = this.activeSpans.get(context.spanId);
    if (!span || !span.medicalData) return;
    
    span.medicalData.complianceChecks = span.medicalData.complianceChecks || [];
    span.medicalData.complianceChecks.push(check);
    
    // Add as tags for easier filtering
    span.tags[`compliance.${check.type}`] = check.passed;
    
    // Record compliance metrics
    metricsCollector.recordChileanCompliance({
      type: check.type === 'rut_validation' ? 'rut_validation' : 
            check.type === 'license_check' ? 'medical_license' : 
            check.type === 'data_residency' ? 'data_residency' : 'rut_validation',
      success: check.passed,
      details: { traceId: context.traceId, spanId: context.spanId },
    });
  }
  
  // Set medical analysis confidence score
  setMedicalConfidence(context: TraceContext, confidence: number): void {
    if (this.isNoOp(context)) return;
    
    const span = this.activeSpans.get(context.spanId);
    if (!span) return;
    
    if (!span.medicalData) {
      span.medicalData = { complianceChecks: [] };
    }
    
    span.medicalData.confidence = confidence;
    span.tags['medical.confidence'] = confidence;
    
    // Low confidence warning
    if (confidence < 0.7) {
      this.addLog(context, 'warn', `Low confidence score: ${confidence}`, {
        threshold: 0.7,
        requiresManualReview: true,
      });
    }
  }
  
  private shouldSample(operationName: string, medicalContext?: MedicalTraceContext): boolean {
    // Always sample emergency cases
    if (this.samplingStrategy.medicalRules?.alwaysSampleEmergency && 
        medicalContext?.urgencyLevel === 'emergency') {
      return true;
    }
    
    // Always sample compliance operations
    if (this.samplingStrategy.medicalRules?.alwaysSampleCompliance &&
        operationName.includes('compliance')) {
      return true;
    }
    
    // Reduced sampling for demo mode
    if (this.samplingStrategy.medicalRules?.reducedSamplingDemo &&
        medicalContext?.complianceFlags?.includes('demo_mode')) {
      return Math.random() < 0.01; // 1% sampling for demo
    }
    
    // Apply main sampling strategy
    switch (this.samplingStrategy.type) {
      case 'always':
        return true;
      case 'probabilistic':
        return Math.random() < (this.samplingStrategy.rate || 0.1);
      default:
        return true;
    }
  }
  
  private checkMedicalSLAs(span: Span, duration: number): void {
    // Medical analysis SLA: 30 seconds
    if (span.operationName.includes('analysis') && duration > 30000) {
      span.tags['sla_violation'] = true;
      span.tags['sla_threshold'] = '30000ms';
      
      metricsCollector.increment('tracing.sla_violations', 1, {
        operation: span.operationName,
        violation_type: 'analysis_timeout',
        priority: 'critical',
      });
    }
    
    // Database query SLA: 3 seconds
    if (span.operationName.includes('database') && duration > 3000) {
      span.tags['sla_violation'] = true;
      span.tags['sla_threshold'] = '3000ms';
      
      metricsCollector.increment('tracing.sla_violations', 1, {
        operation: span.operationName,
        violation_type: 'database_slow',
        priority: 'high',
      });
    }
    
    // n8n workflow SLA: 45 seconds
    if (span.operationName.includes('n8n') && duration > 45000) {
      span.tags['sla_violation'] = true;
      span.tags['sla_threshold'] = '45000ms';
    }
  }
  
  private generateMetricsFromSpan(span: Span): void {
    const duration = (span.endTime || Date.now()) - span.startTime;
    const tags = Object.entries(span.tags).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>);
    
    // Automatic metrics from traces
    metricsCollector.timing(`trace.${span.operationName.replace(/\./g, '_')}.duration`, duration, tags);
    metricsCollector.increment(`trace.${span.operationName.replace(/\./g, '_')}.count`, 1, tags);
    
    if (span.status === 'error') {
      metricsCollector.increment(`trace.${span.operationName.replace(/\./g, '_')}.error`, 1, tags);
    }
    
    // Medical-specific metrics
    if (span.medicalData?.confidence) {
      metricsCollector.histogram('trace.medical.confidence', span.medicalData.confidence, tags);
    }
    
    if (span.medicalData?.complianceChecks) {
      const passedChecks = span.medicalData.complianceChecks.filter(c => c.passed).length;
      const totalChecks = span.medicalData.complianceChecks.length;
      
      if (totalChecks > 0) {
        metricsCollector.gauge('trace.compliance.checks_passed', passedChecks, tags);
        metricsCollector.gauge('trace.compliance.checks_total', totalChecks, tags);
      }
    }
  }
  
  private async exportSpan(span: Span): Promise<void> {
    try {
      if (this.exportConfig?.jaeger) {
        await this.sendToJaeger(span);
      }
      if (this.exportConfig?.zipkin) {
        await this.sendToZipkin(span);
      }
      if (this.exportConfig?.cloudTrace) {
        await this.sendToCloudTrace(span);
      }
      if (this.exportConfig?.customExporter) {
        await this.sendToCustomExporter(span);
      }
    } catch (error) {
      console.error('Failed to export span:', error);
      metricsCollector.increment('tracing.export_failures', 1, {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }
  
  private async sendToJaeger(span: Span): Promise<void> {
    // Jaeger span format conversion
    const jaegerSpan = {
      traceID: span.traceId.replace(/-/g, ''),
      spanID: span.spanId.replace(/-/g, ''),
      parentSpanID: span.parentSpanId?.replace(/-/g, ''),
      operationName: span.operationName,
      startTime: span.startTime * 1000, // microseconds
      duration: span.endTime ? (span.endTime - span.startTime) * 1000 : 0,
      tags: Object.entries(span.tags).map(([key, value]) => ({
        key,
        type: typeof value === 'string' ? 'string' : 'number',
        value: String(value),
      })),
      logs: span.logs.map(log => ({
        timestamp: log.timestamp * 1000,
        fields: [
          { key: 'level', value: log.level },
          { key: 'message', value: log.message },
          ...Object.entries(log.fields || {}).map(([key, value]) => ({
            key,
            value: String(value),
          })),
        ],
      })),
    };
    
    // Send to Jaeger collector
    // Implementation depends on Jaeger setup
  }
  
  private createNoOpContext(traceId: string, spanId: string): TraceContext {
    return {
      traceId,
      spanId,
      flags: 0, // Not sampled
    };
  }
  
  private isNoOp(context: TraceContext): boolean {
    return context.flags === 0;
  }
  
  // Get complete trace
  getTrace(traceId: string): Span[] {
    const spans = this.completedSpans.filter(span => span.traceId === traceId);
    
    // Also check active spans
    for (const span of this.activeSpans.values()) {
      if (span.traceId === traceId) {
        spans.push(span);
      }
    }
    
    return spans.sort((a, b) => a.startTime - b.startTime);
  }
  
  // Analyze trace for issues
  analyzeTrace(traceId: string): TraceAnalysis {
    const spans = this.getTrace(traceId);
    
    if (spans.length === 0) {
      throw new Error(`Trace not found: ${traceId}`);
    }
    
    const totalDuration = Math.max(...spans.map(s => s.endTime || Date.now())) - 
                         Math.min(...spans.map(s => s.startTime));
    const errorCount = spans.filter(s => s.status === 'error').length;
    
    // Medical-specific analysis
    const complianceChecksPassed = spans.reduce((acc, span) => 
      acc + (span.medicalData?.complianceChecks?.filter(c => c.passed).length || 0), 0);
    const complianceChecksFailed = spans.reduce((acc, span) => 
      acc + (span.medicalData?.complianceChecks?.filter(c => !c.passed).length || 0), 0);
    
    const confidenceScores = spans
      .map(s => s.medicalData?.confidence)
      .filter(c => c !== undefined) as number[];
    
    return {
      traceId,
      totalDuration,
      spanCount: spans.length,
      errorCount,
      medicalMetrics: {
        complianceChecksPassed,
        complianceChecksFailed,
        confidenceScores,
        criticalPath: this.findCriticalPath(spans),
      },
      performanceIssues: this.findPerformanceIssues(spans),
      complianceIssues: this.findComplianceIssues(spans),
    };
  }
  
  private findCriticalPath(spans: Span[]): string[] {
    // Find the longest path through the spans (critical path)
    return spans
      .filter(span => !span.parentSpanId) // Root spans
      .map(span => span.operationName);
  }
  
  private findPerformanceIssues(spans: Span[]): any[] {
    return spans
      .filter(span => span.tags.sla_violation === true)
      .map(span => ({
        type: 'slow_span',
        spanId: span.spanId,
        operationName: span.operationName,
        severity: 'high',
        description: `Span exceeded SLA threshold of ${span.tags.sla_threshold}`,
      }));
  }
  
  private findComplianceIssues(spans: Span[]): any[] {
    const issues: any[] = [];
    
    spans.forEach(span => {
      span.medicalData?.complianceChecks?.forEach(check => {
        if (!check.passed) {
          issues.push({
            type: check.type,
            spanId: span.spanId,
            operationName: span.operationName,
            severity: 'violation',
            description: `Compliance check failed: ${check.details}`,
          });
        }
      });
    });
    
    return issues;
  }
  
  // Configuration
  configureSampling(strategy: SamplingStrategy): void {
    this.samplingStrategy = strategy;
  }
  
  configureExport(config: TraceExportConfig): void {
    this.exportConfig = config;
  }
}

// Singleton instance
export const tracingService = TracingService.getInstance();

// Decorator for automatic tracing
export function traced(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const spanName = operationName || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      const context = tracingService.startTrace(spanName, {
        'function.name': propertyKey,
        'class.name': target.constructor.name,
      });
      
      try {
        const result = await originalMethod.apply(this, args);
        tracingService.finishSpan(context, 'ok');
        return result;
      } catch (error) {
        tracingService.addLog(
          context, 
          'error', 
          error instanceof Error ? error.message : String(error),
          { stack: error instanceof Error ? error.stack : undefined }
        );
        tracingService.finishSpan(context, 'error', {
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
        });
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Medical-specific tracing helpers
export function traceMedicalAnalysis(
  analysisType: string,
  sessionId: string,
  doctorRut?: string
): TraceContext {
  return tracingService.startTrace(
    MEDICAL_OPERATIONS.ANALYSIS_REQUEST,
    {
      'medical.analysis_type': analysisType,
      'medical.session_id': sessionId,
    },
    {
      sessionId,
      doctorRut,
      analysisType,
      urgencyLevel: 'routine',
    }
  );
}

export function traceEmergencyAnalysis(
  analysisType: string,
  sessionId: string,
  doctorRut: string
): TraceContext {
  return tracingService.startTrace(
    MEDICAL_OPERATIONS.ANALYSIS_REQUEST,
    {
      'medical.analysis_type': analysisType,
      'medical.session_id': sessionId,
      'medical.urgency': 'emergency',
    },
    {
      sessionId,
      doctorRut,
      analysisType,
      urgencyLevel: 'emergency',
    }
  );
}