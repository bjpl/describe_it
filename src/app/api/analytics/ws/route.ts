/**
 * WebSocket endpoint for real-time analytics updates
 * Provides live streaming of metrics, alerts, and usage data
 */

import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';
import Redis from 'ioredis';
import { recordApiRequest } from '@/lib/monitoring/prometheus';
import { apiLogger } from '@/lib/logger';

// Prevent prerendering during build (Redis not available)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Global WebSocket server instance
let wss: WebSocketServer | null = null;
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true, // Don't connect during module load
  enableOfflineQueue: false, // Fail fast if not connected
  maxRetriesPerRequest: 0, // Don't retry during build
});

// Suppress Redis errors during build
redis.on('error', () => {
  // Silent fail during build - will connect on first use
});

interface WebSocketMessage {
  type: 'metrics_update' | 'api_keys_update' | 'alert' | 'fraud_event' | 'system_status';
  payload: any;
  timestamp: number;
}

interface ConnectedClient {
  id: string;
  ws: any;
  subscriptions: string[];
  lastPing: number;
}

const connectedClients = new Map<string, ConnectedClient>();

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // This is a placeholder for WebSocket upgrade handling
    // In a real Next.js deployment, you'd use a different approach
    // like a separate WebSocket server or upgrade the connection
    
    recordApiRequest('GET', '/api/analytics/ws', 200, (Date.now() - startTime) / 1000);

    return new Response('WebSocket endpoint - use appropriate WebSocket client', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    apiLogger.error('WebSocket endpoint error:', error);
    recordApiRequest('GET', '/api/analytics/ws', 500, (Date.now() - startTime) / 1000);

    return new Response('WebSocket setup failed', { status: 500 });
  }
}

/**
 * Initialize WebSocket server (called externally)
 * This would typically be called from your server setup
 *
 * NOTE: Moved to @/lib/websocket/analytics-ws-utils to comply with Next.js route rules
 */
