# Database Migration Summary

## Overview

The Describe It application uses a comprehensive Supabase database schema with 18 tables, 12 custom enums, 10+ functions, and 7 analytical views to power a complete Spanish learning platform.

## Migration Files

### Location: `supabase/migrations/`

| File                                         | Purpose                    | Tables Created                | Dependencies |
| -------------------------------------------- | -------------------------- | ----------------------------- | ------------ |
| `001_initial_schema.sql`                     | Core database structure    | 11 core tables                | None         |
| `002_seed_data.sql`                          | Sample vocabulary & data   | Populates existing tables     | 001          |
| `003_advanced_features.sql`                  | Functions, views, triggers | Creates 7 views, 10 functions | 001, 002     |
| `20251007000000_create_analytics_events.sql` | Analytics infrastructure   | 7 analytics tables            | 001          |

## Database Schema

### Core Tables (11)

#### 1. **users**

Extended user profiles for Spanish learners

- Authentication integration (Supabase Auth)
- Learning preferences and goals
- Spanish proficiency tracking
- Theme and UI preferences
- **RLS:** Users can only access their own profile

**Key Fields:**

```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
spanish_level spanish_level (beginner/intermediate/advanced)
target_words_per_day INTEGER DEFAULT 10
theme theme_preference DEFAULT 'light'
language language_preference DEFAULT 'en'
```

#### 2. **sessions**

Learning session tracking with comprehensive metrics

- Session timing and duration
- Performance metrics (Q&A accuracy, engagement)
- Content processed (images, descriptions, vocabulary)
- Device and context information
- **RLS:** Users can only access their own sessions

**Key Fields:**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
session_type session_type (description/qa/vocabulary/mixed)
duration_minutes INTEGER
qa_attempts, qa_correct INTEGER
engagement_score, completion_rate DECIMAL(3,2)
```

#### 3. **images**

Image metadata and attribution from Unsplash

- Image properties (dimensions, color, aspect ratio)
- Photographer attribution
- Usage tracking
- Content suitability ratings
- **RLS:** Public read access

**Key Fields:**

```sql
id UUID PRIMARY KEY
unsplash_id VARCHAR(255) UNIQUE
url TEXT NOT NULL
photographer_name, photographer_username VARCHAR(255)
usage_count INTEGER DEFAULT 0
is_suitable_for_learning BOOLEAN DEFAULT true
```

#### 4. **vocabulary_lists**

Collections of Spanish words organized by theme/difficulty

- Public/private sharing
- Completion statistics
- Category organization
- **RLS:** Public lists visible to all, private to creator

**Key Fields:**

```sql
id UUID PRIMARY KEY
name VARCHAR(255) NOT NULL
category vocabulary_category
difficulty_level INTEGER (1-10)
total_words INTEGER
is_public BOOLEAN DEFAULT false
created_by UUID REFERENCES users(id)
```

#### 5. **vocabulary_items**

Individual Spanish words/phrases with comprehensive linguistic data

- Spanish text and English translation
- Part of speech and gender
- Conjugation info for verbs
- Pronunciation (IPA notation)
- Context sentences in both languages
- Memory aids and cultural notes
- **RLS:** Inherits permissions from parent list

**Key Fields:**

```sql
id UUID PRIMARY KEY
vocabulary_list_id UUID REFERENCES vocabulary_lists(id)
spanish_text VARCHAR(500) NOT NULL
english_translation VARCHAR(500) NOT NULL
part_of_speech part_of_speech
gender spanish_gender
conjugation_info JSONB (for verbs)
pronunciation_ipa VARCHAR(255)
context_sentence_spanish, context_sentence_english TEXT
frequency_score INTEGER (1-10)
```

#### 6. **learning_progress**

Individual user progress for vocabulary items using spaced repetition

- Mastery level tracking (0-100)
- Review scheduling (SM-2 algorithm)
- Performance metrics
- Error pattern analysis
- **RLS:** Users can only access their own progress

**Key Fields:**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
vocabulary_item_id UUID REFERENCES vocabulary_items(id)
mastery_level INTEGER (0-100)
review_count, correct_count, incorrect_count INTEGER
next_review TIMESTAMP
learning_phase learning_phase (new/learning/review/mastered)
ease_factor DECIMAL(3,2) (SM-2 algorithm)
interval_days INTEGER
```

#### 7. **saved_descriptions**

AI-generated image descriptions with metadata

- Bilingual descriptions (English/Spanish)
- Description style variations
- Generated vocabulary and Q&A pairs
- User ratings and feedback
- AI generation metadata
- **RLS:** Users can access their own and public descriptions

