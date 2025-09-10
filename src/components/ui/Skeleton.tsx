"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

// Enhanced skeleton variants
export interface EnhancedSkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
  className?: string;
}

export function EnhancedSkeleton({
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
  className
}: EnhancedSkeletonProps) {
  const baseClasses = "bg-muted";
  
  const variantClasses = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-md",
    rounded: "rounded-lg"
  };
  
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-wave",
    none: ""
  };
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;
  
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  );
}

// Skeleton group for multiple loading elements
export interface SkeletonGroupProps {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function SkeletonGroup({ children, loading = true, className }: SkeletonGroupProps) {
  if (!loading) return <>{children}</>;
  
  return (
    <div className={cn("space-y-2", className)} role="status" aria-live="polite">
      {children}
    </div>
  );
}

// Preset skeleton layouts
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <EnhancedSkeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? "75%" : "100%"}
        />
      ))}
    </div>
  );
}

export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-4", className)}>
      <EnhancedSkeleton variant="circular" width={40} height={40} />
      <div className="space-y-2 flex-1">
        <EnhancedSkeleton variant="text" width="40%" />
        <EnhancedSkeleton variant="text" width="60%" />
      </div>
    </div>
  );
}

export function CardSkeletonEnhanced({ className }: { className?: string }) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <EnhancedSkeleton height={200} className="w-full" />
      <div className="p-4 space-y-3">
        <EnhancedSkeleton variant="text" width="80%" />
        <TextSkeleton lines={2} />
        <div className="flex justify-between items-center pt-2">
          <EnhancedSkeleton variant="rounded" width={80} height={32} />
          <EnhancedSkeleton variant="circular" width={24} height={24} />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className }: { 
  rows?: number; 
  columns?: number; 
  className?: string; 
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <EnhancedSkeleton key={`header-${i}`} height={20} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <EnhancedSkeleton key={`${rowIndex}-${colIndex}`} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
