"use client";

import React, { Suspense, useState, useEffect } from "react";
import {
  DashboardLayout,
  DashboardGrid,
  DashboardCard,
  DashboardSection,
  DashboardStatsCard
} from "@/components/Dashboard/DashboardLayout";
import { SavedDescriptions } from "@/components/Dashboard/SavedDescriptions";
import { LearningProgress } from "@/components/Dashboard/LearningProgress";
import { ApiKeysManager } from "@/components/Dashboard/ApiKeysManager";
import { UserStats } from "@/components/Dashboard/UserStats";
import { RecentActivity } from "@/components/Dashboard/RecentActivity";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingOverlay, CardSkeletonEnhanced } from "@/components/ui/LoadingStates";
import { supabase, DatabaseService } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Target,
  Clock,
  Zap,
  Settings,
  TrendingUp,
  Users,
  Trophy,
  Calendar,
  Activity,
  Image,
  Key,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  quickStats: {
    totalWords: number;
    totalSessions: number;
    currentStreak: number;
    averageAccuracy: number;
  };
  recentAchievements: {
    name: string;
    description: string;
    earnedAt: string;
    rarity: "common" | "rare" | "epic" | "legendary";
  }[];
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [activeView, setActiveView] = useState<"overview" | "analytics" | "settings">("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        router.push("/auth/signin?redirect=/dashboard");
        return;
      }

      // For demo purposes, use mock data
      const mockData: DashboardData = {
        user: {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url
        },
        quickStats: {
          totalWords: 234,
          totalSessions: 67,
          currentStreak: 7,
          averageAccuracy: 87.5
        },
        recentAchievements: [
          {
            name: "Week Warrior",
            description: "Maintained a 7-day streak",
            earnedAt: "2024-01-15",
            rarity: "epic"
          },
          {
            name: "Accuracy Master",
            description: "Achieved 90%+ accuracy",
            earnedAt: "2024-01-10",
            rarity: "legendary"
          }
        ]
      };
      
      setDashboardData(mockData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard";
      setError(errorMessage);
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Dashboard Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchDashboardData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title={dashboardData?.user ? `Welcome back, ${dashboardData.user.name}!` : "Dashboard"}
      description="Track your learning progress and manage your vocabulary journey"
    >
      <div className="space-y-8">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* View Selector */}
          <div className="flex gap-2">
            <Button
              variant={activeView === "overview" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("overview")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={activeView === "analytics" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("analytics")}
            >
              <LineChart className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant={activeView === "settings" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          {/* Time Range & Actions */}
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-1 text-sm border rounded-md"
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Overview View */}
        {activeView === "overview" && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <DashboardSection title="Quick Stats">
              <LoadingOverlay isLoading={loading}>
                {loading ? (
                  <DashboardGrid cols={4}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <CardSkeletonEnhanced key={i} className="h-32" />
                    ))}
                  </DashboardGrid>
                ) : dashboardData && (
                  <DashboardGrid cols={4}>
                    <DashboardStatsCard
                      title="Words Learned"
                      value={dashboardData.quickStats.totalWords}
                      description="Total vocabulary"
                      icon={<BookOpen className="h-8 w-8" />}
                      trend={{
                        value: 15.2,
                        label: "from last month",
                        positive: true
                      }}
                    />
                    
                    <DashboardStatsCard
                      title="Study Sessions"
                      value={dashboardData.quickStats.totalSessions}
                      description="Completed sessions"
                      icon={<Target className="h-8 w-8" />}
                      trend={{
                        value: 8.7,
                        label: "from last month",
                        positive: true
                      }}
                    />
                    
                    <DashboardStatsCard
                      title="Current Streak"
                      value={`${dashboardData.quickStats.currentStreak} days`}
                      description="Keep it up!"
                      icon={<Zap className="h-8 w-8" />}
                      trend={{
                        value: 2,
                        label: "days added",
                        positive: true
                      }}
                    />
                    
                    <DashboardStatsCard
                      title="Avg Accuracy"
                      value={`${dashboardData.quickStats.averageAccuracy.toFixed(1)}%`}
                      description="Getting better!"
                      icon={<TrendingUp className="h-8 w-8" />}
                      trend={{
                        value: 3.2,
                        label: "improvement",
                        positive: true
                      }}
                    />
                  </DashboardGrid>
                )}
              </LoadingOverlay>
            </DashboardSection>

            {/* Main Content Grid */}
            <DashboardGrid cols={3} gap={6}>
              {/* Learning Progress - Spans 2 columns */}
              <DashboardCard
                title="Learning Progress"
                description="Your vocabulary journey over time"
                colSpan={2}
                loading={loading}
              >
                <Suspense fallback={<CardSkeletonEnhanced className="h-80" />}>
                  <LearningProgress
                    userId={dashboardData?.user?.id}
                    timeRange={selectedTimeRange}
                  />
                </Suspense>
              </DashboardCard>

              {/* Recent Activity */}
              <DashboardCard
                title="Recent Activity"
                description="Your latest learning activities"
                loading={loading}
              >
                <Suspense fallback={<CardSkeletonEnhanced className="h-80" />}>
                  <RecentActivity
                    userId={dashboardData?.user?.id}
                    limit={10}
                    autoRefresh={true}
                  />
                </Suspense>
              </DashboardCard>

              {/* Saved Descriptions */}
              <DashboardCard
                title="Saved Descriptions"
                description="Your generated image descriptions"
                colSpan={2}
                loading={loading}
              >
                <Suspense fallback={<CardSkeletonEnhanced className="h-80" />}>
                  <SavedDescriptions
                    userId={dashboardData?.user?.id}
                    limit={10}
                    showSearch={false}
                    showFilters={false}
                  />
                </Suspense>
              </DashboardCard>

              {/* Recent Achievements */}
              <DashboardCard
                title="Recent Achievements"
                description="Your latest accomplishments"
                loading={loading}
              >
                <div className="space-y-3">
                  {dashboardData?.recentAchievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(achievement.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={cn(
                        "text-xs",
                        achievement.rarity === "legendary" && "bg-yellow-100 text-yellow-800",
                        achievement.rarity === "epic" && "bg-purple-100 text-purple-800",
                        achievement.rarity === "rare" && "bg-blue-100 text-blue-800",
                        achievement.rarity === "common" && "bg-gray-100 text-gray-800"
                      )}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center p-8">
                      <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No achievements yet</p>
                    </div>
                  )}
                </div>
              </DashboardCard>
            </DashboardGrid>
          </div>
        )}

        {/* Analytics View */}
        {activeView === "analytics" && (
          <div className="space-y-8">
            <DashboardSection
              title="Detailed Analytics"
              description="Deep dive into your learning patterns and progress"
            >
              <DashboardGrid cols={1}>
                <DashboardCard
                  title="User Statistics"
                  description="Comprehensive view of your learning statistics"
                  loading={loading}
                >
                  <Suspense fallback={<CardSkeletonEnhanced className="h-96" />}>
                    <UserStats
                      userId={dashboardData?.user?.id}
                      timeRange={selectedTimeRange}
                    />
                  </Suspense>
                </DashboardCard>
              </DashboardGrid>
            </DashboardSection>
          </div>
        )}

        {/* Settings View */}
        {activeView === "settings" && (
          <div className="space-y-8">
            <DashboardSection
              title="Dashboard Settings"
              description="Manage your API keys and preferences"
            >
              <DashboardGrid cols={1}>
                <DashboardCard
                  title="API Keys Management"
                  description="Manage your API keys for enhanced functionality"
                  loading={loading}
                >
                  <Suspense fallback={<CardSkeletonEnhanced className="h-96" />}>
                    <ApiKeysManager />
                  </Suspense>
                </DashboardCard>
              </DashboardGrid>
            </DashboardSection>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