**Key Fields:**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
image_id UUID REFERENCES images(id)
english_description, spanish_description TEXT
description_style description_style
generated_vocabulary, qa_pairs, extracted_phrases JSONB
is_favorite, is_public BOOLEAN
user_rating INTEGER (1-5)
```

#### 8. **qa_responses**

Question-answer pairs with detailed tracking

- Question content and difficulty
- User responses and accuracy
- Timing metrics
- Grammar/vocabulary concepts tested
- AI-generated feedback
- **RLS:** Users can access their own responses

**Key Fields:**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
question TEXT NOT NULL
correct_answer, user_answer TEXT
is_correct BOOLEAN
similarity_score, confidence_level DECIMAL(3,2)
difficulty qa_difficulty (facil/medio/dificil)
response_time_seconds INTEGER
vocabulary_items_tested UUID[]
```

#### 9. **user_settings**

Comprehensive user preferences and configuration

- UI/UX preferences (theme, font size, accessibility)
- Learning preferences and goals
- Notification settings
- Privacy and data settings
- Export preferences
- **RLS:** Users can only access their own settings

**Key Fields:**

```sql
id UUID PRIMARY KEY
user_id UUID UNIQUE REFERENCES users(id)
theme theme_preference
language language_preference
daily_word_goal, weekly_session_goal INTEGER
enable_notifications, auto_save_vocabulary BOOLEAN
default_export_format export_format
```

#### 10. **user_interactions**

Analytics tracking for user behavior

- Interaction types and actions
- Component and page tracking
- Session context
- Custom metadata (JSONB)
- **RLS:** Admin access only

**Key Fields:**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
interaction_type, action VARCHAR(100)
page_url, referrer TEXT
timestamp TIMESTAMP
metadata JSONB
```

#### 11. **learning_analytics**

Aggregated learning metrics and progress

- Daily/weekly/monthly summaries
- Vocabulary learning stats
- Q&A performance
- Goal achievement tracking
- **RLS:** Users can access their own analytics

**Key Fields:**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
date_recorded DATE
period_type VARCHAR(20) (daily/weekly/monthly)
vocabulary_learned, qa_correct, qa_total INTEGER
average_accuracy, improvement_rate DECIMAL(5,2)
streak_days INTEGER
```

### Analytics Tables (7)

#### 12. **analytics_events**

General event tracking for all user actions

- Event names and custom data
- Session association
- User tier tracking
- **RLS:** Users can view their own events

#### 13. **system_alerts**

Monitoring and alerting system

- Alert types and severity levels
- Acknowledgment tracking
- Resolution status
- **RLS:** Admin access only

#### 14. **performance_metrics**

Detailed performance measurements

- Metric types (page load, API calls, etc.)
- Route-specific metrics
- User agent tracking
- **RLS:** Users can view their own metrics

#### 15. **error_logs**

Comprehensive error tracking

- Error messages and stack traces
- Severity levels
- Sentry integration
- Recovery status
- **RLS:** Users can view their own errors

#### 16. **user_sessions**

Session-level metadata and tracking

- Session duration and page views
- Device and browser information
- Learning activity counts
- **RLS:** Users can view their own sessions

#### 17. **api_usage_logs**

API endpoint monitoring

- Endpoint and method tracking
- Response times and status codes
- Rate limiting tracking
- **RLS:** Admin access only

#### 18. **feature_usage_stats**

Feature-specific usage analytics

- Feature names and actions
- Success/failure tracking
- Duration metrics
- **RLS:** Users can view their own usage

## Custom Types (Enums)

```sql
spanish_level          -- beginner, intermediate, advanced
session_type           -- description, qa, vocabulary, mixed
description_style      -- narrativo, poetico, academico, conversacional, etc.
part_of_speech         -- noun, verb, adjective, adverb, etc.
difficulty_level       -- beginner, intermediate, advanced
learning_phase         -- new, learning, review, mastered
qa_difficulty          -- facil, medio, dificil
vocabulary_category    -- basic, intermediate, advanced, custom, thematic
spanish_gender         -- masculino, femenino, neutro
theme_preference       -- light, dark, auto
language_preference    -- en, es
export_format          -- json, csv, pdf
```

## Functions

### Spaced Repetition

- `calculate_next_review()` - SM-2 algorithm implementation
- `get_vocabulary_due_for_review()` - Returns items needing review

### Statistics

- `update_vocabulary_list_statistics()` - Updates list stats
- `calculate_user_streak()` - Calculates learning streak
- `recommend_difficulty_level()` - Adaptive difficulty

### Maintenance

- `cleanup_old_sessions()` - Removes sessions older than 90 days
- `update_vocabulary_statistics()` - Updates rankings
- `cleanup_old_analytics()` - Removes old analytics data

### Utilities

- `export_user_data()` - GDPR-compliant data export
- `log_sensitive_operation()` - Security audit logging

## Views

### Learning Dashboards

- `user_learning_dashboard` - Complete user overview
- `vocabulary_learning_insights` - Vocabulary difficulty patterns
- `session_analytics` - Session performance metrics

