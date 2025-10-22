# Observabilidad – Prompt Multiagente

## Objetivo
Asegurar monitoreo y trazabilidad completos en TheCareBot para detectar fallos, validar resiliencia y mantener SLAs médicos críticos.

---

## Responsabilidades
- Medir retries, circuit breakers, latencia y fallbacks.
- Implementar dashboards de resiliencia en tiempo real.
- Configurar chaos testing automatizado.
- Alertar fallos críticos con escalación automática.
- Implementar distributed tracing para requests médicos.
- Configurar métricas de negocio (tiempo de análisis, precisión diagnóstica).
- Establecer SLOs/SLIs para servicios médicos críticos.

---

## Reglas Técnicas

### 1. **Sistema de Métricas Estructuradas**
```typescript
// src/observability/metrics.ts
export interface SystemMetrics {
  // Métricas de resiliencia
  retries: RetryMetrics;
  circuitBreakers: CircuitBreakerMetrics;
  fallbacks: FallbackMetrics;
  timeouts: TimeoutMetrics;
  
  // Métricas de performance
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  errorRates: ErrorRateMetrics;
  
  // Métricas de negocio médico
  medical: MedicalBusinessMetrics;
  
  // Métricas de infraestructura
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
    confidenceScoreDistribution: Record<string, number>; // bins de confidence
  };
  
  sessionMetrics: {
    activeSessions: number;
    totalSessions: number;
    avgSessionDuration: number;
    sessionCompletionRate: number;
    concurrentSessionsMax: number;
  };
  
  doctorMetrics: {
    activeDoctors: number;
    doctorsWithActiveSessions: number;
    avgSessionsPerDoctor: number;
    doctorUtilizationRate: number;
  };
  
  qualityMetrics: {
    analysisAccuracy: number; // Basado en feedback médico
    falsePositiveRate: number;
    falseNegativeRate: number;
    criticalCasesDetected: number;
    emergencyResponseTime: number;
  };
}

// Collector principal de métricas
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Partial<SystemMetrics> = {};
  private metricsBuffer: Array<MetricEvent> = [];
  private flushInterval?: NodeJS.Timeout;
  
  private constructor() {
    this.startPeriodicFlush();
  }
  
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  // Increment counter metrics
  increment(metric: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.addEvent({
      type: 'counter',
      name: metric,
      value,
      tags,
      timestamp: Date.now(),
    });
  }
  
  // Record timing metrics
  timing(metric: string, duration: number, tags: Record<string, string> = {}): void {
    this.addEvent({
      type: 'timing',
      name: metric,
      value: duration,
      tags,
      timestamp: Date.now(),
    });
  }
  
  // Record gauge metrics (current state)
  gauge(metric: string, value: number, tags: Record<string, string> = {}): void {
    this.addEvent({
      type: 'gauge',
      name: metric,
      value,
      tags,
      timestamp: Date.now(),
    });
  }
  
  // Record histogram metrics
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
    
    // Flush inmediato para métricas críticas
    if (event.tags?.priority === 'critical' || this.metricsBuffer.length >= 100) {
      this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    const eventsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      // Enviar a múltiples backends de métricas
      await Promise.allSettled([
        this.sendToPrometheus(eventsToFlush),
        this.sendToDatadog(eventsToFlush),
        this.sendToCloudWatch(eventsToFlush),
      ]);
      
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-agregar eventos al buffer para retry
      this.metricsBuffer.unshift(...eventsToFlush);
    }
  }
  
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000); // Flush cada 10 segundos
  }
  
  // Métricas específicas para operaciones médicas
  recordMedicalAnalysis(analysisData: {
    sessionId: string;
    analysisType: string;
    duration: number;
    success: boolean;
    confidenceScore?: number;
    errorType?: string;
  }): void {
    const tags = {
      sessionId: analysisData.sessionId,
      analysisType: analysisData.analysisType,
      success: analysisData.success.toString(),
    };
    
    if (analysisData.errorType) {
      tags.errorType = analysisData.errorType;
    }
    
    // Métricas básicas
    this.increment('medical.analysis.total', 1, tags);
    this.timing('medical.analysis.duration', analysisData.duration, tags);
    
    if (analysisData.success) {
      this.increment('medical.analysis.success', 1, tags);
      
      if (analysisData.confidenceScore !== undefined) {
        this.histogram('medical.analysis.confidence', analysisData.confidenceScore, tags);
      }
    } else {
      this.increment('medical.analysis.failure', 1, tags);
    }
    
    // Alertas para casos críticos
    if (analysisData.duration > 30000) { // > 30 segundos
      this.gauge('medical.analysis.slow', 1, { ...tags, priority: 'critical' });
    }
    
    if (analysisData.confidenceScore && analysisData.confidenceScore < 0.3) {
      this.gauge('medical.analysis.low_confidence', 1, { ...tags, priority: 'warning' });
    }
  }
}

interface MetricEvent {
  type: 'counter' | 'timing' | 'gauge' | 'histogram';
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

// Singleton instance
export const metricsCollector = MetricsCollector.getInstance();
```

