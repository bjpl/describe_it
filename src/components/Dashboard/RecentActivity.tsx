"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingOverlay, TextSkeleton } from "@/components/ui/LoadingStates";
import { supabase, DatabaseService } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Clock,
  BookOpen,
  Target,
  Trophy,
  Image,
  MessageSquare,
  Star,
  Zap,
  Calendar,
  Filter,
  RefreshCw,
  ChevronRight,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Activity
} from "lucide-react";
import type { StudySession, UserProgress } from "@/types/database";
import { logger } from '@/lib/logger';

interface RecentActivityProps {
  className?: string;
  userId?: string;
  limit?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
}

interface ActivityItem {
  id: string;
  type: "study_session" | "word_learned" | "achievement" | "description_saved" | "quiz_completed" | "streak_milestone";
  title: string;
  description: string;
  timestamp: string;
  metadata: {
    score?: number;
    accuracy?: number;
    wordsCount?: number;
    sessionType?: string;
    achievementLevel?: string;
    imageUrl?: string;
    difficulty?: string;
  };
  icon: string;
  color: string;
  priority: "low" | "medium" | "high";
}

const ACTIVITY_ICONS = {
  study_session: BookOpen,
  word_learned: Star,
  achievement: Trophy,
  description_saved: Image,
  quiz_completed: Target,
  streak_milestone: Zap
};

const ACTIVITY_COLORS = {
  study_session: "bg-blue-100 text-blue-800",
  word_learned: "bg-green-100 text-green-800",
  achievement: "bg-yellow-100 text-yellow-800",
  description_saved: "bg-purple-100 text-purple-800",
  quiz_completed: "bg-orange-100 text-orange-800",
  streak_milestone: "bg-red-100 text-red-800"
};

const PRIORITY_COLORS = {
  low: "border-gray-200",
  medium: "border-blue-200",
  high: "border-yellow-200"
};