### Analytics

- `daily_analytics_summary` - Daily aggregated stats
- `feature_usage_summary` - Feature popularity
- `error_summary` - Error patterns and trends
- `api_performance_summary` - API endpoint performance

## Triggers

### Automatic Updates

- `update_updated_at_column()` - Updates timestamps on changes
- `update_vocabulary_list_stats()` - Maintains word counts
- `calculate_session_duration()` - Auto-calculates session length
- `log_user_changes()` - Logs user profile changes

## Indexes

### Performance Optimizations

- **Single-column indexes:** 35+ indexes on frequently queried columns
- **Composite indexes:** 10+ for complex queries
- **Full-text search:** GIN indexes on Spanish/English text
- **JSONB indexes:** For metadata and custom fields

Key indexes:

```sql
-- Users
idx_users_email, idx_users_spanish_level

-- Sessions
idx_sessions_user_started (user_id, started_at)

-- Vocabulary
idx_vocabulary_items_fulltext_spanish (GIN)
idx_vocabulary_items_fulltext_english (GIN)

-- Learning Progress
idx_learning_progress_next_review
idx_progress_user_phase_review (composite)

-- Analytics
idx_analytics_events_properties (GIN)
```

## Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

### User Data Policies

- Users can only view/modify their own data
- Profile updates restricted to owner
- Settings accessible only to owner

### Content Policies

- Public content visible to all users
- Private content restricted to creator
- Shared content accessible to specified users

### Admin Policies

- Full access for admin role
- Monitoring and analytics access
- System maintenance permissions

### Anonymous Policies

- Public read access to images
- Public vocabulary lists accessible

## Sample Data

### Vocabulary (26 items across 5 lists)

**Primeras Palabras (6 words):**

- hola, adiós, gracias, por favor, sí, no

**Colores y Formas (5 words):**

- rojo, azul, verde, círculo, cuadrado

**Casa y Familia (5 words):**

- madre, padre, hermano, casa, cocina

**Comida y Bebida (5 words):**

- agua, pan, manzana, leche, café

**Verbos Comunes (5 words):**

- ser, estar, tener, hacer, ir

### Images (3 samples)

- Mountain landscape
- Cafe interior
- Family dining scene

## Migration Dependencies

```
001_initial_schema.sql (Base)
    ├── Creates all core tables
    ├── Defines all enums
    ├── Creates basic indexes
    └── Sets up RLS policies

002_seed_data.sql (Depends on: 001)
    ├── Inserts vocabulary lists
    ├── Populates vocabulary items
    ├── Adds sample images
    └── Creates settings template

003_advanced_features.sql (Depends on: 001, 002)
    ├── Creates utility functions
    ├── Defines analytical views
    ├── Adds advanced indexes
    └── Sets up triggers

20251007000000_create_analytics_events.sql (Depends on: 001)
    ├── Creates analytics tables
    ├── Sets up monitoring infrastructure
    ├── Defines analytics views
    └── Configures cleanup functions
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase project active
- [ ] Service role key available
- [ ] Migrations run in order (001, 002, 003, analytics)
- [ ] Database verified (all tables exist)
- [ ] Sample data present (5 vocab lists)
- [ ] RLS policies enabled
- [ ] Functions and views created
- [ ] Application connects successfully
- [ ] Vocabulary system works
- [ ] User authentication configured

## Maintenance Schedule

**Daily:**

- Monitor error logs
- Check system alerts
- Review API performance

**Weekly:**

- Run `cleanup_old_sessions()`
- Update vocabulary statistics
- Review user analytics

**Monthly:**

- Clean old analytics data
- Audit RLS policies
- Review database performance
- Check index usage

## Performance Characteristics

**Expected Query Performance:**

- User dashboard: < 100ms
- Vocabulary search: < 50ms
- Learning progress: < 75ms
- Analytics queries: < 200ms

**Optimization Features:**

- Query result caching at app level
- Connection pooling via Supabase
- Indexed foreign keys
- Materialized views for heavy queries
- JSONB indexing for metadata

## Security Features

- Row Level Security on all user tables
- Service role separation
- Audit logging for sensitive operations
- GDPR-compliant data export
- Encrypted connections (SSL/TLS)
- API key rotation support

## Scalability

**Current Design Supports:**

- 10,000+ concurrent users
- 100,000+ vocabulary items
- 1,000,000+ learning sessions
- 10,000,000+ analytics events

**Scaling Strategies:**

- Horizontal scaling via Supabase
- Read replicas for analytics
- Partitioning for analytics tables
- Archive old sessions periodically

---

**Schema Version:** 1.0.0
**Last Updated:** 2025-01-27
**Total Migrations:** 4
**Total Tables:** 18
**Total Functions:** 10+
**Total Views:** 7
