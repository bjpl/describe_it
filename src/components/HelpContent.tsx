"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Search,
  Image,
  MessageSquare,
  HelpCircle,
  Keyboard,
  Activity,
  Globe,
  BookOpen,
  Settings,
  AlertCircle,
  Info,
  Mail,
  ExternalLink,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Monitor,
  Smartphone,
  Zap,
  Heart,
  Star,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { logger } from '@/lib/logger';

interface HelpContentProps {
  onClose: () => void;
}

interface ServiceStatus {
  name: string;
  category: "core" | "external" | "storage" | "monitoring" | "security";
  enabled: boolean;
  configured: boolean;
  healthy: boolean;
  demoMode: boolean;
  required: boolean;
  reason?: string;
}

interface ApiStatus {
  unsplash: boolean;
  openai: boolean;
  database: boolean;
  cache: boolean;
}

interface FeedbackData {
  type: "bug" | "feature" | "general";
  email: string;
  subject: string;
  message: string;
  includeSystemInfo: boolean;
}

export function HelpContent({ onClose }: HelpContentProps) {
  const [activeTab, setActiveTab] = useState("guide");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    unsplash: false,
    openai: false,
    database: false,
    cache: false,
  });
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackData>({
    type: "general",
    email: "",
    subject: "",
    message: "",
    includeSystemInfo: true,
  });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOnline, connectionType } = useNetworkStatus();

  // Load API status and service information
  useEffect(() => {
    const loadSystemStatus = async () => {
      try {
        // Check API endpoints
        const healthResponse = await fetch("/api/health", { method: "HEAD" });
        const cacheResponse = await fetch("/api/cache/status", {
          method: "HEAD",
        });

        setApiStatus({
          unsplash: Boolean(process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
          openai: Boolean(process.env.OPENAI_API_KEY),
          database: healthResponse.ok,
          cache: cacheResponse.ok,
        });

        // Mock service statuses (in a real app, this would come from an API)
        setServiceStatuses([
          {
            name: "Image Search",
            category: "external",
            enabled: Boolean(process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
            configured: Boolean(process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
            healthy: Boolean(process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
            demoMode: !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY,
            required: false,
            reason: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
              ? undefined
              : "Using demo images",
          },
          {
            name: "AI Descriptions",
            category: "external",
            enabled: Boolean(process.env.OPENAI_API_KEY),
            configured: Boolean(process.env.OPENAI_API_KEY),
            healthy: Boolean(process.env.OPENAI_API_KEY),
            demoMode: !process.env.OPENAI_API_KEY,
            required: false,
            reason: process.env.OPENAI_API_KEY
              ? undefined
              : "Using pre-generated content",
          },
        ]);
      } catch (error) {
        logger.error("Failed to load system status:", error);
      }
    };

    loadSystemStatus();
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // In a real app, this would submit to your feedback API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      setFeedbackSubmitted(true);
      setFeedbackForm({
        type: "general",
        email: "",
        subject: "",
        message: "",
        includeSystemInfo: true,
      });
    } catch (error) {
      logger.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: "guide", label: "User Guide", icon: BookOpen },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "status", label: "API Status", icon: Activity },
    { id: "tips", label: "Learning Tips", icon: Lightbulb },
    { id: "troubleshooting", label: "Troubleshooting", icon: AlertCircle },
    { id: "about", label: "About", icon: Info },
    { id: "feedback", label: "Feedback", icon: Mail },
  ];

  const shortcuts = [
    { key: "Ctrl/Cmd + K", action: "Focus search bar" },
    { key: "Ctrl/Cmd + Enter", action: "Search for images" },
    { key: "Ctrl/Cmd + D", action: "Generate description" },
    { key: "Ctrl/Cmd + Q", action: "Generate Q&amp;A" },
    { key: "Ctrl/Cmd + P", action: "Extract phrases" },
    { key: "Ctrl/Cmd + I", action: "Open help modal" },
    { key: "Escape", action: "Close modal/cancel action" },
    { key: "Tab", action: "Navigate between elements" },
    { key: "Space", action: "Activate focused button" },
    { key: "Arrow Keys", action: "Navigate image grid" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "guide":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Describe It!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Learn Spanish through interactive image descriptions and
                exercises.
              </p>
            </div>

            {/* Getting Started */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <button
                onClick={() => toggleSection("getting-started")}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Getting Started</span>
                </div>
                {expandedSections.has("getting-started") ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedSections.has("getting-started") && (
                <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                      1
                    </div>
                    <div>
                      <strong>Search for Images:</strong> Use the search bar to
                      find images related to topics you want to learn about. Try
                      searches like &quot;kitchen&quot;, &quot;family&quot;, or &quot;vacation&quot;.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                      2
                    </div>
                    <div>
                      <strong>Select an Image:</strong> Click on any image from
                      the search results to begin the learning process.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                      3
                    </div>
                    <div>
                      <strong>Generate Content:</strong> Use the buttons to
                      generate descriptions, Q&A exercises, or extract key
                      phrases.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <button
                onClick={() => toggleSection("features")}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold">Features Overview</span>
                </div>
                {expandedSections.has("features") ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedSections.has("features") && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Image className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <strong className="text-green-600">
                        AI-Powered Descriptions
                      </strong>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Get detailed descriptions in both English and Spanish to
                        understand vocabulary in context.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <strong className="text-blue-600">Interactive Q&A</strong>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Test your understanding with automatically generated
                        questions about the image.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <strong className="text-purple-600">
                        Phrase Extraction
                      </strong>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Identify key vocabulary and phrases to focus your
                        learning.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Learning Methods */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <button
                onClick={() => toggleSection("learning-methods")}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold">Learning Methods</span>
                </div>
                {expandedSections.has("learning-methods") ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedSections.has("learning-methods") && (
                <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <strong>Visual Learning:</strong> Associate Spanish words
                    and phrases with images to improve retention.
                  </div>
                  <div>
                    <strong>Contextual Learning:</strong> Learn vocabulary
                    within meaningful sentences and descriptions.
                  </div>
                  <div>
                    <strong>Active Recall:</strong> Use Q&A exercises to test
                    your understanding and reinforce learning.
                  </div>
                  <div>
                    <strong>Progressive Difficulty:</strong> Start with basic
                    vocabulary and gradually work up to complex sentences.
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "shortcuts":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Keyboard className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Keyboard Shortcuts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use these shortcuts to navigate more efficiently
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
                Navigation
              </h4>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {shortcut.action}
                    </span>
                    <kbd className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Accessibility
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    All functionality is accessible via keyboard navigation. Use
                    Tab to move between elements and Enter or Space to activate
                    buttons. Screen readers are fully supported.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "status":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Activity className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                System Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current status of all services and APIs
              </p>
            </div>

            {/* Connection Status */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Connection
                </h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Network Status
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-sm font-medium">
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
                {connectionType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Connection Type
                    </span>
                    <span className="text-sm font-medium">
                      {connectionType}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* API Services */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  API Services
                </h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    <span className="text-sm">Image Search</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${apiStatus.unsplash ? "bg-green-500" : "bg-yellow-500"}`}
                    />
                    <span className="text-sm font-medium">
                      {apiStatus.unsplash ? "Active" : "Demo Mode"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">AI Descriptions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${apiStatus.openai ? "bg-green-500" : "bg-yellow-500"}`}
                    />
                    <span className="text-sm font-medium">
                      {apiStatus.openai ? "Active" : "Demo Mode"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">Health Check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${apiStatus.database ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-sm font-medium">
                      {apiStatus.database ? "Healthy" : "Unavailable"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Mode Info */}
            {(!apiStatus.unsplash || !apiStatus.openai) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      Demo Mode Active
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                      Some services are running in demo mode with pre-generated
                      content.
                    </p>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                      {!apiStatus.unsplash && (
                        <div>• Image search uses curated demo images</div>
                      )}
                      {!apiStatus.openai && (
                        <div>• AI content uses pre-generated responses</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "tips":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Lightbulb className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Learning Tips & Best Practices
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Maximize your Spanish learning experience
              </p>
            </div>

            <div className="grid gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="w-6 h-6 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Focus on Context
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      Rather than memorizing isolated words, focus on
                      understanding vocabulary within the context of complete
                      descriptions.
                    </p>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Tip: Read the full description first, then identify
                      unfamiliar words.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Progressive Learning
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                      Start with simple images and gradually work up to more
                      complex scenes as your vocabulary grows.
                    </p>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Suggested progression: Objects → Scenes → Activities →
                      Abstract concepts
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Heart className="w-6 h-6 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      Active Engagement
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                      Don&apos;t just read passively. Use the Q&amp;A feature to test
                      yourself and the phrase extraction to identify key terms.
                    </p>
                    <div className="text-xs text-purple-700 dark:text-purple-300">
                      Try to answer questions before reading the answers.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Monitor className="w-6 h-6 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                      Regular Practice
                    </h4>
                    <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                      Consistent daily practice, even for 10-15 minutes, is more
                      effective than longer, infrequent sessions.
                    </p>
                    <div className="text-xs text-orange-700 dark:text-orange-300">
                      Set a daily goal of analyzing 2-3 images with full
                      descriptions.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Study Strategies
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>
                    Create mental associations between images and Spanish
                    descriptions
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>
                    Practice describing images in your own words before reading
                    AI descriptions
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>
                    Use the extracted phrases to create your own sentences
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                  <span>
                    Review previous images periodically to reinforce learning
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case "troubleshooting":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Troubleshooting
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Solutions to common issues
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <button
                  onClick={() => toggleSection("no-images")}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">
                    No images appear in search results
                  </span>
                  {expandedSections.has("no-images") ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expandedSections.has("no-images") && (
                  <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <strong>Possible causes:</strong>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Network connection issues</li>
                      <li>API rate limit exceeded</li>
                      <li>Search term too specific or in wrong language</li>
                    </ul>
                    <div className="mt-3">
                      <strong>Solutions:</strong>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Check your internet connection</li>
                      <li>Try simpler, more general search terms in English</li>
                      <li>Wait a moment and try again if rate limited</li>
                      <li>Refresh the page to reset the connection</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <button
                  onClick={() => toggleSection("slow-loading")}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Content loads very slowly
                  </span>
                  {expandedSections.has("slow-loading") ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expandedSections.has("slow-loading") && (
                  <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <strong>Possible causes:</strong>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Slow internet connection</li>
                      <li>High server load</li>
                      <li>Large image files</li>
                    </ul>
                    <div className="mt-3">
                      <strong>Solutions:</strong>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Check your network speed</li>
                      <li>Close other bandwidth-heavy applications</li>
                      <li>Try again during off-peak hours</li>
                      <li>
                        Use a wired connection instead of Wi-Fi if possible
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <button
                  onClick={() => toggleSection("keyboard-shortcuts")}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Keyboard shortcuts not working
                  </span>
                  {expandedSections.has("keyboard-shortcuts") ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expandedSections.has("keyboard-shortcuts") && (
                  <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <strong>Possible causes:</strong>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Browser focus is on another element</li>
                      <li>Operating system shortcuts conflict</li>
                      <li>Browser extensions interfering</li>
                    </ul>
                    <div className="mt-3">
                      <strong>Solutions:</strong>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Click on the page area to ensure focus</li>
                      <li>Try using Ctrl instead of Cmd on Windows/Linux</li>
                      <li>Disable browser extensions temporarily</li>
                      <li>Use mouse navigation as an alternative</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <button
                  onClick={() => toggleSection("demo-mode")}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">
                    App stuck in demo mode
                  </span>
                  {expandedSections.has("demo-mode") ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expandedSections.has("demo-mode") && (
                  <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <strong>About demo mode:</strong>
                    </div>
                    <p>
                      Demo mode is automatically enabled when API keys are not
                      configured. This is normal for the public demo version.
                    </p>
                    <div className="mt-3">
                      <strong>In demo mode:</strong>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Image search shows curated demo images</li>
                      <li>AI descriptions use pre-generated content</li>
                      <li>All core features remain functional</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Still need help?
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    If you&apos;re experiencing issues not covered here, please use
                    the Feedback tab to report the problem. Include as much
                    detail as possible about what you were doing when the issue
                    occurred.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Describe It
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Interactive Spanish Learning Platform
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Version Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Version
                  </span>
                  <span className="font-medium">0.1.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Build Date
                  </span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Status
                  </span>
                  <span className="font-medium">Demo</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Technology Stack
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Frontend
                  </div>
                  <div className="font-medium">React 19, Next.js 15</div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Styling
                  </div>
                  <div className="font-medium">Tailwind CSS</div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Icons</div>
                  <div className="font-medium">Lucide React</div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">AI</div>
                  <div className="font-medium">OpenAI GPT-4</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Credits
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Images
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Powered by Unsplash API - High-quality photos from talented
                    photographers worldwide
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    AI Technology
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    OpenAI GPT-4 for natural language processing and content
                    generation
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Icons
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Lucide - Beautiful & consistent SVG icon library
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Documentation & Resources
              </h4>
              <div className="space-y-2">
                <a
                  href="https://github.com/your-username/describe-it"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Source Code & Documentation
                </a>
                <a
                  href="https://github.com/your-username/describe-it/issues"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Report Issues & Request Features
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("tips");
                  }}
                >
                  <BookOpen className="w-4 h-4" />
                  Learning Guide & Best Practices
                </a>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Made with ❤️ for Spanish learners everywhere
            </div>
          </div>
        );

      case "feedback":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Mail className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Feedback & Support
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Help us improve your learning experience
              </p>
            </div>

            {feedbackSubmitted ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Thank you for your feedback!
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  We&apos;ve received your message and will review it carefully. Your
                  input helps us make the app better for everyone.
                </p>
                <button
                  onClick={() => setFeedbackSubmitted(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  Submit another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Feedback Type
                  </label>
                  <select
                    value={feedbackForm.type}
                    onChange={(e) =>
                      setFeedbackForm((prev) => ({
                        ...prev,
                        type: e.target.value as FeedbackData["type"],
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={feedbackForm.email}
                    onChange={(e) =>
                      setFeedbackForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Provide your email if you&apos;d like us to follow up with you.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={feedbackForm.subject}
                    onChange={(e) =>
                      setFeedbackForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Brief description of your feedback"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={feedbackForm.message}
                    onChange={(e) =>
                      setFeedbackForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    placeholder="Please provide detailed information about your feedback, bug report, or feature request..."
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeSystemInfo"
                    checked={feedbackForm.includeSystemInfo}
                    onChange={(e) =>
                      setFeedbackForm((prev) => ({
                        ...prev,
                        includeSystemInfo: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    htmlFor="includeSystemInfo"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Include system information to help with troubleshooting
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Sending..." : "Send Feedback"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFeedbackForm({
                        type: "general",
                        email: "",
                        subject: "",
                        message: "",
                        includeSystemInfo: true,
                      })
                    }
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </form>
            )}

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Other Ways to Reach Us
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                  <a
                    href="https://github.com/your-username/describe-it/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    GitHub Issues
                  </a>
                  <span className="text-gray-500">
                    - For bug reports and feature requests
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                  <a
                    href="https://github.com/your-username/describe-it/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    GitHub Discussions
                  </a>
                  <span className="text-gray-500">
                    - For general questions and ideas
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Help & Support
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        {renderTabContent()}
      </div>
    </div>
  );
}
