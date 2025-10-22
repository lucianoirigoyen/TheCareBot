// src/services/health-monitor.ts
export interface HealthCheckResult {
  readonly service: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly responseTimeMs: number;
  readonly details: Record<string, unknown>;
  readonly timestamp: string;
  readonly version?: string;
  readonly dependencies?: HealthCheckResult[];
}

export interface ServiceHealthCheck {
  readonly name: string;
  readonly check: () => Promise<HealthCheckResult>;
  readonly interval: number;
  readonly criticalForSystem: boolean;
  readonly timeout?: number;
}

export class HealthMonitor {
  private results = new Map<string, HealthCheckResult>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private checks = new Map<string, ServiceHealthCheck>();
  
  registerHealthCheck(healthCheck: ServiceHealthCheck): void {
    const { name, check, interval } = healthCheck;
    
    // Store the check for later reference
    this.checks.set(name, healthCheck);
    
    // Clear existing interval if exists
    const existingInterval = this.intervals.get(name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Execute check immediately
    this.runHealthCheck(name, check, healthCheck.timeout);
    
    // Schedule periodic checks
    const intervalId = setInterval(() => {
      this.runHealthCheck(name, check, healthCheck.timeout);
    }, interval);
    
    this.intervals.set(name, intervalId);
    
    console.info(`Health check registered for service [${name}]`, {
      interval,
      critical: healthCheck.criticalForSystem,
      timeout: healthCheck.timeout,
    });
  }
  
  private async runHealthCheck(
    name: string, 
    check: () => Promise<HealthCheckResult>, 
    timeoutMs: number = 10000
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Wrap check with timeout
      const result = await Promise.race([
        check(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
        ),
      ]);
      
      this.results.set(name, result);
      
      if (result.status === 'unhealthy') {
        console.error(`Health check failed for service [${name}]`, {
          status: result.status,
          responseTime: result.responseTimeMs,
          details: result.details,
        });
      } else if (result.status === 'degraded') {
        console.warn(`Health check degraded for service [${name}]`, {
          responseTime: result.responseTimeMs,
          details: result.details,
        });
      }
      
    } catch (error) {
      const errorResult: HealthCheckResult = {
        service: name,
        status: 'unhealthy',
        responseTimeMs: Date.now() - startTime,
        details: { 
          error: error instanceof Error ? error.message : String(error),
          checkDuration: Date.now() - startTime,
        },
        timestamp: new Date().toISOString(),
      };
      
      this.results.set(name, errorResult);
      console.error(`Health check exception for service [${name}]`, {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }
  
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    criticalServicesDown: string[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const services = Array.from(this.results.values());
    const criticalChecks = Array.from(this.checks.values())
      .filter(check => check.criticalForSystem)
      .map(check => check.name);
    
    const criticalServicesDown = services
      .filter(s => s.status === 'unhealthy' && criticalChecks.includes(s.service))
      .map(s => s.service);
    
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (criticalServicesDown.length > 0) {
      systemStatus = 'unhealthy';
    } else if (services.some(s => s.status === 'unhealthy' || s.status === 'degraded')) {
      systemStatus = 'degraded';
    } else {
      systemStatus = 'healthy';
    }
    
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
    };
    
    return {
      status: systemStatus,
      services,
      criticalServicesDown,
      summary,
    };
  }
  
  getServiceHealth(serviceName: string): HealthCheckResult | null {
    return this.results.get(serviceName) || null;
  }
  
  /**
   * Force run a specific health check
   */
  async runCheckNow(serviceName: string): Promise<HealthCheckResult | null> {
    const healthCheck = this.checks.get(serviceName);
    if (!healthCheck) {
      console.warn(`Health check not found for service [${serviceName}]`);
      return null;
    }
    
    await this.runHealthCheck(serviceName, healthCheck.check, healthCheck.timeout);
    return this.getServiceHealth(serviceName);
  }
  
  /**
   * Stop monitoring a service
   */
  unregisterHealthCheck(serviceName: string): void {
    const interval = this.intervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(serviceName);
    }
    
    this.results.delete(serviceName);
    this.checks.delete(serviceName);
    
    console.info(`Health check unregistered for service [${serviceName}]`);
  }
  
  /**
   * Stop all health monitoring
   */
  stopAllChecks(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    
    this.intervals.clear();
    console.info('All health checks stopped');
  }
  
  /**
   * Get services that haven't been checked recently
   */
  getStaleServices(maxAgeMs: number = 300000): string[] { // 5 minutes default
    const now = Date.now();
    const staleServices: string[] = [];
    
    for (const [serviceName, result] of this.results) {
      const resultAge = now - new Date(result.timestamp).getTime();
      if (resultAge > maxAgeMs) {
        staleServices.push(serviceName);
      }
    }
    
    return staleServices;
  }
}

/**
 * Medical-specific health checks for TheCareBot
 */
export function createMedicalHealthChecks(): ServiceHealthCheck[] {
  return [
    {
      name: 'supabase-database',
      criticalForSystem: true,
      interval: 30000, // 30 seconds
      timeout: 5000,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
          // Simple connectivity test (would use actual Supabase client)
          const testQuery = { data: { count: 1 }, error: null };
          
          if (testQuery.error) throw new Error('Database connection failed');
          
          const responseTime = Date.now() - startTime;
          
          return {
            service: 'supabase-database',
            status: responseTime > 2000 ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            details: { 
              connectionPool: 'active', 
              queryResult: testQuery.data,
              slowQuery: responseTime > 2000,
            },
            timestamp: new Date().toISOString(),
          };
          
        } catch (error) {
          return {
            service: 'supabase-database',
            status: 'unhealthy',
            responseTimeMs: Date.now() - startTime,
            details: { 
              error: error instanceof Error ? error.message : String(error),
              connectionAttempted: true,
            },
            timestamp: new Date().toISOString(),
          };
        }
      },
    },
    
