// IndexedDB wrapper for offline storage
const DB_NAME = 'describe-it-offline';
const DB_VERSION = 1;

export interface PendingItem {
  id?: number;
  data: unknown;
  timestamp: number;
  type: 'vocabulary' | 'description';
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('vocabulary')) {
          const vocabStore = db.createObjectStore('vocabulary', {
            keyPath: 'id',
            autoIncrement: true,
          });
          vocabStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('descriptions')) {
          const descStore = db.createObjectStore('descriptions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          descStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('searchHistory')) {
          const searchStore = db.createObjectStore('searchHistory', {
            keyPath: 'id',
            autoIncrement: true,
          });
          searchStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('IndexedDB schema created');
      };
    });
  }

  async savePendingItem(
    storeName: 'vocabulary' | 'descriptions',
    data: unknown
  ): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const item: PendingItem = {
        data,
        timestamp: Date.now(),
        type: storeName === 'vocabulary' ? 'vocabulary' : 'description',
      };

      const request = store.add(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async getPendingItems(
    storeName: 'vocabulary' | 'descriptions'
  ): Promise<PendingItem[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async removePendingItem(
    storeName: 'vocabulary' | 'descriptions',
    id: number
  ): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearPendingItems(
    storeName: 'vocabulary' | 'descriptions'
  ): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Search history methods
  async saveSearchQuery(query: string, filters?: Record<string, unknown>): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction('searchHistory', 'readwrite');
      const store = transaction.objectStore('searchHistory');

      const item = {
        query,
        filters,
        timestamp: Date.now(),
      };

      const request = store.add(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      // Limit search history to last 50 items
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result > 50) {
          const index = store.index('timestamp');
          const cursorRequest = index.openCursor();
          let deleteCount = countRequest.result - 50;

          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor && deleteCount > 0) {
              store.delete(cursor.primaryKey);
              deleteCount--;
              cursor.continue();
            }
          };
        }
      };
    });
  }

  async getSearchHistory(limit = 10): Promise<Array<{ query: string; filters?: Record<string, unknown>; timestamp: number }>> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction('searchHistory', 'readonly');
      const store = transaction.objectStore('searchHistory');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');

      const results: Array<{ query: string; filters?: Record<string, unknown>; timestamp: number }> = [];
      let count = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async clearSearchHistory(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction('searchHistory', 'readwrite');
      const store = transaction.objectStore('searchHistory');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Sync queue manager
export class SyncQueue {
  private syncing = false;

  async syncAll(): Promise<void> {
    if (this.syncing) {
      console.log('Sync already in progress');
      return;
    }

    this.syncing = true;

    try {
      await Promise.all([
        this.syncVocabulary(),
        this.syncDescriptions(),
      ]);
      console.log('All pending items synced successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncing = false;
    }
  }

  private async syncVocabulary(): Promise<void> {
    const items = await offlineStorage.getPendingItems('vocabulary');

    for (const item of items) {
      try {
        const response = await fetch('/api/vocabulary/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok && item.id) {
          await offlineStorage.removePendingItem('vocabulary', item.id);
        }
      } catch (error) {
        console.error('Failed to sync vocabulary item:', error);
        // Don't throw, continue with other items
      }
    }
  }

  private async syncDescriptions(): Promise<void> {
    const items = await offlineStorage.getPendingItems('descriptions');

    for (const item of items) {
      try {
        const response = await fetch('/api/descriptions/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok && item.id) {
          await offlineStorage.removePendingItem('descriptions', item.id);
        }
      } catch (error) {
        console.error('Failed to sync description:', error);
        // Don't throw, continue with other items
      }
    }
  }
}

export const syncQueue = new SyncQueue();