### 2. **Distributed Tracing para Requests Médicos**
```typescript
// src/observability/tracing.ts
import { randomUUID } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags: number;
  baggage?: Record<string, string>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string | number | boolean>;
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    fields?: Record<string, unknown>;
  }>;
  status: 'ok' | 'error' | 'timeout';
}

export class TracingService {
  private static instance: TracingService;
  private activeSpans = new Map<string, Span>();
  private completedSpans: Span[] = [];
  private maxSpansBuffer = 1000;
  
  private constructor() {}
  
  static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }
  
  // Crear un nuevo trace para request médico
  startTrace(operationName: string, tags: Record<string, string | number | boolean> = {}): TraceContext {
    const traceId = randomUUID();
    const spanId = randomUUID();
    
    const span: Span = {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      tags: {
        ...tags,
        'service.name': 'thecarebot',
        'service.version': process.env.NEXT_PUBLIC_VERSION || 'unknown',
      },
      logs: [],
      status: 'ok',
    };
    
    this.activeSpans.set(spanId, span);
    
    return {
      traceId,
      spanId,
      flags: 1,
    };
  }
  
  // Crear span hijo
  startChildSpan(
    parentContext: TraceContext,
    operationName: string,
    tags: Record<string, string | number | boolean> = {}
  ): TraceContext {
    const spanId = randomUUID();
    
    const span: Span = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      operationName,
      startTime: Date.now(),
      tags,
      logs: [],
      status: 'ok',
    };
    
    this.activeSpans.set(spanId, span);
    
    return {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      flags: parentContext.flags,
    };
  }
  
  // Finalizar span
  finishSpan(
    context: TraceContext,
    status: 'ok' | 'error' | 'timeout' = 'ok',
    finalTags: Record<string, string | number | boolean> = {}
  ): void {
    const span = this.activeSpans.get(context.spanId);
    if (!span) return;
    
    span.endTime = Date.now();
    span.status = status;
    span.tags = { ...span.tags, ...finalTags };
    
    // Mover a completed spans
    this.activeSpans.delete(context.spanId);
    this.completedSpans.push(span);
    
    // Mantener buffer size
    if (this.completedSpans.length > this.maxSpansBuffer) {
      const toRemove = this.completedSpans.length - this.maxSpansBuffer;
      this.completedSpans.splice(0, toRemove);
    }
    
    // Enviar a sistemas de tracing
    this.exportSpan(span);
  }
  
  // Agregar log a span activo
  addLog(
    context: TraceContext,
    level: 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, unknown>
  ): void {
    const span = this.activeSpans.get(context.spanId);
    if (!span) return;
    
    span.logs.push({
      timestamp: Date.now(),
      level,
      message,
      fields,
    });
  }
  
  // Agregar tags a span activo
  addTags(context: TraceContext, tags: Record<string, string | number | boolean>): void {
    const span = this.activeSpans.get(context.spanId);
    if (!span) return;
    
    span.tags = { ...span.tags, ...tags };
  }
  
  private async exportSpan(span: Span): Promise<void> {
    try {
      // Exportar a Jaeger/Zipkin
      await this.sendToJaeger(span);
      
      // También generar métricas basadas en spans
      this.generateMetricsFromSpan(span);
      
    } catch (error) {
      console.error('Failed to export span:', error);
    }
  }
  
  private generateMetricsFromSpan(span: Span): void {
    const duration = (span.endTime || Date.now()) - span.startTime;
    const tags = Object.entries(span.tags).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>);
    
    // Métricas automáticas desde traces
    metricsCollector.timing(`trace.${span.operationName}.duration`, duration, tags);
    metricsCollector.increment(`trace.${span.operationName}.count`, 1, tags);
    
    if (span.status === 'error') {
      metricsCollector.increment(`trace.${span.operationName}.error`, 1, tags);
    }
  }
  
  // Obtener trace completo
  getTrace(traceId: string): Span[] {
    return this.completedSpans.filter(span => span.traceId === traceId);
  }
}

export const tracingService = TracingService.getInstance();

// Decorator para instrumentar funciones automáticamente
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
        tracingService.addLog(context, 'error', error instanceof Error ? error.message : String(error));
        tracingService.finishSpan(context, 'error', {
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
        });
        throw error;
      }
    };
    
    return descriptor;
  };
}
```