export function RecentActivity({
  className,
  userId,
  limit = 20,
  showFilters = true,
  autoRefresh = false
}: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchActivities = useCallback(async (showRefreshing = false) => {
    if (!userId && !showRefreshing) {
      // Generate mock data for demo
      setTimeout(() => {
        setActivities(generateMockActivities());
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch recent sessions and progress
      const [sessions, progress] = await Promise.all([
        DatabaseService.getUserSessions(userId!, limit),
        DatabaseService.getLearningProgress(userId!, limit)
      ]);

      // Transform data to activity items
      const activityItems = await transformToActivityItems(sessions as StudySession[], progress);
      
      // Sort by timestamp (newest first)
      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setActivities(activityItems.slice(0, limit));
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch activities";
      setError(errorMessage);
      logger.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, limit]); // generateMockActivities and transformToActivityItems are stable

  // Auto-refresh functionality
  useEffect(() => {
    fetchActivities();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchActivities(true);
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [fetchActivities, autoRefresh]);

  // Real-time updates with Supabase subscriptions
  useEffect(() => {
    if (!userId || !supabase) return;

    const channel = supabase
      .channel('user-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Add new session to activities
          const newActivity = transformSessionToActivity(payload.new as StudySession);
          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Add new progress to activities
          const newActivity = transformProgressToActivity(payload.new as UserProgress);
          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, limit]);

  const generateMockActivities = (): ActivityItem[] => {
    const mockActivities: ActivityItem[] = [];
    const now = new Date();
    
    // Generate activities for the last 7 days
    for (let i = 0; i < limit; i++) {
      const timestamp = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)); // Every 2 hours
      const types: (keyof typeof ACTIVITY_ICONS)[] = [
        "study_session", "word_learned", "achievement", 
        "description_saved", "quiz_completed", "streak_milestone"
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      
      mockActivities.push({
        id: `activity-${i}`,
        type,
        title: getActivityTitle(type, i),
        description: getActivityDescription(type, i),
        timestamp: timestamp.toISOString(),
        metadata: getActivityMetadata(type, i),
        icon: type,
        color: ACTIVITY_COLORS[type],
        priority: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low"
      });
    }
    
    return mockActivities;
  };

  const getActivityTitle = (type: keyof typeof ACTIVITY_ICONS, index: number): string => {
    const titles = {
      study_session: `Completed ${["Flashcards", "Quiz", "Matching", "Writing"][index % 4]} session`,
      word_learned: `Learned ${Math.floor(Math.random() * 10) + 1} new words`,
      achievement: `Earned "${["First Steps", "Word Master", "Streak Keeper", "Perfect Score"][index % 4]}" achievement`,
      description_saved: `Saved image description`,
      quiz_completed: `Completed vocabulary quiz`,
      streak_milestone: `Reached ${Math.floor(Math.random() * 20) + 1} day streak!`
    };
    return titles[type];
  };

  const getActivityDescription = (type: keyof typeof ACTIVITY_ICONS, index: number): string => {
    const descriptions = {
      study_session: `${Math.floor(Math.random() * 30) + 10} words reviewed with ${Math.floor(Math.random() * 20) + 75}% accuracy`,
      word_learned: `Added to ${["Nouns", "Verbs", "Adjectives", "Phrases"][index % 4]} category`,
      achievement: `Completed milestone requirements`,
      description_saved: `Generated in ${["narrative", "poetic", "academic", "conversational"][index % 4]} style`,
      quiz_completed: `Scored ${Math.floor(Math.random() * 30) + 70}% on ${["beginner", "intermediate", "advanced"][index % 3]} level quiz`,
      streak_milestone: `Keep up the great work!`
    };
    return descriptions[type];
  };

  const getActivityMetadata = (type: keyof typeof ACTIVITY_ICONS, index: number) => {
    const base = {
      score: Math.floor(Math.random() * 30) + 70,
      accuracy: Math.floor(Math.random() * 20) + 75,
      wordsCount: Math.floor(Math.random() * 15) + 5
    };
    
    switch (type) {
      case "study_session":
        return {
          ...base,
          sessionType: ["flashcards", "quiz", "matching", "writing"][index % 4]
        };
      case "achievement":
        return {
          achievementLevel: ["bronze", "silver", "gold", "platinum"][index % 4]
        };
      case "description_saved":
        return {
          imageUrl: `https://images.unsplash.com/photo-${1500000000000 + index}?w=400&h=300&fit=crop`,
          difficulty: ["beginner", "intermediate", "advanced"][index % 3]
        };
      default:
        return base;
    }
  };

  const transformToActivityItems = async (
    sessions: StudySession[],
    progress: UserProgress[]
  ): Promise<ActivityItem[]> => {
    const activities: ActivityItem[] = [];
    
    // Transform sessions
    sessions.forEach(session => {
      activities.push(transformSessionToActivity(session));
    });
    
    // Transform progress
    progress.forEach(progressItem => {
      activities.push(transformProgressToActivity(progressItem));
    });
    
    return activities;
  };

  const transformSessionToActivity = (session: StudySession): ActivityItem => {
    return {
      id: session.id,
      type: "study_session",
      title: `Completed ${session.session_type} session`,
      description: `${session.vocabulary_items.length} words reviewed with ${session.accuracy.toFixed(1)}% accuracy`,
      timestamp: session.completed_at || session.started_at,
      metadata: {
        score: session.score,
        accuracy: session.accuracy,
        wordsCount: session.vocabulary_items.length,
        sessionType: session.session_type
      },
      icon: "study_session",
      color: ACTIVITY_COLORS.study_session,
      priority: session.accuracy >= 90 ? "high" : session.accuracy >= 75 ? "medium" : "low"
    };
  };

  const transformProgressToActivity = (progress: UserProgress): ActivityItem => {
    return {
      id: progress.id,
      type: "word_learned",
      title: "Learned new word",
      description: `Mastery level: ${progress.mastery_level}%`,
      timestamp: progress.last_reviewed,
      metadata: {
        accuracy: (progress.times_correct / progress.times_reviewed) * 100,
        wordsCount: 1
      },
      icon: "word_learned",
      color: ACTIVITY_COLORS.word_learned,
      priority: progress.mastery_level >= 80 ? "high" : progress.mastery_level >= 50 ? "medium" : "low"
    };
  };

  const filteredActivities = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter(activity => activity.type === filter);
  }, [activities, filter]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    const IconComponent = ACTIVITY_ICONS[type as keyof typeof ACTIVITY_ICONS] || BookOpen;
    return <IconComponent className="h-4 w-4" />;
  };

  const handleRefresh = () => {
    fetchActivities(true);
  };

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center p-8 border rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive mb-2">Failed to load activities</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchActivities()} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">
            Last updated: {formatTimestamp(lastRefresh.toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Activities
          </Button>
          <Button
            variant={filter === "study_session" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("study_session")}
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Study Sessions
          </Button>
          <Button
            variant={filter === "achievement" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("achievement")}
          >
            <Trophy className="h-4 w-4 mr-1" />
            Achievements
          </Button>
          <Button
            variant={filter === "word_learned" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("word_learned")}
          >
            <Star className="h-4 w-4 mr-1" />
            Words Learned
          </Button>
        </div>
      )}

      {/* Activity Feed */}
      <LoadingOverlay isLoading={loading}>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <TextSkeleton lines={2} />
              </Card>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center p-8 border rounded-lg">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Recent Activity</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {filter === "all" 
                ? "Start learning to see your activity here"
                : `No ${filter.replace("_", " ")} activities found`}
            </p>
            {filter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter("all")}
              >
                Show All Activities
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredActivities.map((activity, index) => (
              <Card 
                key={activity.id} 
                className={cn(
                  "p-4 transition-all duration-200 hover:shadow-md",
                  PRIORITY_COLORS[activity.priority],
                  index === 0 && isRefreshing && "animate-pulse"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn("p-2 rounded-full flex-shrink-0", activity.color)}>
                    {getActivityIcon(activity.icon)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {activity.title}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {activity.priority === "high" && (
                          <Badge variant="destructive" className="text-xs">
                            High
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {activity.description}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {activity.metadata.score && (
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          <span>Score: {activity.metadata.score}</span>
                        </div>
                      )}
                      {activity.metadata.accuracy && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>{activity.metadata.accuracy.toFixed(0)}% accuracy</span>
                        </div>
                      )}
                      {activity.metadata.wordsCount && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{activity.metadata.wordsCount} words</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </LoadingOverlay>

      {/* Load more */}
      {!loading && filteredActivities.length >= limit && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities()}
          >
            Load More Activities
          </Button>
        </div>
      )}
    </div>
  );
}

export default RecentActivity;
