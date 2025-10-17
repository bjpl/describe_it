-- ==============================================
-- FIX MISSING ENUM TYPES
-- ==============================================
-- Run this in Supabase SQL Editor to create missing ENUM types
-- Safe to run multiple times - checks if type exists first

-- Enable extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types with IF NOT EXISTS logic using DO blocks

-- spanish_level
DO $$ BEGIN
    CREATE TYPE spanish_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- session_type
DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('description', 'qa', 'vocabulary', 'mixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- description_style
DO $$ BEGIN
    CREATE TYPE description_style AS ENUM ('narrativo', 'poetico', 'academico', 'conversacional', 'infantil', 'creativo', 'tecnico');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- part_of_speech
DO $$ BEGIN
    CREATE TYPE part_of_speech AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'article', 'pronoun', 'conjunction', 'interjection', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- difficulty_level (THIS IS THE ONE CAUSING YOUR ERROR)
DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- learning_phase
DO $$ BEGIN
    CREATE TYPE learning_phase AS ENUM ('new', 'learning', 'review', 'mastered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- qa_difficulty
DO $$ BEGIN
    CREATE TYPE qa_difficulty AS ENUM ('facil', 'medio', 'dificil');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- vocabulary_category
DO $$ BEGIN
    CREATE TYPE vocabulary_category AS ENUM ('basic', 'intermediate', 'advanced', 'custom', 'thematic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- spanish_gender
DO $$ BEGIN
    CREATE TYPE spanish_gender AS ENUM ('masculino', 'femenino', 'neutro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- theme_preference
DO $$ BEGIN
    CREATE TYPE theme_preference AS ENUM ('light', 'dark', 'auto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- language_preference
DO $$ BEGIN
    CREATE TYPE language_preference AS ENUM ('en', 'es');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- export_format
DO $$ BEGIN
    CREATE TYPE export_format AS ENUM ('json', 'csv', 'pdf');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verify all types were created
SELECT
    typname as enum_type,
    'Created successfully' as status
FROM pg_type
WHERE typname IN (
    'spanish_level', 'session_type', 'description_style', 'part_of_speech',
    'difficulty_level', 'learning_phase', 'qa_difficulty', 'vocabulary_category',
    'spanish_gender', 'theme_preference', 'language_preference', 'export_format'
)
ORDER BY typname;
