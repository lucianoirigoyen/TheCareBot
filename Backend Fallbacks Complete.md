# Backend Fallbacks – Prompt Multiagente

## Objetivo

Diseñar e implementar estrategias de **resiliencia backend** para TheCareBot garantizando continuidad de servicio, incluso bajo fallos parciales.

---

## Responsabilidades

- Identificar puntos críticos de fallo (APIs externas, Supabase, Google Healthcare API, langchain).
- Implementar **retry con backoff exponencial y jitter**.
- Integrar **circuit breakers** para fallos persistentes.
- Definir **fallbacks seguros** (cache, valores por defecto, modo demo).
- Añadir **timeouts y bulkhead** para aislar fallos.
- Proteger datos sensibles en fallbacks (ej. no devolver información médica parcial insegura).
- Implementar health checks y graceful degradation.
- Configurar observabilidad y alertas de resiliencia.

---

## Reglas Técnicas

### 1. **Configuración de Timeouts por Servicio**

```typescript
// src/config/timeouts.ts
export const TIMEOUT_CONFIG = {
  database: {
    query: 3000, // Consultas simples
    transaction: 10000, // Transacciones complejas
    migration: 30000, // Migraciones de schema
  },
  externalApis: {
    googleHealthcare: 8000,
    imageAnalysis: 15000, // Procesamiento de imágenes
    authentication: 3000,
  },
  cache: {
    read: 500,
    write: 1000,
  },
  fileOperations: {
    upload: 30000,
    download: 10000,
    processing: 60000,
  },
} as const;

export type TimeoutCategory = keyof typeof TIMEOUT_CONFIG;
export type TimeoutOperation<T extends TimeoutCategory> =
  keyof (typeof TIMEOUT_CONFIG)[T];
```

### 2. **Retry con Backoff Exponencial + Jitter**

```typescript
// src/utils/retry.ts
export interface RetryOptions {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitterMaxMs: number;
  readonly retryCondition?: (error: Error) => boolean;
  readonly onRetry?: (error: Error, attempt: number) => void;
}

export const RETRY_CONFIGS = {
  critical: {
    maxRetries: 5,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    jitterMaxMs: 50,
  },
  normal: {
    maxRetries: 3,
    baseDelayMs: 200,
    maxDelayMs: 3000,
    jitterMaxMs: 100,
  },
  background: {
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    jitterMaxMs: 200,
  },
} as const;

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // No reintentar si no cumple condición
      if (options.retryCondition && !options.retryCondition(lastError)) {
        throw lastError;
      }

      // No reintentar en último intento
      if (attempt === options.maxRetries) {
        throw lastError;
      }

      // Calcular delay con backoff exponencial + jitter
      const exponentialDelay = Math.min(
        options.baseDelayMs * Math.pow(2, attempt),
        options.maxDelayMs
      );
      const jitter = Math.random() * options.jitterMaxMs;
      const totalDelay = exponentialDelay + jitter;

      // Callback de retry
      options.onRetry?.(lastError, attempt + 1);

      // Log del intento
      console.warn(
        `Retry attempt ${attempt + 1}/${
          options.maxRetries
        } after ${totalDelay}ms`,
        {
          error: lastError.message,
          operation: operation.name || "anonymous",
        }
      );

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
}

// Utility para determinar si un error es retryable
export function isRetryableError(error: Error): boolean {
  // Errores HTTP retryables (5xx, algunos 4xx)
  if ("status" in error) {
    const status = (error as any).status as number;
    return (
      status >= 500 || // Server errors
      status === 408 || // Request timeout
      status === 429 || // Too many requests
      status === 503 // Service unavailable
    );
  }

  // Errores de red
  if ("code" in error) {
    const code = (error as any).code as string;
    return [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
    ].includes(code);
  }

  // Errores de base de datos retryables
  if (
    error.message.includes("connection") ||
    error.message.includes("timeout") ||
    error.message.includes("deadlock")
  ) {
    return true;
  }

  return false;
}
```

### 3. **Circuit Breaker Pattern**

