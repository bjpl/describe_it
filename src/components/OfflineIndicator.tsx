'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { syncQueue } from '@/lib/offline-storage';
import { logger } from '@/lib/logger';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Automatically sync when coming back online
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await syncQueue.syncAll();
      setPendingCount(0);
    } catch (error) {
      logger.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show indicator when online and no pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all ${
        isOnline
          ? 'bg-green-50 border-2 border-green-200'
          : 'bg-red-50 border-2 border-red-200'
      }`}
    >
      {isOnline ? (
        <Wifi className="text-green-600" size={20} />
      ) : (
        <WifiOff className="text-red-600" size={20} />
      )}

      <div className="flex flex-col">
        <span
          className={`font-semibold text-sm ${
            isOnline ? 'text-green-800' : 'text-red-800'
          }`}
        >
          {isOnline ? 'Back Online' : 'Offline Mode'}
        </span>
        {pendingCount > 0 && (
          <span className="text-xs text-gray-600">
            {pendingCount} pending item{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="ml-2 p-2 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50"
          aria-label="Sync pending items"
        >
          <RefreshCw
            className={`text-green-600 ${isSyncing ? 'animate-spin' : ''}`}
            size={16}
          />
        </button>
      )}
    </div>
  );
}
