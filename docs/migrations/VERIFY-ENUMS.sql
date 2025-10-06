-- Quick check if ENUMs exist
SELECT typname as enum_type
FROM pg_type
WHERE typname IN (
    'spanish_level', 'session_type', 'description_style', 'part_of_speech',
    'difficulty_level', 'learning_phase', 'qa_difficulty', 'vocabulary_category',
    'spanish_gender', 'theme_preference', 'language_preference', 'export_format'
)
ORDER BY typname;

-- Count (should be 12)
SELECT COUNT(DISTINCT typname) as total_enums
FROM pg_type
WHERE typname IN (
    'spanish_level', 'session_type', 'description_style', 'part_of_speech',
    'difficulty_level', 'learning_phase', 'qa_difficulty', 'vocabulary_category',
    'spanish_gender', 'theme_preference', 'language_preference', 'export_format'
);
