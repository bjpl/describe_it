"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  className = "",
}: PaginationControlsProps) {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [1];

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !isLoading) {
      onPageChange(page);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {/* Previous Button */}
      <MotionButton
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1 || isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${
            currentPage <= 1 || isLoading
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
          }
        `}
        whileHover={currentPage > 1 && !isLoading ? { scale: 1.05 } : {}}
        whileTap={currentPage > 1 && !isLoading ? { scale: 0.95 } : {}}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </MotionButton>

      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {visiblePages.map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <span className="px-3 py-2 text-gray-400">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ) : (
              <MotionButton
                onClick={() => handlePageChange(page as number)}
                disabled={isLoading}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    page === currentPage
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  }
                  ${isLoading ? "cursor-not-allowed opacity-50" : ""}
                `}
                whileHover={
                  page !== currentPage && !isLoading ? { scale: 1.05 } : {}
                }
                whileTap={
                  page !== currentPage && !isLoading ? { scale: 0.95 } : {}
                }
              >
                {page}
              </MotionButton>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Next Button */}
      <MotionButton
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${
            currentPage >= totalPages || isLoading
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
          }
        `}
        whileHover={
          currentPage < totalPages && !isLoading ? { scale: 1.05 } : {}
        }
        whileTap={currentPage < totalPages && !isLoading ? { scale: 0.95 } : {}}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </MotionButton>

      {/* Page Info */}
      <div className="hidden md:flex items-center ml-4 text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
}
