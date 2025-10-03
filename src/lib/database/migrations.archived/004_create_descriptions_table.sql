-- Migration: 004_create_descriptions_table.sql
-- Description: Create descriptions table for AI-generated image descriptions
-- Created: 2025-08-28

-- Create descriptions table for AI-generated multilingual descriptions
CREATE TABLE public.descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    style TEXT NOT NULL CHECK (style IN ('simple', 'detailed', 'poetic', 'narrative', 'technical', 'conversational')),
    spanish_text TEXT NOT NULL,
    english_translation TEXT NOT NULL,
    difficulty_score INTEGER DEFAULT 5 CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
    word_count INTEGER NOT NULL CHECK (word_count > 0),
    reading_time_seconds INTEGER DEFAULT 0 CHECK (reading_time_seconds >= 0),
    complexity_level TEXT DEFAULT 'intermediate' CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    tense_focus TEXT DEFAULT 'present' CHECK (tense_focus IN ('present', 'past', 'future', 'mixed')),
    grammar_points TEXT[] DEFAULT '{}',
    vocabulary_level TEXT DEFAULT 'intermediate' CHECK (vocabulary_level IN ('basic', 'intermediate', 'advanced', 'expert')),
    cultural_context TEXT,
    ai_model TEXT DEFAULT 'gpt-4',
    ai_prompt TEXT,
    generation_metadata JSONB DEFAULT '{}'::jsonb,
    quality_score DECIMAL(3,2) DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 10),
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_time_seconds INTEGER CHECK (completion_time_seconds >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL
);

-- Create indexes for performance
CREATE INDEX idx_descriptions_session_id ON public.descriptions(session_id);
CREATE INDEX idx_descriptions_image_id ON public.descriptions(image_id);
CREATE INDEX idx_descriptions_user_id ON public.descriptions(user_id);
CREATE INDEX idx_descriptions_style ON public.descriptions(style);
CREATE INDEX idx_descriptions_difficulty_score ON public.descriptions(difficulty_score);
CREATE INDEX idx_descriptions_complexity_level ON public.descriptions(complexity_level);
CREATE INDEX idx_descriptions_vocabulary_level ON public.descriptions(vocabulary_level);
CREATE INDEX idx_descriptions_tense_focus ON public.descriptions(tense_focus);
CREATE INDEX idx_descriptions_is_completed ON public.descriptions(is_completed);
CREATE INDEX idx_descriptions_is_favorite ON public.descriptions(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_descriptions_quality_score ON public.descriptions(quality_score DESC);
CREATE INDEX idx_descriptions_user_rating ON public.descriptions(user_rating DESC) WHERE user_rating IS NOT NULL;
CREATE INDEX idx_descriptions_created_at ON public.descriptions(created_at DESC);
CREATE INDEX idx_descriptions_grammar_points ON public.descriptions USING GIN(grammar_points);

-- Composite indexes for common queries
CREATE INDEX idx_descriptions_user_session ON public.descriptions(user_id, session_id);
CREATE INDEX idx_descriptions_user_completed ON public.descriptions(user_id, is_completed, created_at DESC);
CREATE INDEX idx_descriptions_difficulty_style ON public.descriptions(difficulty_score, style);
CREATE INDEX idx_descriptions_image_user ON public.descriptions(image_id, user_id);

-- Full-text search index for Spanish and English content
CREATE INDEX idx_descriptions_spanish_text ON public.descriptions USING GIN(to_tsvector('spanish', spanish_text));
CREATE INDEX idx_descriptions_english_text ON public.descriptions USING GIN(to_tsvector('english', english_translation));

-- Enable Row Level Security
ALTER TABLE public.descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own descriptions" ON public.descriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own descriptions" ON public.descriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own descriptions" ON public.descriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to calculate reading time and word count
CREATE OR REPLACE FUNCTION public.calculate_description_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate word count for Spanish text
    NEW.word_count = array_length(string_to_array(trim(NEW.spanish_text), ' '), 1);
    
    -- Estimate reading time (average 200 words per minute for Spanish learners)
    NEW.reading_time_seconds = GREATEST(10, (NEW.word_count * 60) / 200);
    
    -- Auto-determine complexity based on word count and vocabulary
    NEW.complexity_level = CASE 
        WHEN NEW.word_count <= 20 AND NEW.vocabulary_level IN ('basic', 'intermediate') THEN 'beginner'
        WHEN NEW.word_count <= 50 AND NEW.vocabulary_level = 'intermediate' THEN 'intermediate'
        ELSE 'advanced'
    END;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculations
CREATE TRIGGER calculate_description_stats_trigger
    BEFORE INSERT OR UPDATE ON public.descriptions
    FOR EACH ROW EXECUTE FUNCTION public.calculate_description_stats();

-- Create function to handle description completion
CREATE OR REPLACE FUNCTION public.complete_description()
RETURNS TRIGGER AS $$
BEGIN
    -- If description is being marked as completed
    IF NEW.is_completed = TRUE AND (OLD.is_completed IS FALSE OR OLD.is_completed IS NULL) THEN
        NEW.completed_at = NOW();
        
        -- Calculate completion time if not provided
        IF NEW.completion_time_seconds IS NULL THEN
            NEW.completion_time_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.created_at));
        END IF;
        
        -- Update session statistics
        UPDATE public.sessions 
        SET 
            descriptions_completed = descriptions_completed + 1,
            points_earned = points_earned + CASE 
                WHEN NEW.complexity_level = 'beginner' THEN 5
                WHEN NEW.complexity_level = 'intermediate' THEN 10
                WHEN NEW.complexity_level = 'advanced' THEN 15
                ELSE 10
            END
        WHERE id = NEW.session_id;
        
        -- Update image usage statistics
        PERFORM public.increment_image_usage(NEW.image_id);
        PERFORM public.update_image_success_rate(
            NEW.image_id, 
            NEW.completion_time_seconds::INTEGER, 
            TRUE
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for completion handling
CREATE TRIGGER complete_description_trigger
    BEFORE UPDATE ON public.descriptions
    FOR EACH ROW EXECUTE FUNCTION public.complete_description();

-- Create function to get user's description history
CREATE OR REPLACE FUNCTION public.get_user_description_history(
    user_uuid UUID,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    description_id UUID,
    image_url TEXT,
    spanish_text TEXT,
    english_translation TEXT,
    style TEXT,
    difficulty_score INTEGER,
    is_completed BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        i.url_regular,
        d.spanish_text,
        d.english_translation,
        d.style,
        d.difficulty_score,
        d.is_completed,
        d.created_at
    FROM public.descriptions d
    JOIN public.images i ON d.image_id = i.id
    WHERE d.user_id = user_uuid
    ORDER BY d.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.descriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_description_history(UUID, INTEGER, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.descriptions IS 'AI-generated Spanish descriptions with English translations';
COMMENT ON COLUMN public.descriptions.style IS 'Writing style used for the description generation';
COMMENT ON COLUMN public.descriptions.difficulty_score IS 'Difficulty rating from 1-10 for Spanish learners';
COMMENT ON COLUMN public.descriptions.tense_focus IS 'Primary grammatical tense focus in the description';
COMMENT ON COLUMN public.descriptions.grammar_points IS 'Array of grammar concepts covered in this description';
COMMENT ON COLUMN public.descriptions.cultural_context IS 'Cultural or regional context for language usage';
COMMENT ON COLUMN public.descriptions.generation_metadata IS 'AI model parameters and generation details';
COMMENT ON COLUMN public.descriptions.quality_score IS 'AI-assessed quality score of the generated description';