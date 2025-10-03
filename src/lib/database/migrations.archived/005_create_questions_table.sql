-- Migration: 005_create_questions_table.sql
-- Description: Create questions table for interactive learning activities
-- Created: 2025-08-28

-- Create questions table for interactive learning
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description_id UUID NOT NULL REFERENCES public.descriptions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL CHECK (question_type IN (
        'multiple_choice', 'true_false', 'fill_blank', 'translation', 
        'comprehension', 'grammar', 'vocabulary', 'sentence_order'
    )),
    question_text TEXT NOT NULL,
    question_spanish TEXT,
    question_english TEXT,
    correct_answer TEXT NOT NULL,
    user_response TEXT,
    answer_options JSONB DEFAULT '[]'::jsonb, -- For multiple choice options
    explanation TEXT,
    explanation_spanish TEXT,
    explanation_english TEXT,
    difficulty_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    grammar_focus TEXT[], -- Grammar points being tested
    vocabulary_focus TEXT[], -- Vocabulary being tested
    points_value INTEGER DEFAULT 1 CHECK (points_value > 0),
    time_limit_seconds INTEGER DEFAULT 30 CHECK (time_limit_seconds > 0),
    is_answered BOOLEAN DEFAULT FALSE,
    is_correct BOOLEAN DEFAULT FALSE,
    response_time_seconds INTEGER CHECK (response_time_seconds >= 0),
    hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
    attempts_count INTEGER DEFAULT 0 CHECK (attempts_count >= 0),
    max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0),
    question_order INTEGER NOT NULL CHECK (question_order > 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    answered_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_questions_description_id ON public.questions(description_id);
CREATE INDEX idx_questions_session_id ON public.questions(session_id);
CREATE INDEX idx_questions_user_id ON public.questions(user_id);
CREATE INDEX idx_questions_question_type ON public.questions(question_type);
CREATE INDEX idx_questions_difficulty_level ON public.questions(difficulty_level);
CREATE INDEX idx_questions_is_answered ON public.questions(is_answered);
CREATE INDEX idx_questions_is_correct ON public.questions(is_correct) WHERE is_answered = TRUE;
CREATE INDEX idx_questions_grammar_focus ON public.questions USING GIN(grammar_focus);
CREATE INDEX idx_questions_vocabulary_focus ON public.questions USING GIN(vocabulary_focus);
CREATE INDEX idx_questions_created_at ON public.questions(created_at DESC);
CREATE INDEX idx_questions_question_order ON public.questions(question_order);

-- Composite indexes for common queries
CREATE INDEX idx_questions_session_order ON public.questions(session_id, question_order);
CREATE INDEX idx_questions_user_answered ON public.questions(user_id, is_answered, answered_at DESC);
CREATE INDEX idx_questions_description_order ON public.questions(description_id, question_order);
CREATE INDEX idx_questions_user_correct ON public.questions(user_id, is_correct, answered_at DESC) WHERE is_answered = TRUE;

-- Full-text search index for questions
CREATE INDEX idx_questions_text_search ON public.questions USING GIN(
    to_tsvector('english', question_text || ' ' || COALESCE(explanation, ''))
);

-- Enable Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own questions" ON public.questions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own questions" ON public.questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions" ON public.questions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle question answering
CREATE OR REPLACE FUNCTION public.answer_question()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if question is being answered for the first time
    IF NEW.is_answered = TRUE AND (OLD.is_answered IS FALSE OR OLD.is_answered IS NULL) THEN
        NEW.answered_at = NOW();
        NEW.attempts_count = GREATEST(1, NEW.attempts_count);
        
        -- Calculate response time if not provided
        IF NEW.response_time_seconds IS NULL THEN
            NEW.response_time_seconds = LEAST(
                NEW.time_limit_seconds,
                EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER
            );
        END IF;
        
        -- Check if answer is correct (case-insensitive comparison)
        NEW.is_correct = (LOWER(TRIM(NEW.user_response)) = LOWER(TRIM(NEW.correct_answer)));
        
        -- Update session statistics
        UPDATE public.sessions 
        SET 
            questions_answered = questions_answered + 1,
            questions_correct = questions_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
            points_earned = points_earned + CASE 
                WHEN NEW.is_correct THEN NEW.points_value 
                ELSE 0 
            END
        WHERE id = NEW.session_id;
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for question answering
CREATE TRIGGER answer_question_trigger
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.answer_question();

-- Create function to generate questions for a description
CREATE OR REPLACE FUNCTION public.generate_questions_for_description(
    desc_id UUID,
    sess_id UUID,
    usr_id UUID,
    question_count INTEGER DEFAULT 3
)
RETURNS VOID AS $$
DECLARE
    desc_record RECORD;
    i INTEGER;
BEGIN
    -- Get description details
    SELECT spanish_text, english_translation, difficulty_score, complexity_level, grammar_points
    INTO desc_record
    FROM public.descriptions
    WHERE id = desc_id AND user_id = usr_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Description not found or access denied';
    END IF;
    
    -- Generate different types of questions
    FOR i IN 1..question_count LOOP
        INSERT INTO public.questions (
            description_id,
            session_id,
            user_id,
            question_type,
            question_text,
            correct_answer,
            difficulty_level,
            question_order,
            points_value
        ) VALUES (
            desc_id,
            sess_id,
            usr_id,
            CASE 
                WHEN i % 3 = 1 THEN 'comprehension'
                WHEN i % 3 = 2 THEN 'translation'
                ELSE 'vocabulary'
            END,
            'Generated question ' || i || ' for description',
            'Sample answer ' || i,
            desc_record.complexity_level,
            i,
            CASE 
                WHEN desc_record.complexity_level = 'beginner' THEN 1
                WHEN desc_record.complexity_level = 'intermediate' THEN 2
                ELSE 3
            END
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user question statistics
CREATE OR REPLACE FUNCTION public.get_user_question_stats(
    user_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_questions INTEGER,
    correct_answers INTEGER,
    accuracy_percentage DECIMAL,
    avg_response_time DECIMAL,
    questions_by_type JSONB,
    questions_by_difficulty JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_questions,
        SUM(CASE WHEN q.is_correct THEN 1 ELSE 0 END)::INTEGER as correct_answers,
        ROUND(
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    (SUM(CASE WHEN q.is_correct THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100
                ELSE 0
            END, 2
        ) as accuracy_percentage,
        ROUND(AVG(q.response_time_seconds)::DECIMAL, 2) as avg_response_time,
        jsonb_object_agg(
            q.question_type, 
            COUNT(*) FILTER (WHERE q.question_type IS NOT NULL)
        ) as questions_by_type,
        jsonb_object_agg(
            q.difficulty_level,
            COUNT(*) FILTER (WHERE q.difficulty_level IS NOT NULL)
        ) as questions_by_difficulty
    FROM public.questions q
    WHERE q.user_id = user_uuid
    AND q.is_answered = TRUE
    AND q.answered_at > (NOW() - (days_back || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.questions TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_questions_for_description(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_question_stats(UUID, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.questions IS 'Interactive questions for testing Spanish comprehension';
COMMENT ON COLUMN public.questions.question_type IS 'Type of question (multiple_choice, true_false, fill_blank, etc.)';
COMMENT ON COLUMN public.questions.answer_options IS 'JSON array of options for multiple choice questions';
COMMENT ON COLUMN public.questions.grammar_focus IS 'Array of grammar concepts being tested';
COMMENT ON COLUMN public.questions.vocabulary_focus IS 'Array of vocabulary words being tested';
COMMENT ON COLUMN public.questions.response_time_seconds IS 'Time taken by user to answer in seconds';
COMMENT ON COLUMN public.questions.hints_used IS 'Number of hints user requested for this question';