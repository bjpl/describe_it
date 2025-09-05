"use client";

import React from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { LanguageVisibility } from "@/types";

interface LanguageTogglesProps {
  visibility: LanguageVisibility;
  onVisibilityChange: (visibility: LanguageVisibility) => void;
  className?: string;
}

export function LanguageToggles({
  visibility,
  onVisibilityChange,
  className = "",
}: LanguageTogglesProps) {
  const toggleEnglish = () => {
    onVisibilityChange({
      ...visibility,
      showEnglish: !visibility.showEnglish,
    });
  };

  const toggleSpanish = () => {
    onVisibilityChange({
      ...visibility,
      showSpanish: !visibility.showSpanish,
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Show:
      </span>

      {/* English Toggle */}
      <MotionButton
        onClick={toggleEnglish}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
          visibility.showEnglish
            ? "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300"
            : "bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {visibility.showEnglish ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
        <span className="text-xs font-medium">EN</span>
        <span className="text-xs">🇺🇸</span>
      </MotionButton>

      {/* Spanish Toggle */}
      <MotionButton
        onClick={toggleSpanish}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
          visibility.showSpanish
            ? "bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300"
            : "bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {visibility.showSpanish ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
        <span className="text-xs font-medium">ES</span>
        <span className="text-xs">🇪🇸</span>
      </MotionButton>

      {/* Quick Actions */}
      <div className="border-l border-gray-300 dark:border-gray-600 pl-2 ml-2">
        <button
          onClick={() =>
            onVisibilityChange({ showEnglish: true, showSpanish: true })
          }
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Show All
        </button>
        <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
        <button
          onClick={() =>
            onVisibilityChange({ showEnglish: false, showSpanish: true })
          }
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ES Only
        </button>
      </div>
    </div>
  );
}
