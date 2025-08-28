-- Migration: 006_create_phrases_table.sql
-- Description: Create phrases table for vocabulary extraction and learning
-- Created: 2025-08-28

-- Create phrases table for vocabulary and expression learning
CREATE TABLE public.phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description_id UUID NOT NULL REFERENCES public.descriptions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'vocabulary', 'expression', 'idiom', 'phrase', 'grammar_pattern', 
        'collocation', 'verb_conjugation', 'cultural_reference'
    )),
    spanish_text TEXT NOT NULL,
    english_translation TEXT NOT NULL,
    phonetic_pronunciation TEXT,
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    word_type TEXT CHECK (word_type IN (
        'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 
        'pronoun', 'article', 'interjection', 'phrase', 'expression'
    )),
    gender TEXT CHECK (gender IN ('masculine', 'feminine', 'neutral')), -- For nouns
    is_plural BOOLEAN DEFAULT FALSE,
    verb_tense TEXT CHECK (verb_tense IN (
        'infinitive', 'present', 'preterite', 'imperfect', 'future', 
        'conditional', 'subjunctive', 'imperative'
    )),
    context_sentence_spanish TEXT,
    context_sentence_english TEXT,
    usage_notes TEXT,
    regional_variants TEXT[], -- e.g., ['Mexico', 'Argentina', 'Spain']
    formality_level TEXT DEFAULT 'neutral' CHECK (formality_level IN ('formal', 'neutral', 'informal', 'slang')),
    frequency_rank INTEGER CHECK (frequency_rank > 0), -- Word frequency ranking
    is_user_selected BOOLEAN DEFAULT FALSE,
    is_mastered BOOLEAN DEFAULT FALSE,
    study_count INTEGER DEFAULT 0 CHECK (study_count >= 0),
    correct_count INTEGER DEFAULT 0 CHECK (correct_count >= 0),
    last_studied_at TIMESTAMPTZ NULL,
    mastered_at TIMESTAMPTZ NULL,
    extraction_confidence DECIMAL(3,2) DEFAULT 0 CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
    ai_generated_metadata JSONB DEFAULT '{}'::jsonb,
    user_notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_phrases_description_id ON public.phrases(description_id);
CREATE INDEX idx_phrases_session_id ON public.phrases(session_id);
CREATE INDEX idx_phrases_user_id ON public.phrases(user_id);
CREATE INDEX idx_phrases_category ON public.phrases(category);
CREATE INDEX idx_phrases_difficulty_level ON public.phrases(difficulty_level);
CREATE INDEX idx_phrases_word_type ON public.phrases(word_type);
CREATE INDEX idx_phrases_is_user_selected ON public.phrases(is_user_selected) WHERE is_user_selected = TRUE;
CREATE INDEX idx_phrases_is_mastered ON public.phrases(is_mastered);
CREATE INDEX idx_phrases_formality_level ON public.phrases(formality_level);
CREATE INDEX idx_phrases_frequency_rank ON public.phrases(frequency_rank);
CREATE INDEX idx_phrases_regional_variants ON public.phrases USING GIN(regional_variants);
CREATE INDEX idx_phrases_tags ON public.phrases USING GIN(tags);
CREATE INDEX idx_phrases_created_at ON public.phrases(created_at DESC);
CREATE INDEX idx_phrases_last_studied_at ON public.phrases(last_studied_at DESC) WHERE last_studied_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_phrases_user_selected ON public.phrases(user_id, is_user_selected, created_at DESC);
CREATE INDEX idx_phrases_user_mastered ON public.phrases(user_id, is_mastered, mastered_at DESC);
CREATE INDEX idx_phrases_user_study ON public.phrases(user_id, last_studied_at DESC) WHERE last_studied_at IS NOT NULL;
CREATE INDEX idx_phrases_difficulty_category ON public.phrases(difficulty_level, category);
CREATE INDEX idx_phrases_user_category ON public.phrases(user_id, category, is_user_selected);

-- Full-text search indexes
CREATE INDEX idx_phrases_spanish_search ON public.phrases USING GIN(to_tsvector('spanish', spanish_text));
CREATE INDEX idx_phrases_english_search ON public.phrases USING GIN(to_tsvector('english', english_translation));
CREATE INDEX idx_phrases_context_search ON public.phrases USING GIN(
    to_tsvector('spanish', COALESCE(context_sentence_spanish, ''))
);

-- Enable Row Level Security
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own phrases" ON public.phrases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own phrases" ON public.phrases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phrases" ON public.phrases
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle phrase selection
CREATE OR REPLACE FUNCTION public.select_phrase()
RETURNS TRIGGER AS $$
BEGIN
    -- When user selects a phrase for study
    IF NEW.is_user_selected = TRUE AND (OLD.is_user_selected IS FALSE OR OLD.is_user_selected IS NULL) THEN
        -- Update session statistics
        UPDATE public.sessions 
        SET phrases_selected = phrases_selected + 1
        WHERE id = NEW.session_id;
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for phrase selection
CREATE TRIGGER select_phrase_trigger
    BEFORE UPDATE ON public.phrases
    FOR EACH ROW EXECUTE FUNCTION public.select_phrase();

