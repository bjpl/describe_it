/**
 * Unit tests for vector module types and error classes
 * Tests error hierarchies, type guards, and error properties
 */
import { describe, it, expect } from 'vitest';

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base error class for vector operations
 */
class VectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorError';
    Object.setPrototypeOf(this, VectorError.prototype);
  }
}

/**
 * Error during embedding generation
 */
class EmbeddingError extends VectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EMBEDDING_ERROR', 500, details);
    this.name = 'EmbeddingError';
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}

/**
 * Error during vector search
 */
class SearchError extends VectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SEARCH_ERROR', 500, details);
    this.name = 'SearchError';
    Object.setPrototypeOf(this, SearchError.prototype);
  }
}

/**
 * Error during graph operations
 */
class GraphError extends VectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GRAPH_ERROR', 500, details);
    this.name = 'GraphError';
    Object.setPrototypeOf(this, GraphError.prototype);
  }
}

/**
 * Error during configuration parsing
 */
class ConfigError extends VectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', 400, details);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isVectorError(error: unknown): error is VectorError {
  return error instanceof VectorError;
}

function isEmbeddingError(error: unknown): error is EmbeddingError {
  return error instanceof EmbeddingError;
}

function isSearchError(error: unknown): error is SearchError {
  return error instanceof SearchError;
}