```typescript
// src/utils/circuitBreaker.ts
export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  readonly failureThreshold: number; // Fallos para abrir
  readonly timeWindowMs: number; // Ventana de tiempo para contar fallos
  readonly recoveryTimeoutMs: number; // Tiempo antes de intentar recovery
  readonly successThreshold: number; // Éxitos para cerrar desde half-open
  readonly onStateChange?: (state: CircuitState, reason: string) => void;
}

export const CIRCUIT_BREAKER_CONFIGS = {
  critical: {
    failureThreshold: 3,
    timeWindowMs: 15000,
    recoveryTimeoutMs: 30000,
    successThreshold: 2,
  },
  normal: {
    failureThreshold: 5,
    timeWindowMs: 30000,
    recoveryTimeoutMs: 60000,
    successThreshold: 3,
  },
  background: {
    failureThreshold: 10,
    timeWindowMs: 60000,
    recoveryTimeoutMs: 120000,
    successThreshold: 5,
  },
} as const;

interface CircuitMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
}

export class CircuitBreaker<T> {
  private state: CircuitState = "closed";
  private metrics: CircuitMetrics = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
    totalRequests: 0,
  };

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {}

  async execute(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      // Verificar si es momento de intentar recovery
      if (
        Date.now() - this.metrics.lastFailureTime >=
        this.options.recoveryTimeoutMs
      ) {
        this.changeState("half-open", "Recovery timeout reached");
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    this.metrics.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private onSuccess(): void {
    this.metrics.successes++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === "half-open") {
      if (this.metrics.successes >= this.options.successThreshold) {
        this.changeState(
          "closed",
          `${this.options.successThreshold} successes in half-open`
        );
        this.resetMetrics();
      }
    }
  }

  private onFailure(error: Error): void {
    this.metrics.failures++;
    this.metrics.lastFailureTime = Date.now();

    if (this.state === "closed" || this.state === "half-open") {
      // Contar fallos en ventana de tiempo
      const failuresInWindow = this.getFailuresInTimeWindow();

      if (failuresInWindow >= this.options.failureThreshold) {
        this.changeState("open", `${failuresInWindow} failures in time window`);
      }
    }
  }

  private getFailuresInTimeWindow(): number {
    const now = Date.now();
    const windowStart = now - this.options.timeWindowMs;

    // En implementación real, mantendríamos un array de timestamps
    // Por simplicidad, asumimos que todos los fallos recientes están en ventana
    return this.metrics.lastFailureTime >= windowStart
      ? this.metrics.failures
      : 0;
  }

  private changeState(newState: CircuitState, reason: string): void {
    const oldState = this.state;
    this.state = newState;

    console.info(
      `Circuit breaker [${this.name}] state change: ${oldState} → ${newState}`,
      {
        reason,
        metrics: this.metrics,
      }
    );

    this.options.onStateChange?.(newState, reason);
  }

  private resetMetrics(): void {
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: Date.now(),
      totalRequests: 0,
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): Readonly<CircuitMetrics> {
    return { ...this.metrics };
  }
}

// Factory para crear circuit breakers
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker<any>>();

  static getBreaker<T>(
    name: string,
    config: keyof typeof CIRCUIT_BREAKER_CONFIGS = "normal"
  ): CircuitBreaker<T> {
    if (!this.breakers.has(name)) {
      const options = CIRCUIT_BREAKER_CONFIGS[config];
      this.breakers.set(name, new CircuitBreaker(name, options));
    }

    return this.breakers.get(name)!;
  }

  static getAllBreakerStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {};

    for (const [name, breaker] of this.breakers) {
      states[name] = breaker.getState();
    }

    return states;
  }
}
```

### 4. **Fallbacks Seguros por Servicio**

