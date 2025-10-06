-- ==============================================
-- FIX USERS TABLE - Drop and recreate with correct schema
-- ==============================================
-- This will delete existing user data!
-- Only run if you just created your account and don't mind re-signing up

-- Drop existing users table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with correct ENUM columns
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    spanish_level spanish_level NOT NULL DEFAULT 'beginner',
    is_authenticated BOOLEAN DEFAULT false,
    profile_completed BOOLEAN DEFAULT false,
    
    -- User preferences
    theme theme_preference DEFAULT 'light',
    language language_preference DEFAULT 'en',
    default_description_style description_style DEFAULT 'conversacional',
    
    -- Learning preferences
    target_words_per_day INTEGER DEFAULT 10,
    preferred_difficulty difficulty_level DEFAULT 'beginner',
    enable_notifications BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_username CHECK (username IS NULL OR (LENGTH(username) >= 3 AND username ~ '^[a-zA-Z0-9_]+$')),
    CONSTRAINT valid_full_name CHECK (full_name IS NULL OR LENGTH(full_name) >= 2),
    CONSTRAINT valid_words_per_day CHECK (target_words_per_day >= 1 AND target_words_per_day <= 100)
);

-- Success message
SELECT 'Users table recreated successfully! Now run the full table migration.' as message;
