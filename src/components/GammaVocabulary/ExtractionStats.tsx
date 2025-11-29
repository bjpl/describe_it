"use client";

import React from "react";
import { MotionDiv } from "@/components/ui/MotionComponents";
import { Target } from "lucide-react";
import { getCategoryColor } from "@/lib/utils/phrase-helpers";
import { ExtractionStatsData } from "./types";

interface ExtractionStatsProps {
  stats: ExtractionStatsData;
}

export const ExtractionStats: React.FC<ExtractionStatsProps> = ({ stats }) => {
  if (stats.recentExtractions.length === 0) {
    return null;
  }

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-t border-gray-200 dark:border-gray-600 pt-4"
    >
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Target className="h-4 w-4" />
        Recent Extractions ({stats.recentExtractions.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {stats.recentExtractions.slice(0, 12).map((phrase) => (
          <span
            key={phrase.id}
            className={`px-2 py-1 text-xs rounded ${getCategoryColor(phrase.category)}`}
            title={`${phrase.definition} (${phrase.category})`}
          >
            {phrase.phrase}
          </span>
        ))}
        {stats.recentExtractions.length > 12 && (
          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs rounded">
            +{stats.recentExtractions.length - 12} more
          </span>
        )}
      </div>
    </MotionDiv>
  );
};
