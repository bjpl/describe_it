import PQueue from 'p-queue';
import { EventEmitter } from 'events';

export interface BatchRequest<T = any> {
  id: string;
  data: T;
  priority: number;
  timestamp: Date;
  timeout?: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export interface BatchProcessorConfig {
  batchSize: number;
  maxBatchWaitMs: number;
  maxConcurrentBatches: number;
  priority?: boolean;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface BatchMetrics {
  totalRequests: number;
  batchedRequests: number;
  averageBatchSize: number;
  averageWaitTime: number;
  successRate: number;
  errors: number;
}

export abstract class BatchProcessor<TInput, TOutput> extends EventEmitter {
  protected config: BatchProcessorConfig;
  protected queue: PQueue;
  protected pendingRequests: Map<string, BatchRequest<TInput>> = new Map();
  protected batchTimer?: NodeJS.Timeout;
  protected metrics: BatchMetrics = {
    totalRequests: 0,
    batchedRequests: 0,
    averageBatchSize: 0,
    averageWaitTime: 0,
    successRate: 0,
    errors: 0,
  };

  constructor(config: Partial<BatchProcessorConfig> = {}) {
    super();
    
    this.config = {
      batchSize: 10,
      maxBatchWaitMs: 100,
      maxConcurrentBatches: 3,
      priority: true,
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      ...config,
    };

    this.queue = new PQueue({
      concurrency: this.config.maxConcurrentBatches,
      timeout: this.config.timeoutMs,
    });

    this.setupMetrics();
  }

  private setupMetrics(): void {
    this.queue.on('completed', () => {
      this.emit('batch:completed');
    });

    this.queue.on('error', (error) => {
      this.metrics.errors++;
      this.emit('batch:error', error);
    });
  }

  abstract processBatch(requests: BatchRequest<TInput>[]): Promise<TOutput[]>;

  async process(data: TInput, priority: number = 0, timeout?: number): Promise<TOutput> {
    return new Promise<TOutput>((resolve, reject) => {
      const request: BatchRequest<TInput> = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data,
        priority,
        timestamp: new Date(),
        timeout,
        resolve,
        reject,
      };

      this.metrics.totalRequests++;
      this.pendingRequests.set(request.id, request);

      // Set up timeout if specified
      if (timeout) {
        setTimeout(() => {
          if (this.pendingRequests.has(request.id)) {
            this.pendingRequests.delete(request.id);
            reject(new Error(`Request timeout after ${timeout}ms`));
          }
        }, timeout);
      }

      this.scheduleBatch();
    });
  }

  private scheduleBatch(): void {
    // If we have enough requests or no timer is running, process immediately
    if (this.pendingRequests.size >= this.config.batchSize) {
      this.processPendingBatch();
      return;
    }

    // Start timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processPendingBatch();
      }, this.config.maxBatchWaitMs);
    }
  }

  private processPendingBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.pendingRequests.size === 0) return;

    // Get requests for this batch
    const requests = Array.from(this.pendingRequests.values());
    
    // Sort by priority if enabled
    if (this.config.priority) {
      requests.sort((a, b) => b.priority - a.priority);
    }

    // Take up to batchSize requests
    const batchRequests = requests.slice(0, this.config.batchSize);
    
    // Remove processed requests from pending
    batchRequests.forEach(req => this.pendingRequests.delete(req.id));

    // Update metrics
    this.metrics.batchedRequests += batchRequests.length;
    this.updateAverageBatchSize(batchRequests.length);
    this.updateAverageWaitTime(batchRequests);

    // Add to processing queue
    this.queue.add(() => this.executeBatch(batchRequests));

    // If there are still pending requests, schedule another batch
    if (this.pendingRequests.size > 0) {
      this.scheduleBatch();
    }
  }

  private async executeBatch(requests: BatchRequest<TInput>[]): Promise<void> {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts + 1;

    while (attempt < maxAttempts) {
      try {
        const results = await this.processBatch(requests);
        
        // Resolve all requests with their results
        requests.forEach((request, index) => {
          if (results[index] !== undefined) {
            request.resolve(results[index]);
          } else {
            request.reject(new Error('No result for request'));
          }
        });

        // Update success rate
        this.updateSuccessRate(requests.length, 0);
        return;

      } catch (error) {
        attempt++;
        
        if (attempt >= maxAttempts) {
          // Final attempt failed, reject all requests
          requests.forEach(request => 
            request.reject(error instanceof Error ? error : new Error(String(error)))
          );
          this.updateSuccessRate(0, requests.length);
          this.metrics.errors += requests.length;
        } else {
          // Wait before retry
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelayMs * attempt)
          );
        }
      }
    }
  }

  private updateAverageBatchSize(batchSize: number): void {
    const totalBatches = Math.ceil(this.metrics.batchedRequests / this.metrics.averageBatchSize) || 1;
    this.metrics.averageBatchSize = 
      (this.metrics.averageBatchSize * (totalBatches - 1) + batchSize) / totalBatches;
  }

  private updateAverageWaitTime(requests: BatchRequest<TInput>[]): void {
    const now = new Date();
    const totalWaitTime = requests.reduce(
      (sum, req) => sum + (now.getTime() - req.timestamp.getTime()), 
      0
    );
    const averageWaitTime = totalWaitTime / requests.length;

    const totalProcessedRequests = this.metrics.totalRequests - this.pendingRequests.size;
    this.metrics.averageWaitTime = 
      (this.metrics.averageWaitTime * (totalProcessedRequests - requests.length) + totalWaitTime) 
      / totalProcessedRequests;
  }

  private updateSuccessRate(successful: number, failed: number): void {
    const totalProcessed = this.metrics.totalRequests - this.pendingRequests.size;
    const totalSuccessful = totalProcessed - this.metrics.errors + successful - failed;
    this.metrics.successRate = totalSuccessful / totalProcessed;
  }

  getMetrics(): BatchMetrics {
    return { ...this.metrics };
  }

  getQueueStats() {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused,
    };
  }

  async drain(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Process any remaining requests
    if (this.pendingRequests.size > 0) {
      this.processPendingBatch();
    }

    await this.queue.onIdle();
  }

  async clear(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(request => 
      request.reject(new Error('Batch processor cleared'))
    );
    this.pendingRequests.clear();

    this.queue.clear();
  }
}

