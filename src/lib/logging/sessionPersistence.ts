// Session Persistence - Handle localStorage/sessionStorage for session data
import { SessionStorage, SessionSummary, SessionReport } from "@/types/session";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

export class SessionPersistence {
  private readonly storagePrefix = "describe_it_session_";
  private readonly summaryPrefix = "describe_it_summary_";
  private readonly settingsKey = "describe_it_settings";
  private readonly maxSessions = 10; // Keep only last 10 sessions

  constructor(private useSessionStorage = false) {}

  private getStorage(): Storage {
    if (typeof window === "undefined") {
      // Mock storage for SSR
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      };
    }

    return this.useSessionStorage ? sessionStorage : localStorage;
  }

  // Session data methods
  public async save(sessionId: string, data: SessionStorage): Promise<void> {
    try {
      const storage = this.getStorage();
      const key = this.storagePrefix + sessionId;

      // Add compression for large datasets
      const compressedData = this.compressData(data);
      storage.setItem(key, JSON.stringify(compressedData));

      // Update session list
      await this.updateSessionList(sessionId);

      logger.debug("Session data saved:", { sessionId });
    } catch (error) {
      logger.error("Failed to save session data:", error instanceof Error ? error : undefined, { sessionId });

      // Try to clear old data if storage is full
      if (this.isStorageQuotaExceeded(error)) {
        await this.cleanup();
        // Retry save
        try {
          const storage = this.getStorage();
          const key = this.storagePrefix + sessionId;
          const compressedData = this.compressData(data);
          storage.setItem(key, JSON.stringify(compressedData));
        } catch (retryError) {
          logger.error(
            "Failed to save session data after cleanup:",
            retryError instanceof Error ? retryError : undefined,
            { sessionId }
          );
        }
      }
    }
  }

  public async load(sessionId: string): Promise<SessionStorage | null> {
    try {
      const storage = this.getStorage();
      const key = this.storagePrefix + sessionId;
      const stored = storage.getItem(key);

      if (!stored) {
        return null;
      }

      const parsed = safeParse(stored);
      const decompressed = this.decompressData(parsed);

      logger.debug("Session data loaded:", { sessionId });
      return decompressed;
    } catch (error) {
      logger.error("Failed to load session data:", error instanceof Error ? error : undefined, { sessionId });
      return null;
    }
  }

  public async clear(sessionId: string): Promise<void> {
    try {
      const storage = this.getStorage();
      const key = this.storagePrefix + sessionId;
      storage.removeItem(key);

      // Remove from session list
      await this.removeFromSessionList(sessionId);

      logger.debug("Session data cleared:", { sessionId });
    } catch (error) {
      logger.error("Failed to clear session data:", error instanceof Error ? error : undefined, { sessionId });
    }
  }

  public async list(): Promise<string[]> {
    try {
      const storage = this.getStorage();
      const sessionList = storage.getItem("session_list");

      if (!sessionList) {
        return [];
      }

      const parsed = safeParse(sessionList);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      logger.error("Failed to list sessions:", error);
      return [];
    }
  }

  // Session summary methods (for quick access)
  public async saveSummary(
    sessionId: string,
    summary: SessionSummary,
  ): Promise<void> {
    try {
      const storage = this.getStorage();
      const key = this.summaryPrefix + sessionId;
      storage.setItem(key, safeStringify(summary));

      logger.debug("Session summary saved:", { sessionId });
    } catch (error) {
      logger.error("Failed to save session summary:", error instanceof Error ? error : undefined, { sessionId });
    }
  }

  public async loadSummary(sessionId: string): Promise<SessionSummary | null> {
    try {
      const storage = this.getStorage();
      const key = this.summaryPrefix + sessionId;
      const stored = storage.getItem(key);

      if (!stored) {
        return null;
      }

      return safeParse<SessionSummary>(stored) ?? null;
    } catch (error) {
      logger.error("Failed to load session summary:", error instanceof Error ? error : undefined, { sessionId });
      return null;
    }
  }

  public async loadAllSummaries(): Promise<SessionSummary[]> {
    try {
      const sessionIds = await this.list();
      const summaries: SessionSummary[] = [];

      for (const sessionId of sessionIds) {
        const summary = await this.loadSummary(sessionId);
        if (summary) {
          summaries.push(summary);
        }
      }

      // Sort by start time (most recent first)
      return summaries.sort((a, b) => b.startTime - a.startTime);
    } catch (error) {
      logger.error("Failed to load all summaries:", error instanceof Error ? error : undefined);
      return [];
    }
  }

  // Export functionality
  public async export(
    sessionId: string,
    format: "json" | "text" | "csv",
  ): Promise<string> {
    try {
      const sessionData = await this.load(sessionId);
      if (!sessionData) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const summary = await this.loadSummary(sessionId);
      if (!summary) {
        throw new Error(`Session summary ${sessionId} not found`);
      }

      const report: SessionReport = {
        summary,
        interactions: sessionData.interactions,
        learningMetrics: {
          timeSpentReading: 0,
          descriptionsRead: 0,
          questionsAnswered: 0,
          vocabularyEncountered: 0,
          repetitionPatterns: {},
          difficultyProgression: [],
          focusAreas: [],
          improvementSuggestions: [],
        },
        recommendations: [],
        exportFormat: format,
        generatedAt: Date.now(),
      };

      switch (format) {
        case "json":
          return JSON.stringify(report, null, 2);
        case "text":
          return this.formatAsText(report);
        case "csv":
          return this.formatAsCSV(report);
        default:
          return JSON.stringify(report, null, 2);
      }
    } catch (error) {
      logger.error("Failed to export session:", error instanceof Error ? error : undefined, { sessionId });
      throw error;
    }
  }

  // Bulk export
  public async exportAll(format: "json" | "text" | "csv"): Promise<string> {
    try {
      const sessionIds = await this.list();
      const allReports: SessionReport[] = [];

      for (const sessionId of sessionIds) {
        try {
          const reportData = await this.export(sessionId, "json");
          const report = safeParse<SessionReport>(reportData);
          if (report) {
            allReports.push(report);
          }
        } catch (error) {
          logger.warn(`Failed to export session ${sessionId}:`, { error: error instanceof Error ? error.message : String(error), sessionId });
        }
      }

      switch (format) {
        case "json":
          return JSON.stringify(
            {
              exportedAt: Date.now(),
              sessionCount: allReports.length,
              sessions: allReports,
            },
            null,
            2
          );
        case "text":
          return this.formatAllAsText(allReports);
        case "csv":
          return this.formatAllAsCSV(allReports);
        default:
          return JSON.stringify(allReports, null, 2);
      }
    } catch (error) {
      logger.error("Failed to export all sessions:", error);
      throw error;
    }
  }

  // Settings persistence
  public async saveSettings(settings: any): Promise<void> {
    try {
      const storage = this.getStorage();
      storage.setItem(this.settingsKey, safeStringify(settings));
    } catch (error) {
      logger.error("Failed to save settings:", error);
    }
  }

  public async loadSettings<T>(): Promise<T | null> {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(this.settingsKey);

      if (!stored) {
        return null;
      }

      return safeParse<T>(stored) ?? null;
    } catch (error) {
      logger.error("Failed to load settings:", error);
      return null;
    }
  }

  // Storage management
  public async getStorageInfo(): Promise<{
    used: number;
    available: number;
    sessionCount: number;
    oldestSession: string | null;
    newestSession: string | null;
  }> {
    try {
      const storage = this.getStorage();
      const sessionIds = await this.list();

      let used = 0;
      let oldestSession: string | null = null;
      let newestSession: string | null = null;
      let oldestTime = Infinity;
      let newestTime = 0;

      // Calculate storage usage
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          const value = storage.getItem(key);
          if (value) {
            used += value.length;

            const sessionId = key.replace(this.storagePrefix, "");
            const summary = await this.loadSummary(sessionId);

            if (summary) {
              if (summary.startTime < oldestTime) {
                oldestTime = summary.startTime;
                oldestSession = sessionId;
              }
              if (summary.startTime > newestTime) {
                newestTime = summary.startTime;
                newestSession = sessionId;
              }
            }
          }
        }
      }

      // Estimate available storage (5MB typical limit for localStorage)
      const totalQuota = 5 * 1024 * 1024; // 5MB in bytes
      const available = totalQuota - used;

      return {
        used,
        available,
        sessionCount: sessionIds.length,
        oldestSession,
        newestSession,
      };
    } catch (error) {
      logger.error("Failed to get storage info:", error);
      return {
        used: 0,
        available: 0,
        sessionCount: 0,
        oldestSession: null,
        newestSession: null,
      };
    }
  }

  public async cleanup(): Promise<void> {
    try {
      const sessionIds = await this.list();

      // Keep only the most recent sessions
      if (sessionIds.length > this.maxSessions) {
        const summaries = await this.loadAllSummaries();
        const sortedSessions = summaries
          .sort((a, b) => a.startTime - b.startTime) // Oldest first
          .slice(0, sessionIds.length - this.maxSessions);

        for (const summary of sortedSessions) {
          await this.clear(summary.sessionId);
          await this.clearSummary(summary.sessionId);
        }

        logger.info(`Cleaned up ${sortedSessions.length} old sessions`);
      }
    } catch (error) {
      logger.error("Failed to cleanup storage:", error);
    }
  }

  // Private helper methods
  private async updateSessionList(sessionId: string): Promise<void> {
    const sessionIds = await this.list();

    if (!sessionIds.includes(sessionId)) {
      sessionIds.push(sessionId);

      const storage = this.getStorage();
      storage.setItem("session_list", safeStringify(sessionIds));
    }
  }

  private async removeFromSessionList(sessionId: string): Promise<void> {
    const sessionIds = await this.list();
    const filtered = sessionIds.filter((id) => id !== sessionId);

    const storage = this.getStorage();
    storage.setItem("session_list", safeStringify(filtered));
  }

  private async clearSummary(sessionId: string): Promise<void> {
    try {
      const storage = this.getStorage();
      const key = this.summaryPrefix + sessionId;
      storage.removeItem(key);
    } catch (error) {
      logger.error("Failed to clear session summary:", error);
    }
  }

  private compressData(data: SessionStorage): any {
    // Simple compression: remove redundant metadata
    const compressed = {
      ...data,
      interactions: data.interactions.map((interaction) => ({
        ...interaction,
        metadata: undefined, // Remove redundant metadata
      })),
    };

    return compressed;
  }

  private decompressData(data: any): SessionStorage {
    // Restore metadata if needed
    if (data.currentSession) {
      data.interactions = data.interactions.map((interaction: any) => ({
        ...interaction,
        metadata: data.currentSession,
      }));
    }

    return data;
  }

  private isStorageQuotaExceeded(error: any): boolean {
    return (
      error instanceof DOMException &&
      (error.code === 22 || // QUOTA_EXCEEDED_ERR
        error.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED (Firefox)
        error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    );
  }

  private formatAsText(report: SessionReport): string {
    const duration = Math.round(report.summary.totalDuration / 1000 / 60);

    return `
SESSION REPORT
==============
Session: ${report.summary.sessionId}
Duration: ${duration} minutes
Interactions: ${report.summary.totalInteractions}
Learning Score: ${report.summary.learningScore}/100

ACTIVITIES
==========
Searches: ${report.summary.totalSearches}
Images: ${report.summary.imagesViewed}
Descriptions: ${report.summary.descriptionsGenerated}
Questions: ${report.summary.questionsGenerated}
Vocabulary: ${report.summary.vocabularySelected}

Generated: ${new Date(report.generatedAt).toLocaleString()}
    `.trim();
  }

  private formatAsCSV(report: SessionReport): string {
    const headers = ["timestamp", "type", "data"];
    const rows = report.interactions.map((interaction) => [
      new Date(interaction.timestamp).toISOString(),
      interaction.type,
      safeStringify(interaction.data),
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  private formatAllAsText(reports: SessionReport[]): string {
    const header = `
DESCRIBE IT - ALL SESSIONS REPORT
==================================
Total Sessions: ${reports.length}
Generated: ${new Date().toLocaleString()}

`;

    const sessionSummaries = reports
      .map((report, index) => {
        const duration = Math.round(report.summary.totalDuration / 1000 / 60);

        return `
SESSION ${index + 1}: ${report.summary.sessionId}
Duration: ${duration} minutes | Score: ${report.summary.learningScore}/100
Activities: ${report.summary.totalInteractions} interactions
      `.trim();
      })
      .join("\n\n");

    return header + sessionSummaries;
  }

  private formatAllAsCSV(reports: SessionReport[]): string {
    const headers = [
      "session_id",
      "start_time",
      "duration",
      "interactions",
      "learning_score",
      "searches",
      "images",
      "descriptions",
      "questions",
      "vocabulary",
    ];

    const rows = reports.map((report) => [
      report.summary.sessionId,
      new Date(report.summary.startTime).toISOString(),
      Math.round(report.summary.totalDuration / 1000 / 60),
      report.summary.totalInteractions,
      report.summary.learningScore,
      report.summary.totalSearches,
      report.summary.imagesViewed,
      report.summary.descriptionsGenerated,
      report.summary.questionsGenerated,
      report.summary.vocabularySelected,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }
}

// Factory function
export function createSessionPersistence(
  useSessionStorage = false,
): SessionPersistence {
  return new SessionPersistence(useSessionStorage);
}
