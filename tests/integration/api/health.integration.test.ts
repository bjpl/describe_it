/**
 * Health API Integration Tests
 * Tests the /api/health endpoint functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { request } from '../../shared/helpers/request-builder';

describe('Health API - Integration Tests', () => {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const api = request(baseURL);

  describe('GET /api/health', () => {
    describe('Quick Status Check', () => {
      it('should return health status with basic information', async () => {
        const response = await api.get('/api/health');

        await response.expectSuccess();
        await response.expectJson();

        const data = await response.getData();

        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('healthy');
        expect(data).toHaveProperty('demo');
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.healthy).toBe('boolean');
        expect(typeof data.demo).toBe('boolean');
      });

      it('should include demo mode indicator in headers', async () => {
        const response = await api.get('/api/health');

        const headers = response.headers;
        expect(headers.has('x-demo-mode')).toBe(true);
      });

      it('should return 200 status code', async () => {
        const response = await api.get('/api/health');
        await response.expectStatus(200);
      });

      it('should have cache control headers', async () => {
        const response = await api.get('/api/health');

        const headers = response.headers;
        expect(headers.get('cache-control')).toContain('max-age');
      });

      it('should return consistent response format', async () => {
        const response1 = await api.get('/api/health');
        const response2 = await api.get('/api/health');

        const data1 = await response1.getData();
        const data2 = await response2.getData();

        expect(Object.keys(data1).sort()).toEqual(Object.keys(data2).sort());
      });
    });

    describe('Detailed Health Check', () => {
      it('should return detailed health information when requested', async () => {
        const response = await api.get('/api/health?detailed=true');

        await response.expectSuccess();
        await response.expectJson();

        const data = await response.getData();

        // Check for detailed health check properties
        expect(data).toHaveProperty('overall');
        expect(data).toHaveProperty('services');
      });

      it('should include service-level health checks', async () => {
        const response = await api.get('/api/health?detailed=true');

        const data = await response.getData();

        if (data.services) {
          expect(Array.isArray(data.services)).toBe(true);

          if (data.services.length > 0) {
            const service = data.services[0];
            expect(service).toHaveProperty('name');
            expect(service).toHaveProperty('status');
          }
        }
      });

      it('should return overall health status', async () => {
        const response = await api.get('/api/health?detailed=true');

        const data = await response.getData();

        if (data.overall) {
          expect(data.overall).toHaveProperty('healthy');
          expect(data.overall).toHaveProperty('status');
          expect(typeof data.overall.healthy).toBe('boolean');
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle malformed query parameters gracefully', async () => {
        const response = await api.get('/api/health?detailed=invalid');

        // Should still return a response
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
      });

      it('should always return JSON content type', async () => {
        const response = await api.get('/api/health');

        await response.expectJson();
      });
    });

    describe('Response Time', () => {
      it('should respond within acceptable time (< 2s for quick check)', async () => {
        const startTime = Date.now();
        await api.get('/api/health');
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(2000);
      });

      it('should respond within acceptable time for detailed check (< 5s)', async () => {
        const startTime = Date.now();
        await api.get('/api/health?detailed=true');
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(5000);
      });
    });
  });

  describe('OPTIONS /api/health', () => {
    it('should handle CORS preflight requests', async () => {
      // Note: Using a workaround since our request builder defaults to GET
      const response = await fetch(`${baseURL}/api/health`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-methods')).toContain('GET');
    });
  });
});
