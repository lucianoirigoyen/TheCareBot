// src/utils/bulkhead.ts
export interface BulkheadOptions {
  readonly maxConcurrency: number;
  readonly queueSize: number;
  readonly timeoutMs: number;
  readonly onQueueFull?: () => void;
  readonly onTimeout?: (operation: string) => void;
}

export const BULKHEAD_CONFIGS = {
  critical: { 
    maxConcurrency: 10, 
    queueSize: 50, 
    timeoutMs: 5000 
  },
  normal: { 
    maxConcurrency: 5, 
    queueSize: 20, 
    timeoutMs: 10000 
  },
  background: { 
    maxConcurrency: 2, 
    queueSize: 10, 
    timeoutMs: 30000 
  },
} as const;

export type BulkheadConfig = keyof typeof BULKHEAD_CONFIGS;

interface QueuedOperation<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
  enqueuedAt: number;
}

export class Bulkhead<T> {
  private activeOperations = 0;
  private queue: Array<QueuedOperation<T>> = [];
  private stats = {
    totalExecuted: 0,
    totalQueued: 0,
    totalTimeouts: 0,
    totalRejectedQueueFull: 0,
    averageExecutionTime: 0,
  };
  
  constructor(
    private readonly name: string,
    private readonly options: BulkheadOptions
  ) {}
  
