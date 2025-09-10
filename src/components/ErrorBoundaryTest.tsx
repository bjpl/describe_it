"use client";

import React, { useState } from "react";
import { ErrorBoundary } from "@/providers/ErrorBoundary";
import { SectionErrorBoundary } from "./SectionErrorBoundary";

/**
 * Test component that throws errors for testing error boundaries
 */
function ThrowError({
  shouldThrow = false,
  errorType = "default",
}: {
  shouldThrow?: boolean;
  errorType?: "default" | "async" | "render" | "effect";
}) {
  const [, forceUpdate] = useState({});

  React.useEffect(() => {
    if (shouldThrow && errorType === "effect") {
      throw new Error("Test effect error for error boundary testing");
    }
  }, [shouldThrow, errorType]);

  if (shouldThrow && errorType === "render") {
    throw new Error("Test render error for error boundary testing");
  }

  const handleAsyncError = async () => {
    if (errorType === "async") {
      try {
        throw new Error("Test async error for error boundary testing");
      } catch (error) {
        // Simulate an unhandled promise rejection
        setTimeout(() => {
          throw error;
        }, 0);
      }
    }
  };

  if (shouldThrow && errorType === "async") {
    handleAsyncError();
  }

  if (shouldThrow && errorType === "default") {
    throw new Error("Test default error for error boundary testing");
  }

  return (
    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <p className="text-green-700 dark:text-green-300">
        Component is working correctly! Error boundary is not active.
      </p>
      <button
        onClick={() => forceUpdate({})}
        className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
      >
        Re-render Component
      </button>
    </div>
  );
}

/**
 * Error Boundary Test Component
 * Use this component to test error boundary functionality in development
 */
export function ErrorBoundaryTest() {
  const [errorConfig, setErrorConfig] = useState({
    shouldThrow: false,
    errorType: "default" as "default" | "async" | "render" | "effect",
    boundaryType: "global" as "global" | "section",
  });

  const triggerError = (type: typeof errorConfig.errorType) => {
    setErrorConfig({
      ...errorConfig,
      shouldThrow: true,
      errorType: type,
    });
  };

  const resetError = () => {
    setErrorConfig({
      ...errorConfig,
      shouldThrow: false,
    });
  };

  if (process.env.NODE_ENV === "production") {
    return null; // Don't show in production
  }

  const TestWrapper =
    errorConfig.boundaryType === "section"
      ? ({ children }: { children: React.ReactNode }) => (
          <SectionErrorBoundary
            sectionName="Test Section"
            sectionType="general"
            onRetry={resetError}
          >
            {children}
          </SectionErrorBoundary>
        )
      : ({ children }: { children: React.ReactNode }) => (
          <ErrorBoundary>{children}</ErrorBoundary>
        );

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Error Boundary Test Panel
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Boundary Type:
          </label>
          <select
            value={errorConfig.boundaryType}
            onChange={(e) =>
              setErrorConfig({
                ...errorConfig,
                boundaryType: e.target.value as "global" | "section",
              })
            }
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="global">Global Error Boundary</option>
            <option value="section">Section Error Boundary</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => triggerError("render")}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            Render Error
          </button>
          <button
            onClick={() => triggerError("effect")}
            className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
          >
            Effect Error
          </button>
          <button
            onClick={() => triggerError("default")}
            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
          >
            Default Error
          </button>
        </div>

        <button
          onClick={resetError}
          className="w-full px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>

        <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
          <TestWrapper>
            <ThrowError
              shouldThrow={errorConfig.shouldThrow}
              errorType={errorConfig.errorType}
            />
          </TestWrapper>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundaryTest;
