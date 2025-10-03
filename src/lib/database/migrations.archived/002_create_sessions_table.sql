-- Migration: 002_create_sessions_table.sql
-- Description: Create learning sessions table for tracking user activity
-- Created: 2025-08-28

-- Create sessions table for tracking learning activities
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL DEFAULT 'practice' CHECK (session_type IN ('practice', 'review', 'challenge', 'free_play')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    duration_minutes INTEGER DEFAULT 0 CHECK (duration_minutes >= 0),
    images_viewed INTEGER DEFAULT 0 CHECK (images_viewed >= 0),
    descriptions_completed INTEGER DEFAULT 0 CHECK (descriptions_completed >= 0),
    questions_answered INTEGER DEFAULT 0 CHECK (questions_answered >= 0),
    questions_correct INTEGER DEFAULT 0 CHECK (questions_correct >= 0),
    phrases_selected INTEGER DEFAULT 0 CHECK (phrases_selected >= 0),
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    accuracy_percentage DECIMAL(5,2) DEFAULT 0 CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
    session_data JSONB DEFAULT '{}'::jsonb,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_session_type ON public.sessions(session_type);
CREATE INDEX idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX idx_sessions_completed_at ON public.sessions(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_sessions_user_started ON public.sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_user_status ON public.sessions(user_id, status);
CREATE INDEX idx_sessions_points_earned ON public.sessions(points_earned DESC);
CREATE INDEX idx_sessions_accuracy ON public.sessions(accuracy_percentage DESC);

-- Composite index for analytics queries
CREATE INDEX idx_sessions_analytics ON public.sessions(user_id, session_type, status, started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions" ON public.sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to calculate session duration and accuracy
CREATE OR REPLACE FUNCTION public.calculate_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate duration if session is being completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
        NEW.duration_minutes = GREATEST(1, EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))/60);
    END IF;
    
    -- Calculate accuracy percentage
    IF NEW.questions_answered > 0 THEN
        NEW.accuracy_percentage = ROUND((NEW.questions_correct::DECIMAL / NEW.questions_answered) * 100, 2);
    ELSE
        NEW.accuracy_percentage = 0;
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session statistics
CREATE TRIGGER calculate_session_stats_trigger
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.calculate_session_stats();

-- Create function to update user statistics when session completes
CREATE OR REPLACE FUNCTION public.update_user_stats_on_session_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if session just completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.users 
        SET 
            total_points = total_points + NEW.points_earned,
            last_active_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Update streak if this is their first session today
        WITH today_sessions AS (
            SELECT COUNT(*) as session_count
            FROM public.sessions 
            WHERE user_id = NEW.user_id 
            AND DATE(started_at AT TIME ZONE 'UTC') = CURRENT_DATE
            AND status = 'completed'
        )
        UPDATE public.users u
        SET streak_count = CASE 
            WHEN ts.session_count = 1 THEN 
                CASE 
                    WHEN DATE(u.last_active_at AT TIME ZONE 'UTC') = CURRENT_DATE - INTERVAL '1 day' 
                    THEN u.streak_count + 1
                    ELSE 1
                END
            ELSE u.streak_count
        END
        FROM today_sessions ts
        WHERE u.id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user stats
CREATE TRIGGER update_user_stats_on_session_complete_trigger
    AFTER UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_on_session_complete();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.sessions IS 'Learning sessions tracking user activity and progress';
COMMENT ON COLUMN public.sessions.session_type IS 'Type of learning session (practice, review, challenge, free_play)';
COMMENT ON COLUMN public.sessions.duration_minutes IS 'Session duration in minutes, calculated automatically';
COMMENT ON COLUMN public.sessions.accuracy_percentage IS 'Percentage of questions answered correctly';
COMMENT ON COLUMN public.sessions.session_data IS 'Additional session-specific data in JSON format';
COMMENT ON COLUMN public.sessions.device_info IS 'Device and browser information in JSON format';