/* REMOVED - Invalid Next.js route export
export function initWebSocketServer(server?: any) {
  if (wss) return wss;

  wss = new WebSocketServer({ 
    port: parseInt(process.env.WS_PORT || '3001'),
    path: '/api/analytics/ws'
  });

  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    const client: ConnectedClient = {
      id: clientId,
      ws,
      subscriptions: ['all'], // Default subscription
      lastPing: Date.now(),
    };

    connectedClients.set(clientId, client);
    apiLogger.info(`Analytics WebSocket client connected: ${clientId}`);

    // Send welcome message
    sendToClient(clientId, {
      type: 'system_status',
      payload: { 
        status: 'connected', 
        clientId, 
        availableSubscriptions: ['metrics', 'alerts', 'fraud', 'api_keys', 'all']
      },
      timestamp: Date.now(),
    });

    ws.on('message', (message) => {
      const data = safeParse(message.toString());
      if (data) {
        handleClientMessage(clientId, data);
      } else {
        apiLogger.error('Invalid WebSocket message from client:', { clientId });
      }
    });

    ws.on('close', () => {
      connectedClients.delete(clientId);
      apiLogger.info(`Analytics WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      apiLogger.error(`WebSocket error for client ${clientId}:`, error);
      connectedClients.delete(clientId);
    });

    // Set up ping interval
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
        client.lastPing = Date.now();
      } else {
        clearInterval(pingInterval);
        connectedClients.delete(clientId);
      }
    }, 30000); // Ping every 30 seconds

    ws.on('pong', () => {
      client.lastPing = Date.now();
    });
  });

  // Start broadcasting real-time data
  startDataBroadcasting();

  // Clean up stale connections
  setInterval(cleanupStaleConnections, 60000); // Every minute

  apiLogger.info(`Analytics WebSocket server started on port ${process.env.WS_PORT || '3001'}`);
  return wss;
}

function generateClientId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function handleClientMessage(clientId: string, message: any) {
  const client = connectedClients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'subscribe':
      if (Array.isArray(message.subscriptions)) {
        client.subscriptions = message.subscriptions;
        sendToClient(clientId, {
          type: 'system_status',
          payload: { status: 'subscriptions_updated', subscriptions: client.subscriptions },
          timestamp: Date.now(),
        });
      }
      break;

    case 'ping':
      sendToClient(clientId, {
        type: 'system_status',
        payload: { status: 'pong' },
        timestamp: Date.now(),
      });
      break;

    case 'get_current_data':
      sendCurrentData(clientId);
      break;

    default:
      apiLogger.info(`Unknown message type from client ${clientId}:`, message.type);
  }
}

function sendToClient(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client || client.ws.readyState !== client.ws.OPEN) return;

  try {
    client.ws.send(safeStringify(message));
  } catch (error) {
    apiLogger.error(`Failed to send message to client ${clientId}:`, error);
    connectedClients.delete(clientId);
  }
}

function broadcast(message: WebSocketMessage, subscription: string = 'all') {
  for (const [clientId, client] of connectedClients) {
    if (client.subscriptions.includes(subscription) || client.subscriptions.includes('all')) {
      sendToClient(clientId, message);
    }
  }
}

async function startDataBroadcasting() {
  // Broadcast metrics updates every 30 seconds
  setInterval(async () => {
    try {
      const metrics = await getCurrentMetrics();
      broadcast({
        type: 'metrics_update',
        payload: metrics,
        timestamp: Date.now(),
      }, 'metrics');
    } catch (error) {
      apiLogger.error('Error broadcasting metrics:', error);
    }
  }, 30000);

  // Broadcast API keys updates every minute
  setInterval(async () => {
    try {
      const apiKeys = await getCurrentApiKeysData();
      broadcast({
        type: 'api_keys_update',
        payload: apiKeys,
        timestamp: Date.now(),
      }, 'api_keys');
    } catch (error) {
      apiLogger.error('Error broadcasting API keys data:', error);
    }
  }, 60000);

  // Subscribe to Redis alerts channel for real-time alerts
  const alertSubscriber = redis.duplicate();
  alertSubscriber.subscribe('analytics:alerts', 'analytics:fraud_events', (err, count) => {
    if (err) {
      apiLogger.error('Failed to subscribe to Redis channels:', err);
      return;
    }
    apiLogger.info(`Subscribed to ${count} Redis channels for real-time updates`);
  });

  alertSubscriber.on('message', (channel, message) => {
    try {
      const data = safeParse(message);
      if (!data) return;
      
      if (channel === 'analytics:alerts') {
        broadcast({
          type: 'alert',
          payload: data,
          timestamp: Date.now(),
        }, 'alerts');
      } else if (channel === 'analytics:fraud_events') {
        broadcast({
          type: 'fraud_event',
          payload: data,
          timestamp: Date.now(),
        }, 'fraud');
      }
    } catch (error) {
      apiLogger.error('Error processing Redis message:', error);
    }
  });
}

async function getCurrentMetrics() {
  // This would fetch current metrics from your monitoring system
  // For now, returning sample data - replace with actual implementation
  return {
    timestamp: Date.now(),
    apiCalls: Math.floor(Math.random() * 1000) + 100,
    errors: Math.floor(Math.random() * 50),
    avgResponseTime: Math.random() * 2000 + 200,
    activeUsers: Math.floor(Math.random() * 50) + 10,
    totalCost: Math.random() * 10 + 1,
    cacheHitRate: Math.random() * 0.3 + 0.7,
    openaiTokensUsed: Math.floor(Math.random() * 10000) + 1000,
  };
}

async function getCurrentApiKeysData() {
  try {
    const keys = await redis.keys('analytics:api_key:*');
    const apiKeysData = [];

    for (const key of keys.slice(0, 10)) { // Limit for performance
      try {
        const data = await redis.hgetall(key);
        const keyHash = key.split(':').pop() || 'unknown';
        
        apiKeysData.push({
          keyHash,
          keyName: data.name || null,
          requests: parseInt(data.requests || '0'),
          errors: parseInt(data.errors || '0'),
          cost: parseFloat(data.cost || '0'),
          lastUsed: parseInt(data.lastUsed || '0'),
          rateLimitHits: parseInt(data.rateLimitHits || '0'),
        });
      } catch (error) {
        apiLogger.error(`Error processing API key data for ${key}:`, error);
      }
    }

    return apiKeysData.sort((a, b) => b.requests - a.requests);
  } catch (error) {
    apiLogger.error('Error fetching API keys data:', error);
    return [];
  }
}

async function sendCurrentData(clientId: string) {
  try {
    const [metrics, apiKeys] = await Promise.all([
      getCurrentMetrics(),
      getCurrentApiKeysData(),
    ]);

    sendToClient(clientId, {
      type: 'metrics_update',
      payload: metrics,
      timestamp: Date.now(),
    });

    sendToClient(clientId, {
      type: 'api_keys_update',
      payload: apiKeys,
      timestamp: Date.now(),
    });
  } catch (error) {
    apiLogger.error('Error sending current data:', error);
  }
}

function cleanupStaleConnections() {
  const now = Date.now();
  const staleThreshold = 2 * 60 * 1000; // 2 minutes

  for (const [clientId, client] of connectedClients) {
    if (now - client.lastPing > staleThreshold) {
      apiLogger.info(`Cleaning up stale connection: ${clientId}`);
      try {
        client.ws.close();
      } catch (error) {
        apiLogger.error(`Error closing stale connection ${clientId}:`, error);
      }
      connectedClients.delete(clientId);
    }
  }
}

/**
 * Utility functions for external use
 *
 * NOTE: Moved to @/lib/websocket/analytics-ws-utils to comply with Next.js route rules
 * Import from there instead of this route file
 */
/* REMOVED - Invalid Next.js route exports - use @/lib/websocket/analytics-ws-utils instead
export function broadcastAlert(alert: any) { ... }
export function broadcastFraudEvent(event: any) { ... }
export function getConnectedClientsCount(): number { ... }
export function closeWebSocketServer() { ... }
*/