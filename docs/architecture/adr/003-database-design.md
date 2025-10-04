# ADR-003: Database Design and Data Architecture

## Status
Accepted

## Date
2024-01-15

## Context

The Describe It application requires a robust database design to handle:

1. User authentication and profiles
2. Learning session management
3. AI-generated content storage (descriptions, Q&A, vocabulary)
4. Progress tracking and analytics
5. Real-time collaboration features
6. Data export functionality
7. Audit logging for security and compliance

We needed to design a schema that balances performance, scalability, data integrity, and ease of development.

## Decision

We decided to implement a PostgreSQL-based database design using Supabase with the following key principles:

### Database Choice: PostgreSQL via Supabase
- **PostgreSQL**: Robust, ACID-compliant relational database with JSON support
- **Supabase**: Managed PostgreSQL with built-in authentication, real-time features, and REST API
- **Row-Level Security (RLS)**: Built-in security at the database level
- **Real-time subscriptions**: Live updates for collaborative features

### Schema Design Philosophy
1. **Normalized Design**: Avoid data duplication while maintaining query performance
2. **Audit Trail**: Track all changes for analytics and debugging
3. **Soft Deletes**: Preserve data for analytics while respecting user privacy
4. **Extensible**: Schema can evolve with new features
5. **Performance**: Optimized indexes for common query patterns

## Database Schema

### Core Tables

#### 1. Users and Authentication
```sql
-- Extends Supabase auth.users
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'es' CHECK (preferred_language IN ('es', 'en')),
    difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- Preferences
    auto_translate BOOLEAN DEFAULT true,
    show_hints BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    
    -- Analytics
    total_sessions INTEGER DEFAULT 0,
    total_learning_time INTEGER DEFAULT 0, -- in seconds
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE USING (auth.uid() = id);
```

#### 2. Learning Sessions
```sql
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session data
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    
    -- Progress tracking
    total_descriptions INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    vocabulary_learned INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- in seconds
    
    -- Metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their own sessions" 
ON sessions USING (user_id = auth.uid());
```

#### 3. Images
```sql
CREATE TABLE images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Unsplash data
    unsplash_id TEXT UNIQUE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    download_url TEXT,
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    color TEXT, -- dominant color
    description TEXT,
    alt_description TEXT,
    tags TEXT[], -- array of tags
    
    -- Attribution
    photographer_name TEXT,
    photographer_username TEXT,
    photographer_profile_url TEXT,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

CREATE UNIQUE INDEX idx_images_unsplash_id ON images(unsplash_id);
CREATE INDEX idx_images_usage_count ON images(usage_count DESC);
CREATE INDEX idx_images_tags ON images USING GIN(tags);
```

#### 4. AI-Generated Descriptions
```sql
CREATE TABLE descriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('spanish', 'english')),
    style TEXT NOT NULL CHECK (style IN ('narrativo', 'poetico', 'academico', 'conversacional', 'infantil')),
    
    -- AI metadata
    ai_model TEXT, -- e.g., 'gpt-4-turbo-preview'
    ai_prompt TEXT,
    ai_response_time INTEGER, -- milliseconds
    ai_tokens_used INTEGER,
    ai_cost_usd DECIMAL(10,6),
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Quality metrics
    word_count INTEGER,
    reading_level TEXT, -- beginner, intermediate, advanced
    vocabulary_richness DECIMAL(3,2),
    
    -- Status
    is_favorite BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    quality_score DECIMAL(3,2), -- manual or automated quality assessment
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_descriptions_session_id ON descriptions(session_id);
CREATE INDEX idx_descriptions_user_id ON descriptions(user_id);
CREATE INDEX idx_descriptions_image_id ON descriptions(image_id);
CREATE INDEX idx_descriptions_language_style ON descriptions(language, style);
CREATE INDEX idx_descriptions_created_at ON descriptions(created_at DESC);

-- Enable RLS
ALTER TABLE descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can read published descriptions" 
ON descriptions FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create descriptions" 
ON descriptions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own descriptions" 
ON descriptions FOR UPDATE USING (user_id = auth.uid());
```

