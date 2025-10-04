-- =====================================================
-- DESCRIBE IT - SPANISH LEARNING APP DATABASE SETUP
-- =====================================================
-- Run this script in your Supabase SQL Editor to set up all tables
-- This includes user authentication, learning progress tracking, and content management

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
-- Note: Supabase auth.users already exists for authentication
-- This table extends user data with Spanish learning specific fields

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  spanish_level TEXT CHECK (spanish_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. SESSIONS TABLE
-- =====================================================
-- Track user learning sessions for progress analytics

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('description', 'qa', 'vocabulary', 'mixed')) DEFAULT 'mixed',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  images_processed INTEGER DEFAULT 0,
  descriptions_generated INTEGER DEFAULT 0,
  qa_attempts INTEGER DEFAULT 0,
  qa_correct INTEGER DEFAULT 0,
  vocabulary_learned INTEGER DEFAULT 0,
  session_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 3. VOCABULARY LISTS TABLE
-- =====================================================
-- Predefined vocabulary collections by difficulty and theme

CREATE TABLE IF NOT EXISTS public.vocabulary_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('basic', 'intermediate', 'advanced', 'custom')) DEFAULT 'basic',
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10) DEFAULT 1,
  total_words INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for vocabulary lists
ALTER TABLE public.vocabulary_lists ENABLE ROW LEVEL SECURITY;

-- Anyone can view active lists, only creators can modify their custom lists
CREATE POLICY "Anyone can view active vocabulary lists" ON public.vocabulary_lists
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create custom vocabulary lists" ON public.vocabulary_lists
  FOR INSERT WITH CHECK (auth.uid() = created_by AND category = 'custom');

CREATE POLICY "Users can update own custom vocabulary lists" ON public.vocabulary_lists
  FOR UPDATE USING (auth.uid() = created_by AND category = 'custom');

-- =====================================================
-- 4. VOCABULARY ITEMS TABLE
-- =====================================================
-- Individual vocabulary words/phrases with translations and context

CREATE TABLE IF NOT EXISTS public.vocabulary_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vocabulary_list_id UUID REFERENCES public.vocabulary_lists(id) ON DELETE CASCADE,
  spanish_text TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  part_of_speech TEXT CHECK (part_of_speech IN ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'other')) DEFAULT 'other',
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10) DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'general',
  context_sentence_spanish TEXT,
  context_sentence_english TEXT,
  pronunciation_ipa TEXT,
  usage_notes TEXT,
  frequency_score INTEGER DEFAULT 50 CHECK (frequency_score >= 1 AND frequency_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for vocabulary items
ALTER TABLE public.vocabulary_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view vocabulary items from active lists
CREATE POLICY "Anyone can view vocabulary items" ON public.vocabulary_items
  FOR SELECT USING (
    vocabulary_list_id IN (
      SELECT id FROM public.vocabulary_lists WHERE is_active = true
    )
  );

-- Users can add items to lists they created
CREATE POLICY "Users can add items to own lists" ON public.vocabulary_items
  FOR INSERT WITH CHECK (
    vocabulary_list_id IN (
      SELECT id FROM public.vocabulary_lists 
      WHERE created_by = auth.uid() AND category = 'custom'
    )
  );

-- =====================================================
-- 5. LEARNING PROGRESS TABLE
-- =====================================================
-- Track user progress with individual vocabulary items using spaced repetition

CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vocabulary_item_id UUID REFERENCES public.vocabulary_items(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  difficulty_adjustment INTEGER DEFAULT 0,
  learning_phase TEXT CHECK (learning_phase IN ('new', 'learning', 'review', 'mastered')) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, vocabulary_item_id)
);

-- RLS for learning progress
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own learning progress
CREATE POLICY "Users can view own learning progress" ON public.learning_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning progress" ON public.learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning progress" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 6. SAVED DESCRIPTIONS TABLE
-- =====================================================
-- Save user-generated image descriptions and AI responses

CREATE TABLE IF NOT EXISTS public.saved_descriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  image_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  english_description TEXT NOT NULL,
  spanish_description TEXT NOT NULL,
  description_style TEXT CHECK (description_style IN ('conversacional', 'académico', 'creativo', 'técnico', 'narrativo')) DEFAULT 'conversacional',
  generated_vocabulary JSONB DEFAULT '[]'::jsonb,
  qa_pairs JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for saved descriptions
ALTER TABLE public.saved_descriptions ENABLE ROW LEVEL SECURITY;

