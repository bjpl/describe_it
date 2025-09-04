"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCw, Copy, Check } from "lucide-react";
import {
  DescriptionStyle,
  StyleDescription,
  LanguageVisibility,
  UnsplashImage,
} from "@/types";
import { StyleSelector } from "./StyleSelector";
import { LanguageToggles } from "./LanguageToggles";
import {
  performanceProfiler,
  useRenderCount,
  shallowCompare,
} from "@/lib/utils/performance-helpers";

interface DescriptionNotebookProps {
  image: UnsplashImage | null;
  onGenerateDescription?: (style: DescriptionStyle) => Promise<void>;
  onDescriptionUpdate?: (
    style: DescriptionStyle,
    english: string,
    spanish: string,
  ) => void;
  className?: string;
}

const INITIAL_DESCRIPTIONS: Record<DescriptionStyle, StyleDescription> = {
  narrativo: {
    style: "narrativo",
    english: "",
    spanish: "",
    isLoading: false,
  },
  poetico: {
    style: "poetico",
    english: "",
    spanish: "",
    isLoading: false,
  },
  academico: {
    style: "academico",
    english: "",
    spanish: "",
    isLoading: false,
  },
  conversacional: {
    style: "conversacional",
    english: "",
    spanish: "",
    isLoading: false,
  },
  infantil: {
    style: "infantil",
    english: "",
    spanish: "",
    isLoading: false,
  },
};