#### 5. Q&A Pairs
```sql
CREATE TABLE questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description_id UUID REFERENCES descriptions(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('es', 'en')),
    
    -- Classification
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT NOT NULL CHECK (category IN ('comprehension', 'vocabulary', 'grammar', 'culture')),
    question_type TEXT CHECK (question_type IN ('multiple_choice', 'open_ended', 'true_false', 'fill_blank')),
    
    -- Options for multiple choice
    options JSONB, -- ["option1", "option2", "option3", "option4"]
    correct_option INTEGER, -- index of correct option (0-based)
    
    -- AI metadata
    ai_model TEXT,
    confidence_score DECIMAL(3,2),
    
    -- User interaction
    times_answered INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    average_response_time INTEGER, -- milliseconds
    
    -- Quality
    quality_score DECIMAL(3,2),
    is_reviewed BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_questions_description_id ON questions(description_id);
CREATE INDEX idx_questions_session_id ON questions(session_id);
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_difficulty_category ON questions(difficulty, category);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access questions from their sessions" 
ON questions USING (user_id = auth.uid());
```

#### 6. Vocabulary Phrases
```sql
CREATE TABLE phrases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description_id UUID REFERENCES descriptions(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    text TEXT NOT NULL,
    translation TEXT,
    language TEXT NOT NULL CHECK (language IN ('es', 'en')),
    
    -- Classification
    category TEXT NOT NULL CHECK (category IN ('noun', 'verb', 'adjective', 'adverb', 'phrase', 'expression')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    context TEXT, -- where this phrase appeared
    
    -- Learning data
    confidence_score DECIMAL(3,2),
    frequency_score INTEGER DEFAULT 1, -- how often this phrase appears
    importance_score DECIMAL(3,2), -- educational importance
    
    -- Examples and usage
    examples JSONB, -- array of example sentences
    synonyms JSONB, -- array of synonyms
    related_phrases JSONB, -- array of related phrase IDs
    
    -- User progress
    times_encountered INTEGER DEFAULT 1,
    times_practiced INTEGER DEFAULT 0,
    mastery_level TEXT DEFAULT 'learning' CHECK (mastery_level IN ('learning', 'practicing', 'mastered')),
    last_practiced_at TIMESTAMP WITH TIME ZONE,
    
    -- AI metadata
    extracted_by TEXT, -- AI model that extracted this phrase
    
    -- Status
    is_bookmarked BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_phrases_description_id ON phrases(description_id);
CREATE INDEX idx_phrases_session_id ON phrases(session_id);
CREATE INDEX idx_phrases_user_id ON phrases(user_id);
CREATE INDEX idx_phrases_text ON phrases(text);
CREATE INDEX idx_phrases_category_difficulty ON phrases(category, difficulty);
CREATE INDEX idx_phrases_mastery_level ON phrases(mastery_level);

-- Full-text search index
CREATE INDEX idx_phrases_text_search ON phrases USING GIN(to_tsvector('spanish', text || ' ' || COALESCE(translation, '')));

-- Enable RLS
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own phrases" 
ON phrases USING (user_id = auth.uid());
```

#### 7. User Progress Tracking
```sql
CREATE TABLE user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Progress metrics
    descriptions_generated INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    vocabulary_learned INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- seconds
    
    -- Streaks and achievements
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    achievements JSONB DEFAULT '[]',
    
    -- Learning velocity
    avg_questions_per_session DECIMAL(5,2),
    avg_accuracy DECIMAL(3,2),
    avg_session_duration INTEGER, -- seconds
    
    -- Skills assessment
    reading_level TEXT CHECK (reading_level IN ('beginner', 'intermediate', 'advanced')),
    vocabulary_size INTEGER DEFAULT 0,
    grammar_level DECIMAL(3,2),
    comprehension_level DECIMAL(3,2),
    
    -- Adaptive learning
    preferred_difficulty TEXT,
    weak_categories JSONB, -- categories user struggles with
    strong_categories JSONB, -- categories user excels in
    
    -- Timestamps
    date DATE NOT NULL, -- for daily progress tracking
    week_start DATE, -- for weekly aggregations
    month_start DATE, -- for monthly aggregations
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date) -- one record per user per day
);

CREATE INDEX idx_user_progress_user_date ON user_progress(user_id, date DESC);
CREATE INDEX idx_user_progress_session_id ON user_progress(session_id);
CREATE INDEX idx_user_progress_week ON user_progress(week_start);
CREATE INDEX idx_user_progress_month ON user_progress(month_start);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own progress" 
ON user_progress USING (user_id = auth.uid());
```

