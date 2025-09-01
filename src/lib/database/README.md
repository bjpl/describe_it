# Spanish Learning App Database Schema

This directory contains the complete Supabase database schema for the Spanish learning application with comprehensive migrations, TypeScript types, and utility functions.

## 🗃️ Database Structure

### Core Tables

1. **users** - Extended user profiles with learning preferences and statistics
2. **sessions** - Learning session tracking and analytics
3. **images** - Unsplash image metadata and usage statistics
4. **descriptions** - AI-generated Spanish descriptions with translations
5. **questions** - Interactive questions for learning assessment
6. **phrases** - Vocabulary and phrases extracted from descriptions
7. **user_progress** - Comprehensive learning analytics and progress tracking
8. **export_history** - Data export requests and download history

### Key Features

- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Comprehensive indexes** for optimal performance
- ✅ **Automated triggers** for statistics and validation
- ✅ **Foreign key relationships** with cascading deletes
- ✅ **Full-text search** capabilities
- ✅ **Audit logging** and data sanitization
- ✅ **Achievement system** and gamification
- ✅ **Progress analytics** and recommendations

## 🚀 Migration Files

Run migrations in order:

```bash
# 1. Core user management
001_create_users_table.sql

# 2. Learning sessions
002_create_sessions_table.sql

# 3. Image management
003_create_images_table.sql

# 4. Content generation
004_create_descriptions_table.sql

# 5. Interactive learning
005_create_questions_table.sql

# 6. Vocabulary extraction
006_create_phrases_table.sql

# 7. Analytics and progress
007_create_user_progress_table.sql

# 8. Data exports
008_create_export_history_table.sql

# 9. Performance optimization
009_create_additional_indexes.sql

# 10. Business logic
010_create_triggers_and_functions.sql
```

## 📊 Database Functions

### User Management
- `handle_new_user()` - Auto-create profiles on signup
- `update_user_stats_on_session_complete()` - Update points and streaks
- `check_achievements()` - Award achievements based on progress

### Session Management
- `calculate_session_stats()` - Auto-calculate duration and accuracy
- `validate_session_data()` - Ensure data integrity
- `batch_calculate_progress()` - Batch process daily/weekly stats

### Analytics & Progress
- `calculate_daily_progress()` - Generate daily progress reports
- `calculate_period_progress()` - Weekly/monthly aggregations
- `get_user_progress_summary()` - Comprehensive user analytics
- `generate_recommendations()` - Personalized learning suggestions

### Content Management
- `increment_image_usage()` - Track image usage statistics
- `extract_phrases_from_description()` - Auto-extract vocabulary
- `get_user_vocabulary_stats()` - Vocabulary mastery tracking

### Data Export
- `request_data_export()` - Initiate user data exports
- `cleanup_expired_exports()` - Automatic cleanup of old exports
- `get_exportable_data_info()` - Estimate export sizes

## 🔧 TypeScript Integration

### Database Types
```typescript
import { Database, Tables, TablesInsert } from '@/types/database'

// Type-safe database operations
const user: Tables<'users'> = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
```

### Service Classes
```typescript
import { userService, sessionService } from '@/lib/database/utils'

// High-level operations
const userWithProgress = await userService.getUserWithProgress(userId)
const session = await sessionService.startSession(userId, 'practice')
```

## 🎯 Key Design Decisions

### Security
- All tables use Row Level Security (RLS)
- Users can only access their own data
- Admin functions require special permissions
- Input sanitization prevents XSS attacks

### Performance
- Strategic indexing on frequently queried columns
- Composite indexes for complex analytics queries
- GIN indexes for full-text search and arrays
- Covering indexes to avoid table lookups

### Data Integrity
- Comprehensive foreign key relationships
- Check constraints on numeric ranges
- Triggers for automatic calculations
- Audit logging for sensitive operations

### Scalability
- Partitioning-ready temporal indexes
- Efficient cleanup functions for old data
- Batch processing capabilities
- Optimized query patterns

## 📈 Analytics Capabilities

### User Progress Tracking
- Daily, weekly, and monthly progress aggregation
- Skill-specific performance metrics
- Learning consistency scoring
- Achievement and milestone tracking

### Content Analytics
- Image usage and success rate tracking
- Description difficulty and quality scoring
- Question performance by type and difficulty
- Vocabulary mastery progression

### System Analytics
- User engagement and retention metrics
- Content effectiveness analysis
- Performance bottleneck identification
- Export and data usage tracking

## 🔒 Data Privacy & Export

### GDPR Compliance
- Complete user data export functionality
- Data retention policies with automatic cleanup
- Privacy settings and data sharing controls
- Audit trails for data access and modifications

### Export Features
- Multiple formats (JSON, CSV, PDF, Excel)
- Configurable data inclusion settings
- Secure download links with expiration
- Export history and download tracking

## 🛠️ Usage Examples

### Starting a Learning Session
```sql
-- Start session
INSERT INTO sessions (user_id, session_type) 
VALUES ('user-uuid', 'practice');

-- Add description
INSERT INTO descriptions (session_id, image_id, user_id, spanish_text, english_translation, style)
VALUES ('session-uuid', 'image-uuid', 'user-uuid', 'Spanish text', 'English translation', 'simple');

-- Generate questions
SELECT generate_questions_for_description('description-uuid', 'session-uuid', 'user-uuid', 3);
```

### Progress Analytics
```sql
-- Daily progress calculation
SELECT calculate_daily_progress('user-uuid');

-- Get user analytics
SELECT * FROM get_user_progress_summary('user-uuid', 30);

-- Achievement check
SELECT check_achievements('user-uuid');
```

### Data Export
```sql
-- Request export
SELECT request_data_export('user-uuid', 'vocabulary', 'json');

-- Check export status
SELECT * FROM export_history WHERE user_id = 'user-uuid' ORDER BY created_at DESC;
```

## 🔧 Maintenance

### Regular Tasks
- Run `cleanup_old_data()` weekly
- Execute `batch_calculate_progress()` daily
- Monitor index usage and performance
- Review and archive old export files

### Performance Monitoring
- Query execution time analysis
- Index effectiveness review
- Storage usage optimization
- Connection pool monitoring

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Cross-region replication for critical data
- Regular restore testing procedures

## 📝 Development Notes

- All migrations are idempotent and can be safely re-run
- Functions use `SECURITY DEFINER` for elevated permissions where needed
- Triggers are designed to be efficient and avoid cascading issues
- RLS policies are thoroughly tested for security vulnerabilities
- Full-text search supports both Spanish and English content