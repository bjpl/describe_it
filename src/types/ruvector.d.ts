/**
 * Type declarations for ruvector module
 * This is a placeholder for the future ruvector package
 */

declare module 'ruvector' {
  export interface RuVectorConfig {
    apiKey?: string;
    endpoint?: string;
  }

  export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
  }

  export interface Collection {
    name: string;
    dimensions: number;
    metric: 'cosine' | 'euclidean' | 'dot';
  }

  export interface Point {
    id: string;
    vector: number[];
    metadata?: Record<string, unknown>;
  }

  export interface SearchQuery {
    vector: number[];
    limit?: number;
    threshold?: number;
    filter?: Record<string, unknown>;
  }

  export interface SearchResult {
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }

  export class RuVector {
    constructor(config: RuVectorConfig);

    health: {
      check(): Promise<HealthCheckResult>;
    };

    collections: {
      create(name: string, config: { dimensions: number; metric: string }): Promise<Collection>;
      get(name: string): Promise<Collection | null>;
      delete(name: string): Promise<void>;
      exists(name: string): Promise<boolean>;
      list(): Promise<string[]>;
    };

    points: {
      upsert(collection: string, points: Point[]): Promise<void>;
      search(collection: string, query: SearchQuery): Promise<SearchResult[]>;
      get(collection: string, ids: string[]): Promise<Point[]>;
      delete(collection: string, ids: string[]): Promise<void>;
    };
  }
}
