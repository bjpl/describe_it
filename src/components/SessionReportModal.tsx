"use client";

import React, { useState } from "react";
import { X, BarChart3, FileText, TrendingUp } from "lucide-react";
import SessionReport from "./SessionReport";
import { SessionLogger } from "@/lib/logging/sessionLogger";

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionLogger?: SessionLogger;
}

export function SessionReportModal({
  isOpen,
  onClose,
  sessionLogger,
}: SessionReportModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Session Analytics Report
              </h2>
              <p className="text-sm text-gray-600">
                Comprehensive analysis of your learning session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <SessionReport
            sessionLogger={sessionLogger}
            showExportOptions={true}
            className=""
          />
        </div>
      </div>
    </div>
  );
}

// Quick Stats Component for dashboard
export function SessionQuickStats({
  sessionLogger,
  onOpenFullReport,
}: {
  sessionLogger?: SessionLogger;
  onOpenFullReport: () => void;
}) {
  const [stats, setStats] = useState<{
    totalInteractions: number;
    learningScore: number;
    sessionTime: number;
    vocabularyWords: number;
  } | null>(null);

  React.useEffect(() => {
    if (sessionLogger) {
      const summary = sessionLogger.generateSummary();
      setStats({
        totalInteractions: summary.totalInteractions,
        learningScore: summary.learningScore,
        sessionTime: Math.round(summary.totalDuration / 1000 / 60),
        vocabularyWords: summary.vocabularySelected,
      });
    }
  }, [sessionLogger]);

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-blue-900 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Session Progress
        </h3>
        <button
          onClick={onOpenFullReport}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
        >
          <FileText className="w-4 h-4 mr-1" />
          Full Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalInteractions}
          </div>
          <div className="text-xs text-gray-600">Interactions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.learningScore}
          </div>
          <div className="text-xs text-gray-600">Learning Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.sessionTime}m
          </div>
          <div className="text-xs text-gray-600">Session Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.vocabularyWords}
          </div>
          <div className="text-xs text-gray-600">Vocabulary</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Learning Progress</span>
          <span>{stats.learningScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.learningScore, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default SessionReportModal;