-- Users can access their own descriptions, anonymous descriptions are viewable by all
CREATE POLICY "Users can view own descriptions" ON public.saved_descriptions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own descriptions" ON public.saved_descriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own descriptions" ON public.saved_descriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 7. DATABASE INDEXES
-- =====================================================
-- Performance optimization indexes

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_spanish_level ON public.users(spanish_level);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_session_type ON public.sessions(session_type);

-- Vocabulary lists indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_lists_category ON public.vocabulary_lists(category);
CREATE INDEX IF NOT EXISTS idx_vocabulary_lists_difficulty ON public.vocabulary_lists(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_vocabulary_lists_active ON public.vocabulary_lists(is_active);

-- Vocabulary items indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_items_list_id ON public.vocabulary_items(vocabulary_list_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_items_spanish_text ON public.vocabulary_items USING gin(to_tsvector('spanish', spanish_text));
CREATE INDEX IF NOT EXISTS idx_vocabulary_items_english_text ON public.vocabulary_items USING gin(to_tsvector('english', english_translation));
CREATE INDEX IF NOT EXISTS idx_vocabulary_items_category ON public.vocabulary_items(category);
CREATE INDEX IF NOT EXISTS idx_vocabulary_items_difficulty ON public.vocabulary_items(difficulty_level);

-- Learning progress indexes
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_vocab_item ON public.learning_progress(vocabulary_item_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_next_review ON public.learning_progress(next_review);
CREATE INDEX IF NOT EXISTS idx_learning_progress_phase ON public.learning_progress(learning_phase);

-- Saved descriptions indexes
CREATE INDEX IF NOT EXISTS idx_saved_descriptions_user_id ON public.saved_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_descriptions_image_id ON public.saved_descriptions(image_id);
CREATE INDEX IF NOT EXISTS idx_saved_descriptions_style ON public.saved_descriptions(description_style);
CREATE INDEX IF NOT EXISTS idx_saved_descriptions_favorite ON public.saved_descriptions(is_favorite);
CREATE INDEX IF NOT EXISTS idx_saved_descriptions_tags ON public.saved_descriptions USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_saved_descriptions_spanish_desc ON public.saved_descriptions USING gin(to_tsvector('spanish', spanish_description));
CREATE INDEX IF NOT EXISTS idx_saved_descriptions_english_desc ON public.saved_descriptions USING gin(to_tsvector('english', english_description));

-- =====================================================
-- 8. TRIGGER FUNCTIONS
-- =====================================================
-- Automatic timestamp updates and data validation

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_lists_updated_at
    BEFORE UPDATE ON public.vocabulary_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_progress_updated_at
    BEFORE UPDATE ON public.learning_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_descriptions_updated_at
    BEFORE UPDATE ON public.saved_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update vocabulary list word count
CREATE OR REPLACE FUNCTION update_vocabulary_list_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.vocabulary_lists 
        SET total_words = (
            SELECT COUNT(*) 
            FROM public.vocabulary_items 
            WHERE vocabulary_list_id = NEW.vocabulary_list_id
        ),
        updated_at = timezone('utc'::text, now())
        WHERE id = NEW.vocabulary_list_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.vocabulary_lists 
        SET total_words = (
            SELECT COUNT(*) 
            FROM public.vocabulary_items 
            WHERE vocabulary_list_id = OLD.vocabulary_list_id
        ),
        updated_at = timezone('utc'::text, now())
        WHERE id = OLD.vocabulary_list_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply word count trigger
CREATE TRIGGER update_vocabulary_list_count_trigger
    AFTER INSERT OR DELETE ON public.vocabulary_items
    FOR EACH ROW
    EXECUTE FUNCTION update_vocabulary_list_count();

-- =====================================================
-- 9. INITIAL DATA - SPANISH VOCABULARY LISTS
-- =====================================================

-- Basic Spanish Vocabulary List
INSERT INTO public.vocabulary_lists (id, name, description, category, difficulty_level, is_active)
VALUES (
    gen_random_uuid(),
    'Vocabulario Básico',
    'Essential Spanish words for beginners - family, colors, numbers, basic verbs',
    'basic',
    1,
    true
) ON CONFLICT DO NOTHING;

-- Intermediate Spanish Vocabulary List
INSERT INTO public.vocabulary_lists (id, name, description, category, difficulty_level, is_active)
VALUES (
    gen_random_uuid(),
    'Vocabulario Intermedio',
    'Intermediate Spanish vocabulary - emotions, weather, travel, shopping',
    'intermediate',
    5,
    true
) ON CONFLICT DO NOTHING;

-- Advanced Spanish Vocabulary List
INSERT INTO public.vocabulary_lists (id, name, description, category, difficulty_level, is_active)
VALUES (
    gen_random_uuid(),
    'Vocabulario Avanzado',
    'Advanced Spanish vocabulary - abstract concepts, professional terms, complex expressions',
    'advanced',
    8,
    true
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. SAMPLE VOCABULARY ITEMS
-- =====================================================
-- Add some basic Spanish vocabulary to get started

-- Get the basic vocabulary list ID for inserting items
DO $$
DECLARE
    basic_list_id UUID;
    intermediate_list_id UUID;
    advanced_list_id UUID;
BEGIN
    -- Get list IDs
    SELECT id INTO basic_list_id FROM public.vocabulary_lists WHERE name = 'Vocabulario Básico' LIMIT 1;
    SELECT id INTO intermediate_list_id FROM public.vocabulary_lists WHERE name = 'Vocabulario Intermedio' LIMIT 1;
    SELECT id INTO advanced_list_id FROM public.vocabulary_lists WHERE name = 'Vocabulario Avanzado' LIMIT 1;

    -- Basic vocabulary items
    IF basic_list_id IS NOT NULL THEN
        INSERT INTO public.vocabulary_items (vocabulary_list_id, spanish_text, english_translation, part_of_speech, difficulty_level, category, context_sentence_spanish, context_sentence_english, frequency_score)
        VALUES 
            (basic_list_id, 'hola', 'hello', 'other', 1, 'greetings', 'Hola, ¿cómo estás?', 'Hello, how are you?', 95),
            (basic_list_id, 'casa', 'house', 'noun', 1, 'home', 'Mi casa es azul.', 'My house is blue.', 90),
            (basic_list_id, 'agua', 'water', 'noun', 1, 'food_drink', 'Necesito agua.', 'I need water.', 95),
            (basic_list_id, 'comer', 'to eat', 'verb', 1, 'food_drink', 'Me gusta comer frutas.', 'I like to eat fruits.', 90),
            (basic_list_id, 'rojo', 'red', 'adjective', 1, 'colors', 'El coche es rojo.', 'The car is red.', 85),
            (basic_list_id, 'azul', 'blue', 'adjective', 1, 'colors', 'El cielo es azul.', 'The sky is blue.', 85),
            (basic_list_id, 'familia', 'family', 'noun', 1, 'family', 'Mi familia es grande.', 'My family is big.', 88),
            (basic_list_id, 'madre', 'mother', 'noun', 1, 'family', 'Mi madre cocina bien.', 'My mother cooks well.', 90),
            (basic_list_id, 'padre', 'father', 'noun', 1, 'family', 'Mi padre trabaja mucho.', 'My father works a lot.', 88),
            (basic_list_id, 'uno', 'one', 'other', 1, 'numbers', 'Tengo uno.', 'I have one.', 95)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Intermediate vocabulary items
    IF intermediate_list_id IS NOT NULL THEN
        INSERT INTO public.vocabulary_items (vocabulary_list_id, spanish_text, english_translation, part_of_speech, difficulty_level, category, context_sentence_spanish, context_sentence_english, frequency_score)
        VALUES 
            (intermediate_list_id, 'feliz', 'happy', 'adjective', 4, 'emotions', 'Estoy muy feliz hoy.', 'I am very happy today.', 80),
            (intermediate_list_id, 'triste', 'sad', 'adjective', 4, 'emotions', 'No quiero estar triste.', 'I don''t want to be sad.', 75),
            (intermediate_list_id, 'lluvia', 'rain', 'noun', 5, 'weather', 'La lluvia es refrescante.', 'The rain is refreshing.', 70),
            (intermediate_list_id, 'viajar', 'to travel', 'verb', 5, 'travel', 'Me encanta viajar por el mundo.', 'I love to travel around the world.', 78),
            (intermediate_list_id, 'aeropuerto', 'airport', 'noun', 5, 'travel', 'El aeropuerto está lejos.', 'The airport is far away.', 65),
            (intermediate_list_id, 'comprar', 'to buy', 'verb', 4, 'shopping', 'Voy a comprar comida.', 'I am going to buy food.', 85),
            (intermediate_list_id, 'dinero', 'money', 'noun', 4, 'shopping', 'No tengo suficiente dinero.', 'I don''t have enough money.', 88),
            (intermediate_list_id, 'restaurante', 'restaurant', 'noun', 4, 'food_drink', 'Este restaurante es excelente.', 'This restaurant is excellent.', 82),
            (intermediate_list_id, 'trabajo', 'work', 'noun', 4, 'work', 'Mi trabajo es interesante.', 'My work is interesting.', 90),
            (intermediate_list_id, 'escuela', 'school', 'noun', 4, 'education', 'La escuela está cerca.', 'The school is nearby.', 85)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Advanced vocabulary items
    IF advanced_list_id IS NOT NULL THEN
        INSERT INTO public.vocabulary_items (vocabulary_list_id, spanish_text, english_translation, part_of_speech, difficulty_level, category, context_sentence_spanish, context_sentence_english, frequency_score)
        VALUES 
            (advanced_list_id, 'existencialismo', 'existentialism', 'noun', 9, 'philosophy', 'El existencialismo es una corriente filosófica.', 'Existentialism is a philosophical movement.', 25),
            (advanced_list_id, 'interdisciplinario', 'interdisciplinary', 'adjective', 8, 'academic', 'Este proyecto es interdisciplinario.', 'This project is interdisciplinary.', 30),
            (advanced_list_id, 'perspicacia', 'insight', 'noun', 8, 'abstract', 'Su perspicacia es admirable.', 'His insight is admirable.', 35),
            (advanced_list_id, 'idiosincrasia', 'idiosyncrasy', 'noun', 9, 'abstract', 'Cada cultura tiene su idiosincrasia.', 'Each culture has its idiosyncrasy.', 20),
            (advanced_list_id, 'paradigma', 'paradigm', 'noun', 7, 'academic', 'Necesitamos un nuevo paradigma.', 'We need a new paradigm.', 45),
            (advanced_list_id, 'epistemología', 'epistemology', 'noun', 9, 'philosophy', 'La epistemología estudia el conocimiento.', 'Epistemology studies knowledge.', 15),
            (advanced_list_id, 'implementar', 'to implement', 'verb', 7, 'business', 'Vamos a implementar el plan.', 'We are going to implement the plan.', 60),
            (advanced_list_id, 'sostenibilidad', 'sustainability', 'noun', 7, 'environment', 'La sostenibilidad es crucial.', 'Sustainability is crucial.', 55),
            (advanced_list_id, 'concienciación', 'awareness', 'noun', 8, 'abstract', 'La concienciación es el primer paso.', 'Awareness is the first step.', 50),
            (advanced_list_id, 'metamorfosis', 'metamorphosis', 'noun', 8, 'abstract', 'La metamorfosis del proceso fue notable.', 'The metamorphosis of the process was remarkable.', 40)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- 11. DATABASE VIEWS
-- =====================================================
-- Useful views for common queries

-- User learning statistics view
CREATE OR REPLACE VIEW public.user_learning_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.spanish_level,
    COUNT(DISTINCT s.id) as total_sessions,
    COALESCE(SUM(s.duration_minutes), 0) as total_minutes_studied,
    COALESCE(SUM(s.descriptions_generated), 0) as total_descriptions,
    COALESCE(SUM(s.qa_attempts), 0) as total_qa_attempts,
    COALESCE(SUM(s.qa_correct), 0) as total_qa_correct,
    COALESCE(SUM(s.vocabulary_learned), 0) as total_vocabulary_learned,
    COUNT(DISTINCT lp.vocabulary_item_id) as unique_words_studied,
    COUNT(DISTINCT CASE WHEN lp.learning_phase = 'mastered' THEN lp.vocabulary_item_id END) as words_mastered,
    ROUND(
        AVG(CASE WHEN s.qa_attempts > 0 THEN (s.qa_correct::float / s.qa_attempts * 100) END), 2
    ) as avg_qa_accuracy
FROM public.users u
LEFT JOIN public.sessions s ON u.id = s.user_id
LEFT JOIN public.learning_progress lp ON u.id = lp.user_id
GROUP BY u.id, u.email, u.spanish_level;

-- Vocabulary difficulty analysis view
CREATE OR REPLACE VIEW public.vocabulary_difficulty_analysis AS
SELECT 
    vl.name as list_name,
    vl.category,
    COUNT(vi.id) as total_items,
    ROUND(AVG(vi.difficulty_level), 2) as avg_difficulty,
    ROUND(AVG(vi.frequency_score), 2) as avg_frequency,
    COUNT(DISTINCT lp.user_id) as users_studying,
    ROUND(AVG(lp.mastery_level), 2) as avg_mastery_level,
    COUNT(CASE WHEN lp.learning_phase = 'mastered' THEN 1 END) as total_mastered
FROM public.vocabulary_lists vl
LEFT JOIN public.vocabulary_items vi ON vl.id = vi.vocabulary_list_id
LEFT JOIN public.learning_progress lp ON vi.id = lp.vocabulary_item_id
WHERE vl.is_active = true
GROUP BY vl.id, vl.name, vl.category
ORDER BY vl.difficulty_level;

-- =====================================================
-- 12. DATABASE FUNCTIONS
-- =====================================================

-- Function to get vocabulary items due for review
CREATE OR REPLACE FUNCTION get_due_vocabulary_items(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    item_id UUID,
    spanish_text TEXT,
    english_translation TEXT,
    part_of_speech TEXT,
    difficulty_level INTEGER,
    mastery_level INTEGER,
    review_count INTEGER,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    learning_phase TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vi.id,
        vi.spanish_text,
        vi.english_translation,
        vi.part_of_speech,
        vi.difficulty_level,
        COALESCE(lp.mastery_level, 0),
        COALESCE(lp.review_count, 0),
        lp.last_reviewed,
        COALESCE(lp.learning_phase, 'new')
    FROM public.vocabulary_items vi
    LEFT JOIN public.learning_progress lp ON vi.id = lp.vocabulary_item_id AND lp.user_id = p_user_id
    WHERE 
        -- Include new items (never studied)
        (lp.id IS NULL)
        OR 
        -- Include items due for review
        (lp.next_review IS NULL OR lp.next_review <= timezone('utc'::text, now()))
        AND
        -- Exclude mastered items unless they're really overdue
        (lp.learning_phase != 'mastered' OR lp.next_review < timezone('utc'::text, now()) - INTERVAL '7 days')
    ORDER BY 
        CASE WHEN lp.id IS NULL THEN 0 ELSE 1 END, -- New items first
        COALESCE(lp.next_review, timezone('utc'::text, now())), -- Then by due date
        vi.difficulty_level -- Then by difficulty
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next review date based on spaced repetition
CREATE OR REPLACE FUNCTION calculate_next_review_date(
    p_mastery_level INTEGER,
    p_review_count INTEGER,
    p_was_correct BOOLEAN
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    base_interval INTEGER;
    multiplier FLOAT;
    next_review TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Base interval in hours based on mastery level
    base_interval := CASE 
        WHEN p_mastery_level < 20 THEN 2      -- 2 hours
        WHEN p_mastery_level < 40 THEN 8      -- 8 hours  
        WHEN p_mastery_level < 60 THEN 24     -- 1 day
        WHEN p_mastery_level < 80 THEN 72     -- 3 days
        ELSE 168                              -- 1 week
    END;
    
    -- Adjust based on correctness
    multiplier := CASE 
        WHEN p_was_correct THEN 
            CASE 
                WHEN p_review_count = 0 THEN 1.0
                WHEN p_review_count = 1 THEN 1.5
                WHEN p_review_count = 2 THEN 2.0
                ELSE LEAST(3.0, 1.0 + (p_review_count * 0.3))
            END
        ELSE 0.5  -- If incorrect, review sooner
    END;
    
    next_review := timezone('utc'::text, now()) + (base_interval * multiplier || ' hours')::INTERVAL;
    
    RETURN next_review;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETED SUCCESSFULLY! 🎉';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✓ users (extends Supabase auth)';
    RAISE NOTICE '  ✓ sessions (learning session tracking)';
    RAISE NOTICE '  ✓ vocabulary_lists (Spanish word collections)';
    RAISE NOTICE '  ✓ vocabulary_items (individual words/phrases)';
    RAISE NOTICE '  ✓ learning_progress (spaced repetition)';
    RAISE NOTICE '  ✓ saved_descriptions (AI-generated content)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '  ✓ Row Level Security (RLS)';
    RAISE NOTICE '  ✓ Full-text search indexes';
    RAISE NOTICE '  ✓ Automatic timestamp updates';
    RAISE NOTICE '  ✓ Spaced repetition algorithm';
    RAISE NOTICE '  ✓ Learning analytics views';
    RAISE NOTICE '';
    RAISE NOTICE 'Initial data loaded:';
    RAISE NOTICE '  ✓ 3 vocabulary lists (Basic/Intermediate/Advanced)';
    RAISE NOTICE '  ✓ 30 sample Spanish vocabulary items';
    RAISE NOTICE '  ✓ Contextual sentences and usage examples';
    RAISE NOTICE '';
    RAISE NOTICE 'Your Spanish Learning App is ready! 🚀';
    RAISE NOTICE '=======================================================';
END $$;