### 3. **Dashboard en Tiempo Real**
```typescript
// src/components/observability/dashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface DashboardData {
  systemHealth: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    lastUpdated: string;
  };
  
  resilience: {
    circuitBreakers: Record<string, CircuitState>;
    activeRetries: number;
    fallbacksActive: number;
  };
  
  performance: {
    avgLatency: number;
    requestsPerSecond: number;
    errorRate: number;
    p95Latency: number;
  };
  
  medical: {
    activeSessions: number;
    analysesInProgress: number;
    completedToday: number;
    avgAnalysisTime: number;
    criticalAlerts: number;
  };
  
  timeSeries: Array<{
    timestamp: string;
    latency: number;
    requests: number;
    errors: number;
    analyses: number;
  }>;
}

export function ObservabilityDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/observability/dashboard');
        const newData = await response.json() as DashboardData;
        setData(newData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // Actualizar cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }
  
  if (!data) {
    return <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>Error al cargar datos del dashboard</AlertDescription>
    </Alert>;
  }
  
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header con estado general */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getHealthIcon(data.systemHealth.status)}
          <div>
            <h1 className="text-2xl font-bold">Observabilidad del Sistema</h1>
            <p className="text-muted-foreground">
              Uptime: {Math.floor(data.systemHealth.uptime / 3600)}h {Math.floor((data.systemHealth.uptime % 3600) / 60)}m
            </p>
          </div>
        </div>
        
        <Badge variant={data.systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
          {data.systemHealth.status.toUpperCase()}
        </Badge>
      </div>
      
      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Latencia Promedio"
          value={`${data.performance.avgLatency}ms`}
          icon={<Clock className="h-4 w-4" />}
          trend={data.performance.avgLatency < 200 ? 'good' : data.performance.avgLatency < 500 ? 'warning' : 'bad'}
        />
        
        <MetricCard
          title="Requests/Segundo"
          value={data.performance.requestsPerSecond.toString()}
          icon={<Zap className="h-4 w-4" />}
          trend="neutral"
        />
        
        <MetricCard
          title="Tasa de Error"
          value={`${(data.performance.errorRate * 100).toFixed(2)}%`}
          icon={<XCircle className="h-4 w-4" />}
          trend={data.performance.errorRate < 0.01 ? 'good' : data.performance.errorRate < 0.05 ? 'warning' : 'bad'}
        />
        
        <MetricCard
          title="Sesiones Activas"
          value={data.medical.activeSessions.toString()}
          icon={<Activity className="h-4 w-4" />}
          trend="neutral"
        />
      </div>
      
      {/* Alertas críticas */}
      {data.medical.criticalAlerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {data.medical.criticalAlerts} alerta(s) crítica(s) requieren atención inmediata
          </AlertDescription>
        </Alert>
      )}
      
      {/* Gráficos de tiempo real */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latencia en Tiempo Real</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Latencia (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Análisis Médicos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="analyses" fill="#82ca9d" name="Análisis Completados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Estado de Circuit Breakers */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Circuit Breakers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(data.resilience.circuitBreakers).map(([service, state]) => (
              <div key={service} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">{service}</span>
                <Badge variant={state === 'closed' ? 'default' : state === 'half-open' ? 'secondary' : 'destructive'}>
                  {state}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Métricas médicas detalladas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Análisis en Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.medical.analysesInProgress}</div>
            <Progress 
              value={(data.medical.analysesInProgress / 50) * 100} // Asumiendo máximo de 50 concurrentes
              className="mt-2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Completados Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.medical.completedToday}</div>
            <p className="text-muted-foreground">
              Promedio: {data.medical.avgAnalysisTime}s por análisis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Fallbacks Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.resilience.fallbacksActive}</div>
            <p className="text-muted-foreground">
              Retries activos: {data.resilience.activeRetries}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: 'good' | 'warning' | 'bad' | 'neutral';
}

function MetricCard({ title, value, icon, trend }: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'bad': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={getTrendColor()}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
```