// Specialized batch processor for OpenAI vision descriptions
export interface VisionDescriptionRequest {
  imageUrl: string;
  prompt?: string;
  model?: string;
  maxTokens?: number;
}

export interface VisionDescriptionResponse {
  description: string;
  confidence?: number;
  processingTime: number;
}

export class VisionDescriptionBatchProcessor extends BatchProcessor<
  VisionDescriptionRequest, 
  VisionDescriptionResponse
> {
  private openAIClient: any;

  constructor(
    openAIClient: any,
    config: Partial<BatchProcessorConfig> = {}
  ) {
    super({
      batchSize: 5, // Smaller batches for vision API
      maxBatchWaitMs: 200,
      maxConcurrentBatches: 2,
      ...config,
    });
    
    this.openAIClient = openAIClient;
  }

  async processBatch(requests: BatchRequest<VisionDescriptionRequest>[]): Promise<VisionDescriptionResponse[]> {
    const startTime = Date.now();
    
    // Process requests in parallel but respect rate limits
    const promises = requests.map(async (request, index) => {
      try {
        const response = await this.openAIClient.chat.completions.create({
          model: request.data.model || 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: request.data.prompt || 'Describe this image in detail.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: request.data.imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: request.data.maxTokens || 500,
        });

        const processingTime = Date.now() - startTime;
        
        return {
          description: response.choices[0]?.message?.content || '',
          confidence: this.calculateConfidence(response),
          processingTime,
        };
      } catch (error) {
        throw new Error(`Vision API error for request ${index}: ${error}`);
      }
    });

    return Promise.all(promises);
  }

  private calculateConfidence(response: any): number {
    // Simple confidence calculation based on response completeness
    const content = response.choices[0]?.message?.content || '';
    const finishReason = response.choices[0]?.finish_reason;
    
    if (finishReason === 'stop' && content.length > 50) {
      return 0.9;
    } else if (finishReason === 'stop') {
      return 0.7;
    } else if (finishReason === 'length') {
      return 0.6;
    }
    
    return 0.5;
  }
}

// Export utility function to create optimized batch processor
export function createVisionBatchProcessor(
  openAIClient: any,
  config?: Partial<BatchProcessorConfig>
): VisionDescriptionBatchProcessor {
  return new VisionDescriptionBatchProcessor(openAIClient, config);
}