#### 8. Export History
```sql
CREATE TABLE export_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Export details
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'json', 'csv')),
    format TEXT NOT NULL,
    file_size INTEGER, -- bytes
    download_url TEXT,
    
    -- Content included
    includes_images BOOLEAN DEFAULT true,
    includes_descriptions BOOLEAN DEFAULT true,
    includes_qa BOOLEAN DEFAULT true,
    includes_vocabulary BOOLEAN DEFAULT true,
    includes_progress BOOLEAN DEFAULT false,
    
    -- Status
    status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'expired')),
    error_message TEXT,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_export_history_session_id ON export_history(session_id);
CREATE INDEX idx_export_history_status ON export_history(status);
CREATE INDEX idx_export_history_expires_at ON export_history(expires_at);

-- Enable RLS
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own exports" 
ON export_history USING (user_id = auth.uid());
```

### Audit and Analytics Tables

#### 1. Activity Log
```sql
CREATE TABLE activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Activity details
    action TEXT NOT NULL, -- e.g., 'description_generated', 'question_answered', 'vocabulary_saved'
    resource_type TEXT, -- e.g., 'description', 'question', 'phrase'
    resource_id UUID,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    
    -- Metadata
    metadata JSONB,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_session_id ON activity_log(session_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_metadata ON activity_log USING GIN(metadata);
```

#### 2. Performance Metrics
```sql
CREATE TABLE performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Request details
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    
    -- Performance data
    response_time_ms INTEGER NOT NULL,
    ai_response_time_ms INTEGER,
    db_query_time_ms INTEGER,
    
    -- AI usage
    ai_model TEXT,
    ai_tokens_used INTEGER,
    ai_cost_usd DECIMAL(10,6),
    
    -- Error details
    error_type TEXT,
    error_message TEXT,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    ip_address INET,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX idx_performance_metrics_response_time ON performance_metrics(response_time_ms);
```

### Database Functions and Triggers

#### 1. Auto-update timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (apply to all relevant tables)
```

#### 2. Progress calculation
```sql
CREATE OR REPLACE FUNCTION calculate_session_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session progress when descriptions/questions/phrases are added
    UPDATE sessions 
    SET 
        total_descriptions = (SELECT COUNT(*) FROM descriptions WHERE session_id = NEW.session_id AND NOT is_deleted),
        total_questions = (SELECT COUNT(*) FROM questions WHERE session_id = NEW.session_id AND NOT is_deleted),
        vocabulary_learned = (SELECT COUNT(*) FROM phrases WHERE session_id = NEW.session_id AND NOT is_deleted),
        updated_at = NOW()
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_session_progress_descriptions
    AFTER INSERT OR DELETE ON descriptions
    FOR EACH ROW EXECUTE FUNCTION calculate_session_progress();

CREATE TRIGGER update_session_progress_questions
    AFTER INSERT OR DELETE ON questions
    FOR EACH ROW EXECUTE FUNCTION calculate_session_progress();

CREATE TRIGGER update_session_progress_phrases
    AFTER INSERT OR DELETE ON phrases
    FOR EACH ROW EXECUTE FUNCTION calculate_session_progress();
```

## Query Patterns and Optimization

### 1. Common Query Patterns
```sql
-- Get user's recent sessions with progress
SELECT 
    s.*,
    COUNT(d.id) as description_count,
    COUNT(q.id) as question_count,
    COUNT(p.id) as phrase_count
FROM sessions s
LEFT JOIN descriptions d ON s.id = d.session_id AND NOT d.is_deleted
LEFT JOIN questions q ON s.id = q.session_id AND NOT q.is_deleted
LEFT JOIN phrases p ON s.id = p.session_id AND NOT p.is_deleted
WHERE s.user_id = $1 AND NOT s.is_deleted
GROUP BY s.id
ORDER BY s.updated_at DESC
LIMIT 10;

-- Get vocabulary by mastery level
SELECT category, mastery_level, COUNT(*) as count
FROM phrases 
WHERE user_id = $1 AND NOT is_deleted
GROUP BY category, mastery_level
ORDER BY category, mastery_level;

-- Full-text search for vocabulary
SELECT *, ts_rank(to_tsvector('spanish', text || ' ' || COALESCE(translation, '')), plainto_tsquery('spanish', $2)) as rank
FROM phrases 
WHERE user_id = $1 
  AND NOT is_deleted
  AND to_tsvector('spanish', text || ' ' || COALESCE(translation, '')) @@ plainto_tsquery('spanish', $2)
ORDER BY rank DESC, created_at DESC;
```

### 2. Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_descriptions_user_session_created ON descriptions(user_id, session_id, created_at DESC);
CREATE INDEX idx_questions_session_difficulty ON questions(session_id, difficulty);
CREATE INDEX idx_phrases_user_mastery_category ON phrases(user_id, mastery_level, category);

-- Partial indexes for active records
CREATE INDEX idx_active_sessions ON sessions(user_id, updated_at DESC) WHERE NOT is_deleted AND status = 'active';
CREATE INDEX idx_public_descriptions ON descriptions(language, style, created_at DESC) WHERE is_public = true AND NOT is_deleted;
```

## Data Migration and Versioning

### 1. Migration Strategy
```sql
-- Migration versioning table
CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example migration
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
INSERT INTO schema_migrations (version) VALUES ('002_add_ai_metadata');
INSERT INTO schema_migrations (version) VALUES ('003_add_progress_tracking');
```

### 2. Backup Strategy
- **Daily**: Automated full database backup
- **Hourly**: Point-in-time recovery logs
- **Pre-deployment**: Manual backup before schema changes
- **Weekly**: Export to separate cloud storage

## Data Retention and Privacy

### 1. Data Retention Policies
```sql
-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_old_data()
RETURNS void AS $$
BEGIN
    -- Mark old sessions as deleted (1 year)
    UPDATE sessions 
    SET is_deleted = true 
    WHERE updated_at < NOW() - INTERVAL '1 year' 
      AND status = 'archived';
    
    -- Mark old activity logs for deletion (6 months)
    UPDATE activity_log 
    SET created_at = created_at -- placeholder for deletion flag
    WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ language 'plpgsql';

-- Schedule with pg_cron (if available)
SELECT cron.schedule('cleanup-old-data', '0 2 * * 0', 'SELECT soft_delete_old_data();');
```

### 2. GDPR Compliance
```sql
-- User data deletion function
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Anonymize user data instead of hard delete to preserve analytics
    UPDATE users SET 
        email = 'deleted_' || id::text || '@example.com',
        display_name = 'Deleted User',
        avatar_url = NULL
    WHERE id = target_user_id;
    
    -- Mark sessions as deleted
    UPDATE sessions SET is_deleted = true WHERE user_id = target_user_id;
    
    -- Mark content as deleted
    UPDATE descriptions SET is_deleted = true WHERE user_id = target_user_id;
    UPDATE questions SET is_deleted = true WHERE user_id = target_user_id;
    UPDATE phrases SET is_deleted = true WHERE user_id = target_user_id;
END;
$$ language 'plpgsql';
```

## Consequences

### Positive
1. **Data Integrity**: ACID compliance and foreign key constraints ensure consistency
2. **Security**: Row-level security provides granular access control
3. **Performance**: Optimized indexes for common query patterns
4. **Scalability**: Efficient schema design supports growth
5. **Analytics**: Rich data model enables detailed progress tracking
6. **Compliance**: GDPR-ready with soft deletes and data anonymization

### Negative
1. **Complexity**: Rich schema requires careful maintenance
2. **Storage**: Comprehensive audit logs increase storage requirements
3. **Migration**: Schema changes require careful planning
4. **Query Complexity**: Some analytics queries are complex

### Risks & Mitigations
1. **Data Loss**: Comprehensive backup strategy and soft deletes
2. **Performance**: Regular index optimization and query analysis
3. **Privacy**: Built-in RLS and GDPR compliance functions
4. **Scalability**: Monitoring and optimization strategies

## Future Considerations

1. **Sharding**: Consider partitioning large tables by user_id or date
2. **Read Replicas**: Separate read and write workloads for better performance
3. **Data Archiving**: Move old data to cheaper storage solutions
4. **Real-time Analytics**: Consider separate OLAP database for complex analytics

## Review Schedule

This database design will be reviewed:
- **Monthly**: Performance metrics and slow query analysis
- **Quarterly**: Storage growth and optimization opportunities
- **Semi-annually**: Schema evolution and new feature requirements
- **Annually**: Full architecture review and migration planning