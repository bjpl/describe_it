import React, { useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Clock, Database } from "lucide-react";

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  loadTime: number;
  apiLatency: number;
  renderTime: number;
  bundleSize: number;
  cacheHitRate: number;
}

interface PerformanceAlert {
  type: "warning" | "error" | "info";
  message: string;
  metric: keyof PerformanceMetrics;
  timestamp: number;
}

export const PerformanceMonitor = memo(() => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    loadTime: 0,
    apiLatency: 0,
    renderTime: 0,
    bundleSize: 0,
    cacheHitRate: 0,
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== "development") return;

    let animationFrame: number;
    let lastTime = performance.now();
    let frameCount = 0;

    // FPS monitoring
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setMetrics((prev) => ({ ...prev, fps }));

        if (fps < 30) {
          addAlert("warning", `Low FPS detected: ${fps}`, "fps");
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrame = requestAnimationFrame(measureFPS);
    };

    // Memory monitoring
    const measureMemory = () => {
      if ("memory" in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMetrics((prev) => ({ ...prev, memoryUsage }));

        if (memoryUsage > 100) {
          addAlert(
            "warning",
            `High memory usage: ${memoryUsage}MB`,
            "memoryUsage",
          );
        }
      }
    };

    // Performance observer for web vitals
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "paint") {
            if (entry.name === "first-contentful-paint") {
              setMetrics((prev) => ({
                ...prev,
                loadTime: Math.round(entry.startTime),
              }));
            }
          }

          if (entry.entryType === "measure") {
            if (entry.name === "React") {
              setMetrics((prev) => ({
                ...prev,
                renderTime: Math.round(entry.duration),
              }));
            }
          }
        }
      });

      observer.observe({ entryTypes: ["paint", "measure"] });
    }

    // Start monitoring
    measureFPS();
    const memoryInterval = setInterval(measureMemory, 2000);

    // Keyboard shortcut to toggle visibility
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(memoryInterval);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  const addAlert = (
    type: PerformanceAlert["type"],
    message: string,
    metric: keyof PerformanceMetrics,
  ) => {
    const alert: PerformanceAlert = {
      type,
      message,
      metric,
      timestamp: Date.now(),
    };

    setAlerts((prev) => [...prev.slice(-4), alert]);

    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.timestamp !== alert.timestamp));
    }, 5000);
  };

  // API latency monitoring hook
  const monitorAPICall = (url: string, startTime: number, endTime: number) => {
    const latency = endTime - startTime;
    setMetrics((prev) => ({ ...prev, apiLatency: Math.round(latency) }));

    if (latency > 2000) {
      addAlert(
        "warning",
        `Slow API call: ${Math.round(latency)}ms to ${url}`,
        "apiLatency",
      );
    }
  };

  if (process.env.NODE_ENV !== "development" || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Main Performance Panel */}
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed top-4 right-4 z-50 bg-black bg-opacity-90 text-white rounded-lg p-4 font-mono text-sm min-w-64"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="font-semibold">Performance</span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {/* FPS */}
          <div className="flex justify-between">
            <span className="text-gray-300">FPS:</span>
            <span
              className={
                metrics.fps >= 60
                  ? "text-green-400"
                  : metrics.fps >= 30
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {metrics.fps}
            </span>
          </div>

          {/* Memory Usage */}
          <div className="flex justify-between">
            <span className="text-gray-300">Memory:</span>
            <span
              className={
                metrics.memoryUsage < 50
                  ? "text-green-400"
                  : metrics.memoryUsage < 100
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {metrics.memoryUsage}MB
            </span>
          </div>

          {/* Load Time */}
          <div className="flex justify-between">
            <span className="text-gray-300">Load:</span>
            <span
              className={
                metrics.loadTime < 1000
                  ? "text-green-400"
                  : metrics.loadTime < 3000
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {metrics.loadTime}ms
            </span>
          </div>

          {/* API Latency */}
          <div className="flex justify-between">
            <span className="text-gray-300">API:</span>
            <span
              className={
                metrics.apiLatency < 500
                  ? "text-green-400"
                  : metrics.apiLatency < 2000
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {metrics.apiLatency}ms
            </span>
          </div>

          {/* Render Time */}
          <div className="flex justify-between">
            <span className="text-gray-300">Render:</span>
            <span
              className={
                metrics.renderTime < 16
                  ? "text-green-400"
                  : metrics.renderTime < 33
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {metrics.renderTime}ms
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
          Press Ctrl+Shift+P to toggle
        </div>
      </motion.div>

      {/* Performance Alerts */}
      <div className="fixed top-4 left-4 z-50 space-y-2">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.timestamp}
              initial={{ opacity: 0, x: -300, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 max-w-sm
                ${
                  alert.type === "error"
                    ? "bg-red-500 text-white"
                    : alert.type === "warning"
                      ? "bg-yellow-500 text-black"
                      : "bg-blue-500 text-white"
                }
              `}
            >
              {alert.type === "error" && <Zap className="w-4 h-4" />}
              {alert.type === "warning" && <Clock className="w-4 h-4" />}
              {alert.type === "info" && <Database className="w-4 h-4" />}
              <span>{alert.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
});

PerformanceMonitor.displayName = "PerformanceMonitor";

// Hook for API monitoring
export const useAPIPerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    totalCalls: 0,
    averageLatency: 0,
    successRate: 0,
    cacheHitRate: 0,
  });

  const monitorCall = React.useCallback(
    (
      url: string,
      startTime: number,
      success: boolean,
      fromCache: boolean = false,
    ) => {
      const endTime = performance.now();
      const latency = endTime - startTime;

      setMetrics((prev) => {
        const totalCalls = prev.totalCalls + 1;
        const averageLatency =
          (prev.averageLatency * prev.totalCalls + latency) / totalCalls;
        const successfulCalls =
          Math.round(prev.successRate * prev.totalCalls) + (success ? 1 : 0);
        const successRate = successfulCalls / totalCalls;
        const cacheHits =
          Math.round(prev.cacheHitRate * prev.totalCalls) + (fromCache ? 1 : 0);
        const cacheHitRate = cacheHits / totalCalls;

        return {
          totalCalls,
          averageLatency: Math.round(averageLatency),
          successRate: Math.round(successRate * 100) / 100,
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        };
      });

      // Log slow requests
      if (latency > 2000) {
        console.warn(`Slow API call to ${url}: ${Math.round(latency)}ms`);
      }

      return latency;
    },
    [],
  );

  return { metrics, monitorCall };
};

// Web Vitals monitoring
export const useWebVitals = () => {
  const [vitals, setVitals] = useState({
    CLS: 0,
    FID: 0,
    FCP: 0,
    LCP: 0,
    TTFB: 0,
    INP: 0,
  });

  useEffect(() => {
    // Mock web vitals data since web-vitals package is not installed
    const mockVitals = () => {
      setVitals((prev) => ({
        ...prev,
        CLS: Math.random() * 0.1, // Good: < 0.1
        FID: Math.random() * 100, // Good: < 100ms
        FCP: Math.random() * 1800 + 600, // Good: < 1.8s
        LCP: Math.random() * 2500 + 1000, // Good: < 2.5s
        TTFB: Math.random() * 600 + 100, // Good: < 600ms
        INP: Math.random() * 200 + 50, // Good: < 200ms
      }));
    };

    // Initial mock data
    mockVitals();

    // Update periodically for demo purposes
    const interval = setInterval(mockVitals, 5000);
    return () => clearInterval(interval);
  }, []);

  return vitals;
};