```typescript
// src/services/fallbacks/index.ts
export interface FallbackStrategy<T> {
  readonly name: string;
  readonly priority: number; // Mayor número = mayor prioridad
  readonly execute: () => Promise<T>;
  readonly isHealthy: () => Promise<boolean>;
}

export class FallbackChain<T> {
  private strategies: FallbackStrategy<T>[] = [];

  constructor(private readonly serviceName: string) {}

  addStrategy(strategy: FallbackStrategy<T>): this {
    this.strategies.push(strategy);
    // Ordenar por prioridad (mayor primero)
    this.strategies.sort((a, b) => b.priority - a.priority);
    return this;
  }

  async execute(): Promise<Result<T, string>> {
    let lastError: Error | null = null;

    for (const strategy of this.strategies) {
      try {
        // Verificar salud de la estrategia
        const isHealthy = await strategy.isHealthy();
        if (!isHealthy) {
          console.warn(
            `Fallback strategy [${strategy.name}] is unhealthy, skipping`
          );
          continue;
        }

        const result = await strategy.execute();

        console.info(`Fallback successful using strategy [${strategy.name}]`, {
          service: this.serviceName,
          strategyPriority: strategy.priority,
        });

        return { success: true, data: result };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.warn(`Fallback strategy [${strategy.name}] failed`, {
          service: this.serviceName,
          error: lastError.message,
        });
      }
    }

    const errorMessage = `All fallback strategies failed for service [${this.serviceName}]`;
    console.error(errorMessage, { lastError: lastError?.message });

    return {
      success: false,
      error: lastError?.message ?? "No fallback strategies available",
    };
  }
}

// Implementaciones específicas para servicios médicos
export class DatabaseFallbacks {
  static createPatientDataFallback(): FallbackChain<PatientData> {
    const chain = new FallbackChain<PatientData>("patient-data");

    // Estrategia 1: Cache Redis
    chain.addStrategy({
      name: "redis-cache",
      priority: 100,
      execute: async () => {
        const cached = await redisClient.get(`patient:${patientRut}`);
        if (!cached) throw new Error("No cached data");
        return JSON.parse(cached) as PatientData;
      },
      isHealthy: () =>
        redisClient
          .ping()
          .then(() => true)
          .catch(() => false),
    });

    // Estrategia 2: Read-only replica
    chain.addStrategy({
      name: "database-replica",
      priority: 80,
      execute: async () => {
        return await supabaseReplica.from("patient_data").select("*").single();
      },
      isHealthy: async () => {
        try {
          await supabaseReplica.from("health_check").select("1").limit(1);
          return true;
        } catch {
          return false;
        }
      },
    });

    // Estrategia 3: Datos básicos en memoria (emergency only)
    chain.addStrategy({
      name: "in-memory-basic",
      priority: 10,
      execute: async () => {
        // Solo datos no sensibles para mantener funcionalidad mínima
        return {
          rut: patientRut,
          name: "Paciente (datos limitados)",
          allowedOperations: ["basic_consultation"],
          isEmergencyMode: true,
        } as PatientData;
      },
      isHealthy: () => Promise.resolve(true),
    });

    return chain;
  }

  static createAnalysisResultsFallback(): FallbackChain<AnalysisResults> {
    const chain = new FallbackChain<AnalysisResults>("analysis-results");

    // NUNCA devolver resultados médicos inventados o parciales
    // Solo fallback a estados seguros
    chain.addStrategy({
      name: "safe-error-response",
      priority: 50,
      execute: async () => {
        return {
          type: "system_error",
          message: "El análisis no puede completarse en este momento",
          recommendations: [
            "Por favor, intente nuevamente en unos minutos",
            "Si el problema persiste, contacte al soporte técnico",
            "En caso de emergencia, busque atención médica inmediata",
          ],
          requiresManualReview: true,
          isEmergencyMode: true,
        } as AnalysisResults;
      },
      isHealthy: () => Promise.resolve(true),
    });

    return chain;
  }
}
```

### 5. **Bulkhead Pattern - Aislamiento de Recursos**

