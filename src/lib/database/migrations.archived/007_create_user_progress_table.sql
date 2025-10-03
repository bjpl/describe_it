-- Migration: 007_create_user_progress_table.sql
-- Description: Create user_progress table for detailed learning analytics
-- Created: 2025-08-28

-- Create user_progress table for comprehensive learning analytics
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    progress_type TEXT NOT NULL CHECK (progress_type IN (
        'daily', 'weekly', 'monthly', 'skill', 'vocabulary', 'grammar', 
        'achievement', 'milestone', 'session_summary'
    )),
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
    skill_category TEXT CHECK (skill_category IN (
        'reading_comprehension', 'vocabulary_recognition', 'grammar_understanding',
        'translation_accuracy', 'cultural_awareness', 'listening_comprehension'
    )),
    current_level TEXT DEFAULT 'beginner' CHECK (current_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
    sessions_completed INTEGER DEFAULT 0 CHECK (sessions_completed >= 0),
    descriptions_completed INTEGER DEFAULT 0 CHECK (descriptions_completed >= 0),
    questions_answered INTEGER DEFAULT 0 CHECK (questions_answered >= 0),
    questions_correct INTEGER DEFAULT 0 CHECK (questions_correct >= 0),
    phrases_learned INTEGER DEFAULT 0 CHECK (phrases_learned >= 0),
    phrases_mastered INTEGER DEFAULT 0 CHECK (phrases_mastered >= 0),
    time_spent_minutes INTEGER DEFAULT 0 CHECK (time_spent_minutes >= 0),
    accuracy_percentage DECIMAL(5,2) DEFAULT 0 CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
    consistency_score DECIMAL(5,2) DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
    improvement_rate DECIMAL(5,2) DEFAULT 0,
    streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
    achievements_unlocked TEXT[] DEFAULT '{}',
    skill_breakdown JSONB DEFAULT '{}'::jsonb,
    learning_preferences JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    goals_status JSONB DEFAULT '{}'::jsonb,
    challenges_completed TEXT[] DEFAULT '{}',
    weak_areas TEXT[] DEFAULT '{}',
    strong_areas TEXT[] DEFAULT '{}',
    recommendations JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_type ON public.user_progress(progress_type);
CREATE INDEX idx_user_progress_date ON public.user_progress(progress_date DESC);
CREATE INDEX idx_user_progress_skill_category ON public.user_progress(skill_category);
CREATE INDEX idx_user_progress_current_level ON public.user_progress(current_level);
CREATE INDEX idx_user_progress_created_at ON public.user_progress(created_at DESC);
CREATE INDEX idx_user_progress_achievements ON public.user_progress USING GIN(achievements_unlocked);
CREATE INDEX idx_user_progress_challenges ON public.user_progress USING GIN(challenges_completed);
CREATE INDEX idx_user_progress_weak_areas ON public.user_progress USING GIN(weak_areas);
CREATE INDEX idx_user_progress_strong_areas ON public.user_progress USING GIN(strong_areas);

-- Composite indexes for analytics queries
CREATE INDEX idx_user_progress_user_date ON public.user_progress(user_id, progress_date DESC);
CREATE INDEX idx_user_progress_user_type ON public.user_progress(user_id, progress_type, progress_date DESC);
CREATE INDEX idx_user_progress_user_skill ON public.user_progress(user_id, skill_category, progress_date DESC);
CREATE INDEX idx_user_progress_analytics ON public.user_progress(user_id, progress_type, skill_category, progress_date DESC);

-- Unique constraint to prevent duplicate daily progress entries
CREATE UNIQUE INDEX idx_user_progress_user_date_type_skill ON public.user_progress(
    user_id, progress_date, progress_type, COALESCE(skill_category, '')
);

-- Enable Row Level Security
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to calculate daily progress
CREATE OR REPLACE FUNCTION public.calculate_daily_progress(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    session_stats RECORD;
    question_stats RECORD;
    phrase_stats RECORD;
    total_points INTEGER;
    total_time INTEGER;
BEGIN
    -- Get session statistics for the day
    SELECT 
        COUNT(*) as sessions_count,
        SUM(descriptions_completed) as descriptions_count,
        SUM(points_earned) as points_sum,
        SUM(duration_minutes) as time_sum
    INTO session_stats
    FROM public.sessions
    WHERE user_id = user_uuid 
    AND DATE(started_at) = target_date
    AND status = 'completed';
    
    -- Get question statistics for the day
    SELECT 
        COUNT(*) as questions_count,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_count
    INTO question_stats
    FROM public.questions
    WHERE user_id = user_uuid
    AND DATE(answered_at) = target_date
    AND is_answered = TRUE;
    
    -- Get phrase statistics for the day
    SELECT 
        COUNT(*) FILTER (WHERE is_user_selected = TRUE) as learned_count,
        COUNT(*) FILTER (WHERE mastered_at IS NOT NULL AND DATE(mastered_at) = target_date) as mastered_count
    INTO phrase_stats
    FROM public.phrases
    WHERE user_id = user_uuid
    AND DATE(created_at) = target_date;
    
    -- Insert or update daily progress
    INSERT INTO public.user_progress (
        user_id,
        progress_type,
        progress_date,
        points_earned,
        sessions_completed,
        descriptions_completed,
        questions_answered,
        questions_correct,
        phrases_learned,
        phrases_mastered,
        time_spent_minutes,
        accuracy_percentage,
        performance_metrics
    ) VALUES (
        user_uuid,
        'daily',
        target_date,
        COALESCE(session_stats.points_sum, 0),
        COALESCE(session_stats.sessions_count, 0),
        COALESCE(session_stats.descriptions_count, 0),
        COALESCE(question_stats.questions_count, 0),
        COALESCE(question_stats.correct_count, 0),
        COALESCE(phrase_stats.learned_count, 0),
        COALESCE(phrase_stats.mastered_count, 0),
        COALESCE(session_stats.time_sum, 0),
        CASE 
            WHEN COALESCE(question_stats.questions_count, 0) > 0 THEN
                ROUND((COALESCE(question_stats.correct_count, 0)::DECIMAL / question_stats.questions_count) * 100, 2)
            ELSE 0
        END,
        jsonb_build_object(
            'avg_session_duration', COALESCE(session_stats.time_sum::DECIMAL / NULLIF(session_stats.sessions_count, 0), 0),
            'descriptions_per_session', COALESCE(session_stats.descriptions_count::DECIMAL / NULLIF(session_stats.sessions_count, 0), 0)
        )
    )
    ON CONFLICT (user_id, progress_date, progress_type, COALESCE(skill_category, ''))
    DO UPDATE SET
        points_earned = EXCLUDED.points_earned,
        sessions_completed = EXCLUDED.sessions_completed,
        descriptions_completed = EXCLUDED.descriptions_completed,
        questions_answered = EXCLUDED.questions_answered,
        questions_correct = EXCLUDED.questions_correct,
        phrases_learned = EXCLUDED.phrases_learned,
        phrases_mastered = EXCLUDED.phrases_mastered,
        time_spent_minutes = EXCLUDED.time_spent_minutes,
        accuracy_percentage = EXCLUDED.accuracy_percentage,
        performance_metrics = EXCLUDED.performance_metrics,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate weekly/monthly progress
CREATE OR REPLACE FUNCTION public.calculate_period_progress(
    user_uuid UUID, 
    period_type TEXT, 
    target_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    period_stats RECORD;
BEGIN
    -- Calculate date range based on period type
    IF period_type = 'weekly' THEN
        start_date := target_date - EXTRACT(DOW FROM target_date)::INTEGER;
        end_date := start_date + INTERVAL '6 days';
    ELSIF period_type = 'monthly' THEN
        start_date := DATE_TRUNC('month', target_date)::DATE;
        end_date := (DATE_TRUNC('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
    ELSE
        RAISE EXCEPTION 'Invalid period_type: %', period_type;
    END IF;
    
    -- Aggregate daily progress for the period
    SELECT 
        SUM(points_earned) as total_points,
        SUM(sessions_completed) as total_sessions,
        SUM(descriptions_completed) as total_descriptions,
        SUM(questions_answered) as total_questions,
        SUM(questions_correct) as total_correct,
        SUM(phrases_learned) as total_phrases_learned,
        SUM(phrases_mastered) as total_phrases_mastered,
        SUM(time_spent_minutes) as total_time,
        AVG(accuracy_percentage) as avg_accuracy,
        COUNT(*) FILTER (WHERE sessions_completed > 0) as active_days
    INTO period_stats
    FROM public.user_progress
    WHERE user_id = user_uuid
    AND progress_type = 'daily'
    AND progress_date BETWEEN start_date AND end_date;
    
    -- Insert or update period progress
    INSERT INTO public.user_progress (
        user_id,
        progress_type,
        progress_date,
        points_earned,
        sessions_completed,
        descriptions_completed,
        questions_answered,
        questions_correct,
        phrases_learned,
        phrases_mastered,
        time_spent_minutes,
        accuracy_percentage,
        consistency_score,
        performance_metrics
    ) VALUES (
        user_uuid,
        period_type,
        target_date,
        COALESCE(period_stats.total_points, 0),
        COALESCE(period_stats.total_sessions, 0),
        COALESCE(period_stats.total_descriptions, 0),
        COALESCE(period_stats.total_questions, 0),
        COALESCE(period_stats.total_correct, 0),
        COALESCE(period_stats.total_phrases_learned, 0),
        COALESCE(period_stats.total_phrases_mastered, 0),
        COALESCE(period_stats.total_time, 0),
        COALESCE(period_stats.avg_accuracy, 0),
        CASE 
            WHEN period_type = 'weekly' THEN
                ROUND((COALESCE(period_stats.active_days, 0)::DECIMAL / 7) * 100, 2)
            ELSE
                ROUND((COALESCE(period_stats.active_days, 0)::DECIMAL / EXTRACT(DAY FROM end_date - start_date + 1)) * 100, 2)
        END,
        jsonb_build_object(
            'active_days', COALESCE(period_stats.active_days, 0),
            'period_start', start_date,
            'period_end', end_date,
            'avg_daily_points', COALESCE(period_stats.total_points::DECIMAL / NULLIF(period_stats.active_days, 0), 0)
        )
    )
    ON CONFLICT (user_id, progress_date, progress_type, COALESCE(skill_category, ''))
    DO UPDATE SET
        points_earned = EXCLUDED.points_earned,
        sessions_completed = EXCLUDED.sessions_completed,
        descriptions_completed = EXCLUDED.descriptions_completed,
        questions_answered = EXCLUDED.questions_answered,
        questions_correct = EXCLUDED.questions_correct,
        phrases_learned = EXCLUDED.phrases_learned,
        phrases_mastered = EXCLUDED.phrases_mastered,
        time_spent_minutes = EXCLUDED.time_spent_minutes,
        accuracy_percentage = EXCLUDED.accuracy_percentage,
        consistency_score = EXCLUDED.consistency_score,
        performance_metrics = EXCLUDED.performance_metrics,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user progress summary
CREATE OR REPLACE FUNCTION public.get_user_progress_summary(
    user_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    overall_level TEXT,
    total_points INTEGER,
    current_streak INTEGER,
    completion_rate DECIMAL,
    improvement_trend TEXT,
    top_skills JSONB,
    recent_achievements TEXT[],
    next_milestones JSONB
) AS $$
DECLARE
    user_info RECORD;
    progress_trend DECIMAL;
BEGIN
    -- Get user basic info
    SELECT learning_level, total_points, streak_count
    INTO user_info
    FROM public.users
    WHERE id = user_uuid;
    
    -- Calculate improvement trend
    WITH recent_progress AS (
        SELECT 
            accuracy_percentage,
            progress_date,
            LAG(accuracy_percentage) OVER (ORDER BY progress_date) as prev_accuracy
        FROM public.user_progress
        WHERE user_id = user_uuid
        AND progress_type = 'daily'
        AND progress_date > CURRENT_DATE - days_back
        ORDER BY progress_date DESC
        LIMIT 10
    )
    SELECT AVG(accuracy_percentage - COALESCE(prev_accuracy, accuracy_percentage))
    INTO progress_trend
    FROM recent_progress
    WHERE prev_accuracy IS NOT NULL;
    
    RETURN QUERY
    SELECT 
        user_info.learning_level,
        user_info.total_points,
        user_info.streak_count,
        COALESCE(AVG(up.accuracy_percentage), 0) as completion_rate,
        CASE 
            WHEN progress_trend > 5 THEN 'improving'
            WHEN progress_trend < -5 THEN 'declining'
            ELSE 'stable'
        END as improvement_trend,
        jsonb_object_agg(
            up.skill_category,
            up.accuracy_percentage
        ) FILTER (WHERE up.skill_category IS NOT NULL) as top_skills,
        array_agg(DISTINCT unnest(up.achievements_unlocked)) FILTER (
            WHERE up.achievements_unlocked != '{}'
            AND up.created_at > NOW() - (days_back || ' days')::INTERVAL
        ) as recent_achievements,
        jsonb_build_object(
            'next_level_points', CASE 
                WHEN user_info.learning_level = 'beginner' THEN 1000 - user_info.total_points
                WHEN user_info.learning_level = 'intermediate' THEN 5000 - user_info.total_points
                ELSE 10000 - user_info.total_points
            END,
            'streak_milestone', (((user_info.streak_count / 10) + 1) * 10) - user_info.streak_count
        ) as next_milestones
    FROM public.user_progress up
    WHERE up.user_id = user_uuid
    AND up.progress_type = 'daily'
    AND up.progress_date > CURRENT_DATE - days_back
    GROUP BY user_info.learning_level, user_info.total_points, user_info.streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_daily_progress(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_period_progress(UUID, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_progress_summary(UUID, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_progress IS 'Comprehensive learning progress tracking and analytics';
COMMENT ON COLUMN public.user_progress.progress_type IS 'Type of progress record (daily, weekly, monthly, skill-specific)';
COMMENT ON COLUMN public.user_progress.skill_category IS 'Specific skill area being tracked';
COMMENT ON COLUMN public.user_progress.consistency_score IS 'Measure of regular learning activity (0-100)';
COMMENT ON COLUMN public.user_progress.improvement_rate IS 'Rate of improvement over time (can be negative)';
COMMENT ON COLUMN public.user_progress.skill_breakdown IS 'Detailed breakdown of performance by skill area';
COMMENT ON COLUMN public.user_progress.recommendations IS 'AI-generated learning recommendations based on performance';