    {
      name: 'n8n-workflows',
      criticalForSystem: true,
      interval: 60000, // 1 minute
      timeout: 8000,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
          // Test n8n API availability (mock response)
          const mockResponse = { 
            status: 200, 
            data: { health: 'ok', workflows: 3 } 
          };
          
          if (mockResponse.status !== 200) {
            throw new Error(`n8n API returned status ${mockResponse.status}`);
          }
          
          const responseTime = Date.now() - startTime;
          
          return {
            service: 'n8n-workflows',
            status: responseTime > 3000 ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            details: { 
              availableWorkflows: mockResponse.data.workflows,
              apiHealth: mockResponse.data.health,
              slowResponse: responseTime > 3000,
            },
            timestamp: new Date().toISOString(),
          };
          
        } catch (error) {
          return {
            service: 'n8n-workflows',
            status: 'unhealthy',
            responseTimeMs: Date.now() - startTime,
            details: { 
              error: error instanceof Error ? error.message : String(error),
              workflowsAvailable: false,
            },
            timestamp: new Date().toISOString(),
          };
        }
      },
    },
    
    {
      name: 'google-healthcare-api',
      criticalForSystem: false, // Optional service
      interval: 120000, // 2 minutes
      timeout: 10000,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
          // Mock Google Healthcare API check
          const mockAuth = true;
          const mockResponse = { status: 200 };
          
          if (!mockAuth) {
            throw new Error('Google Healthcare API authentication failed');
          }
          
          const responseTime = Date.now() - startTime;
          const status = mockResponse.status === 200 ? 
            (responseTime > 5000 ? 'degraded' : 'healthy') : 'unhealthy';
          
          return {
            service: 'google-healthcare-api',
            status,
            responseTimeMs: responseTime,
            details: { 
              authenticated: mockAuth,
              httpStatus: mockResponse.status,
              quotaAvailable: true,
            },
            timestamp: new Date().toISOString(),
          };
          
        } catch (error) {
          return {
            service: 'google-healthcare-api',
            status: 'unhealthy',
            responseTimeMs: Date.now() - startTime,
            details: { 
              error: error instanceof Error ? error.message : String(error),
              authenticated: false,
            },
            timestamp: new Date().toISOString(),
          };
        }
      },
    },
    
    {
      name: 'redis-cache',
      criticalForSystem: false,
      interval: 45000, // 45 seconds
      timeout: 3000,
      check: async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        
        try {
          // Mock Redis ping
          const pingResult = 'PONG';
          
          if (pingResult !== 'PONG') {
            throw new Error('Redis ping failed');
          }
          
          const responseTime = Date.now() - startTime;
          
          return {
            service: 'redis-cache',
            status: responseTime > 1000 ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            details: { 
              ping: pingResult,
              connected: true,
              memoryUsage: '45MB',
            },
            timestamp: new Date().toISOString(),
          };
          
        } catch (error) {
          return {
            service: 'redis-cache',
            status: 'unhealthy',
            responseTimeMs: Date.now() - startTime,
            details: { 
              error: error instanceof Error ? error.message : String(error),
              connected: false,
            },
            timestamp: new Date().toISOString(),
          };
        }
      },
    },
  ];
}

// Singleton instance
export const healthMonitor = new HealthMonitor();