```typescript
// src/utils/bulkhead.ts
export interface BulkheadOptions {
  readonly maxConcurrency: number;
  readonly queueSize: number;
  readonly timeoutMs: number;
  readonly onQueueFull?: () => void;
  readonly onTimeout?: (operation: string) => void;
}

export const BULKHEAD_CONFIGS = {
  critical: { maxConcurrency: 10, queueSize: 50, timeoutMs: 5000 },
  normal: { maxConcurrency: 5, queueSize: 20, timeoutMs: 10000 },
  background: { maxConcurrency: 2, queueSize: 10, timeoutMs: 30000 },
} as const;

export class Bulkhead<T> {
  private activeOperations = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly name: string,
    private readonly options: BulkheadOptions
  ) {}

  async execute(operation: () => Promise<T>): Promise<T> {
    // Verificar si hay espacio en la cola
    if (this.queue.length >= this.options.queueSize) {
      this.options.onQueueFull?.();
      throw new Error(`Bulkhead [${this.name}] queue is full`);
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.options.onTimeout?.(this.name);
        reject(new Error(`Bulkhead [${this.name}] operation timeout`));
      }, this.options.timeoutMs);

      const executeOperation = async () => {
        try {
          this.activeOperations++;

          const result = await operation();
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        } finally {
          this.activeOperations--;
          this.processQueue();
        }
      };

      if (this.activeOperations < this.options.maxConcurrency) {
        // Ejecutar inmediatamente
        executeOperation();
      } else {
        // Agregar a la cola
        this.queue.push(executeOperation);
      }
    });
  }

  private processQueue(): void {
    if (
      this.queue.length > 0 &&
      this.activeOperations < this.options.maxConcurrency
    ) {
      const nextOperation = this.queue.shift();
      nextOperation?.();
    }
  }

  getStats() {
    return {
      name: this.name,
      activeOperations: this.activeOperations,
      queuedOperations: this.queue.length,
      utilizationPercent:
        (this.activeOperations / this.options.maxConcurrency) * 100,
    };
  }
}

// Factory para bulkheads por servicio
export class BulkheadFactory {
  private static bulkheads = new Map<string, Bulkhead<any>>();

  static getBulkhead<T>(
    serviceName: string,
    config: keyof typeof BULKHEAD_CONFIGS = "normal"
  ): Bulkhead<T> {
    if (!this.bulkheads.has(serviceName)) {
      const options = BULKHEAD_CONFIGS[config];
      this.bulkheads.set(serviceName, new Bulkhead(serviceName, options));
    }

    return this.bulkheads.get(serviceName)!;
  }

  static getAllStats() {
    const stats: Array<ReturnType<Bulkhead<any>["getStats"]>> = [];

    for (const bulkhead of this.bulkheads.values()) {
      stats.push(bulkhead.getStats());
    }

    return stats;
  }
}
```

### 6. **Health Checks y Graceful Degradation**

```typescript
// src/services/healthCheck.ts
export interface HealthCheckResult {
  readonly service: string;
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly responseTimeMs: number;
  readonly details: Record<string, unknown>;
  readonly timestamp: string;
}

export interface ServiceHealthCheck {
  readonly name: string;
  readonly check: () => Promise<HealthCheckResult>;
  readonly interval: number;
  readonly criticalForSystem: boolean;
}

export class HealthMonitor {
  private results = new Map<string, HealthCheckResult>();
  private intervals = new Map<string, NodeJS.Timeout>();

  registerHealthCheck(healthCheck: ServiceHealthCheck): void {
    const { name, check, interval } = healthCheck;

    // Limpiar intervalo anterior si existe
    const existingInterval = this.intervals.get(name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Ejecutar check inmediatamente
    this.runHealthCheck(name, check);

    // Programar checks periódicos
    const intervalId = setInterval(() => {
      this.runHealthCheck(name, check);
    }, interval);

    this.intervals.set(name, intervalId);
  }

  private async runHealthCheck(
    name: string,
    check: () => Promise<HealthCheckResult>
  ): Promise<void> {
    try {
      const result = await check();
      this.results.set(name, result);

      if (result.status === "unhealthy") {
        console.error(`Health check failed for service [${name}]`, result);
      }
    } catch (error) {
      const errorResult: HealthCheckResult = {
        service: name,
        status: "unhealthy",
        responseTimeMs: 0,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      };

      this.results.set(name, errorResult);
      console.error(`Health check exception for service [${name}]`, error);
    }
  }

  getSystemHealth(): {
    status: "healthy" | "degraded" | "unhealthy";
    services: HealthCheckResult[];
    criticalServicesDown: string[];
  } {
    const services = Array.from(this.results.values());
    const criticalServicesDown = services
      .filter((s) => s.status === "unhealthy")
      .map((s) => s.service);

    let systemStatus: "healthy" | "degraded" | "unhealthy";

    if (criticalServicesDown.length === 0) {
      systemStatus = services.some((s) => s.status === "degraded")
        ? "degraded"
        : "healthy";
    } else {
      systemStatus = "unhealthy";
    }

    return {
      status: systemStatus,
      services,
      criticalServicesDown,
    };
  }
}

// Health checks específicos para servicios médicos
export const MEDICAL_HEALTH_CHECKS: ServiceHealthCheck[] = [
  {
    name: "supabase-database",
    criticalForSystem: true,
    interval: 30000,
    check: async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();

      try {
        // Test de conexión simple
        const { data, error } = await supabase
          .from("health_check")
          .select("count")
          .single();

        if (error) throw error;

        return {
          service: "supabase-database",
          status: "healthy",
          responseTimeMs: Date.now() - startTime,
          details: { connectionPool: "active", queryResult: data },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          service: "supabase-database",
          status: "unhealthy",
          responseTimeMs: Date.now() - startTime,
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date().toISOString(),
        };
      }
    },
  },

  {
    name: "google-healthcare-api",
    criticalForSystem: false,
    interval: 60000,
    check: async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();

      try {
        // Ping endpoint o test de autenticación
        const response = await fetch(
          "https://healthcare.googleapis.com/v1/projects/test/locations",
          {
            headers: { Authorization: `Bearer ${await getGoogleToken()}` },
          }
        );

        const status = response.status === 200 ? "healthy" : "degraded";

        return {
          service: "google-healthcare-api",
          status,
          responseTimeMs: Date.now() - startTime,
          details: { httpStatus: response.status },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          service: "google-healthcare-api",
          status: "unhealthy",
          responseTimeMs: Date.now() - startTime,
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date().toISOString(),
        };
      }
    },
  },
];
```