const DescriptionNotebookBase: React.FC<DescriptionNotebookProps> = ({
  image,
  onGenerateDescription,
  onDescriptionUpdate,
  className = "",
}) => {
  const [activeStyle, setActiveStyle] =
    useState<DescriptionStyle>("conversacional");
  const [descriptions, setDescriptions] = useState(INITIAL_DESCRIPTIONS);

  // Performance monitoring
  const renderCount = useRenderCount("DescriptionNotebook");

  React.useEffect(() => {
    performanceProfiler.startMark("DescriptionNotebook-render");
    return () => {
      performanceProfiler.endMark("DescriptionNotebook-render");
    };
  });
  const [languageVisibility, setLanguageVisibility] =
    useState<LanguageVisibility>({
      showEnglish: true,
      showSpanish: true,
    });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleStyleSelect = useCallback((style: DescriptionStyle) => {
    setActiveStyle(style);
  }, []);

  const handleGenerateDescription = useCallback(
    async (style: DescriptionStyle) => {
      if (!image || !onGenerateDescription) return;

      setDescriptions((prev) => ({
        ...prev,
        [style]: { ...prev[style], isLoading: true, error: undefined },
      }));

      try {
        // Simulate API calls - replace with actual API calls
        const [englishRes, spanishRes] = await Promise.all([
          fetch("/api/descriptions/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: image.urls?.regular || image.urls.small,
              style,
              language: "en",
              maxLength: 200,
            }),
          }),
          fetch("/api/descriptions/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: image.urls?.regular || image.urls.small,
              style,
              language: "es",
              maxLength: 200,
            }),
          }),
        ]);

        const englishData = await englishRes.json();
        const spanishData = await spanishRes.json();

        const englishText =
          englishData.data?.text ||
          `This image shows interesting visual elements in a ${style} style.`;
        const spanishText =
          spanishData.data?.text ||
          `Esta imagen muestra elementos visuales interesantes en un estilo ${style}.`;

        setDescriptions((prev) => ({
          ...prev,
          [style]: {
            ...prev[style],
            english: englishText,
            spanish: spanishText,
            isLoading: false,
          },
        }));

        // Notify parent component of update
        if (onDescriptionUpdate) {
          onDescriptionUpdate(style, englishText, spanishText);
        }
      } catch (error) {
        console.error("Generation error:", error);
        const fallbackEnglish = `This is a beautiful image described in ${style} style.`;
        const fallbackSpanish = `Esta es una imagen hermosa descrita en estilo ${style}.`;

        setDescriptions((prev) => ({
          ...prev,
          [style]: {
            ...prev[style],
            english: fallbackEnglish,
            spanish: fallbackSpanish,
            isLoading: false,
            error: "Failed to generate description",
          },
        }));

        // Still notify parent of fallback content
        if (onDescriptionUpdate) {
          onDescriptionUpdate(style, fallbackEnglish, fallbackSpanish);
        }
      }
    },
    [image, onGenerateDescription],
  );

  const handleCopyText = useCallback(
    async (text: string, type: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(`${activeStyle}-${type}`);
        setTimeout(() => setCopiedText(null), 2000);
      } catch (error) {
        console.error("Failed to copy text:", error);
      }
    },
    [activeStyle],
  );

  // Memoize expensive computations
  const activeDescription = useMemo(
    () => descriptions[activeStyle],
    [descriptions, activeStyle],
  );

  // Memoize image-dependent values
  const hasImage = useMemo(() => Boolean(image), [image]);
  const imageKey = useMemo(() => image?.id || null, [image?.id]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cuaderno de Descripciones
        </h2>
        <LanguageToggles
          visibility={languageVisibility}
          onVisibilityChange={setLanguageVisibility}
        />
      </div>

      {/* Style Selector */}
      <StyleSelector
        selectedStyle={activeStyle}
        onStyleSelect={handleStyleSelect}
        disabled={!image}
      />

      {/* Generate Button */}
      {hasImage && (
        <div className="flex justify-center">
          <motion.button
            onClick={() => handleGenerateDescription(activeStyle)}
            disabled={activeDescription.isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeDescription.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            <span>
              {activeDescription.isLoading
                ? "Generando..."
                : "Generar Descripción"}
            </span>
          </motion.button>
        </div>
      )}

      {/* Description Display */}
      {hasImage && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Estilo:{" "}
                {activeStyle.charAt(0).toUpperCase() + activeStyle.slice(1)}
              </h3>
              {activeDescription.error && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  ⚠️ {activeDescription.error}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <AnimatePresence mode="wait">
              {activeDescription.isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-12"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    Generando descripción en estilo {activeStyle}...
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* English Description */}
                  {languageVisibility.showEnglish &&
                    activeDescription.english && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-300">
                            English Description
                          </h4>
                          <motion.button
                            onClick={() =>
                              handleCopyText(
                                activeDescription.english,
                                "english",
                              )
                            }
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {copiedText === `${activeStyle}-english` ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-blue-600" />
                            )}
                          </motion.button>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {activeDescription.english}
                        </p>
                      </div>
                    )}

                  {/* Spanish Description */}
                  {languageVisibility.showSpanish &&
                    activeDescription.spanish && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-green-900 dark:text-green-300">
                            Descripción en Español
                          </h4>
                          <motion.button
                            onClick={() =>
                              handleCopyText(
                                activeDescription.spanish,
                                "spanish",
                              )
                            }
                            className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {copiedText === `${activeStyle}-spanish` ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-green-600" />
                            )}
                          </motion.button>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {activeDescription.spanish}
                        </p>
                      </div>
                    )}

                  {/* No content state */}
                  {!activeDescription.english && !activeDescription.spanish && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>
                        Haz clic en &ldquo;Generar Descripción&rdquo; para crear contenido
                        en estilo {activeStyle}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* No image state */}
      {!hasImage && (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Cuaderno de Descripciones
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Selecciona una imagen para generar descripciones en diferentes
            estilos: narrativo, poético, académico, conversacional e infantil.
          </p>
        </div>
      )}
    </div>
  );
};

// Memoized component with custom comparison
export const DescriptionNotebook = memo(
  DescriptionNotebookBase,
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.image?.id === nextProps.image?.id &&
      prevProps.className === nextProps.className &&
      prevProps.onGenerateDescription === nextProps.onGenerateDescription &&
      prevProps.onDescriptionUpdate === nextProps.onDescriptionUpdate
    );
  },
);
