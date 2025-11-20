/**
 * Enhanced DescriptionTabs component with URL routing
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { Globe, BookOpen, Copy, Check, Volume2, Share2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/MotionComponents';
import { DescriptionStyle } from '@/types';
import { logger } from '@/lib/logger';
import { useSyncedTabState } from '../hooks/useSyncedTabState';
import { useDeepLink } from '../hooks/useDeepLink';
import { TabRouteConfig } from '../types';

interface RoutedDescriptionTabsProps {
  englishDescription: string;
  spanishDescription: string;
  selectedStyle: DescriptionStyle;
  onStyleChange?: (style: DescriptionStyle) => void;
  isGenerating?: boolean;
  className?: string;
  /** Routing configuration */
  routeConfig?: TabRouteConfig;
  /** Enable deep linking/sharing */
  enableSharing?: boolean;
}

/**
 * DescriptionTabs with URL routing and deep linking support
 */
export const RoutedDescriptionTabs: React.FC<RoutedDescriptionTabsProps> = ({
  englishDescription,
  spanishDescription,
  selectedStyle,
  onStyleChange,
  isGenerating = false,
  className = '',
  routeConfig = {},
  enableSharing = true,
}) => {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  // Use synced tab state with URL
  const { tab: activeTab, setTab } = useSyncedTabState({
    ...routeConfig,
    paramName: routeConfig.paramName ?? 'lang',
    defaultTab: routeConfig.defaultTab ?? 'spanish',
  });

  // Deep linking support
  const { copyLink } = useDeepLink({
    tabParam: routeConfig.paramName ?? 'lang',
  });

  const handleCopy = useCallback(async (text: string, language: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(language);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      logger.error('Failed to copy text:', error);
    }
  }, []);

  const handleShare = useCallback(async (language: string) => {
    try {
      const success = await copyLink(language);
      if (success) {
        setCopiedText(`${language}-link`);
        setTimeout(() => setCopiedText(null), 2000);
      }
    } catch (error) {
      logger.error('Failed to share link:', error);
    }
  }, [copyLink]);

  const handleSpeak = useCallback((text: string, language: 'en' | 'es') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'en' ? 'en-US' : 'es-ES';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const tabContent = useMemo(
    () => ({
      english: {
        label: 'English',
        icon: Globe,
        content: englishDescription,
        language: 'en' as const,
      },
      spanish: {
        label: 'Español',
        icon: BookOpen,
        content: spanishDescription,
        language: 'es' as const,
      },
    }),
    [englishDescription, spanishDescription]
  );

  const activeContent = tabContent[activeTab as keyof typeof tabContent] ?? tabContent.spanish;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200">
        {Object.entries(tabContent).map(([key, tab]) => {
          const Icon = tab.icon;
          const isActive = key === activeTab;

          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`
                flex-1 px-4 py-3 flex items-center justify-center gap-2
                font-medium transition-all duration-200
                ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
          <MotionDiv
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
                <div className="flex gap-2 pt-2 flex-wrap">
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
                    onClick={() => handleSpeak(activeContent.content, activeContent.language)}
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

                  {enableSharing && (
                    <button
                      onClick={() => handleShare(activeTab)}
                      className="
                        inline-flex items-center gap-2 px-3 py-1.5
                        text-sm text-gray-700 bg-gray-100
                        rounded-md hover:bg-gray-200
                        transition-colors duration-200
                      "
                    >
                      {copiedText === `${activeTab}-link` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </MotionDiv>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RoutedDescriptionTabs;