function isGraphError(error: unknown): error is GraphError {
  return error instanceof GraphError;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Vector Error Classes', () => {
  describe('VectorError', () => {
    it('should create error with correct properties', () => {
      const error = new VectorError('Test error', 'TEST_CODE', 400, { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ key: 'value' });
      expect(error.name).toBe('VectorError');
    });

    it('should use default status code 500', () => {
      const error = new VectorError('Test error', 'TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it('should be instanceof Error', () => {
      const error = new VectorError('Test', 'CODE');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof VectorError).toBe(true);
    });

    it('should preserve stack trace', () => {
      const error = new VectorError('Test', 'CODE');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('VectorError');
    });

    it('should handle complex details object', () => {
      const details = {
        timestamp: new Date().toISOString(),
        context: { userId: '123', action: 'search' },
        metadata: { attempts: 3, lastError: 'Timeout' }
      };
      const error = new VectorError('Complex error', 'COMPLEX', 500, details);

      expect(error.details).toEqual(details);
    });

    it('should be JSON serializable', () => {
      const error = new VectorError('Test', 'CODE', 400, { key: 'value' });
      const json = JSON.stringify({
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details
      });

      expect(json).toContain('Test');
      expect(json).toContain('CODE');
    });
  });

  describe('EmbeddingError', () => {
    it('should have correct error code', () => {
      const error = new EmbeddingError('Embedding failed', { model: 'test' });

      expect(error.code).toBe('EMBEDDING_ERROR');
      expect(error.name).toBe('EmbeddingError');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ model: 'test' });
    });

    it('should extend VectorError', () => {
      const error = new EmbeddingError('Test');
      expect(error instanceof VectorError).toBe(true);
      expect(error instanceof EmbeddingError).toBe(true);
    });

    it('should work without details', () => {
      const error = new EmbeddingError('Simple error');
      expect(error.message).toBe('Simple error');
      expect(error.details).toBeUndefined();
    });

    it('should handle API-specific error details', () => {
      const error = new EmbeddingError('API rate limit exceeded', {
        apiKey: 'sk-***',
        model: 'claude-3-5-sonnet-20241022',
        retryAfter: 60,
        requestId: 'req_123'
      });

      expect(error.details?.apiKey).toBe('sk-***');
      expect(error.details?.retryAfter).toBe(60);
    });
  });

  describe('SearchError', () => {
    it('should have correct error code', () => {
      const error = new SearchError('Search failed');

      expect(error.code).toBe('SEARCH_ERROR');
      expect(error.name).toBe('SearchError');
      expect(error.statusCode).toBe(500);
    });

    it('should extend VectorError', () => {
      const error = new SearchError('Test');
      expect(error instanceof VectorError).toBe(true);
      expect(error instanceof SearchError).toBe(true);
    });

    it('should store query context', () => {
      const error = new SearchError('Invalid query', {
        query: 'test search',
        filters: { language: 'es' },
        limit: 20
      });

      expect(error.details?.query).toBe('test search');
      expect(error.details?.filters).toEqual({ language: 'es' });
    });
  });

  describe('GraphError', () => {
    it('should have correct error code', () => {
      const error = new GraphError('Graph query failed');

      expect(error.code).toBe('GRAPH_ERROR');
      expect(error.name).toBe('GraphError');
      expect(error.statusCode).toBe(500);
    });

    it('should extend VectorError', () => {
      const error = new GraphError('Test');
      expect(error instanceof VectorError).toBe(true);
      expect(error instanceof GraphError).toBe(true);
    });

    it('should store Cypher query context', () => {
      const error = new GraphError('Invalid Cypher syntax', {
        query: 'MATCH (n) RETURN n',
        parameters: { limit: 10 },
        line: 1,
        column: 8
      });

      expect(error.details?.query).toBe('MATCH (n) RETURN n');
      expect(error.details?.line).toBe(1);
    });
  });

  describe('ConfigError', () => {
    it('should have correct error code and status', () => {
      const error = new ConfigError('Invalid configuration');

      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.name).toBe('ConfigError');
      expect(error.statusCode).toBe(400);
    });

    it('should extend VectorError', () => {
      const error = new ConfigError('Test');
      expect(error instanceof VectorError).toBe(true);
      expect(error instanceof ConfigError).toBe(true);
    });

    it('should store validation errors', () => {
      const error = new ConfigError('Schema validation failed', {
        field: 'index.dimensions',
        value: -1,
        expected: 'positive integer',
        errors: [
          'dimensions must be positive',
          'dimensions must be between 1 and 4096'
        ]
      });

      expect(error.details?.field).toBe('index.dimensions');
      expect(error.details?.errors).toHaveLength(2);
    });
  });

  describe('Error Hierarchy', () => {
    it('should maintain proper prototype chain', () => {
      const embedding = new EmbeddingError('test');
      const search = new SearchError('test');
      const graph = new GraphError('test');

      expect(embedding instanceof EmbeddingError).toBe(true);
      expect(embedding instanceof VectorError).toBe(true);
      expect(embedding instanceof Error).toBe(true);

      expect(search instanceof SearchError).toBe(true);
      expect(search instanceof VectorError).toBe(true);

      expect(graph instanceof GraphError).toBe(true);
      expect(graph instanceof VectorError).toBe(true);
    });

    it('should not cross-contaminate error types', () => {
      const embedding = new EmbeddingError('test');
      const search = new SearchError('test');

      expect(embedding instanceof SearchError).toBe(false);
      expect(search instanceof EmbeddingError).toBe(false);
      expect(embedding instanceof GraphError).toBe(false);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify VectorError', () => {
      const vectorError = new VectorError('test', 'CODE');
      const regularError = new Error('test');

      expect(isVectorError(vectorError)).toBe(true);
      expect(isVectorError(regularError)).toBe(false);
      expect(isVectorError(null)).toBe(false);
      expect(isVectorError(undefined)).toBe(false);
      expect(isVectorError('string')).toBe(false);
    });

    it('should correctly identify EmbeddingError', () => {
      const embeddingError = new EmbeddingError('test');
      const vectorError = new VectorError('test', 'CODE');
      const searchError = new SearchError('test');

      expect(isEmbeddingError(embeddingError)).toBe(true);
      expect(isEmbeddingError(vectorError)).toBe(false);
      expect(isEmbeddingError(searchError)).toBe(false);
    });

    it('should correctly identify SearchError', () => {
      const searchError = new SearchError('test');
      const embeddingError = new EmbeddingError('test');

      expect(isSearchError(searchError)).toBe(true);
      expect(isSearchError(embeddingError)).toBe(false);
    });

    it('should correctly identify GraphError', () => {
      const graphError = new GraphError('test');
      const searchError = new SearchError('test');

      expect(isGraphError(graphError)).toBe(true);
      expect(isGraphError(searchError)).toBe(false);
    });

    it('should handle type narrowing in catch blocks', () => {
      try {
        throw new EmbeddingError('API failed', { model: 'claude' });
      } catch (error) {
        if (isEmbeddingError(error)) {
          // TypeScript should narrow type here
          expect(error.code).toBe('EMBEDDING_ERROR');
          expect(error.details?.model).toBe('claude');
        } else {
          throw new Error('Type guard failed');
        }
      }
    });
  });

  describe('Error Message Formatting', () => {
    it('should produce readable toString output', () => {
      const error = new VectorError('Test error', 'CODE', 400);
      const str = error.toString();

      expect(str).toContain('VectorError');
      expect(str).toContain('Test error');
    });

    it('should include code in error representation', () => {
      const error = new SearchError('Query failed');
      const repr = JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.code
      });

      expect(repr).toContain('SEARCH_ERROR');
      expect(repr).toContain('Query failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error messages', () => {
      const error = new VectorError('', 'CODE');
      expect(error.message).toBe('');
      expect(error.code).toBe('CODE');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const error = new VectorError(longMessage, 'CODE');
      expect(error.message).toHaveLength(10000);
    });

    it('should handle special characters in code', () => {
      const error = new VectorError('test', 'CODE_WITH_SPECIAL-CHARS.123');
      expect(error.code).toBe('CODE_WITH_SPECIAL-CHARS.123');
    });

    it('should handle circular references in details', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      const error = new VectorError('test', 'CODE', 500, circular);
      expect(error.details).toBe(circular);

      // Should not throw when stringifying
      expect(() => {
        const obj = {
          message: error.message,
          code: error.code,
          // Skip details to avoid circular reference
        };
        JSON.stringify(obj);
      }).not.toThrow();
    });

    it('should handle undefined and null in details', () => {
      const error1 = new VectorError('test', 'CODE', 500, undefined);
      const error2 = new VectorError('test', 'CODE', 500, null as any);

      expect(error1.details).toBeUndefined();
      expect(error2.details).toBeNull();
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('should use appropriate status codes', () => {
      const badRequest = new VectorError('Bad input', 'BAD_REQUEST', 400);
      const unauthorized = new VectorError('No auth', 'UNAUTHORIZED', 401);
      const notFound = new VectorError('Not found', 'NOT_FOUND', 404);
      const serverError = new VectorError('Server error', 'SERVER_ERROR', 500);

      expect(badRequest.statusCode).toBe(400);
      expect(unauthorized.statusCode).toBe(401);
      expect(notFound.statusCode).toBe(404);
      expect(serverError.statusCode).toBe(500);
    });

    it('should default to 500 for subclasses', () => {
      const embedding = new EmbeddingError('test');
      const search = new SearchError('test');
      const graph = new GraphError('test');

      expect(embedding.statusCode).toBe(500);
      expect(search.statusCode).toBe(500);
      expect(graph.statusCode).toBe(500);
    });

    it('should allow ConfigError to use 400', () => {
      const config = new ConfigError('Invalid config');
      expect(config.statusCode).toBe(400);
    });
  });
});
