// src/utils/circuit-breaker.ts
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;    // Failures to open
  readonly timeWindowMs: number;        // Time window to count failures
  readonly recoveryTimeoutMs: number;   // Time before attempting recovery
  readonly successThreshold: number;    // Successes to close from half-open
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

export type CircuitBreakerConfig = keyof typeof CIRCUIT_BREAKER_CONFIGS;

interface CircuitMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  failureHistory: number[]; // Timestamps of recent failures
}

export class CircuitBreaker<T> {
  private state: CircuitState = 'closed';
  private metrics: CircuitMetrics = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
    totalRequests: 0,
    failureHistory: [],
  };
  
  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {}
  
  async execute(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if it's time to attempt recovery
      if (Date.now() - this.metrics.lastFailureTime >= this.options.recoveryTimeoutMs) {
        this.changeState('half-open', 'Recovery timeout reached');
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN - too many failures`);
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
    
    if (this.state === 'half-open') {
      if (this.metrics.successes >= this.options.successThreshold) {
        this.changeState('closed', `${this.options.successThreshold} successes in half-open`);
        this.resetMetrics();
      }
    }
  }
  
  private onFailure(error: Error): void {
    this.metrics.failures++;
    this.metrics.lastFailureTime = Date.now();
    this.metrics.failureHistory.push(this.metrics.lastFailureTime);
    
    // Clean old failure history outside time window
    this.cleanFailureHistory();
    
    if (this.state === 'closed' || this.state === 'half-open') {
      const failuresInWindow = this.getFailuresInTimeWindow();
      
      if (failuresInWindow >= this.options.failureThreshold) {
        this.changeState('open', `${failuresInWindow} failures in time window (${this.options.timeWindowMs}ms)`);
      }
    }
  }
  
  private getFailuresInTimeWindow(): number {
    const now = Date.now();
    const windowStart = now - this.options.timeWindowMs;
    
    return this.metrics.failureHistory.filter(timestamp => timestamp >= windowStart).length;
  }
  
  private cleanFailureHistory(): void {
    const now = Date.now();
    const windowStart = now - this.options.timeWindowMs;
    
    this.metrics.failureHistory = this.metrics.failureHistory.filter(
      timestamp => timestamp >= windowStart
    );
  }
  
  private changeState(newState: CircuitState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    
    console.info(`Circuit breaker [${this.name}] state change: ${oldState} → ${newState}`, {
      reason,
      metrics: this.getPublicMetrics(),
      timestamp: new Date().toISOString(),
    });
    
    this.options.onStateChange?.(newState, reason);
  }
  
  private resetMetrics(): void {
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: Date.now(),
      totalRequests: 0,
      failureHistory: [],
    };
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  getMetrics(): Readonly<CircuitMetrics> {
    return { ...this.metrics };
  }
  
  private getPublicMetrics() {
    return {
      failures: this.metrics.failures,
      successes: this.metrics.successes,
      totalRequests: this.metrics.totalRequests,
      failuresInWindow: this.getFailuresInTimeWindow(),
      lastFailureTime: this.metrics.lastFailureTime,
      lastSuccessTime: this.metrics.lastSuccessTime,
    };
  }
  
  /**
   * Force circuit breaker to specific state (for testing)
   */
  forceState(state: CircuitState, reason: string = 'Forced'): void {
    this.changeState(state, reason);
  }
  
  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = 'closed';
    this.resetMetrics();
    console.info(`Circuit breaker [${this.name}] reset to closed state`);
  }
}

/**
 * Factory for creating and managing circuit breakers
 */
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker<any>>();
  
  static getBreaker<T>(
    name: string,
    config: CircuitBreakerConfig = 'normal'
  ): CircuitBreaker<T> {
    if (!this.breakers.has(name)) {
      const options = {
        ...CIRCUIT_BREAKER_CONFIGS[config],
        onStateChange: (state: CircuitState, reason: string) => {
          console.warn(`Circuit breaker [${name}] changed to ${state}: ${reason}`);
          
          // Emit metrics or alerts for monitoring systems
          if (state === 'open') {
            console.error(`ALERT: Circuit breaker [${name}] is now OPEN - service degraded`);
          } else if (state === 'closed') {
            console.info(`Recovery: Circuit breaker [${name}] is now CLOSED - service restored`);
          }
        },
      };
      
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
  
  static getBreakerMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = {
        state: breaker.getState(),
        ...breaker.getMetrics(),
      };
    }
    
    return metrics;
  }
  
  static resetAllBreakers(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    
    console.info('All circuit breakers reset');
  }
  
  /**
   * Get circuit breakers that are currently open (degraded services)
   */
  static getOpenBreakers(): string[] {
    const openBreakers: string[] = [];
    
    for (const [name, breaker] of this.breakers) {
      if (breaker.getState() === 'open') {
        openBreakers.push(name);
      }
    }
    
    return openBreakers;
  }
}