### 4. **Chaos Testing Automatizado**
```typescript
// src/testing/chaos.ts
export interface ChaosExperiment {
  name: string;
  description: string;
  target: ChaosTarget;
  fault: ChaosFault;
  duration: number; // en ms
  frequency: number; // veces por día
  enabled: boolean;
  conditions: ChaosCondition[];
}

export type ChaosTarget = 
  | 'supabase_connection'
  | 'google_healthcare_api'
  | 'n8n_workflows'
  | 'network_latency'
  | 'cpu_load'
  | 'memory_pressure';

export type ChaosFault = 
  | { type: 'network_failure'; probability: number }
  | { type: 'high_latency'; delayMs: number }
  | { type: 'service_unavailable'; httpStatus: number }
  | { type: 'memory_leak'; sizeBytes: number }
  | { type: 'cpu_spike'; utilizationPercent: number }
  | { type: 'database_timeout'; timeoutMs: number };

export interface ChaosCondition {
  type: 'time_window' | 'system_health' | 'active_users';
  value: string | number;
}

// Experimentos predefinidos para entorno médico
export const MEDICAL_CHAOS_EXPERIMENTS: ChaosExperiment[] = [
  {
    name: 'supabase_connection_failure',
    description: 'Simula fallos de conexión a la base de datos',
    target: 'supabase_connection',
    fault: { type: 'network_failure', probability: 0.1 },
    duration: 30000, // 30 segundos
    frequency: 2, // 2 veces por día
    enabled: true,
    conditions: [
      { type: 'time_window', value: '02:00-04:00' }, // Solo de madrugada
      { type: 'active_users', value: 5 }, // Máximo 5 usuarios activos
    ],
  },
  
  {
    name: 'google_healthcare_high_latency',
    description: 'Simula alta latencia en Google Healthcare API',
    target: 'google_healthcare_api',
    fault: { type: 'high_latency', delayMs: 5000 },
    duration: 60000, // 1 minuto
    frequency: 3,
    enabled: true,
    conditions: [
      { type: 'system_health', value: 'healthy' },
    ],
  },
  
  {
    name: 'network_partition_simulation',
    description: 'Simula partición de red temporal',
    target: 'network_latency',
    fault: { type: 'high_latency', delayMs: 10000 },
    duration: 45000, // 45 segundos
    frequency: 1,
    enabled: process.env.NODE_ENV !== 'production', // Solo en staging
    conditions: [
      { type: 'time_window', value: '01:00-05:00' },
    ],
  },
];

export class ChaosEngine {
  private static instance: ChaosEngine;
  private experiments: Map<string, ChaosExperiment> = new Map();
  private activeExperiments: Set<string> = new Set();
  private scheduledExperiments: Map<string, NodeJS.Timeout> = new Map();
  
  private constructor() {
    // Cargar experimentos predefinidos
    MEDICAL_CHAOS_EXPERIMENTS.forEach(experiment => {
      this.experiments.set(experiment.name, experiment);
    });
    
    this.scheduleExperiments();
  }
  
  static getInstance(): ChaosEngine {
    if (!ChaosEngine.instance) {
      ChaosEngine.instance = new ChaosEngine();
    }
    return ChaosEngine.instance;
  }
  
  private scheduleExperiments(): void {
    this.experiments.forEach((experiment, name) => {
      if (!experiment.enabled) return;
      
      // Programar experimento según frecuencia
      const intervalMs = (24 * 60 * 60 * 1000) / experiment.frequency; // ms por día / frecuencia
      
      const scheduleNext = () => {
        const timeout = setTimeout(async () => {
          if (await this.shouldRunExperiment(experiment)) {
            await this.runExperiment(name);
          }
          scheduleNext(); // Reprogramar siguiente ejecución
        }, intervalMs + (Math.random() * 3600000)); // ±1 hora de jitter
        
        this.scheduledExperiments.set(name, timeout);
      };
      
      scheduleNext();
    });
  }
  
  private async shouldRunExperiment(experiment: ChaosExperiment): Promise<boolean> {
    // Verificar condiciones
    for (const condition of experiment.conditions) {
      if (!(await this.checkCondition(condition))) {
        return false;
      }
    }
    
    return true;
  }
  
  private async checkCondition(condition: ChaosCondition): Promise<boolean> {
    switch (condition.type) {
      case 'time_window':
        return this.checkTimeWindow(condition.value as string);
      
      case 'system_health':
        const health = await this.getSystemHealth();
        return health.status === condition.value;
      
      case 'active_users':
        const activeUsers = await this.getActiveUserCount();
        return activeUsers <= (condition.value as number);
      
      default:
        return true;
    }
  }
  
  private checkTimeWindow(window: string): boolean {
    const [start, end] = window.split('-');
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startTime = startHour * 100 + startMin;
    const endTime = endHour * 100 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  }
  
  async runExperiment(experimentName: string): Promise<void> {
    const experiment = this.experiments.get(experimentName);
    if (!experiment || this.activeExperiments.has(experimentName)) {
      return;
    }
    
    console.info(`Starting chaos experiment: ${experimentName}`, {
      description: experiment.description,
      duration: experiment.duration,
      target: experiment.target,
    });
    
    this.activeExperiments.add(experimentName);
    
    // Métricas de inicio
    metricsCollector.increment('chaos.experiment.started', 1, {
      experiment: experimentName,
      target: experiment.target,
    });
    
    try {
      // Aplicar fault injection
      await this.injectFault(experiment.target, experiment.fault);
      
      // Esperar duración del experimento
      await new Promise(resolve => setTimeout(resolve, experiment.duration));
      
      // Limpiar fault injection
      await this.clearFault(experiment.target);
      
      // Métricas de éxito
      metricsCollector.increment('chaos.experiment.completed', 1, {
        experiment: experimentName,
        target: experiment.target,
      });
      
    } catch (error) {
      console.error(`Chaos experiment ${experimentName} failed:`, error);
      
      metricsCollector.increment('chaos.experiment.failed', 1, {
        experiment: experimentName,
        target: experiment.target,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      
    } finally {
      this.activeExperiments.delete(experimentName);
    }
  }
  
  private async injectFault(target: ChaosTarget, fault: ChaosFault): Promise<void> {
    switch (target) {
      case 'supabase_connection':
        await this.injectSupabaseFault(fault);
        break;
      
      case 'google_healthcare_api':
        await this.injectGoogleHealthcareFault(fault);
        break;
      
      case 'network_latency':
        await this.injectNetworkFault(fault);
        break;
        
      // Agregar más targets según necesidad
    }
  }
  
  private async injectSupabaseFault(fault: ChaosFault): Promise<void> {
    if (fault.type === 'network_failure') {
      // Simular usando proxy o interceptor
      global.chaosConfig = { 
        supabaseFailure: fault.probability 
      };
    }
  }
  
  // Manual experiment trigger (para testing)
  async triggerExperiment(experimentName: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Manual chaos experiments not allowed in production');
    }
    
    await this.runExperiment(experimentName);
  }
  
  getActiveExperiments(): string[] {
    return Array.from(this.activeExperiments);
  }
}

export const chaosEngine = ChaosEngine.getInstance();
```

