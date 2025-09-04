/**
 * Progress Dashboard Component
 * Displays comprehensive learning progress and analytics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { Badge } from '../ui/Badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy, 
  Calendar, 
  Clock,
  Book,
  Brain,
  Award,
  Flame
} from 'lucide-react';
import { 
  useProgressSummary, 
  useProgressStats, 
  useStreakInfo,
  useLearningAnalytics 
} from '../../hooks/useProgressTracking';
import { LoadingSpinner } from '../Shared/LoadingStates';

interface ProgressDashboardProps {
  compact?: boolean;
  showAnalytics?: boolean;
  className?: string;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  compact = false,
  showAnalytics = true,
  className = '',
}) => {
  const { data: progressStats, isLoading: statsLoading } = useProgressStats();
  const { data: streakInfo, isLoading: streakLoading } = useStreakInfo();
  const { data: analytics, isLoading: analyticsLoading } = useLearningAnalytics();

  if (statsLoading || streakLoading || (showAnalytics && analyticsLoading)) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!progressStats) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Start learning to see your progress!</p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Stats Grid */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-4`}>
        {/* Total Points */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Total Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressStats.total_points.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
              <span>+{progressStats.this_week.points} this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streakInfo?.current || 0} days</div>
            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
              <span>Best: {streakInfo?.longest || 0} days</span>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progressStats.completion_rate)}%</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              {getTrendIcon(progressStats.improvement_trend)}
              <span className="text-gray-600">{progressStats.improvement_trend}</span>
            </div>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressStats.this_week.sessions}</div>
            <div className="text-sm text-gray-600 mt-1">sessions completed</div>
          </CardContent>
        </Card>
      </div>

      {!compact && (
        <>
          {/* Daily Goal Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Daily Goal Progress
                </span>
                {streakInfo?.today_completed && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Completed
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Points Today</span>
                    <span>{progressStats.this_week.points} / 50</span>
                  </div>
                  <Progress 
                    value={Math.min(100, (progressStats.this_week.points / 50) * 100)} 
                    className="h-2"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{progressStats.this_week.sessions}</div>
                    <div className="text-sm text-gray-600">Sessions</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{Math.round(progressStats.this_week.accuracy)}%</div>
                    <div className="text-sm text-gray-600">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">15</div>
                    <div className="text-sm text-gray-600">Minutes</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Section */}
          {showAnalytics && analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Skill Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Skill Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.skill_breakdown).map(([skill, score]) => (
                      <div key={skill} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{skill.replace('_', ' ')}</span>
                          <span>{Math.round(score)}%</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sessions this week</span>
                      <span className="font-semibold">{analytics.recent_activity.sessions_last_week}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Descriptions completed</span>
                      <span className="font-semibold">{analytics.recent_activity.descriptions_completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">New phrases learned</span>
                      <span className="font-semibold">{analytics.recent_activity.new_phrases_learned}</span>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {analytics.recommendations.focus_areas.slice(0, 3).map((area, index) => (
                          <Badge 
                            key={index}
                            className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Achievements */}
          {progressStats.achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {progressStats.achievements.slice(0, 5).map((achievement, index) => (
                    <Badge 
                      key={index}
                      className="bg-purple-100 text-purple-800 border-purple-200"
                    >
                      {achievement}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Improvement Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getTrendIcon(progressStats.improvement_trend)}
                Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTrendColor(progressStats.improvement_trend)}`}>
                {progressStats.improvement_trend.charAt(0).toUpperCase() + progressStats.improvement_trend.slice(1)}
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-600">
                  {progressStats.improvement_trend === 'improving' && 
                    "Great job! Your performance is getting better over time. Keep up the good work!"
                  }
                  {progressStats.improvement_trend === 'stable' && 
                    "Your performance is steady. Consider challenging yourself with harder content."
                  }
                  {progressStats.improvement_trend === 'declining' && 
                    "Don't worry! Review previous material and focus on your weak areas to improve."
                  }
                </div>
                
                {Object.entries(progressStats.next_milestones).length > 0 && (
                  <div className="pt-2 border-t">
                    <h5 className="text-sm font-medium mb-1">Next Milestones:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {Object.entries(progressStats.next_milestones).slice(0, 2).map(([key, value]) => (
                        <li key={key} className="flex justify-between">
                          <span>{key.replace('_', ' ')}</span>
                          <span className="font-medium">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProgressDashboard;