/**
 * RuVector Client Wrapper
 * Provides a type-safe interface to RuVector distributed vector database
 */

import { getVectorConfig } from './config';
import type {
  RuVectorConfig,
  VectorSearchOptions,
  VectorSearchResult,
  VectorDistance,
} from './types';
import { logger } from '@/lib/logger';

// Internal interfaces
interface Point {
  id: string;
  vector: number[];
  payload?: Record<string, unknown>;
}

interface SearchResult {
  id: string;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[];
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  version: string;
}

interface MetricsResult {
  collections: number;
  points: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface GraphResult {
  nodes: Array<{ id: string; labels: string[]; properties: Record<string, unknown> }>;
  edges: Array<{
    id: string;
    type: string;
    source: string;
    target: string;
    properties: Record<string, unknown>;
  }>;
}

interface RuVectorInstance {
  collections: {
    create: (config: {
      name: string;
      vectors: { size: number; distance: VectorDistance };
      onDiskPayload?: boolean;
    }) => Promise<void>;
    delete: (name: string) => Promise<void>;
    exists: (name: string) => Promise<boolean>;
    list: () => Promise<string[]>;
  };
  points: {
    upsert: (collection: string, points: Point[]) => Promise<void>;
    search: (
      collection: string,
      query: {
        vector: number[];
        limit: number;
        filter?: Record<string, unknown>;
        scoreThreshold?: number;
        withPayload?: boolean;
        withVector?: boolean;
      }
    ) => Promise<SearchResult[]>;
    delete: (collection: string, ids: string[]) => Promise<void>;
    get: (collection: string, ids: string[]) => Promise<Point[]>;
  };
  graph: {
    query: (cypher: string, params?: Record<string, unknown>) => Promise<GraphResult>;
    createNode: (node: {
      labels: string[];
      properties: Record<string, unknown>;
    }) => Promise<string>;
    createEdge: (edge: {
      type: string;
      source: string;
      target: string;
      properties?: Record<string, unknown>;
    }) => Promise<string>;
  };
  health: {
    check: () => Promise<HealthStatus>;
    metrics: () => Promise<MetricsResult>;
  };
}

class RuVectorClient {
  private static instance: RuVectorClient | null = null;
  private client: RuVectorInstance | null = null;
  private config: RuVectorConfig;
  private isConnectedFlag: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = getVectorConfig();
  }

  public static getInstance(): RuVectorClient {
    if (!RuVectorClient.instance) {
      RuVectorClient.instance = new RuVectorClient();
    }
    return RuVectorClient.instance;
  }

  public static resetInstance(): void {
    if (RuVectorClient.instance) {
      RuVectorClient.instance.disconnect();
      RuVectorClient.instance = null;
    }
  }

