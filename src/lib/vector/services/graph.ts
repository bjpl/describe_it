/**
 * GraphService
 * Knowledge graph operations for vocabulary relationships
 */

import { vectorClient } from '../client';
import type { GraphNode, GraphEdge, GraphQueryResult, GraphPath, IGraphService } from '../types';
import { GraphError } from '../types';
import { logger } from '@/lib/logger';

class GraphService implements IGraphService {
  private static instance: GraphService | null = null;

  private constructor() {}

  public static getInstance(): GraphService {
    if (!GraphService.instance) {
      GraphService.instance = new GraphService();
    }
    return GraphService.instance;
  }

  public static resetInstance(): void {
    GraphService.instance = null;
  }

  public async addNode(node: Omit<GraphNode, 'createdAt' | 'updatedAt'>): Promise<GraphNode> {
    if (!vectorClient.isReady()) {
      throw new GraphError('Vector client not connected');
    }

    try {
      const now = new Date();
      const nodeId = await vectorClient.createNode([node.type], {
        ...node.properties,
        id: node.id,
        embedding: node.embedding,
      });

      return {
        ...node,
        id: nodeId || node.id,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('[GraphService] Failed to add node', { error, node });
      throw new GraphError('Failed to add node', { node, error });
    }
  }

  public async addEdge(edge: Omit<GraphEdge, 'id'>): Promise<GraphEdge> {
    if (!vectorClient.isReady()) {
      throw new GraphError('Vector client not connected');
    }

    try {
      const edgeId = await vectorClient.createEdge(edge.type, edge.source, edge.target, {
        weight: edge.weight,
        ...edge.metadata,
      });

      return {
        ...edge,
        id: edgeId,
      };
    } catch (error) {
      logger.error('[GraphService] Failed to add edge', { error, edge });
      throw new GraphError('Failed to add edge', { edge, error });
    }
  }

  public async getNode(id: string): Promise<GraphNode | null> {
    if (!vectorClient.isReady()) {
      throw new GraphError('Vector client not connected');
    }

    try {
      const result = await vectorClient.graphQuery('MATCH (n) WHERE n.id = $id RETURN n', { id });

      if (result.nodes.length === 0) return null;

      const node = result.nodes[0];
      return {
        id: node.id,
        type: node.labels[0] as GraphNode['type'],
        properties: node.properties,
        embedding: node.properties.embedding as number[] | undefined,
        createdAt: new Date((node.properties.createdAt as string) || Date.now()),
        updatedAt: new Date((node.properties.updatedAt as string) || Date.now()),
      };
    } catch (error) {
      logger.error('[GraphService] Failed to get node', { error, id });
      throw new GraphError('Failed to get node', { id, error });
    }
  }

  public async getNeighbors(
    nodeId: string,
    depth: number = 1,
    edgeTypes?: string[]
  ): Promise<GraphQueryResult> {
    if (!vectorClient.isReady()) {
      throw new GraphError('Vector client not connected');
    }

    try {
      const edgeFilter = edgeTypes?.length ? `:${edgeTypes.join('|')}` : '';

      const result = await vectorClient.graphQuery(
        `MATCH (start)-[r${edgeFilter}*1..${depth}]-(neighbor)
         WHERE start.id = $nodeId
         RETURN DISTINCT neighbor, r`,
        { nodeId }
      );

      return this.transformGraphResult(result);
    } catch (error) {
      logger.error('[GraphService] Failed to get neighbors', { error, nodeId });
      throw new GraphError('Failed to get neighbors', { nodeId, error });
    }
  }

  public async findPath(
    sourceId: string,
    targetId: string,
    maxDepth: number = 5
  ): Promise<GraphPath | null> {
    if (!vectorClient.isReady()) {
      throw new GraphError('Vector client not connected');
    }

    try {
      const result = await vectorClient.graphQuery(
        `MATCH path = shortestPath((a)-[*1..${maxDepth}]-(b))
         WHERE a.id = $sourceId AND b.id = $targetId
         RETURN path`,
        { sourceId, targetId }
      );

      if (result.nodes.length === 0) return null;

      // Calculate total weight from edges
      const totalWeight = result.edges.reduce(
        (sum, edge) => sum + ((edge.properties.weight as number) || 1),
        0
      );

      return {
        nodes: result.nodes.map(n => n.id),
        edges: result.edges.map(e => e.id),
        totalWeight,
      };
    } catch (error) {
      logger.error('[GraphService] Failed to find path', { error, sourceId, targetId });
      throw new GraphError('Failed to find path', { sourceId, targetId, error });
    }
  }

  public async query(cypher: string, params?: Record<string, unknown>): Promise<GraphQueryResult> {
    if (!vectorClient.isReady()) {
      throw new GraphError('Vector client not connected');
    }

    try {
      const result = await vectorClient.graphQuery(cypher, params);
      return this.transformGraphResult(result);
    } catch (error) {
      logger.error('[GraphService] Query failed', { error, cypher });
      throw new GraphError('Query failed', { cypher, error });
    }
  }

  /**
   * Build vocabulary relationship graph
   */
  public async buildVocabularyGraph(
    vocabularyItems: Array<{
      id: string;
      word: string;
      language: string;
      embedding?: number[];
      translations?: Array<{ word: string; language: string }>;
      synonyms?: string[];
    }>
  ): Promise<{ nodesCreated: number; edgesCreated: number }> {
    let nodesCreated = 0;
    let edgesCreated = 0;

    for (const item of vocabularyItems) {
      // Create vocabulary node
      await this.addNode({
        id: item.id,
        type: 'vocabulary',
        properties: {
          word: item.word,
          language: item.language,
        },
        embedding: item.embedding,
      });
      nodesCreated++;

      // Create translation edges
      if (item.translations) {
        for (const translation of item.translations) {
          const translationId = `${translation.language}:${translation.word}`;

          // Create translation node if needed
          const existing = await this.getNode(translationId);
          if (!existing) {
            await this.addNode({
              id: translationId,
              type: 'vocabulary',
              properties: {
                word: translation.word,
                language: translation.language,
              },
            });
            nodesCreated++;
          }

          // Create translation edge
          await this.addEdge({
            source: item.id,
            target: translationId,
            type: 'translation',
            weight: 1.0,
            metadata: {
              sourceLanguage: item.language,
              targetLanguage: translation.language,
            },
          });
          edgesCreated++;
        }
      }

      // Create synonym edges
      if (item.synonyms) {
        for (const synonym of item.synonyms) {
          const synonymId = `${item.language}:${synonym}`;

          await this.addEdge({
            source: item.id,
            target: synonymId,
            type: 'synonym',
            weight: 0.9,
            metadata: { language: item.language },
          });
          edgesCreated++;
        }
      }
    }

    logger.info('[GraphService] Built vocabulary graph', { nodesCreated, edgesCreated });
    return { nodesCreated, edgesCreated };
  }

  /**
   * Find semantically related vocabulary
   */
  public async findRelatedVocabulary(
    vocabularyId: string,
    options: { maxResults?: number; minWeight?: number } = {}
  ): Promise<Array<{ id: string; word: string; relationship: string; weight: number }>> {
    const maxResults = options.maxResults || 10;
    const minWeight = options.minWeight || 0.5;

    const result = await this.query(
      `MATCH (v:vocabulary)-[r]-(related:vocabulary)
       WHERE v.id = $vocabularyId AND r.weight >= $minWeight
       RETURN related, type(r) as relationship, r.weight as weight
       ORDER BY weight DESC
       LIMIT $maxResults`,
      { vocabularyId, minWeight, maxResults }
    );

    return result.nodes.map((node, idx) => ({
      id: node.id,
      word: node.properties.word as string,
      relationship: result.edges[idx]?.type || 'related',
      weight: result.edges[idx]?.weight || 0,
    }));
  }

  /**
   * Record learning confusion between words
   */
  public async recordConfusion(userId: string, word1Id: string, word2Id: string): Promise<void> {
    // Check if confusion edge exists
    const existing = await this.query(
      `MATCH (w1:vocabulary)-[r:confused_with]-(w2:vocabulary)
       WHERE w1.id = $word1Id AND w2.id = $word2Id AND r.userId = $userId
       RETURN r`,
      { word1Id, word2Id, userId }
    );

    if (existing.edges.length > 0) {
      // Update existing confusion weight
      await this.query(
        `MATCH (w1:vocabulary)-[r:confused_with]-(w2:vocabulary)
         WHERE w1.id = $word1Id AND w2.id = $word2Id AND r.userId = $userId
         SET r.weight = r.weight + 0.1, r.count = r.count + 1
         RETURN r`,
        { word1Id, word2Id, userId }
      );
    } else {
      // Create new confusion edge
      await this.addEdge({
        source: word1Id,
        target: word2Id,
        type: 'confused_with',
        weight: 0.5,
        metadata: { userId, count: 1 },
      });
    }
  }

  private transformGraphResult(result: {
    nodes: Array<{ id: string; labels: string[]; properties: Record<string, unknown> }>;
    edges: Array<{
      id: string;
      type: string;
      source: string;
      target: string;
      properties: Record<string, unknown>;
    }>;
  }): GraphQueryResult {
    return {
      nodes: result.nodes.map(n => ({
        id: n.id,
        type: n.labels[0] as GraphNode['type'],
        properties: n.properties,
        embedding: n.properties.embedding as number[] | undefined,
        createdAt: new Date((n.properties.createdAt as string) || Date.now()),
        updatedAt: new Date((n.properties.updatedAt as string) || Date.now()),
      })),
      edges: result.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type as GraphEdge['type'],
        weight: (e.properties.weight as number) || 1,
        metadata: e.properties,
      })),
    };
  }
}

export const graphService = GraphService.getInstance();
export { GraphService };
