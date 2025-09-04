import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  isConnecting: boolean;
  lastOffline: Date | null;
  connectionType: string | null;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isConnecting: false,
    lastOffline: null,
    connectionType: null,
  });

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const handleOnline = useCallback(async () => {
    setNetworkStatus((prev) => ({
      ...prev,
      isConnecting: true,
    }));

    // Verify actual connectivity
    const isActuallyOnline = await checkConnection();

    setNetworkStatus((prev) => ({
      ...prev,
      isOnline: isActuallyOnline,
      isConnecting: false,
      lastOffline: isActuallyOnline ? null : prev.lastOffline,
    }));
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    setNetworkStatus((prev) => ({
      ...prev,
      isOnline: false,
      isConnecting: false,
      lastOffline: new Date(),
    }));
  }, []);

  const getConnectionType = useCallback((): string | null => {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || connection?.type || null;
    }
    return null;
  }, []);

  useEffect(() => {
    // Set initial connection type
    setNetworkStatus((prev) => ({
      ...prev,
      connectionType: getConnectionType(),
    }));

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitor connection changes if supported
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const handleConnectionChange = () => {
        setNetworkStatus((prev) => ({
          ...prev,
          connectionType: getConnectionType(),
        }));
      };

      connection?.addEventListener("change", handleConnectionChange);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        connection?.removeEventListener("change", handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline, getConnectionType]);

  // Periodic connectivity check when online
  useEffect(() => {
    if (!networkStatus.isOnline) return;

    const interval = setInterval(async () => {
      const isStillOnline = await checkConnection();
      if (!isStillOnline) {
        setNetworkStatus((prev) => ({
          ...prev,
          isOnline: false,
          lastOffline: new Date(),
        }));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [networkStatus.isOnline, checkConnection]);

  return {
    ...networkStatus,
    retry: handleOnline,
    checkConnection,
  };
}