  async execute(operation: () => Promise<T>): Promise<T> {
    // Check if queue is full
    if (this.queue.length >= this.options.queueSize) {
      this.stats.totalRejectedQueueFull++;
      this.options.onQueueFull?.();
      throw new Error(`Bulkhead [${this.name}] queue is full (${this.options.queueSize})`);
    }
    
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.stats.totalTimeouts++;
        this.options.onTimeout?.(this.name);
        this.removeFromQueue(queuedOp);
        reject(new Error(`Bulkhead [${this.name}] operation timeout after ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);
      
      const queuedOp: QueuedOperation<T> = {
        execute: operation,
        resolve,
        reject,
        timeoutId,
        enqueuedAt: Date.now(),
      };
      
      if (this.activeOperations < this.options.maxConcurrency) {
        // Execute immediately
        this.executeOperation(queuedOp);
      } else {
        // Add to queue
        this.queue.push(queuedOp);
        this.stats.totalQueued++;
        
        console.debug(`Operation queued in bulkhead [${this.name}]`, {
          queueLength: this.queue.length,
          activeOperations: this.activeOperations,
          maxConcurrency: this.options.maxConcurrency,
        });
      }
    });
  }
  
  private async executeOperation(queuedOp: QueuedOperation<T>): Promise<void> {
    this.activeOperations++;
    const startTime = Date.now();
    
    try {
      const result = await queuedOp.execute();
      clearTimeout(queuedOp.timeoutId);
      
      // Update stats
      const executionTime = Date.now() - startTime;
      this.updateExecutionStats(executionTime);
      
      queuedOp.resolve(result);
      
    } catch (error) {
      clearTimeout(queuedOp.timeoutId);
      queuedOp.reject(error instanceof Error ? error : new Error(String(error)));
      
    } finally {
      this.activeOperations--;
      this.processQueue();
    }
  }
  
  private processQueue(): void {
    if (this.queue.length > 0 && this.activeOperations < this.options.maxConcurrency) {
      const nextOperation = this.queue.shift();
      if (nextOperation) {
        this.executeOperation(nextOperation);
      }
    }
  }
  
  private removeFromQueue(targetOp: QueuedOperation<T>): void {
    const index = this.queue.findIndex(op => op === targetOp);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
  }
  
  private updateExecutionStats(executionTime: number): void {
    this.stats.totalExecuted++;
    this.stats.averageExecutionTime = 
      ((this.stats.averageExecutionTime * (this.stats.totalExecuted - 1)) + executionTime) / 
      this.stats.totalExecuted;
  }
  
  getStats() {
    return {
      name: this.name,
      activeOperations: this.activeOperations,
      queuedOperations: this.queue.length,
      utilizationPercent: (this.activeOperations / this.options.maxConcurrency) * 100,
      config: this.options,
      stats: { ...this.stats },
      queueUtilizationPercent: (this.queue.length / this.options.queueSize) * 100,
    };
  }
  
  /**
   * Get detailed queue information
   */
  getQueueInfo() {
    const now = Date.now();
    return {
      length: this.queue.length,
      maxSize: this.options.queueSize,
      averageWaitTime: this.queue.length > 0 
        ? this.queue.reduce((sum, op) => sum + (now - op.enqueuedAt), 0) / this.queue.length
        : 0,
      oldestEnqueuedAt: this.queue.length > 0 
        ? Math.min(...this.queue.map(op => op.enqueuedAt))
        : null,
    };
  }
  
  /**
   * Clear all queued operations (emergency)
   */
  clearQueue(reason: string = 'Manual clear'): void {
    const clearedOperations = this.queue.length;
    
    this.queue.forEach(op => {
      clearTimeout(op.timeoutId);
      op.reject(new Error(`Operation cancelled due to queue clear: ${reason}`));
    });
    
    this.queue = [];
    
    console.warn(`Bulkhead [${this.name}] queue cleared: ${clearedOperations} operations cancelled`, {
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Factory for creating and managing bulkheads by service
 */
export class BulkheadFactory {
  private static bulkheads = new Map<string, Bulkhead<any>>();
  
  static getBulkhead<T>(
    serviceName: string,
    config: BulkheadConfig = 'normal'
  ): Bulkhead<T> {
    if (!this.bulkheads.has(serviceName)) {
      const options = {
        ...BULKHEAD_CONFIGS[config],
        onQueueFull: () => {
          console.warn(`Bulkhead [${serviceName}] queue is full - rejecting new operations`);
        },
        onTimeout: (operation: string) => {
          console.error(`Bulkhead [${operation}] operation timed out`);
        },
      };
      
      this.bulkheads.set(serviceName, new Bulkhead(serviceName, options));
    }
    
    return this.bulkheads.get(serviceName)!;
  }
  
  static getAllStats() {
    const stats: Array<ReturnType<Bulkhead<any>['getStats']>> = [];
    
    for (const bulkhead of this.bulkheads.values()) {
      stats.push(bulkhead.getStats());
    }
    
    return stats;
  }
  
  static getSystemUtilization() {
    const stats = this.getAllStats();
    
    if (stats.length === 0) {
      return {
        averageUtilization: 0,
        maxUtilization: 0,
        totalActiveOperations: 0,
        totalQueuedOperations: 0,
        services: [],
      };
    }
    
    const totalUtilization = stats.reduce((sum, stat) => sum + stat.utilizationPercent, 0);
    const maxUtilization = Math.max(...stats.map(stat => stat.utilizationPercent));
    const totalActive = stats.reduce((sum, stat) => sum + stat.activeOperations, 0);
    const totalQueued = stats.reduce((sum, stat) => sum + stat.queuedOperations, 0);
    
    return {
      averageUtilization: totalUtilization / stats.length,
      maxUtilization,
      totalActiveOperations: totalActive,
      totalQueuedOperations: totalQueued,
      services: stats.map(stat => ({
        name: stat.name,
        utilization: stat.utilizationPercent,
        active: stat.activeOperations,
        queued: stat.queuedOperations,
      })),
    };
  }
  
  /**
   * Emergency: Clear all queues across all bulkheads
   */
  static clearAllQueues(reason: string = 'System emergency'): void {
    for (const bulkhead of this.bulkheads.values()) {
      bulkhead.clearQueue(reason);
    }
    
    console.error(`All bulkhead queues cleared due to: ${reason}`);
  }
  
  /**
   * Get services that are at high utilization
   */
  static getHighUtilizationServices(threshold: number = 80): string[] {
    return this.getAllStats()
      .filter(stat => stat.utilizationPercent >= threshold)
      .map(stat => stat.name);
  }
}