-- Create function to update phrase mastery
CREATE OR REPLACE FUNCTION public.update_phrase_mastery()
RETURNS TRIGGER AS $$
BEGIN
    -- Update study statistics
    IF NEW.study_count > OLD.study_count THEN
        NEW.last_studied_at = NOW();
        
        -- Auto-mastery logic: mastered if studied 5+ times with 80%+ accuracy
        IF NEW.study_count >= 5 AND NEW.correct_count::DECIMAL / NEW.study_count >= 0.8 THEN
            IF NEW.is_mastered = FALSE THEN
                NEW.is_mastered = TRUE;
                NEW.mastered_at = NOW();
            END IF;
        END IF;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mastery updates
CREATE TRIGGER update_phrase_mastery_trigger
    BEFORE UPDATE ON public.phrases
    FOR EACH ROW EXECUTE FUNCTION public.update_phrase_mastery();

-- Create function to extract phrases from description
CREATE OR REPLACE FUNCTION public.extract_phrases_from_description(
    desc_id UUID,
    sess_id UUID,
    usr_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    desc_record RECORD;
    phrase_count INTEGER := 0;
    words TEXT[];
    word TEXT;
BEGIN
    -- Get description details
    SELECT spanish_text, complexity_level, grammar_points
    INTO desc_record
    FROM public.descriptions
    WHERE id = desc_id AND user_id = usr_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Description not found or access denied';
    END IF;
    
    -- Simple word extraction (in practice, this would use NLP)
    words := string_to_array(lower(regexp_replace(desc_record.spanish_text, '[^\w\s]', '', 'g')), ' ');
    
    -- Insert sample phrases (in practice, this would be more sophisticated)
    FOREACH word IN ARRAY words LOOP
        IF length(word) > 3 THEN -- Only process words longer than 3 characters
            INSERT INTO public.phrases (
                description_id,
                session_id,
                user_id,
                category,
                spanish_text,
                english_translation,
                difficulty_level,
                word_type,
                extraction_confidence
            ) VALUES (
                desc_id,
                sess_id,
                usr_id,
                'vocabulary',
                word,
                'Translation for ' || word, -- Placeholder - would use real translation
                desc_record.complexity_level,
                'noun', -- Placeholder - would use NLP to determine
                0.75
            )
            ON CONFLICT DO NOTHING; -- Avoid duplicates
            
            phrase_count := phrase_count + 1;
        END IF;
    END LOOP;
    
    RETURN phrase_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's vocabulary progress
CREATE OR REPLACE FUNCTION public.get_user_vocabulary_stats(
    user_uuid UUID,
    category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_phrases INTEGER,
    selected_phrases INTEGER,
    mastered_phrases INTEGER,
    mastery_percentage DECIMAL,
    avg_study_count DECIMAL,
    phrases_by_difficulty JSONB,
    phrases_by_category JSONB,
    recent_activity JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_phrases,
        COUNT(*) FILTER (WHERE p.is_user_selected = TRUE)::INTEGER as selected_phrases,
        COUNT(*) FILTER (WHERE p.is_mastered = TRUE)::INTEGER as mastered_phrases,
        ROUND(
            CASE 
                WHEN COUNT(*) FILTER (WHERE p.is_user_selected = TRUE) > 0 THEN
                    (COUNT(*) FILTER (WHERE p.is_mastered = TRUE)::DECIMAL / 
                     COUNT(*) FILTER (WHERE p.is_user_selected = TRUE)) * 100
                ELSE 0
            END, 2
        ) as mastery_percentage,
        ROUND(AVG(p.study_count), 2) as avg_study_count,
        jsonb_object_agg(
            p.difficulty_level,
            COUNT(*) FILTER (WHERE p.difficulty_level IS NOT NULL)
        ) as phrases_by_difficulty,
        jsonb_object_agg(
            p.category,
            COUNT(*) FILTER (WHERE p.category IS NOT NULL)
        ) as phrases_by_category,
        jsonb_build_object(
            'studied_last_7_days', COUNT(*) FILTER (WHERE p.last_studied_at > NOW() - INTERVAL '7 days'),
            'mastered_last_7_days', COUNT(*) FILTER (WHERE p.mastered_at > NOW() - INTERVAL '7 days')
        ) as recent_activity
    FROM public.phrases p
    WHERE p.user_id = user_uuid
    AND (category_filter IS NULL OR p.category = category_filter);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.phrases TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_phrases_from_description(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_vocabulary_stats(UUID, TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.phrases IS 'Vocabulary phrases and expressions extracted from descriptions';
COMMENT ON COLUMN public.phrases.category IS 'Type of phrase (vocabulary, expression, idiom, etc.)';
COMMENT ON COLUMN public.phrases.phonetic_pronunciation IS 'IPA or simplified phonetic representation';
COMMENT ON COLUMN public.phrases.regional_variants IS 'Countries/regions where this phrase variant is used';
COMMENT ON COLUMN public.phrases.formality_level IS 'Appropriate formality context for usage';
COMMENT ON COLUMN public.phrases.frequency_rank IS 'Relative frequency ranking of this word/phrase';
COMMENT ON COLUMN public.phrases.extraction_confidence IS 'AI confidence score for phrase extraction accuracy';
COMMENT ON COLUMN public.phrases.ai_generated_metadata IS 'Additional AI-generated linguistic metadata';