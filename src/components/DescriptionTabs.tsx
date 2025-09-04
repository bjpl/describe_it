"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, BookOpen, Copy, Check, Volume2 } from "lucide-react";
import { DescriptionStyle } from "@/types";

interface DescriptionTabsProps {
  englishDescription: string;
  spanishDescription: string;
  selectedStyle: DescriptionStyle;
  onStyleChange?: (style: DescriptionStyle) => void;
  isGenerating?: boolean;
  className?: string;
}

export const DescriptionTabs: React.FC<DescriptionTabsProps> = ({
  englishDescription,
  spanishDescription,
  selectedStyle,
  onStyleChange,
  isGenerating = false,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<"english" | "spanish">("spanish");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, language: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(language);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  }, []);

  const handleSpeak = useCallback((text: string, language: "en" | "es") => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "en" ? "en-US" : "es-ES";
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const tabContent = useMemo(
    () => ({
      english: {
        label: "English",
        icon: Globe,
        content: englishDescription,
        language: "en" as const,
      },
      spanish: {
        label: "Español",
        icon: BookOpen,
        content: spanishDescription,
        language: "es" as const,
      },
    }),
    [englishDescription, spanishDescription],
  );

  const activeContent = tabContent[activeTab];

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200">
        {Object.entries(tabContent).map(([key, tab]) => {
          const Icon = tab.icon;
          const isActive = key === activeTab;

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key as "english" | "spanish")}
              className={`
                flex-1 px-4 py-3 flex items-center justify-center gap-2
                font-medium transition-all duration-200
                ${
                  isActive
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
              disabled={isGenerating}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating description...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Description Text */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 leading-relaxed">
                    {activeContent.content}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleCopy(activeContent.content, activeTab)}
                    className="
                      inline-flex items-center gap-2 px-3 py-1.5
                      text-sm text-gray-700 bg-gray-100
                      rounded-md hover:bg-gray-200
                      transition-colors duration-200
                    "
                  >
                    {copiedText === activeTab ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      handleSpeak(activeContent.content, activeContent.language)
                    }
                    className="
                      inline-flex items-center gap-2 px-3 py-1.5
                      text-sm text-gray-700 bg-gray-100
                      rounded-md hover:bg-gray-200
                      transition-colors duration-200
                    "
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Speak</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DescriptionTabs;
