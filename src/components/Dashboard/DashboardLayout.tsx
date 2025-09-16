"use client";

import React, { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingOverlay, CardSkeletonEnhanced } from "@/components/ui/LoadingStates";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

interface DashboardCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
}

interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
  gap?: 2 | 4 | 6 | 8;
}

// Main dashboard layout component
export function DashboardLayout({
  children,
  className,
  title = "Dashboard",
  description
}: DashboardLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="text-muted-foreground text-lg">{description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Optional header actions could go here */}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <Suspense
          fallback={
            <DashboardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeletonEnhanced key={i} className="h-80" />
              ))}
            </DashboardGrid>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}

// Dashboard grid for organizing cards
export function DashboardGrid({
  children,
  className,
  cols = 3,
  gap = 6
}: DashboardGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
  };

  const gridGap = {
    2: "gap-2",
    4: "gap-4",
    6: "gap-6",
    8: "gap-8"
  };

  return (
    <div className={cn(
      "grid auto-rows-fr",
      gridCols[cols],
      gridGap[gap],
      className
    )}>
      {children}
    </div>
  );
}

// Dashboard card component with built-in loading and error states
export function DashboardCard({
  title,
  description,
  children,
  className,
  loading = false,
  error,
  colSpan = 1,
  rowSpan = 1
}: DashboardCardProps) {
  const spanClasses = {
    col: {
      1: "",
      2: "md:col-span-2",
      3: "md:col-span-2 xl:col-span-3"
    },
    row: {
      1: "",
      2: "md:row-span-2"
    }
  };

  const cardContent = (
    <Card className={cn(
      "h-full flex flex-col",
      spanClasses.col[colSpan],
      spanClasses.row[rowSpan],
      className
    )}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-destructive text-sm font-medium">Error occurred</div>
              <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <LoadingOverlay isLoading={loading} message="Loading...">
      {cardContent}
    </LoadingOverlay>
  );
}

// Dashboard section for grouping related cards
export function DashboardSection({
  title,
  description,
  children,
  className,
  ...props
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn("space-y-6", className)} {...props}>
      {title && (
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// Dashboard stats card for displaying key metrics
export function DashboardStatsCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
  loading = false
}: {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  if (loading) {
    return <CardSkeletonEnhanced className={cn("h-32", className)} />;
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs">
          <span className={cn(
            "font-medium",
            trend.positive ? "text-emerald-600" : "text-red-600"
          )}>
            {trend.positive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-muted-foreground ml-1">{trend.label}</span>
        </div>
      )}
    </Card>
  );
}

export default DashboardLayout;
