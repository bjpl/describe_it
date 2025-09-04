# Describe It - Supabase Database Schema

Complete database schema and integration for the Spanish learning application "Describe It".

## 📋 Overview

This database schema provides a comprehensive foundation for a Spanish learning application with the following key features:

- **User Management** - Complete user profiles with Spanish learning preferences
- **Session Tracking** - Detailed learning session analytics and progress tracking
- **Vocabulary System** - Hierarchical vocabulary management with advanced linguistic data
- **Progress Tracking** - Spaced repetition algorithm implementation (SM-2)
- **Q&A System** - Question generation and response tracking with feedback
- **Content Management** - AI-generated descriptions with metadata
- **Analytics** - Comprehensive learning analytics and insights
- **Settings Management** - User preferences and configuration

## 🗄️ Database Structure

### Core Tables

#### `users` - User Profiles
- Enhanced user profiles for Spanish learners
- Spanish proficiency levels (beginner, intermediate, advanced)
- Learning preferences and goals
- Authentication and profile completion tracking

#### `sessions` - Learning Sessions
- Detailed session tracking with metrics
- Engagement and completion rates
- Device and context information
- Performance analytics

#### `vocabulary_lists` - Vocabulary Collections
- Hierarchical vocabulary organization
- Public/private sharing capabilities
- Category-based organization
- Completion and mastery tracking

#### `vocabulary_items` - Individual Words/Phrases
- Comprehensive linguistic data for Spanish words
- IPA pronunciation, syllable count, stress patterns
- Gender, articles, plural forms, conjugation data
- Semantic relationships (synonyms, antonyms, word families)
- Learning aids (memory hints, cultural notes, false friends)
- Image associations and emoji representations

#### `learning_progress` - Individual Learning Tracking
- Spaced repetition implementation (SM-2 algorithm)
- Mastery levels and learning phases
- Error pattern analysis
- Adaptive difficulty adjustment
- Performance metrics and timing data

#### `qa_responses` - Question & Answer System
- Question generation and response tracking
- Similarity scoring and confidence levels
- Vocabulary and grammar concept mapping
- Detailed feedback and explanations
- Performance analytics

#### `saved_descriptions` - Content Management
- AI-generated image descriptions
- Multiple description styles support
- Content complexity and readability metrics
- User favorites and public sharing
- Quality ratings and issue reporting

#### `user_settings` - Comprehensive Preferences
- UI/UX preferences (theme, font, accessibility)
- Learning preferences and goals
- Notification and privacy settings
- Export and backup preferences
- Advanced feature toggles

### Analytics Tables

#### `user_interactions` - Interaction Tracking
- Detailed user interaction logging
- Component-level analytics
- Session context and metadata
- Performance monitoring

#### `learning_analytics` - Aggregated Analytics
- Daily/weekly/monthly learning metrics
- Progress tracking and goal achievement
- Performance trends and insights
- Streak tracking and gamification

### Supporting Tables

#### `images` - Image Metadata
- Processed image information
- Attribution and usage tracking
- Content suitability flags
- Quality and safety ratings

## 🏗️ Advanced Features

### Database Functions

#### Spaced Repetition
```sql
calculate_next_review(ease_factor, response_quality, interval_days)
```
Implements SM-2 algorithm for optimal learning scheduling.

#### User Analytics
```sql
calculate_user_streak(user_id)
get_vocabulary_due_for_review(user_id, limit)
recommend_difficulty_level(user_id, category)
```

#### Data Management
```sql
update_vocabulary_list_statistics(list_id)
cleanup_old_sessions()
export_user_data(user_id)
```

### Analytical Views

#### `user_learning_dashboard`
Comprehensive user learning overview with session stats, performance metrics, and goal tracking.

#### `vocabulary_learning_insights`
Vocabulary learning analytics with difficulty insights and common error patterns.

#### `session_analytics`
Session-level analytics with engagement metrics and performance trends.

### Performance Optimizations

- **35+ Indexes** for query optimization
- **Full-text search** for vocabulary items
- **JSONB indexes** for metadata queries
- **Composite indexes** for complex queries
- **Concurrent index creation** for zero-downtime deployment

### Security Features

- **Row Level Security (RLS)** on all user data
- **Comprehensive policies** for data access control
- **Audit logging** for sensitive operations
- **GDPR compliance** with data export functions
- **Input validation** and constraint checking

## 📁 File Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Core schema and tables
│   ├── 002_seed_data.sql         # Sample data and defaults
│   └── 003_advanced_features.sql # Functions, views, and optimizations
└── README.md                     # This file
```

## 🚀 Setup Instructions

### 1. Environment Variables

Ensure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Migration

Run the migrations in order:

```bash
# Using Supabase CLI
supabase db reset