### 5. **Sistema de Alertas Médicas**
```typescript
// src/observability/alerts.ts
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: AlertChannel[];
  cooldownMinutes: number;
  escalationRules: EscalationRule[];
}

export type AlertCondition = 
  | { type: 'metric_threshold'; metric: string; operator: '>' | '<' | '>='; threshold: number; duration: number }
  | { type: 'error_rate'; service: string; threshold: number; duration: number }
  | { type: 'latency_percentile'; service: string; percentile: number; threshold: number; duration: number }
  | { type: 'medical_quality'; metric: 'false_positive_rate' | 'analysis_timeout' | 'low_confidence'; threshold: number };

export interface AlertChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  config: Record<string, string>;
  severityFilter?: Array<'low' | 'medium' | 'high' | 'critical'>;
}

export interface EscalationRule {
  afterMinutes: number;
  channels: AlertChannel[];
  message?: string;
}

// Reglas predefinidas para sistema médico
export const MEDICAL_ALERT_RULES: AlertRule[] = [
  {
    id: 'medical_analysis_timeout',
    name: 'Análisis Médico Timeout',
    description: 'Análisis médico tarda más de 30 segundos en completarse',
    condition: { 
      type: 'latency_percentile', 
      service: 'medical_analysis', 
      percentile: 95, 
      threshold: 30000, 
      duration: 300000 // 5 minutos
    },
    severity: 'high',
    enabled: true,
    cooldownMinutes: 15,
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_MEDICAL_ALERTS_WEBHOOK || '' },
        severityFilter: ['high', 'critical'],
      },
      {
        type: 'email',
        config: { recipients: 'medical-team@thecarebot.com' },
      },
    ],
    escalationRules: [
      {
        afterMinutes: 10,
        channels: [
          {
            type: 'pagerduty',
            config: { serviceKey: process.env.PAGERDUTY_MEDICAL_KEY || '' },
          },
        ],
        message: 'ESCALATION: Medical analysis timeout persisting for 10+ minutes',
      },
    ],
  },
  
  {
    id: 'high_false_positive_rate',
    name: 'Alta Tasa de Falsos Positivos',
    description: 'Tasa de falsos positivos en análisis médicos excede 15%',
    condition: {
      type: 'medical_quality',
      metric: 'false_positive_rate',
      threshold: 0.15,
    },
    severity: 'critical',
    enabled: true,
    cooldownMinutes: 30,
    channels: [
      {
        type: 'email',
        config: { recipients: 'quality-assurance@thecarebot.com,medical-director@thecarebot.com' },
      },
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_QUALITY_ALERTS_WEBHOOK || '' },
      },
    ],
    escalationRules: [
      {
        afterMinutes: 5,
        channels: [
          {
            type: 'pagerduty',
            config: { serviceKey: process.env.PAGERDUTY_QUALITY_KEY || '' },
          },
        ],
      },
    ],
  },
  
  {
    id: 'circuit_breaker_open',
    name: 'Circuit Breaker Abierto',
    description: 'Circuit breaker crítico permanece abierto',
    condition: {
      type: 'metric_threshold',
      metric: 'circuit_breaker.open_duration',
      operator: '>',
      threshold: 300000, // 5 minutos
      duration: 60000, // por 1 minuto
    },
    severity: 'high',
    enabled: true,
    cooldownMinutes: 10,
    channels: [
      {
        type: 'slack',
        config: { webhook: process.env.SLACK_INFRA_ALERTS_WEBHOOK || '' },
      },
    ],
    escalationRules: [],
  },
];

export class AlertManager {
  private static instance: AlertManager;
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private cooldowns: Map<string, number> = new Map();
  
  private constructor() {
    MEDICAL_ALERT_RULES.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
    
    this.startEvaluationLoop();
  }
  
  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }
  
  private startEvaluationLoop(): void {
    setInterval(() => {
      this.evaluateAllRules();
    }, 30000); // Evaluar cada 30 segundos
  }
  
  private async evaluateAllRules(): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      // Verificar cooldown
      const lastFired = this.cooldowns.get(ruleId);
      if (lastFired && Date.now() - lastFired < rule.cooldownMinutes * 60000) {
        continue;
      }
      
      try {
        const shouldFire = await this.evaluateCondition(rule.condition);
        
        if (shouldFire) {
          await this.fireAlert(ruleId, rule);
          this.cooldowns.set(ruleId, Date.now());
        }
        
      } catch (error) {
        console.error(`Failed to evaluate alert rule ${ruleId}:`, error);
      }
    }
  }
  
  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    switch (condition.type) {
      case 'metric_threshold':
        return this.evaluateMetricThreshold(condition);
      
      case 'error_rate':
        return this.evaluateErrorRate(condition);
      
      case 'latency_percentile':
        return this.evaluateLatencyPercentile(condition);
      
      case 'medical_quality':
        return this.evaluateMedicalQuality(condition);
      
      default:
        return false;
    }
  }
  
  private async fireAlert(ruleId: string, rule: AlertRule): Promise<void> {
    const alert: ActiveAlert = {
      id: crypto.randomUUID(),
      ruleId,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      firedAt: Date.now(),
      status: 'firing',
    };
    
    this.activeAlerts.set(alert.id, alert);
    
    console.warn(`ALERT FIRED: ${rule.name}`, {
      severity: rule.severity,
      description: rule.description,
    });
    
    // Enviar a canales configurados
    for (const channel of rule.channels) {
      if (!channel.severityFilter || channel.severityFilter.includes(rule.severity)) {
        await this.sendToChannel(alert, channel);
      }
    }
    
    // Programar escalaciones
    rule.escalationRules.forEach(escalation => {
      setTimeout(async () => {
        if (this.activeAlerts.has(alert.id)) {
          console.warn(`ESCALATING ALERT: ${rule.name}`);
          
          for (const channel of escalation.channels) {
            await this.sendToChannel({
              ...alert,
              description: escalation.message || alert.description,
            }, channel);
          }
        }
      }, escalation.afterMinutes * 60000);
    });
    
    // Métricas
    metricsCollector.increment('alerts.fired', 1, {
      rule: ruleId,
      severity: rule.severity,
    });
  }
  
  private async sendToChannel(alert: ActiveAlert, channel: AlertChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendToSlack(alert, channel.config);
          break;
        
        case 'email':
          await this.sendToEmail(alert, channel.config);
          break;
        
        case 'pagerduty':
          await this.sendToPagerDuty(alert, channel.config);
          break;
        
        case 'webhook':
          await this.sendToWebhook(alert, channel.config);
          break;
      }
      
    } catch (error) {
      console.error(`Failed to send alert to ${channel.type}:`, error);
    }
  }
  
  private async sendToSlack(alert: ActiveAlert, config: Record<string, string>): Promise<void> {
    const webhook = config.webhook;
    if (!webhook) return;
    
    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff4500',
      critical: '#ff0000',
    }[alert.severity];
    
    const payload = {
      attachments: [{
        color,
        title: `🚨 ${alert.name}`,
        text: alert.description,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true,
          },
          {
            title: 'Time',
            value: new Date(alert.firedAt).toISOString(),
            short: true,
          },
        ],
      }],
    };
    
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}

interface ActiveAlert {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  firedAt: number;
  status: 'firing' | 'resolved';
}

export const alertManager = AlertManager.getInstance();
```