### 7. **Servicio Integrado de Resiliencia**

```typescript
// src/services/resilience.ts
export class ResilienceService {
  private circuitBreakers = new Map<string, CircuitBreaker<any>>();
  private bulkheads = new Map<string, Bulkhead<any>>();
  private healthMonitor = new HealthMonitor();

  constructor() {
    this.setupHealthChecks();
  }

  // Método principal para ejecutar operaciones con todas las protecciones
  async executeResilient<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      retryConfig?: keyof typeof RETRY_CONFIGS;
      circuitBreakerConfig?: keyof typeof CIRCUIT_BREAKER_CONFIGS;
      bulkheadConfig?: keyof typeof BULKHEAD_CONFIGS;
      fallbackChain?: FallbackChain<T>;
      timeoutMs?: number;
    } = {}
  ): Promise<Result<T, string>> {
    const {
      retryConfig = "normal",
      circuitBreakerConfig = "normal",
      bulkheadConfig = "normal",
      fallbackChain,
      timeoutMs,
    } = options;

    try {
      // 1. Aplicar timeout si se especifica
      const timedOperation = timeoutMs
        ? this.withTimeout(operation, timeoutMs)
        : operation;

      // 2. Aplicar bulkhead
      const bulkhead = BulkheadFactory.getBulkhead(
        operationName,
        bulkheadConfig
      );
      const bulkheadOperation = () => bulkhead.execute(timedOperation);

      // 3. Aplicar circuit breaker
      const circuitBreaker = CircuitBreakerFactory.getBreaker(
        operationName,
        circuitBreakerConfig
      );
      const circuitOperation = () => circuitBreaker.execute(bulkheadOperation);

      // 4. Aplicar retry
      const retryOptions = {
        ...RETRY_CONFIGS[retryConfig],
        retryCondition: isRetryableError,
        onRetry: (error: Error, attempt: number) => {
          console.warn(`Operation [${operationName}] retry ${attempt}`, {
            error: error.message,
            circuitState: circuitBreaker.getState(),
          });
        },
      };

      const result = await withRetry(circuitOperation, retryOptions);
      return { success: true, data: result };
    } catch (error) {
      console.error(
        `Operation [${operationName}] failed after all resilience measures`,
        {
          error: error instanceof Error ? error.message : String(error),
          circuitState: this.circuitBreakers.get(operationName)?.getState(),
        }
      );

      // 5. Intentar fallback como último recurso
      if (fallbackChain) {
        console.info(`Attempting fallback for operation [${operationName}]`);
        return await fallbackChain.execute();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): () => Promise<T> {
    return async () => {
      return Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);
    };
  }

  private setupHealthChecks(): void {
    MEDICAL_HEALTH_CHECKS.forEach((healthCheck) => {
      this.healthMonitor.registerHealthCheck(healthCheck);
    });
  }

  // Endpoint para status de resiliencia
  getResilienceStatus() {
    return {
      healthChecks: this.healthMonitor.getSystemHealth(),
      circuitBreakers: CircuitBreakerFactory.getAllBreakerStates(),
      bulkheads: BulkheadFactory.getAllStats(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Instancia singleton
export const resilienceService = new ResilienceService();
```

