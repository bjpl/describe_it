import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Download, Check, X } from "lucide-react";

interface PWAOptimizationsProps {
  enabled?: boolean;
}

interface ServiceWorkerStatus {
  registered: boolean;
  activated: boolean;
  updateAvailable: boolean;
  installing: boolean;
}

export const PWAOptimizations: React.FC<PWAOptimizationsProps> = ({
  enabled = true,
}) => {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    registered: false,
    activated: false,
    updateAvailable: false,
    installing: false,
  });
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [cacheStatus, setCacheStatus] = useState({
    totalCached: 0,
    lastUpdate: null as Date | null,
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Service Worker registration and management
    const registerServiceWorker = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
            },
          );

          setSwStatus((prev) => ({ ...prev, registered: true }));

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              setSwStatus((prev) => ({ ...prev, installing: true }));

              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  setSwStatus((prev) => ({
                    ...prev,
                    updateAvailable: true,
                    installing: false,
                  }));
                }
                if (newWorker.state === "activated") {
                  setSwStatus((prev) => ({ ...prev, activated: true }));
                }
              });
            }
          });

          // Listen for service worker messages
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data.type === "CACHE_UPDATED") {
              setCacheStatus({
                totalCached: event.data.count,
                lastUpdate: new Date(),
              });
            }
          });

          // Check if service worker is already activated
          if (registration.active) {
            setSwStatus((prev) => ({ ...prev, activated: true }));

            // Request cache status
            registration.active.postMessage({ type: "GET_CACHE_STATUS" });
          }
        } catch (error) {
          console.error("SW registration failed:", error);
        }
      }
    };

    // PWA install prompt handling
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);

      // Show install banner after 30 seconds if not dismissed
      setTimeout(() => {
        if (installPrompt && !localStorage.getItem("pwa-install-dismissed")) {
          setShowInstallBanner(true);
        }
      }, 30000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app is already installed
    window.addEventListener("appinstalled", () => {
      setInstallPrompt(null);
      setShowInstallBanner(false);
      localStorage.setItem("pwa-installed", "true");
    });

    registerServiceWorker();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [enabled, installPrompt]);

  const handleInstallApp = async () => {
    if (installPrompt) {
      const result = await installPrompt.prompt();
      setInstallPrompt(null);
      setShowInstallBanner(false);

      if (result.outcome === "accepted") {
        localStorage.setItem("pwa-installed", "true");
      }
    }
  };

  const handleUpdateServiceWorker = () => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!enabled) return null;

  return (
    <>
      {/* Network Status Indicator */}
      <div className="fixed top-4 right-20 z-40">
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2"
            >
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Offline</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Service Worker Update Notification */}
      <AnimatePresence>
        {swStatus.updateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-50"
          >
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Update Available</h4>
                <p className="text-sm text-blue-100 mb-3">
                  A new version of the app is ready to install.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateServiceWorker}
                    className="bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={() =>
                      setSwStatus((prev) => ({
                        ...prev,
                        updateAvailable: false,
                      }))
                    }
                    className="text-blue-200 hover:text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && installPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-50"
          >
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Install App</h4>
                <p className="text-sm text-purple-100 mb-3">
                  Install Describe It for a better experience with offline
                  support.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallApp}
                    className="bg-white text-purple-500 px-3 py-1 rounded text-sm font-medium hover:bg-purple-50 transition-colors"
                  >
                    Install
                  </button>
                  <button
                    onClick={dismissInstallBanner}
                    className="text-purple-200 hover:text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={dismissInstallBanner}
                className="text-purple-200 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Worker Status (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-40">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              SW:{" "}
              {swStatus.registered ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <X className="w-3 h-3 text-red-400" />
              )}
            </span>
            {cacheStatus.totalCached > 0 && (
              <span>Cached: {cacheStatus.totalCached} files</span>
            )}
            <span className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

// Hook for PWA capabilities
export const usePWACapabilities = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [supportsPWA, setSupportsPWA] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if app is installed
    const installed = localStorage.getItem("pwa-installed") === "true";
    setIsInstalled(installed);

    // Check if running in standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check PWA support
    const supports = "serviceWorker" in navigator && "PushManager" in window;
    setSupportsPWA(supports);
  }, []);

  return { isInstalled, isStandalone, supportsPWA };
};

// Service Worker communication hook
export const useServiceWorker = () => {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(setRegistration);

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "UPDATE_AVAILABLE") {
          setIsUpdateAvailable(true);
        }
      });
    }
  }, []);

  const updateServiceWorker = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  const clearCache = () => {
    if (registration?.active) {
      registration.active.postMessage({ type: "CLEAR_CACHE" });
    }
  };

  return { registration, isUpdateAvailable, updateServiceWorker, clearCache };
};
