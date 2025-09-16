"use client";

import React from "react";
import { motion } from "framer-motion";
import { MotionButton, MotionDiv } from "./ui/MotionComponents";
import { DescriptionStyle } from "@/types";

interface StyleSelectorProps {
  selectedStyle: DescriptionStyle;
  onStyleSelect: (style: DescriptionStyle) => void;
  disabled?: boolean;
  className?: string;
}

const STYLE_OPTIONS: Array<{
  value: DescriptionStyle;
  label: string;
  description: string;
  icon: string;
  color: string;
}> = [
  {
    value: "conversacional",
    label: "Conversational",
    description: "Casual, everyday language",
    icon: "💬",
    color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  },
  {
    value: "narrativo",
    label: "Narrative",
    description: "Story-like, descriptive",
    icon: "📖",
    color: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  },
  {
    value: "poetico",
    label: "Poetic",
    description: "Artistic, metaphorical",
    icon: "✨",
    color:
      "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
  },
  {
    value: "academico",
    label: "Academic",
    description: "Formal, precise language",
    icon: "🎓",
    color:
      "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
  },
  {
    value: "infantil",
    label: "Children",
    description: "Simple, playful words",
    icon: "🧸",
    color: "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200",
  },
];

export function StyleSelector({
  selectedStyle,
  onStyleSelect,
  disabled = false,
  className = "",
}: StyleSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Choose Description Style
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = selectedStyle === option.value;

          return (
            <MotionButton
              key={option.value}
              onClick={() => onStyleSelect(option.value)}
              disabled={disabled}
              className={`relative p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                isSelected
                  ? option.color.replace("hover:", "")
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              } ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
            >
              {/* Selection indicator */}
              {isSelected && (
                <MotionDiv
                  className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </MotionDiv>
              )}

              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      isSelected
                        ? "text-current"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {option.label}
                  </div>
                </div>
              </div>

              <p
                className={`text-xs leading-relaxed ${
                  isSelected
                    ? "text-current opacity-90"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {option.description}
              </p>
            </MotionButton>
          );
        })}
      </div>

      {/* Style description */}
      {selectedStyle && (
        <MotionDiv
          key={selectedStyle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">Selected: </span>
            {
              STYLE_OPTIONS.find((opt) => opt.value === selectedStyle)
                ?.description
            }
          </p>
        </MotionDiv>
      )}
    </div>
  );
}