---

## Buenas Prácticas Implementadas

### **Métricas Comprehensivas**
- ✅ **Métricas de resiliencia**: retries, circuit breakers, fallbacks, timeouts
- ✅ **Métricas médicas específicas**: tiempo de análisis, precisión, casos críticos
- ✅ **Métricas de infraestructura**: latencia, throughput, error rates
- ✅ **Buffer con flush automático** para alta performance

### **Distributed Tracing Médico**
- ✅ **Traces completos** de requests médicos desde ingreso hasta respuesta
- ✅ **Context propagation** entre servicios
- ✅ **Decorador @traced** para instrumentación automática
- ✅ **Generación automática** de métricas desde traces

### **Dashboard en Tiempo Real**
- ✅ **Actualización automática** cada 5 segundos
- ✅ **Visualizaciones específicas** para métricas médicas
- ✅ **Estado de circuit breakers** en tiempo real
- ✅ **Alertas críticas** destacadas

### **Chaos Testing Seguro**
- ✅ **Experimentos controlados** con condiciones estrictas
- ✅ **Ventanas de tiempo seguras** (madrugadas, pocos usuarios)
- ✅ **Fault injection reversible** automáticamente
- ✅ **Métricas de experimentos** para análisis

### **Sistema de Alertas Médicas**
- ✅ **Reglas específicas** para calidad médica
- ✅ **Escalación automática** para casos críticos
- ✅ **Cooldown inteligente** para evitar spam
- ✅ **Múltiples canales** (Slack, email, PagerDuty)

