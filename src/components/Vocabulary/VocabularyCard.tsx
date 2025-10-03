"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import {
  Volume2,
  Heart,
  Edit,
  Trash2,
  Share2,
  Check,
  RotateCcw,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { ExtractedVocabularyItem } from "@/types/comprehensive";

export interface VocabularyCardProps {
  item: ExtractedVocabularyItem;
  mode?: "compact" | "expanded";
  onFavorite?: (id: string, isFavorite: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onMarkMastered?: (id: string) => void;
  onMarkForReview?: (id: string) => void;
  onAddToList?: (id: string, listName: string) => void;
  onRemoveFromList?: (id: string, listName: string) => void;
  onReportIssue?: (id: string, issue: string) => void;
  onPlayAudio?: (audioUrl: string) => void;
  isFavorite?: boolean;
  isMastered?: boolean;
  masteryLevel?: number;
  timesReviewed?: number;
  lastReviewedDate?: Date;
  nextReviewDate?: Date;
  customLists?: string[];
  className?: string;
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  item,
  mode = "expanded",
  onFavorite,
  onEdit,
  onDelete,
  onShare,
  onMarkMastered,
  onMarkForReview,
  onAddToList,
  onRemoveFromList,
  onReportIssue,
  onPlayAudio,
  isFavorite = false,
  isMastered = false,
  masteryLevel = 0,
  timesReviewed = 0,
  lastReviewedDate,
  nextReviewDate,
  customLists = [],
  className = "",
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [reportText, setReportText] = useState("");

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleFavoriteToggle = useCallback(() => {
    if (onFavorite) {
      onFavorite(item.id, !isFavorite);
    }
  }, [item.id, isFavorite, onFavorite]);

  const handlePlayAudio = useCallback(() => {
    if (onPlayAudio && item.pronunciation.audio_url) {
      onPlayAudio(item.pronunciation.audio_url);
    }
  }, [item.pronunciation.audio_url, onPlayAudio]);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(item.id);
    }
  }, [item.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(item.id);
    }
  }, [item.id, onDelete]);

  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(item.id);
    }
  }, [item.id, onShare]);

  const handleMarkMastered = useCallback(() => {
    if (onMarkMastered) {
      onMarkMastered(item.id);
    }
  }, [item.id, onMarkMastered]);

  const handleMarkForReview = useCallback(() => {
    if (onMarkForReview) {
      onMarkForReview(item.id);
    }
  }, [item.id, onMarkForReview]);

  const handleAddToList = useCallback(() => {
    if (onAddToList && newListName.trim()) {
      onAddToList(item.id, newListName.trim());
      setNewListName("");
      setShowAddToList(false);
    }
  }, [item.id, newListName, onAddToList]);

  const handleRemoveFromList = useCallback(
    (listName: string) => {
      if (onRemoveFromList) {
        onRemoveFromList(item.id, listName);
      }
    },
    [item.id, onRemoveFromList]
  );

  const handleReportIssue = useCallback(() => {
    if (onReportIssue && reportText.trim()) {
      onReportIssue(item.id, reportText.trim());
      setReportText("");
      setShowReportIssue(false);
    }
  }, [item.id, reportText, onReportIssue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleFlip();
      }
    },
    [handleFlip]
  );

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getMasteryColor = (level: number) => {
    if (level >= 80) return "bg-green-500";
    if (level >= 60) return "bg-blue-500";
    if (level >= 40) return "bg-yellow-500";
    if (level >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card
      className={`vocabulary-card ${mode} ${isFlipped ? "flipped" : ""} ${className}`}
      role="article"
      aria-label={`Vocabulary card for ${item.word}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">
              {!isFlipped ? item.word : item.translations.es || item.definition}
            </CardTitle>
            <CardDescription className="mt-1">
              {!isFlipped ? item.part_of_speech : "Spanish Translation"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {item.pronunciation.audio_url && (
              <button
                onClick={handlePlayAudio}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Play pronunciation"
                title="Play pronunciation"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleFavoriteToggle}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ${
                isFavorite ? "text-red-500" : "text-gray-400"
              }`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Flip Card Button */}
          <button
            onClick={handleFlip}
            className="w-full py-3 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-blue-700 dark:text-blue-300 font-medium"
            aria-label={isFlipped ? "Show English" : "Show Spanish"}
          >
            {isFlipped ? "← Show English" : "Flip to Spanish →"}
          </button>

          {/* Definition */}
          {!isFlipped && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Definition
              </h4>
              <p className="text-gray-600 dark:text-gray-400">{item.definition}</p>
            </div>
          )}

          {/* Pronunciation */}
          {!isFlipped && item.pronunciation.ipa && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Pronunciation
              </h4>
              <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
                {item.pronunciation.ipa}
              </p>
            </div>
          )}

          {/* Context Sentences */}
          {!isFlipped && mode === "expanded" && item.context_sentences.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Example Usage
              </h4>
              <ul className="space-y-1">
                {item.context_sentences.slice(0, 2).map((sentence, idx) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 italic">
                    &quot;{sentence}&quot;
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progress Indicators */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            {/* Mastery Level */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Mastery Level
                </span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {masteryLevel}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getMasteryColor(
                    masteryLevel
                  )}`}
                  style={{ width: `${masteryLevel}%` }}
                  role="progressbar"
                  aria-valuenow={masteryLevel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Mastery level: ${masteryLevel}%`}
                />
              </div>
            </div>

            {/* Review Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {timesReviewed}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Reviewed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(lastReviewedDate)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Last Review</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(nextReviewDate)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Next Review</div>
              </div>
            </div>
          </div>

          {/* Custom Lists */}
          {customLists.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customLists.map((list) => (
                <span
                  key={list}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs"
                >
                  {list}
                  <button
                    onClick={() => handleRemoveFromList(list)}
                    className="hover:text-purple-900 dark:hover:text-purple-100"
                    aria-label={`Remove from ${list}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add to List Form */}
          {showAddToList && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                aria-label="New list name"
              />
              <button
                onClick={handleAddToList}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                aria-label="Confirm add to list"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowAddToList(false)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm"
                aria-label="Cancel add to list"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Report Issue Form */}
          {showReportIssue && (
            <div className="space-y-2">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm min-h-[80px]"
                aria-label="Report issue description"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReportIssue}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  aria-label="Submit issue report"
                >
                  Submit Report
                </button>
                <button
                  onClick={() => setShowReportIssue(false)}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm"
                  aria-label="Cancel report"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex flex-wrap gap-2 w-full">
          {/* Action Buttons */}
          <button
            onClick={handleMarkMastered}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isMastered
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
            aria-label={isMastered ? "Marked as mastered" : "Mark as mastered"}
          >
            <Check className="h-4 w-4 inline mr-1" />
            {isMastered ? "Mastered" : "Mark Mastered"}
          </button>

          <button
            onClick={handleMarkForReview}
            className="flex-1 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-lg text-sm font-medium transition-colors"
            aria-label="Mark for review"
          >
            <RotateCcw className="h-4 w-4 inline mr-1" />
            Review
          </button>

          <button
            onClick={() => setShowAddToList(!showAddToList)}
            className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg text-sm font-medium transition-colors"
            aria-label="Add to list"
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Add to List
          </button>

          <button
            onClick={handleEdit}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Edit card"
            title="Edit"
          >
            <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            aria-label="Delete card"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>

          <button
            onClick={handleShare}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Share card"
            title="Share"
          >
            <Share2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={() => setShowReportIssue(!showReportIssue)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Report issue"
            title="Report Issue"
          >
            <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </CardFooter>
    </Card>
  );
};

VocabularyCard.displayName = "VocabularyCard";
