"use client";

import React from 'react';
import { DashboardCard } from '@/components/Dashboard/DashboardLayout';
import { Clock, Trophy, TrendingUp } from 'lucide-react';
import type { UserActivity } from '../types';

interface ActivityWidgetProps {
  activity: UserActivity;
  loading?: boolean;
}

export function ActivityWidget({ activity, loading = false }: ActivityWidgetProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Sessions */}
      <DashboardCard
        title="Recent Sessions"
        description="Your latest activities"
        loading={loading}
      >
        <div className="space-y-3">
          {activity.recentSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions yet. Start learning!
            </div>
          ) : (
            activity.recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {new Date(session.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.duration} min · {session.wordsLearned} words
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  {session.accuracy}%
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardCard>

      {/* Top Vocabulary */}
      <DashboardCard
        title="Top Vocabulary"
        description="Most practiced words"
        loading={loading}
      >
        <div className="space-y-3">
          {activity.topVocabulary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vocabulary data yet
            </div>
          ) : (
            activity.topVocabulary.map((vocab, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{vocab.word}</div>
                    <div className="text-xs text-muted-foreground">
                      Practiced {vocab.count} times
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${vocab.mastery}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                    {vocab.mastery}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
