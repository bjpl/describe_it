'use client';

import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Clock, Target, Award, Calendar, Brain, Zap, Trophy } from 'lucide-react';
import { VocabularySet } from '@/types/api';
import { StudySession } from '@/lib/storage/vocabularyStorage';
import { StudyStatistics } from '@/lib/algorithms/spacedRepetition';

interface ProgressStatisticsProps {
  vocabularySets: VocabularySet[];
  studyHistory: StudySession[];
  statistics: StudyStatistics;
}

interface ChartData {
  name: string;
  value: number;
  date?: string;
  correct?: number;
  total?: number;
  accuracy?: number;
}

export const ProgressStatistics: React.FC<ProgressStatisticsProps> = ({
  vocabularySets,
  studyHistory,
  statistics
}) => {
  // Process data for charts
  const difficultyData: ChartData[] = React.useMemo(() => {
    const counts = { beginner: 0, intermediate: 0, advanced: 0 };
    
    vocabularySets.forEach(set => {
      set.phrases.forEach(phrase => {
        counts[phrase.difficulty]++;
      });
    });
    
    return [
      { name: 'Beginner', value: counts.beginner },
      { name: 'Intermediate', value: counts.intermediate },
      { name: 'Advanced', value: counts.advanced }
    ];
  }, [vocabularySets]);
  
  const categoryData: ChartData[] = React.useMemo(() => {
    const counts: Record<string, number> = {};
    
    vocabularySets.forEach(set => {
      set.phrases.forEach(phrase => {
        counts[phrase.category] = (counts[phrase.category] || 0) + 1;
      });
    });
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vocabularySets]);
  
  const studyProgressData: ChartData[] = React.useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });
    
    return last30Days.map(date => {
      const sessionsForDate = studyHistory.filter(session => session.date === date);
      const totalStudied = sessionsForDate.reduce((sum, session) => sum + session.itemsStudied, 0);
      const totalCorrect = sessionsForDate.reduce((sum, session) => sum + session.correctAnswers, 0);
      
      return {
        date,
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: totalStudied,
        correct: totalCorrect,
        total: totalStudied,
        accuracy: totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : 0
      };
    });
  }, [studyHistory]);
  
  const masteryData: ChartData[] = React.useMemo(() => {
    const totalPhrases = vocabularySets.reduce((sum, set) => sum + set.phrases.length, 0);
    const masteredPhrases = vocabularySets.reduce((sum, set) => 
      sum + set.phrases.filter(phrase => phrase.studyProgress.correctAnswers >= 3).length, 0
    );
    const learningPhrases = vocabularySets.reduce((sum, set) => 
      sum + set.phrases.filter(phrase => 
        phrase.studyProgress.totalAttempts > 0 && phrase.studyProgress.correctAnswers < 3
      ).length, 0
    );
    const newPhrases = totalPhrases - masteredPhrases - learningPhrases;
    
    return [
      { name: 'New', value: newPhrases },
      { name: 'Learning', value: learningPhrases },
      { name: 'Mastered', value: masteredPhrases }
    ];
  }, [vocabularySets]);
  
  const accuracyTrendData: ChartData[] = React.useMemo(() => {
    const sessions = studyHistory.slice(-14); // Last 14 sessions
    return sessions.map((session, index) => ({
      name: `Session ${index + 1}`,
      value: session.itemsStudied > 0 ? Math.round((session.correctAnswers / session.itemsStudied) * 100) : 0,
      date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [studyHistory]);
  
  // Color schemes
  const COLORS = {
    primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    difficulty: ['#10B981', '#F59E0B', '#EF4444'], // Green, Yellow, Red
    mastery: ['#6B7280', '#F59E0B', '#10B981'] // Gray, Yellow, Green
  };
  
  // Calculate weekly goal progress
  const thisWeekSessions = React.useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return studyHistory.filter(session => new Date(session.date) >= oneWeekAgo);
  }, [studyHistory]);
  
  const weeklyItemsStudied = thisWeekSessions.reduce((sum, session) => sum + session.itemsStudied, 0);
  const weeklyGoal = 140; // 20 items per day × 7 days
  const weeklyProgress = Math.min(100, Math.round((weeklyItemsStudied / weeklyGoal) * 100));
  
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Items to Review</p>
              <p className="text-2xl font-bold">{statistics.itemsToReview}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-200" />
          </div>
          <p className="text-blue-100 text-xs mt-1">~{statistics.estimatedTime} minutes</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Mastered</p>
              <p className="text-2xl font-bold">{statistics.masteredItems}</p>
            </div>
            <Award className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Study Streak</p>
              <p className="text-2xl font-bold">{statistics.studyStreak}</p>
            </div>
            <Zap className="h-8 w-8 text-purple-200" />
          </div>
          <p className="text-purple-100 text-xs mt-1">days</p>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Avg. Quality</p>
              <p className="text-2xl font-bold">{statistics.averageQuality.toFixed(1)}</p>
            </div>
            <Brain className="h-8 w-8 text-yellow-200" />
          </div>
          <p className="text-yellow-100 text-xs mt-1">out of 5.0</p>
        </div>
      </div>
      
      {/* Weekly Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Weekly Progress
          </h3>
          <Target className="h-5 w-5 text-gray-500" />
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {weeklyItemsStudied} / {weeklyGoal} items this week
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {weeklyProgress}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {weeklyGoal - weeklyItemsStudied > 0 
              ? `${weeklyGoal - weeklyItemsStudied} items to reach weekly goal`
              : 'Weekly goal achieved! 🎉'
            }
          </p>
        </div>
      </div>
      
      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Study Progress Over Time */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Study Progress (Last 30 Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={studyProgressData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value, name) => [value, name === 'value' ? 'Items Studied' : name]}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  fill="url(#colorGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Accuracy Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Accuracy Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }} 
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Mastery Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Learning Progress
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={masteryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {masteryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS.mastery[index % COLORS.mastery.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {masteryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.mastery[index] }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Difficulty Levels
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value) => [value, 'Phrases']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {difficultyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS.difficulty[index % COLORS.difficulty.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Vocabulary Categories
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value) => [value, 'Phrases']}
                />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Study Statistics Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Study Statistics
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{statistics.totalReviews}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{statistics.correctReviews}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Correct Answers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((statistics.correctReviews / Math.max(statistics.totalReviews, 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overall Accuracy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{vocabularySets.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Study Sets</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressStatistics;