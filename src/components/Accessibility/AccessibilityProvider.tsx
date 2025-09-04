"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AccessibilityContextType {
  isHighContrast: boolean;
  fontSize: "small" | "medium" | "large" | "extra-large";
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  toggleHighContrast: () => void;
  setFontSize: (size: AccessibilityContextType["fontSize"]) => void;
  toggleReducedMotion: () => void;
  toggleScreenReaderMode: () => void;
  announceToScreenReader: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null,
);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider",
    );
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
}) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontSize, setFontSize] =
    useState<AccessibilityContextType["fontSize"]>("medium");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const [announcements, setAnnouncements] = useState<
    Array<{ id: string; message: string }>
  >([]);

  // Detect system preferences
  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReducedMotion(prefersReducedMotion);

    // Check for prefers-contrast
    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)",
    ).matches;
    setIsHighContrast(prefersHighContrast);

    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        setKeyboardNavigation(true);
      }
    };

    const handleMouseDown = () => {
      setKeyboardNavigation(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;

    // High contrast
    if (isHighContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Font size
    root.classList.remove(
      "font-small",
      "font-medium",
      "font-large",
      "font-extra-large",
    );
    root.classList.add(`font-${fontSize}`);

    // Reduced motion
    if (reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }

    // Keyboard navigation
    if (keyboardNavigation) {
      root.classList.add("keyboard-navigation");
    } else {
      root.classList.remove("keyboard-navigation");
    }
  }, [isHighContrast, fontSize, reducedMotion, keyboardNavigation]);

  const toggleHighContrast = () => {
    setIsHighContrast((prev) => !prev);
    announceToScreenReader(
      isHighContrast ? "High contrast disabled" : "High contrast enabled",
    );
  };

  const handleSetFontSize = (size: AccessibilityContextType["fontSize"]) => {
    setFontSize(size);
    announceToScreenReader(`Font size changed to ${size}`);
  };

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => !prev);
    announceToScreenReader(reducedMotion ? "Motion enabled" : "Motion reduced");
  };

  const toggleScreenReaderMode = () => {
    setScreenReaderMode((prev) => !prev);
    announceToScreenReader(
      screenReaderMode
        ? "Screen reader mode disabled"
        : "Screen reader mode enabled",
    );
  };

  const announceToScreenReader = (message: string) => {
    const id = `announcement-${Date.now()}`;
    setAnnouncements((prev) => [...prev, { id, message }]);

    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }, 1000);
  };

  const value: AccessibilityContextType = {
    isHighContrast,
    fontSize,
    reducedMotion,
    screenReaderMode,
    keyboardNavigation,
    toggleHighContrast,
    setFontSize: handleSetFontSize,
    toggleReducedMotion,
    toggleScreenReaderMode,
    announceToScreenReader,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}

      {/* Screen reader announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        <AnimatePresence>
          {announcements.map((announcement) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {announcement.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AccessibilityContext.Provider>
  );
};

// Accessibility Settings Panel
export const AccessibilityPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isHighContrast,
    fontSize,
    reducedMotion,
    screenReaderMode,
    toggleHighContrast,
    setFontSize,
    toggleReducedMotion,
    toggleScreenReaderMode,
    announceToScreenReader,
  } = useAccessibility();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + A to open accessibility panel
      if (e.altKey && e.key === "a") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        announceToScreenReader(
          isOpen ? "Accessibility panel closed" : "Accessibility panel opened",
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, announceToScreenReader]);

  return (
    <>
      {/* Accessibility trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open accessibility settings (Alt + A)"
        title="Accessibility Settings"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
          />
        </svg>
      </button>

      {/* Accessibility Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="fixed bottom-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80 max-h-96 overflow-y-auto"
              role="dialog"
              aria-labelledby="accessibility-title"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="accessibility-title" className="text-lg font-semibold">
                  Accessibility Settings
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  aria-label="Close accessibility settings"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* High Contrast */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="high-contrast"
                    className="text-sm font-medium"
                  >
                    High Contrast
                  </label>
                  <button
                    id="high-contrast"
                    onClick={toggleHighContrast}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${isHighContrast ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}
                    `}
                    role="switch"
                    aria-checked={isHighContrast}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 rounded-full bg-white transition-transform
                        ${isHighContrast ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Font Size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["small", "medium", "large", "extra-large"] as const).map(
                      (size) => (
                        <button
                          key={size}
                          onClick={() => setFontSize(size)}
                          className={`
                          px-3 py-2 text-xs rounded border text-center
                          ${
                            fontSize === size
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                          }
                        `}
                          aria-pressed={fontSize === size}
                        >
                          {size.charAt(0).toUpperCase() +
                            size.slice(1).replace("-", " ")}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="reduced-motion"
                    className="text-sm font-medium"
                  >
                    Reduce Motion
                  </label>
                  <button
                    id="reduced-motion"
                    onClick={toggleReducedMotion}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${reducedMotion ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}
                    `}
                    role="switch"
                    aria-checked={reducedMotion}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 rounded-full bg-white transition-transform
                        ${reducedMotion ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>

                {/* Screen Reader Mode */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="screen-reader-mode"
                    className="text-sm font-medium"
                  >
                    Screen Reader Mode
                  </label>
                  <button
                    id="screen-reader-mode"
                    onClick={toggleScreenReaderMode}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${screenReaderMode ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}
                    `}
                    role="switch"
                    aria-checked={screenReaderMode}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 rounded-full bg-white transition-transform
                        ${screenReaderMode ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Press Alt + A to toggle this panel
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