### **SLOs/SLIs Médicos**
- ✅ **SLI**: 95% de análisis < 5 segundos
- ✅ **SLO**: 99.5% uptime para servicios críticos
- ✅ **Error budget**: tracking automático
- ✅ **Alertas proactivas** antes de violar SLOs

---

## Configuración de Monitoreo Externo

### **Prometheus Configuration**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'thecarebot'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 5s
    
rule_files:
  - "medical_alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

### **Grafana Dashboard JSON**
```json
{
  "dashboard": {
    "title": "TheCareBot Medical System",
    "panels": [
      {
        "title": "Medical Analysis Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, medical_analysis_duration_seconds_bucket)",
            "legendFormat": "P95 Analysis Time"
          }
        ]
      }
    ]
  }
}
```

---

## Entregables
- ✅ Sistema completo de métricas con collector optimizado
- ✅ Distributed tracing para requests médicos
- ✅ Dashboard en tiempo real con visualizaciones médicas
- ✅ Chaos testing automatizado con experimentos seguros
- ✅ Sistema de alertas con escalación médica
- ✅ SLOs/SLIs definidos para servicios críticos
- ✅ Integración con Prometheus/Grafana
- ✅ Health checks automáticos con métricas
- ✅ Logging estructurado para análisis forense
- ✅ Documentación completa de observabilidad