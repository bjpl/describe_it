-- ==============================================
-- SEED DATA - INITIAL VOCABULARY AND SETTINGS
-- ==============================================
-- Sample data for Spanish learning application

-- Insert default vocabulary lists
INSERT INTO vocabulary_lists (
    id, name, description, category, difficulty_level, 
    is_active, is_public, total_words, completion_rate, 
    average_mastery, tags, language_pair
) VALUES
(
    uuid_generate_v4(),
    'Primeras Palabras',
    'Vocabulario básico esencial para comenzar a aprender español',
    'basic',
    1,
    true,
    true,
    20,
    0.0,
    0.0,
    ARRAY['básico', 'principiante', 'esencial'],
    'es-en'
),
(
    uuid_generate_v4(),
    'Colores y Formas',
    'Aprende los colores básicos y las formas geométricas',
    'thematic',
    1,
    true,
    true,
    15,
    0.0,
    0.0,
    ARRAY['colores', 'formas', 'visual', 'básico'],
    'es-en'
),
(
    uuid_generate_v4(),
    'Casa y Familia',
    'Vocabulario relacionado con el hogar y los miembros de la familia',
    'thematic',
    2,
    true,
    true,
    25,
    0.0,
    0.0,
    ARRAY['familia', 'casa', 'hogar', 'relaciones'],
    'es-en'
),
(
    uuid_generate_v4(),
    'Comida y Bebida',
    'Alimentos, bebidas y vocabulario gastronómico básico',
    'thematic',
    2,
    true,
    true,
    30,
    0.0,
    0.0,
    ARRAY['comida', 'bebida', 'cocina', 'restaurante'],
    'es-en'
),
(
    uuid_generate_v4(),
    'Verbos Comunes',
    'Los verbos más utilizados en español cotidiano',
    'basic',
    3,
    true,
    true,
    35,
    0.0,
    0.0,
    ARRAY['verbos', 'acciones', 'común', 'conjugación'],
    'es-en'
);

-- Get vocabulary list IDs for vocabulary items insertion
DO $$
DECLARE
    list_primeras_palabras UUID;
    list_colores_formas UUID;
    list_casa_familia UUID;
    list_comida_bebida UUID;
    list_verbos_comunes UUID;
