-- ==============================================
-- STEP 1: CREATE ALL ENUM TYPES FIRST
-- ==============================================
-- Run this BEFORE any table creation
-- Safe to run multiple times
-- Takes ~2 seconds

-- Enable extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- CREATE 12 ENUM TYPES
-- ==============================================

-- 1. Spanish proficiency levels
DO $$ BEGIN
    CREATE TYPE spanish_level AS ENUM ('beginner', 'intermediate', 'advanced');
    RAISE NOTICE 'Created spanish_level ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'spanish_level ENUM already exists';
END $$;

-- 2. Session types
DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('description', 'qa', 'vocabulary', 'mixed');
    RAISE NOTICE 'Created session_type ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'session_type ENUM already exists';
END $$;

-- 3. Description writing styles
DO $$ BEGIN
    CREATE TYPE description_style AS ENUM ('narrativo', 'poetico', 'academico', 'conversacional', 'infantil', 'creativo', 'tecnico');
    RAISE NOTICE 'Created description_style ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'description_style ENUM already exists';
END $$;

-- 4. Parts of speech
DO $$ BEGIN
    CREATE TYPE part_of_speech AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'article', 'pronoun', 'conjunction', 'interjection', 'other');
    RAISE NOTICE 'Created part_of_speech ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'part_of_speech ENUM already exists';
END $$;

-- 5. General difficulty levels
DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
    RAISE NOTICE 'Created difficulty_level ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'difficulty_level ENUM already exists';
END $$;

-- 6. Learning phases (spaced repetition)
DO $$ BEGIN
    CREATE TYPE learning_phase AS ENUM ('new', 'learning', 'review', 'mastered');
    RAISE NOTICE 'Created learning_phase ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'learning_phase ENUM already exists';
END $$;

-- 7. Q&A difficulty (Spanish)
DO $$ BEGIN
    CREATE TYPE qa_difficulty AS ENUM ('facil', 'medio', 'dificil');
    RAISE NOTICE 'Created qa_difficulty ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'qa_difficulty ENUM already exists';
END $$;

-- 8. Vocabulary categories
DO $$ BEGIN
    CREATE TYPE vocabulary_category AS ENUM ('basic', 'intermediate', 'advanced', 'custom', 'thematic');
    RAISE NOTICE 'Created vocabulary_category ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'vocabulary_category ENUM already exists';
END $$;

-- 9. Spanish grammatical gender
DO $$ BEGIN
    CREATE TYPE spanish_gender AS ENUM ('masculino', 'femenino', 'neutro');
    RAISE NOTICE 'Created spanish_gender ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'spanish_gender ENUM already exists';
END $$;

-- 10. UI theme preference
DO $$ BEGIN
    CREATE TYPE theme_preference AS ENUM ('light', 'dark', 'auto');
    RAISE NOTICE 'Created theme_preference ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'theme_preference ENUM already exists';
END $$;

-- 11. Language selection
DO $$ BEGIN
    CREATE TYPE language_preference AS ENUM ('en', 'es');
    RAISE NOTICE 'Created language_preference ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'language_preference ENUM already exists';
END $$;

-- 12. Export file formats
DO $$ BEGIN
    CREATE TYPE export_format AS ENUM ('json', 'csv', 'pdf');
    RAISE NOTICE 'Created export_format ENUM';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'export_format ENUM already exists';
END $$;

-- ==============================================
-- VERIFICATION
-- ==============================================

SELECT
    typname as enum_name,
    enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN (
    'spanish_level', 'session_type', 'description_style', 'part_of_speech',
    'difficulty_level', 'learning_phase', 'qa_difficulty', 'vocabulary_category',
    'spanish_gender', 'theme_preference', 'language_preference', 'export_format'
)
ORDER BY typname, enumlabel;

-- Count check (should return 12)
SELECT COUNT(DISTINCT typname) as total_enums_created
FROM pg_type
WHERE typname IN (
    'spanish_level', 'session_type', 'description_style', 'part_of_speech',
    'difficulty_level', 'learning_phase', 'qa_difficulty', 'vocabulary_category',
    'spanish_gender', 'theme_preference', 'language_preference', 'export_format'
);

-- Success message
DO $$ BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'STEP 1 COMPLETE: All 12 ENUM types created!';
    RAISE NOTICE 'Next: Run STEP-2-create-tables.sql';
    RAISE NOTICE '==============================================';
END $$;
