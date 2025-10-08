import { logger } from '@/lib/logger';
import { safeParse } from '@/lib/utils/json-safe';

/**
 * Hive-Mind Coordination System - Agent Gamma-3 Implementation
 * Coordinates vocabulary data sharing with Alpha-1 and Delta-4
 */

export interface HiveAgent {
  id: string;
  name: string;
  role: "alpha-1" | "gamma-3" | "delta-4";
  capabilities: string[];
  status: "ready" | "busy" | "offline";
  lastHeartbeat: Date;
}

export interface CoordinationMessage {
  from: string;
  to: string | string[];
  type: "data-share" | "request" | "response" | "notification" | "heartbeat";
  payload: any;
  timestamp: Date;
  messageId: string;
}

export interface VocabularyCoordinationData {
  extractedPhrases: {
    count: number;
    categories: Record<string, number>;
    difficulty: string;
    imageId: string;
    sourceDescription: string;
  };
  vocabularyStats: {
    totalPhrases: number;
    byCategory: Record<string, number>;
    recentAdditions: number;
  };
  exportEvents: {
    format: string;
    timestamp: string;
    recordCount: number;
  }[];
}

export class HiveCoordinator {
  private static instance: HiveCoordinator;
  private agents: Map<string, HiveAgent> = new Map();
  private messageQueue: CoordinationMessage[] = [];
  private listeners: Set<(message: CoordinationMessage) => void> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeCoordination();
  }

  static getInstance(): HiveCoordinator {
    if (!HiveCoordinator.instance) {
      HiveCoordinator.instance = new HiveCoordinator();
    }
    return HiveCoordinator.instance;
  }

  /**
   * Register Agent Gamma-3 in the hive-mind
   */
  registerGamma3(): void {
    const gamma3Agent: HiveAgent = {
      id: "gamma-3",
      name: "Vocabulary Extraction Specialist",
      role: "gamma-3",
      capabilities: [
        "phrase-extraction",
        "vocabulary-categorization",
        "csv-export",
        "translation-coordination",
        "alphabetical-sorting",
      ],
      status: "ready",
      lastHeartbeat: new Date(),
    };

    this.agents.set("gamma-3", gamma3Agent);
    this.startHeartbeat();

    // Announce presence to other agents
    this.broadcastMessage({
      from: "gamma-3",
      to: ["alpha-1", "delta-4"],
      type: "notification",
      payload: {
        event: "agent-registered",
        agent: gamma3Agent,
      },
      timestamp: new Date(),
      messageId: this.generateMessageId(),
    });
  }

  /**
   * Share vocabulary extraction data with Alpha-1
   */
  shareVocabularyWithAlpha1(data: VocabularyCoordinationData): void {
    const message: CoordinationMessage = {
      from: "gamma-3",
      to: "alpha-1",
      type: "data-share",
      payload: {
        type: "vocabulary-data",
        data,
        capabilities: {
          canExtractFromDescriptions: true,
          supportedCategories: [
            "sustantivos",
            "verbos",
            "adjetivos",
            "adverbios",
            "frasesClaves",
          ],
          exportFormats: ["csv", "json"],
          translationSupport: true,
        },
      },
      timestamp: new Date(),
      messageId: this.generateMessageId(),
    };

    this.sendMessage(message);

    // Store in session storage for persistence
    if (typeof window !== "undefined") {
      const coordinationKey = `hive-coordination-${Date.now()}`;
      window.sessionStorage.setItem(coordinationKey, JSON.stringify(message));

      // Clean up old coordination data (keep last 10)
      this.cleanupStoredCoordination();
    }
  }

  /**
   * Request description text from Alpha-1
   */
  requestDescriptionFromAlpha1(
    imageId: string,
    descriptionStyle?: string,
  ): void {
    const message: CoordinationMessage = {
      from: "gamma-3",
      to: "alpha-1",
      type: "request",
      payload: {
        type: "description-request",
        imageId,
        requesterCapabilities: ["vocabulary-extraction"],
        preferences: {
          style: descriptionStyle,
          minLength: 50,
          includeContext: true,
        },
      },
      timestamp: new Date(),
      messageId: this.generateMessageId(),
    };

    this.sendMessage(message);
  }

  /**
   * Share vocabulary statistics with Delta-4
   */
  shareStatisticsWithDelta4(
    stats: VocabularyCoordinationData["vocabularyStats"],
  ): void {
    const message: CoordinationMessage = {
      from: "gamma-3",
      to: "delta-4",
      type: "data-share",
      payload: {
        type: "vocabulary-statistics",
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          agent: "gamma-3",
          dataVersion: "1.0",
        },
      },
      timestamp: new Date(),
      messageId: this.generateMessageId(),
    };

    this.sendMessage(message);
  }

  /**
   * Handle incoming coordination messages
   */
  handleIncomingMessage(message: CoordinationMessage): void {
    // Add to message queue
    this.messageQueue.push(message);

    // Process message based on type
    switch (message.type) {
      case "request":
        this.handleRequest(message);
        break;
      case "data-share":
        this.handleDataShare(message);
        break;
      case "response":
        this.handleResponse(message);
        break;
      case "notification":
        this.handleNotification(message);
        break;
      case "heartbeat":
        this.handleHeartbeat(message);
        break;
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        logger.error("Error in coordination listener:", error);
      }
    });
  }

  /**
   * Export coordination data for Delta-4 analysis
   */
  exportCoordinationData(): {
    agents: HiveAgent[];
    messageHistory: CoordinationMessage[];
    vocabularySharing: VocabularyCoordinationData | null;
  } {
    const vocabularySharing = this.extractStoredVocabularyData();

    return {
      agents: Array.from(this.agents.values()),
      messageHistory: this.messageQueue.slice(-50), // Last 50 messages
      vocabularySharing,
    };
  }

  /**
   * Add coordination listener
   */
  addListener(listener: (message: CoordinationMessage) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove coordination listener
   */
  removeListener(listener: (message: CoordinationMessage) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Get active agents
   */
  getActiveAgents(): HiveAgent[] {
    const now = new Date();
    return Array.from(this.agents.values()).filter((agent) => {
      const timeSinceHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
      return timeSinceHeartbeat < 60000; // Active within last minute
    });
  }

  /**
   * Private Methods
   */
  private initializeCoordination(): void {
    // Initialize browser-based coordination if available
    if (typeof window !== "undefined") {
      // Listen for custom events from other agents
      window.addEventListener("hive-coordination", (event: any) => {
        const message = event.detail as CoordinationMessage;
        this.handleIncomingMessage(message);
      });

      // Periodic cleanup
      setInterval(() => {
        this.cleanupMessageQueue();
        this.cleanupStoredCoordination();
      }, 300000); // Every 5 minutes
    }
  }

  private sendMessage(message: CoordinationMessage): void {
    // Add to local queue
    this.messageQueue.push(message);

    // Broadcast via custom event if in browser
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hive-coordination", {
          detail: message,
        }),
      );
    }

    // Store important messages
    if (message.type === "data-share" || message.type === "request") {
      const storageKey = `hive-message-${message.messageId}`;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(storageKey, JSON.stringify(message));
      }
    }
  }

  private broadcastMessage(message: CoordinationMessage): void {
    if (Array.isArray(message.to)) {
      message.to.forEach((recipient) => {
        const individualMessage = { ...message, to: recipient };
        this.sendMessage(individualMessage);
      });
    } else {
      this.sendMessage(message);
    }
  }

  private handleRequest(message: CoordinationMessage): void {
    if (message.payload?.type === "vocabulary-capabilities") {
      // Respond with Gamma-3 capabilities
      const response: CoordinationMessage = {
        from: "gamma-3",
        to: message.from,
        type: "response",
        payload: {
          requestId: message.messageId,
          capabilities: {
            phraseExtraction: true,
            categorization: [
              "sustantivos",
              "verbos",
              "adjetivos",
              "adverbios",
              "frasesClaves",
            ],
            exportFormats: ["target_word_list.csv", "json"],
            translation: true,
            alphabeticalSorting: true,
            descriptionCoordination: true,
          },
        },
        timestamp: new Date(),
        messageId: this.generateMessageId(),
      };

      this.sendMessage(response);
    }
  }

  private handleDataShare(message: CoordinationMessage): void {
    // Process shared data from other agents
    if (
      message.from === "alpha-1" &&
      message.payload?.type === "description-data"
    ) {
      // Handle description data from Alpha-1
      this.processAlpha1Description(message.payload.data);
    } else if (
      message.from === "delta-4" &&
      message.payload?.type === "analysis-request"
    ) {
      // Handle analysis request from Delta-4
      this.processDelta4AnalysisRequest(message.payload.data);
    }
  }

  private handleResponse(message: CoordinationMessage): void {
    // Handle responses to our requests
    logger.info(`Received response from ${message.from}:`, message.payload);
  }

  private handleNotification(message: CoordinationMessage): void {
    // Handle notifications from other agents
    if (message.payload?.event === "agent-registered") {
      const agent = message.payload.agent as HiveAgent;
      this.agents.set(agent.id, agent);
    }
  }

  private handleHeartbeat(message: CoordinationMessage): void {
    const agent = this.agents.get(message.from);
    if (agent) {
      agent.lastHeartbeat = message.timestamp;
      agent.status = "ready";
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const heartbeat: CoordinationMessage = {
        from: "gamma-3",
        to: ["alpha-1", "delta-4"],
        type: "heartbeat",
        payload: {
          status: "ready",
          capabilities: [
            "phrase-extraction",
            "vocabulary-categorization",
            "csv-export",
          ],
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
        messageId: this.generateMessageId(),
      };

      this.broadcastMessage(heartbeat);
    }, 30000); // Every 30 seconds
  }

  private processAlpha1Description(data: any): void {
    // Process description data received from Alpha-1
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("alpha1-description-received", {
          detail: data,
        }),
      );
    }
  }

  private processDelta4AnalysisRequest(data: any): void {
    // Process analysis request from Delta-4
    const analysisData = this.exportCoordinationData();

    const response: CoordinationMessage = {
      from: "gamma-3",
      to: "delta-4",
      type: "response",
      payload: {
        type: "analysis-data",
        data: analysisData,
        requestId: data.requestId,
      },
      timestamp: new Date(),
      messageId: this.generateMessageId(),
    };

    this.sendMessage(response);
  }

  private extractStoredVocabularyData(): VocabularyCoordinationData | null {
    if (typeof window === "undefined") return null;

    try {
      const storedData = window.sessionStorage.getItem("gamma3-coordination");
      if (!storedData) return null;
      const parsed = safeParse<VocabularyCoordinationData>(storedData, null as any);
      return parsed ?? null;
    } catch (error) {
      logger.error("Error extracting stored vocabulary data:", error);
      return null;
    }
  }

  private cleanupMessageQueue(): void {
    // Keep only last 100 messages
    if (this.messageQueue.length > 100) {
      this.messageQueue = this.messageQueue.slice(-100);
    }
  }

  private cleanupStoredCoordination(): void {
    if (typeof window === "undefined") return;

    try {
      // Get all coordination keys
      const keys = Object.keys(window.sessionStorage).filter(
        (key) => key.startsWith("hive-") || key.startsWith("gamma3-"),
      );

      // Sort by timestamp and keep only recent ones
      const sortedKeys = keys
        .map((key) => ({
          key,
          timestamp: this.extractTimestampFromKey(key),
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20) // Keep only last 20 items
        .map((item) => item.key);

      // Remove old keys
      keys.forEach((key) => {
        if (!sortedKeys.includes(key)) {
          window.sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      logger.error("Error cleaning up stored coordination:", error);
    }
  }

  private extractTimestampFromKey(key: string): number {
    const match = key.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private generateMessageId(): string {
    return `gamma3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default HiveCoordinator;