  public async connect(): Promise<void> {
    if (this.isConnectedFlag && this.client) return;
    if (!this.config.enabled) {
      logger.info('[RuVector] Vector search disabled');
      return;
    }

    try {
      const ruvectorModule = await import('ruvector').catch(() => null);
      if (ruvectorModule?.RuVector) {
        this.client = new ruvectorModule.RuVector({
          apiKey: this.config.apiKey,
          endpoint: this.config.endpoint,
        }) as unknown as RuVectorInstance;
      } else {
        this.client = this.createMockClient();
      }

      const health = await this.client.health.check();
      if (health.status === 'healthy') {
        this.isConnectedFlag = true;
        this.reconnectAttempts = 0;
        logger.info('[RuVector] Connected', { latency: health.latency });
        this.startHealthMonitoring();
        await this.ensureCollections();
      }
    } catch (error) {
      this.isConnectedFlag = false;
      logger.error('[RuVector] Connection failed', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), Math.pow(2, this.reconnectAttempts) * 1000);
      }
    }
  }

  public disconnect(): void {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    this.healthCheckInterval = null;
    this.client = null;
    this.isConnectedFlag = false;
  }

  public isReady(): boolean {
    return this.isConnectedFlag && this.client !== null;
  }
  public getClient(): RuVectorInstance | null {
    return this.client;
  }

  private async ensureCollections(): Promise<void> {
    if (!this.client) return;
    for (const collection of Object.values(this.config.collections)) {
      if (!(await this.client.collections.exists(collection))) {
        await this.client.collections.create({
          name: collection,
          vectors: { size: this.config.embedding.dimensions, distance: 'cosine' },
          onDiskPayload: true,
        });
      }
    }
  }

  public async createCollection(
    name: string,
    dimensions = this.config.embedding.dimensions,
    distance: VectorDistance = 'cosine'
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.collections.create({ name, vectors: { size: dimensions, distance } });
  }

  public async deleteCollection(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.collections.delete(name);
  }

  public async upsert(
    collection: string,
    points: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.points.upsert(
      collection,
      points.map(p => ({ id: p.id, vector: p.vector, payload: p.metadata }))
    );
  }

  public async search<T = Record<string, unknown>>(
    collection: string,
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult<T>[]> {
    if (!this.client) throw new Error('Not connected');
    const results = await this.client.points.search(collection, {
      vector,
      limit: options.limit || this.config.search.defaultLimit,
      scoreThreshold: options.threshold || this.config.search.minThreshold,
      withPayload: options.includeMetadata !== false,
      withVector: options.includeVectors === true,
      filter: this.buildFilter(options.filters),
    });
    return results.map(r => ({
      id: r.id,
      score: r.score,
      metadata: (r.payload || {}) as T,
      vector: r.vector,
    }));
  }

  public async delete(collection: string, ids: string[]): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.points.delete(collection, ids);
  }

  public async get(collection: string, ids: string[]): Promise<Point[]> {
    if (!this.client) throw new Error('Not connected');
    return await this.client.points.get(collection, ids);
  }

  public async graphQuery(cypher: string, params?: Record<string, unknown>): Promise<GraphResult> {
    if (!this.client) throw new Error('Not connected');
    return await this.client.graph.query(cypher, params);
  }

  public async createNode(labels: string[], properties: Record<string, unknown>): Promise<string> {
    if (!this.client) throw new Error('Not connected');
    return await this.client.graph.createNode({ labels, properties });
  }

  public async createEdge(
    type: string,
    source: string,
    target: string,
    properties?: Record<string, unknown>
  ): Promise<string> {
    if (!this.client) throw new Error('Not connected');
    return await this.client.graph.createEdge({ type, source, target, properties });
  }

  public async healthCheck(): Promise<HealthStatus> {
    if (!this.client) return { status: 'unhealthy', latency: -1, version: 'unknown' };
    return await this.client.health.check();
  }

  public async getMetrics(): Promise<MetricsResult | null> {
    return this.client ? await this.client.health.metrics() : null;
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (health.status !== 'healthy') logger.warn('[RuVector] Degraded');
      } catch {
        this.isConnectedFlag = false;
        this.connect();
      }
    }, 30000);
  }

  private buildFilter(
    filters?: VectorSearchOptions['filters']
  ): Record<string, unknown> | undefined {
    if (!filters?.length) return undefined;
    return {
      must: filters.map(f => {
        if (f.operator === 'eq') return { key: f.field, match: { value: f.value } };
        if (f.operator === 'in') return { key: f.field, match: { any: f.value } };
        if (['gt', 'gte', 'lt', 'lte'].includes(f.operator))
          return { key: f.field, range: { [f.operator]: f.value } };
        return { key: f.field, match: { text: f.value } };
      }),
    };
  }

  private createMockClient(): RuVectorInstance {
    const storage = new Map<string, Map<string, Point>>();
    const self = this;
    return {
      collections: {
        create: async c => {
          storage.set(c.name, new Map());
        },
        delete: async n => {
          storage.delete(n);
        },
        exists: async n => storage.has(n),
        list: async () => [...storage.keys()],
      },
      points: {
        upsert: async (c, pts) => {
          let coll = storage.get(c) || new Map();
          storage.set(c, coll);
          pts.forEach(p => coll.set(p.id, p));
        },
        search: async (c, q) => {
          const coll = storage.get(c);
          if (!coll) return [];
          return [...coll.entries()]
            .map(([id, p]) => ({
              id,
              score: self.cosineSimilarity(q.vector, p.vector),
              payload: p.payload,
              vector: q.withVector ? p.vector : undefined,
            }))
            .filter(r => r.score >= (q.scoreThreshold || 0))
            .sort((a, b) => b.score - a.score)
            .slice(0, q.limit);
        },
        delete: async (c, ids) => {
          const coll = storage.get(c);
          ids.forEach(id => coll?.delete(id));
        },
        get: async (c, ids) =>
          ids.map(id => storage.get(c)?.get(id)).filter((p): p is Point => !!p),
      },
      graph: {
        query: async () => ({ nodes: [], edges: [] }),
        createNode: async () => 'node_' + Date.now(),
        createEdge: async () => 'edge_' + Date.now(),
      },
      health: {
        check: async () => ({ status: 'healthy' as const, latency: 1, version: 'mock-1.0' }),
        metrics: async () => ({
          collections: storage.size,
          points: 0,
          memoryUsage: 0,
          cpuUsage: 0,
        }),
      },
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0,
      nA = 0,
      nB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      nA += a[i] * a[i];
      nB += b[i] * b[i];
    }
    const mag = Math.sqrt(nA) * Math.sqrt(nB);
    return mag === 0 ? 0 : dot / mag;
  }
}

export const vectorClient = RuVectorClient.getInstance();
export { RuVectorClient };
export async function initializeVectorClient(): Promise<void> {
  await vectorClient.connect();
}
export function isVectorClientReady(): boolean {
  return vectorClient.isReady();
}