BEGIN
    -- Get list IDs
    SELECT id INTO list_primeras_palabras FROM vocabulary_lists WHERE name = 'Primeras Palabras';
    SELECT id INTO list_colores_formas FROM vocabulary_lists WHERE name = 'Colores y Formas';
    SELECT id INTO list_casa_familia FROM vocabulary_lists WHERE name = 'Casa y Familia';
    SELECT id INTO list_comida_bebida FROM vocabulary_lists WHERE name = 'Comida y Bebida';
    SELECT id INTO list_verbos_comunes FROM vocabulary_lists WHERE name = 'Verbos Comunes';

    -- Insert vocabulary items for "Primeras Palabras"
    INSERT INTO vocabulary_items (
        vocabulary_list_id, spanish_text, english_translation, part_of_speech,
        difficulty_level, gender, article, context_sentence_spanish, context_sentence_english,
        pronunciation_ipa, frequency_score, register, synonyms, memory_hints,
        associated_image_urls, emoji_representation
    ) VALUES
    (list_primeras_palabras, 'hola', 'hello', 'interjection', 'beginner', null, null, 
     '¡Hola! ¿Cómo estás?', 'Hello! How are you?', 'ˈola', 10, 'neutral', 
     ARRAY['buenas', 'saludos'], ARRAY['Most common greeting'], ARRAY[]::TEXT[], '👋'),
    
    (list_primeras_palabras, 'adiós', 'goodbye', 'interjection', 'beginner', null, null,
     'Adiós, nos vemos mañana', 'Goodbye, see you tomorrow', 'aˈðjos', 9, 'neutral',
     ARRAY['hasta luego', 'nos vemos'], ARRAY['Wave goodbye gesture'], ARRAY[]::TEXT[], '👋'),
     
    (list_primeras_palabras, 'gracias', 'thank you', 'interjection', 'beginner', null, null,
     'Gracias por tu ayuda', 'Thank you for your help', 'ˈgɾaθjas', 10, 'neutral',
     ARRAY['muchas gracias'], ARRAY['Say with a smile'], ARRAY[]::TEXT[], '🙏'),
     
    (list_primeras_palabras, 'por favor', 'please', 'other', 'beginner', null, null,
     'Pásame el agua, por favor', 'Pass me the water, please', 'poɾ faˈβoɾ', 9, 'formal',
     ARRAY['por favorcito'], ARRAY['Polite expression'], ARRAY[]::TEXT[], '🙏'),
     
    (list_primeras_palabras, 'sí', 'yes', 'adverb', 'beginner', null, null,
     'Sí, me gusta mucho', 'Yes, I like it a lot', 'si', 10, 'neutral',
     ARRAY['claro', 'por supuesto'], ARRAY['Nod your head'], ARRAY[]::TEXT[], '✅'),
     
    (list_primeras_palabras, 'no', 'no', 'adverb', 'beginner', null, null,
     'No, no me gusta', 'No, I don''t like it', 'no', 10, 'neutral',
     ARRAY['nada'], ARRAY['Shake your head'], ARRAY[]::TEXT[], '❌');

    -- Insert vocabulary items for "Colores y Formas"
    INSERT INTO vocabulary_items (
        vocabulary_list_id, spanish_text, english_translation, part_of_speech,
        difficulty_level, gender, article, context_sentence_spanish, context_sentence_english,
        pronunciation_ipa, frequency_score, register, synonyms, memory_hints,
        associated_image_urls, emoji_representation
    ) VALUES
    (list_colores_formas, 'rojo', 'red', 'adjective', 'beginner', 'masculino', 'el', 
     'El coche rojo es muy bonito', 'The red car is very pretty', 'ˈroxo', 8, 'neutral', 
     ARRAY['colorado'], ARRAY['Think of roses', 'Color of blood'], ARRAY[]::TEXT[], '🔴'),
     
    (list_colores_formas, 'azul', 'blue', 'adjective', 'beginner', 'masculino', 'el',
     'El cielo azul es hermoso', 'The blue sky is beautiful', 'aˈθul', 8, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Think of the ocean', 'Color of sky'], ARRAY[]::TEXT[], '🔵'),
     
    (list_colores_formas, 'verde', 'green', 'adjective', 'beginner', 'masculino', 'el',
     'La hierba verde crece rápido', 'The green grass grows fast', 'ˈbeɾðe', 8, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Think of trees', 'Color of nature'], ARRAY[]::TEXT[], '🟢'),
     
    (list_colores_formas, 'círculo', 'circle', 'noun', 'beginner', 'masculino', 'el',
     'Dibuja un círculo perfecto', 'Draw a perfect circle', 'ˈθiɾkulo', 6, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Round shape', 'No corners'], ARRAY[]::TEXT[], '⭕'),
     
    (list_colores_formas, 'cuadrado', 'square', 'noun', 'beginner', 'masculino', 'el',
     'El cuadrado tiene cuatro lados', 'The square has four sides', 'kwaˈðɾaðo', 6, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Four equal sides', 'Four corners'], ARRAY[]::TEXT[], '⬜');

    -- Insert vocabulary items for "Casa y Familia"
    INSERT INTO vocabulary_items (
        vocabulary_list_id, spanish_text, english_translation, part_of_speech,
        difficulty_level, gender, article, context_sentence_spanish, context_sentence_english,
        pronunciation_ipa, frequency_score, register, synonyms, memory_hints,
        associated_image_urls, emoji_representation
    ) VALUES
    (list_casa_familia, 'madre', 'mother', 'noun', 'beginner', 'femenino', 'la',
     'Mi madre es muy cariñosa', 'My mother is very loving', 'ˈmaðɾe', 9, 'neutral',
     ARRAY['mamá', 'mami'], ARRAY['The person who gave birth'], ARRAY[]::TEXT[], '👩'),
     
    (list_casa_familia, 'padre', 'father', 'noun', 'beginner', 'masculino', 'el',
     'Mi padre trabaja mucho', 'My father works a lot', 'ˈpaðɾe', 9, 'neutral',
     ARRAY['papá', 'papi'], ARRAY['Male parent'], ARRAY[]::TEXT[], '👨'),
     
    (list_casa_familia, 'hermano', 'brother', 'noun', 'beginner', 'masculino', 'el',
     'Mi hermano menor juega fútbol', 'My younger brother plays soccer', 'eɾˈmano', 8, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Male sibling'], ARRAY[]::TEXT[], '👦'),
     
    (list_casa_familia, 'casa', 'house', 'noun', 'beginner', 'femenino', 'la',
     'Nuestra casa es muy grande', 'Our house is very big', 'ˈkasa', 9, 'neutral',
     ARRAY['hogar', 'vivienda'], ARRAY['Where you live'], ARRAY[]::TEXT[], '🏠'),
     
    (list_casa_familia, 'cocina', 'kitchen', 'noun', 'beginner', 'femenino', 'la',
     'Cocinamos en la cocina', 'We cook in the kitchen', 'koˈθina', 7, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Where you cook food'], ARRAY[]::TEXT[], '🍳');

    -- Insert vocabulary items for "Comida y Bebida"
    INSERT INTO vocabulary_items (
        vocabulary_list_id, spanish_text, english_translation, part_of_speech,
        difficulty_level, gender, article, context_sentence_spanish, context_sentence_english,
        pronunciation_ipa, frequency_score, register, synonyms, memory_hints,
        associated_image_urls, emoji_representation
    ) VALUES
    (list_comida_bebida, 'agua', 'water', 'noun', 'beginner', 'femenino', 'el',
     'Bebo mucha agua cada día', 'I drink a lot of water every day', 'ˈaɣwa', 10, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Essential for life', 'Clear liquid'], ARRAY[]::TEXT[], '💧'),
     
    (list_comida_bebida, 'pan', 'bread', 'noun', 'beginner', 'masculino', 'el',
     'Compramos pan fresco en la panadería', 'We buy fresh bread at the bakery', 'pan', 9, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Basic food', 'Made with flour'], ARRAY[]::TEXT[], '🍞'),
     
    (list_comida_bebida, 'manzana', 'apple', 'noun', 'beginner', 'femenino', 'la',
     'La manzana roja está deliciosa', 'The red apple is delicious', 'manˈθana', 7, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Round fruit', 'Often red or green'], ARRAY[]::TEXT[], '🍎'),
     
    (list_comida_bebida, 'leche', 'milk', 'noun', 'beginner', 'femenino', 'la',
     'Los niños toman leche', 'Children drink milk', 'ˈlet͡ʃe', 8, 'neutral',
     ARRAY[]::TEXT[], ARRAY['White liquid', 'From cows'], ARRAY[]::TEXT[], '🥛'),
     
    (list_comida_bebida, 'café', 'coffee', 'noun', 'beginner', 'masculino', 'el',
     'Me gusta el café por la mañana', 'I like coffee in the morning', 'kaˈfe', 8, 'neutral',
     ARRAY[]::TEXT[], ARRAY['Dark drink', 'Gives energy'], ARRAY[]::TEXT[], '☕');

    -- Insert vocabulary items for "Verbos Comunes"
    INSERT INTO vocabulary_items (
        vocabulary_list_id, spanish_text, english_translation, part_of_speech,
        difficulty_level, gender, article, context_sentence_spanish, context_sentence_english,
        pronunciation_ipa, frequency_score, register, conjugation_info, memory_hints,
        associated_image_urls, emoji_representation
    ) VALUES
    (list_verbos_comunes, 'ser', 'to be (permanent)', 'verb', 'beginner', null, null,
     'Ella es muy inteligente', 'She is very intelligent', 'seɾ', 10, 'neutral',
     '{"infinitive": "ser", "present": {"yo": "soy", "tú": "eres", "él/ella": "es", "nosotros": "somos", "vosotros": "sois", "ellos": "son"}}',
     ARRAY['Permanent characteristics', 'Essential qualities'], ARRAY[]::TEXT[], '🌟'),
     
    (list_verbos_comunes, 'estar', 'to be (temporary)', 'verb', 'beginner', null, null,
     'Estoy muy cansado hoy', 'I am very tired today', 'esˈtaɾ', 10, 'neutral',
     '{"infinitive": "estar", "present": {"yo": "estoy", "tú": "estás", "él/ella": "está", "nosotros": "estamos", "vosotros": "estáis", "ellos": "están"}}',
     ARRAY['Temporary states', 'Location', 'Feelings'], ARRAY[]::TEXT[], '📍'),
     
    (list_verbos_comunes, 'tener', 'to have', 'verb', 'beginner', null, null,
     'Tengo dos hermanos', 'I have two brothers', 'teˈneɾ', 10, 'neutral',
     '{"infinitive": "tener", "present": {"yo": "tengo", "tú": "tienes", "él/ella": "tiene", "nosotros": "tenemos", "vosotros": "tenéis", "ellos": "tienen"}}',
     ARRAY['Possession', 'Very irregular'], ARRAY[]::TEXT[], '🤲'),
     
    (list_verbos_comunes, 'hacer', 'to do/make', 'verb', 'beginner', null, null,
     'Hago mi tarea todos los días', 'I do my homework every day', 'aˈθeɾ', 9, 'neutral',
     '{"infinitive": "hacer", "present": {"yo": "hago", "tú": "haces", "él/ella": "hace", "nosotros": "hacemos", "vosotros": "hacéis", "ellos": "hacen"}}',
     ARRAY['Actions', 'Creating things'], ARRAY[]::TEXT[], '⚒️'),
     
    (list_verbos_comunes, 'ir', 'to go', 'verb', 'beginner', null, null,
     'Voy al colegio en autobús', 'I go to school by bus', 'iɾ', 9, 'neutral',
     '{"infinitive": "ir", "present": {"yo": "voy", "tú": "vas", "él/ella": "va", "nosotros": "vamos", "vosotros": "vais", "ellos": "van"}}',
     ARRAY['Movement', 'Very irregular verb'], ARRAY[]::TEXT[], '🚶');

END $$;

-- Update vocabulary list counts
UPDATE vocabulary_lists 
SET total_words = (
    SELECT COUNT(*) 
    FROM vocabulary_items 
    WHERE vocabulary_list_id = vocabulary_lists.id
);

-- ==============================================
-- SAMPLE IMAGES FOR TESTING
-- ==============================================

INSERT INTO images (
    id, unsplash_id, url, thumbnail_url, description, alt_description,
    width, height, color, photographer_name, photographer_username,
    usage_count, is_suitable_for_learning, content_rating
) VALUES
(
    uuid_generate_v4(),
    'sample_001',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    'Beautiful mountain landscape with lake',
    'Scenic view of mountains reflected in calm lake water',
    1920, 1280, '#4A90E2',
    'John Photographer', 'johnphoto',
    0, true, 'safe'
),
(
    uuid_generate_v4(),
    'sample_002', 
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    'Cozy cafe interior with people',
    'Interior view of a busy coffee shop with customers',
    1920, 1280, '#8B4513',
    'Maria Cafe', 'mariacafe',
    0, true, 'safe'
),
(
    uuid_generate_v4(),
    'sample_003',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
    'Happy family having dinner',
    'Family of four enjoying a meal together at dining table',
    1920, 1280, '#FF6B6B',
    'Family Photos', 'familyphotos',
    0, true, 'safe'
);

-- ==============================================
-- DEFAULT USER SETTINGS TEMPLATE
-- ==============================================

-- This will be used as a template for new user settings
INSERT INTO user_settings (
    id, user_id,
    theme, language, font_size, high_contrast, reduced_motion,
    default_description_style, auto_save_descriptions, auto_save_vocabulary, auto_generate_qa,
    enable_notifications, email_notifications, push_notifications,
    reminder_frequency, reminder_time,
    profile_public, share_progress, data_collection,
    default_export_format, max_history_items, auto_backup, backup_frequency,
    daily_word_goal, weekly_session_goal, preferred_session_length,
    enable_experimental, enable_ai_suggestions, voice_enabled, offline_mode,
    settings_version, last_modified_by
) VALUES (
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000000', -- Template user ID
    'light', 'en', 'medium', false, false,
    'conversacional', true, true, true,
    true, false, true,
    'daily', '09:00:00',
    false, false, true,
    'json', 100, true, 'weekly',
    10, 5, 20,
    false, true, false, false,
    1, 'system'
);

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SEED DATA INSERTED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Vocabulary lists: 5';
    RAISE NOTICE 'Vocabulary items: 25+';
    RAISE NOTICE 'Sample images: 3';
    RAISE NOTICE 'Default settings: 1 template';
    RAISE NOTICE 'Ready for Spanish learning!';
    RAISE NOTICE '==============================================';
END $$;