-- Migration: 001_create_users_table.sql
-- Description: Create users table with Supabase auth integration
-- Created: 2025-08-28

-- Create users table that extends Supabase auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es')),
    learning_level TEXT DEFAULT 'beginner' CHECK (learning_level IN ('beginner', 'intermediate', 'advanced')),
    daily_goal INTEGER DEFAULT 10 CHECK (daily_goal > 0 AND daily_goal <= 100),
    streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0),
    total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'premium_plus')),
    timezone TEXT DEFAULT 'UTC',
    notification_settings JSONB DEFAULT '{"email": true, "push": true, "reminders": true}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_username ON public.users(username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_learning_level ON public.users(learning_level);
CREATE INDEX idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX idx_users_created_at ON public.users(created_at);
CREATE INDEX idx_users_last_active_at ON public.users(last_active_at);
CREATE INDEX idx_users_streak_count ON public.users(streak_count DESC);
CREATE INDEX idx_users_total_points ON public.users(total_points DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle user creation on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, UPDATE, INSERT ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.users IS 'Extended user profiles linked to Supabase auth';
COMMENT ON COLUMN public.users.id IS 'Primary key, references auth.users.id';
COMMENT ON COLUMN public.users.learning_level IS 'User''s Spanish proficiency level';
COMMENT ON COLUMN public.users.daily_goal IS 'Number of descriptions to complete daily';
COMMENT ON COLUMN public.users.streak_count IS 'Consecutive days of activity';
COMMENT ON COLUMN public.users.notification_settings IS 'JSON object with notification preferences';
COMMENT ON COLUMN public.users.preferences IS 'JSON object for app-specific user preferences';