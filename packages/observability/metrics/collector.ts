// Medical metrics collector for TheCareBot
// High-performance metrics collection with medical compliance focus

import { randomUUID } from 'crypto';
import { 
  SystemMetrics, 
  MetricEvent, 
  MedicalAnalysisEvent, 
  MedicalAnalysisType,
  ChileanComplianceMetrics 
} from './types.js';

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Partial<SystemMetrics> = {};
  private metricsBuffer: Array<MetricEvent> = [];
  private flushInterval?: NodeJS.Timeout;
  private readonly maxBufferSize = 1000;
  private readonly flushIntervalMs = 10000; // 10 seconds
  
  private constructor() {
    this.initializeMetrics();
    this.startPeriodicFlush();
  }
  
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  private initializeMetrics(): void {
    this.metrics = {
      retries: {
        totalRetries: 0,
        retriesByService: {},
        retrySuccessRate: 0,
        avgRetriesPerOperation: 0,
        maxConsecutiveRetries: 0,
        retryLatencyImpact: 0,
      },
      circuitBreakers: {
        breakerStates: {},
        totalTrips: 0,
        tripsByService: {},
        recoverySuccessRate: 0,
        avgTripDuration: 0,
        preventedRequests: 0,
      },
      fallbacks: {
        totalFallbacks: 0,
        fallbacksByService: {},
        fallbackSuccessRate: 0,
        demoModeActivations: 0,
      },
      medical: {
        analysisMetrics: {
          totalAnalyses: 0,
          completedAnalyses: 0,
          failedAnalyses: 0,
          avgAnalysisTime: 0,
          analysisTimePercentiles: { p50: 0, p95: 0, p99: 0 },
          confidenceScoreDistribution: {},
          analysisTypeBreakdown: {} as Record<MedicalAnalysisType, number>,
        },
        sessionMetrics: {
          activeSessions: 0,
          totalSessions: 0,
          avgSessionDuration: 0,
          sessionCompletionRate: 0,
          concurrentSessionsMax: 0,
          sessionTimeoutViolations: 0,
        },
        doctorMetrics: {
          activeDoctors: 0,
          doctorsWithActiveSessions: 0,
          avgSessionsPerDoctor: 0,
          doctorUtilizationRate: 0,
          uniqueDoctorsToday: 0,
        },
        qualityMetrics: {
          analysisAccuracy: 0,
          falsePositiveRate: 0,
          falseNegativeRate: 0,
          criticalCasesDetected: 0,
          emergencyResponseTime: 0,
          confidenceBelowThreshold: 0,
        },
        complianceMetrics: {
          rutValidationFailures: 0,
          dataResidencyViolations: 0,
          sessionTimeoutCompliance: 100,
          auditLogIntegrity: 100,
          demoModeUsage: 0,
        },
      },
    };
  }
  
  // Core metric recording methods
  increment(metric: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.addEvent({
      type: 'counter',
      name: metric,
      value,
      tags,
      timestamp: Date.now(),
    });
  }
  
  timing(metric: string, duration: number, tags: Record<string, string> = {}): void {
    this.addEvent({
      type: 'timing',
      name: metric,
      value: duration,
      tags,
      timestamp: Date.now(),
    });
  }
  
  gauge(metric: string, value: number, tags: Record<string, string> = {}): void {
    this.addEvent({
      type: 'gauge',
      name: metric,
      value,
      tags,
      timestamp: Date.now(),
    });
  }
  
  histogram(metric: string, value: number, tags: Record<string, string> = {}): void {
    this.addEvent({
      type: 'histogram',
      name: metric,
      value,
      tags,
      timestamp: Date.now(),
    });
  }
  
  private addEvent(event: MetricEvent): void {
    this.metricsBuffer.push(event);
    
    // Immediate flush for critical medical events
    if (event.priority === 'critical' || this.metricsBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }
  
  // Medical-specific metric recording
  recordMedicalAnalysis(analysisData: MedicalAnalysisEvent): void {
    const tags = {
      sessionId: analysisData.sessionId,
      analysisType: analysisData.analysisType,
      success: analysisData.success.toString(),
    };
    
    // Add optional tags
    if (analysisData.errorType) {
      tags.errorType = analysisData.errorType;
    }
    if (analysisData.doctorRut) {
      tags.doctorRut = analysisData.doctorRut;
    }
    if (analysisData.n8nExecutionId) {
      tags.n8nExecutionId = analysisData.n8nExecutionId;
    }
    
    // Core medical metrics
    this.increment('medical.analysis.total', 1, tags);
    this.timing('medical.analysis.duration', analysisData.duration, tags);
    
    if (analysisData.success) {
      this.increment('medical.analysis.success', 1, tags);
      
      if (analysisData.confidenceScore !== undefined) {
        this.histogram('medical.analysis.confidence', analysisData.confidenceScore, tags);
        
        // Track low confidence scores (< 0.7 requires manual review)
        if (analysisData.confidenceScore < 0.7) {
          this.increment('medical.quality.low_confidence', 1, { 
            ...tags, 
            priority: 'high' 
          });
        }
      }
    } else {
      this.increment('medical.analysis.failure', 1, tags);
    }
    
    // Medical SLA violations (> 30 seconds)
    if (analysisData.duration > 30000) {
      this.gauge('medical.analysis.sla_violation', 1, { 
        ...tags, 
        priority: 'critical',
        slaThreshold: '30000ms'
      });
    }
    
    // Emergency response time tracking
    if (analysisData.analysisType === 'emergencia_medica') {
      this.timing('medical.emergency.response_time', analysisData.duration, {
        ...tags,
        priority: 'critical'
      });
    }
  }
  
  // Chilean compliance tracking
  recordChileanCompliance(event: {
    type: 'rut_validation' | 'medical_license' | 'session_timeout' | 'data_residency';
    success: boolean;
    details?: Record<string, string>;
  }): void {
    const tags = {
      complianceType: event.type,
      success: event.success.toString(),
      ...event.details,
    };
    
    this.increment('compliance.chilean.total', 1, tags);
    
    if (event.success) {
      this.increment('compliance.chilean.success', 1, tags);
    } else {
      this.increment('compliance.chilean.violation', 1, { 
        ...tags, 
        priority: 'critical' 
      });
    }
    
    // Specific compliance metrics
    switch (event.type) {
      case 'rut_validation':
        this.increment('compliance.rut.total', 1, tags);
        break;
      case 'medical_license':
        this.increment('compliance.license.total', 1, tags);
        break;
      case 'session_timeout':
        if (!event.success) {
          this.increment('compliance.session.timeout_violations', 1, { 
            ...tags, 
            priority: 'high' 
          });
        }
        break;
      case 'data_residency':
        if (!event.success) {
          this.increment('compliance.data.residency_violations', 1, { 
            ...tags, 
            priority: 'critical' 
          });
        }
        break;
    }
  }
  
  // Session management metrics
  recordSession(event: {
    action: 'start' | 'end' | 'timeout' | 'extend';
    sessionId: string;
    doctorRut?: string;
    duration?: number;
  }): void {
    const tags = {
      action: event.action,
      sessionId: event.sessionId,
    };
    
    if (event.doctorRut) {
      tags.doctorRut = event.doctorRut;
    }
    
    this.increment('medical.session.events', 1, tags);
    
    switch (event.action) {
      case 'start':
        this.increment('medical.session.started', 1, tags);
        this.gauge('medical.session.active', 1, tags);
        break;
      case 'end':
        this.increment('medical.session.completed', 1, tags);
        this.gauge('medical.session.active', -1, tags);
        if (event.duration) {
          this.timing('medical.session.duration', event.duration, tags);
        }
        break;
      case 'timeout':
        this.increment('medical.session.timeouts', 1, { 
          ...tags, 
          priority: 'high' 
        });
        this.gauge('medical.session.active', -1, tags);
        break;
      case 'extend':
        this.increment('medical.session.extensions', 1, tags);
        break;
    }
  }
  
  // Circuit breaker state changes
  recordCircuitBreakerState(service: string, newState: 'closed' | 'open' | 'half-open'): void {
    const tags = {
      service,
      state: newState,
    };
    
    this.gauge('circuit_breaker.state', newState === 'closed' ? 0 : newState === 'half-open' ? 1 : 2, tags);
    this.increment('circuit_breaker.state_changes', 1, tags);
    
    if (newState === 'open') {
      this.increment('circuit_breaker.trips', 1, { 
        ...tags, 
        priority: 'high' 
      });
    }
  }
  
  // n8n workflow tracking
  recordN8nWorkflow(event: {
    workflowId: string;
    executionId: string;
    success: boolean;
    duration: number;
    intention?: string;
  }): void {
    const tags = {
      workflowId: event.workflowId,
      executionId: event.executionId,
      success: event.success.toString(),
    };
    
    if (event.intention) {
      tags.intention = event.intention;
    }
    
    this.increment('n8n.workflow.executions', 1, tags);
    this.timing('n8n.workflow.duration', event.duration, tags);
    
    if (event.success) {
      this.increment('n8n.workflow.success', 1, tags);
    } else {
      this.increment('n8n.workflow.failures', 1, { 
        ...tags, 
        priority: 'high' 
      });
    }
  }
  
  private async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    const eventsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      // Send to multiple backends with resilience
      await Promise.allSettled([
        this.sendToPrometheus(eventsToFlush),
        this.sendToCloudWatch(eventsToFlush),
        this.sendToDatadog(eventsToFlush),
      ]);
      
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add events to buffer for retry (with size limit)
      const retryEvents = eventsToFlush.slice(0, this.maxBufferSize - this.metricsBuffer.length);
      this.metricsBuffer.unshift(...retryEvents);
    }
  }
  
  private async sendToPrometheus(events: MetricEvent[]): Promise<void> {
    // Implementation for Prometheus metrics export
    // Convert events to Prometheus format
    const prometheusMetrics = events.map(event => {
      const labels = Object.entries(event.tags)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      
      return `${event.name.replace(/\./g, '_')}{${labels}} ${event.value} ${event.timestamp}`;
    }).join('\n');
    
    // Send to Prometheus pushgateway or exposition endpoint
    // Implementation depends on Prometheus setup
  }
  
  private async sendToCloudWatch(events: MetricEvent[]): Promise<void> {
    // Implementation for CloudWatch metrics
    // Batch events for efficient sending
  }
  
  private async sendToDatadog(events: MetricEvent[]): Promise<void> {
    // Implementation for Datadog metrics
    // Convert to Datadog format and send
  }
  
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }
  
  // Get current metrics snapshot
  getMetrics(): Partial<SystemMetrics> {
    return { ...this.metrics };
  }
  
  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush before shutdown
    await this.flush();
  }
}

// Singleton instance
export const metricsCollector = MetricsCollector.getInstance();

// Helper functions for common medical metrics
export function recordMedicalAnalysisStart(sessionId: string, analysisType: MedicalAnalysisType): string {
  const analysisId = randomUUID();
  metricsCollector.increment('medical.analysis.started', 1, {
    sessionId,
    analysisType,
    analysisId,
  });
  return analysisId;
}

export function recordMedicalAnalysisEnd(
  analysisId: string,
  sessionId: string,
  analysisType: MedicalAnalysisType,
  success: boolean,
  duration: number,
  confidenceScore?: number,
  errorType?: string
): void {
  metricsCollector.recordMedicalAnalysis({
    sessionId,
    analysisType,
    duration,
    success,
    confidenceScore,
    errorType,
  });
}

// Demo mode tracking (critical for medical compliance)
export function recordDemoModeActivation(reason: string, context: Record<string, string> = {}): void {
  metricsCollector.increment('medical.demo_mode.activations', 1, {
    reason,
    priority: 'high',
    ...context,
  });
}