# Or manually run each migration:
psql -f supabase/migrations/001_initial_schema.sql
psql -f supabase/migrations/002_seed_data.sql
psql -f supabase/migrations/003_advanced_features.sql
```

### 3. Verify Installation

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Check views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';
```

## 💻 Usage Examples

### Using the Database Service

```typescript
import { databaseService } from '@/lib/supabase';

// Create a new user
const userResult = await databaseService.createUser({
  email: 'student@example.com',
  spanish_level: 'beginner',
  target_words_per_day: 10
});

// Add vocabulary items
const vocabResult = await databaseService.addVocabularyItem({
  vocabulary_list_id: 'list-uuid',
  spanish_text: 'hola',
  english_translation: 'hello',
  part_of_speech: 'interjection',
  difficulty_level: 'beginner'
});

// Track learning progress
const progressResult = await databaseService.updateLearningProgress(
  'user-uuid',
  'vocab-item-uuid',
  {
    mastery_level: 75,
    learning_phase: 'review',
    confidence_score: 0.8
  }
);

// Get vocabulary due for review
const dueVocab = await databaseService.searchVocabulary(
  '',
  { userId: 'user-uuid' },
  { limit: 20 }
);
```

### Direct Database Queries

```typescript
import { supabase } from '@/lib/supabase';

// Get user dashboard data
const { data: dashboard } = await supabase
  .from('user_learning_dashboard')
  .select('*')
  .eq('user_id', userId)
  .single();

// Get vocabulary due for review
const { data: dueVocab } = await supabase
  .rpc('get_vocabulary_due_for_review', {
    user_id_param: userId,
    limit_items: 20
  });

// Calculate learning streak
const { data: streak } = await supabase
  .rpc('calculate_user_streak', {
    user_id_param: userId
  });
```

## 📊 Data Model Highlights

### Vocabulary System
- **Multi-level hierarchy**: Lists → Items → Progress
- **Rich linguistic data**: Gender, conjugations, phonetics
- **Semantic relationships**: Synonyms, antonyms, word families
- **Learning aids**: Memory hints, cultural notes, false friends

### Progress Tracking
- **Spaced repetition**: SM-2 algorithm implementation
- **Adaptive learning**: Dynamic difficulty adjustment
- **Error analysis**: Pattern recognition and feedback
- **Performance metrics**: Response time, accuracy, confidence

### Analytics & Insights
- **Real-time dashboards**: User progress and achievements
- **Learning analytics**: Session metrics and trends
- **Vocabulary insights**: Difficulty analysis and recommendations
- **Gamification**: Streaks, goals, and achievements

## 🔧 Maintenance

### Regular Tasks
- **Daily**: Analytics aggregation, cleanup old sessions
- **Weekly**: Vocabulary statistics update, user goal tracking
- **Monthly**: Performance analysis, capacity planning

### Monitoring
- **Connection metrics**: Pool usage, query performance
- **Error tracking**: Failed operations, retry patterns
- **Usage analytics**: Feature adoption, user engagement
- **Performance metrics**: Query times, cache hit rates

## 🛡️ Security & Privacy

### Data Protection
- **Row Level Security**: User data isolation
- **Audit logging**: Sensitive operation tracking
- **Data encryption**: At rest and in transit
- **GDPR compliance**: Data export and deletion

### Access Control
- **Role-based permissions**: User, admin, service roles
- **API key management**: Separate keys for different access levels
- **Rate limiting**: Protection against abuse
- **Input validation**: SQL injection prevention

## 📈 Scalability Considerations

### Performance
- **Optimized indexes**: Query-specific optimizations
- **Connection pooling**: Efficient resource usage
- **Caching strategy**: Intelligent query caching
- **Batch operations**: Efficient bulk data operations

### Growth Planning
- **Partitioning strategy**: Large table management
- **Archive policies**: Historical data management
- **Capacity monitoring**: Resource usage tracking
- **Scaling triggers**: Automated resource allocation

## 🤝 Contributing

When adding new features or modifying the schema:

1. **Create migration files** in sequential order
2. **Update TypeScript types** in `src/types/database.ts`
3. **Add service methods** in `src/lib/services/database.ts`
4. **Update documentation** in this README
5. **Add test cases** for new functionality

## 📝 License

This database schema is part of the Describe It Spanish Learning Application.

---

**Version**: 1.0.0  
**Last Updated**: 2024-09-04  
**Compatibility**: PostgreSQL 14+, Supabase