---

## Buenas Prácticas Implementadas

### **Estrategia de Timeouts Diferenciados**

- ✅ Timeouts específicos por tipo de operación
- ✅ Configuración centralizada y tipada
- ✅ Timeouts más cortos para operaciones críticas

### **Retry Inteligente**

- ✅ Backoff exponencial con jitter para evitar thundering herd
- ✅ Condiciones de retry configurables por tipo de error
- ✅ Logging detallado de intentos de retry
- ✅ Límites máximos para evitar cascadas

### **Circuit Breaker por Criticidad**

- ✅ Estados bien definidos con transiciones claras
- ✅ Configuración por nivel de criticidad del servicio
- ✅ Métricas detalladas para observabilidad
- ✅ Recovery automático con validación

### **Fallbacks Seguros Médicos**

- ✅ **NUNCA** devolver datos médicos inventados
- ✅ Degradación graceful con funcionalidad limitada
- ✅ Cadena de fallbacks por prioridad
- ✅ Verificación de salud de cada estrategia

### **Aislamiento de Recursos**

- ✅ Bulkhead pattern para limitar impacto de fallos
- ✅ Pools separados por criticidad de servicio
- ✅ Gestión de cola con timeouts
- ✅ Métricas de utilización de recursos

### **Monitoreo de Salud**

- ✅ Health checks automáticos y programados
- ✅ Diferenciación entre servicios críticos y no críticos
- ✅ Estado del sistema basado en servicios críticos
- ✅ Logging estructurado de eventos de salud

---

## Ejemplos de Uso en Producción

### **API de Análisis Médico**

```typescript
// src/api/medical-analysis.ts
export async function performMedicalAnalysis(
  sessionId: string,
  imageUrls: string[]
): Promise<ApiResponse<AnalysisResults>> {
  const fallbackChain = DatabaseFallbacks.createAnalysisResultsFallback();

  const result = await resilienceService.executeResilient(
    "medical-analysis",
    async () => {
      // Operación principal con APIs externas
      const analysis = await googleHealthcareAPI.analyzeImages(imageUrls);
      await supabase.from("medical_analyses").insert({
        sessionId,
        results: analysis,
        status: "completed",
      });
      return analysis;
    },
    {
      retryConfig: "critical",
      circuitBreakerConfig: "critical",
      bulkheadConfig: "critical",
      fallbackChain,
      timeoutMs: TIMEOUT_CONFIG.externalApis.imageAnalysis,
    }
  );

  if (result.success) {
    return {
      success: true,
      data: result.data,
      error: null,
      timestamp: new Date().toISOString(),
    };
  } else {
    return {
      success: false,
      data: null,
      error: { code: "ANALYSIS_FAILED", message: result.error },
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## Scripts de Monitoreo

### **Health Check Endpoint**

```typescript
// src/pages/api/health.ts
export default async function handler(req: NextRequest) {
  const status = resilienceService.getResilienceStatus();

  const httpStatus =
    status.healthChecks.status === "healthy"
      ? 200
      : status.healthChecks.status === "degraded"
      ? 200
      : 503;

  return Response.json(status, { status: httpStatus });
}
```

---

## Entregables

- ✅ Sistema de retry con backoff exponencial y jitter
- ✅ Circuit breakers configurados por criticidad
- ✅ Fallbacks seguros que nunca comprometen datos médicos
- ✅ Bulkhead pattern para aislamiento de recursos
- ✅ Health checks automáticos con alertas
- ✅ Timeouts diferenciados por tipo de operación
- ✅ Servicio integrado de resiliencia
- ✅ Métricas detalladas para observabilidad
- ✅ Tests de resiliencia con inyección de fallos
- ✅ Documentación de configuración y uso
