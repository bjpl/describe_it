# VocabularyService Migration Guide

## Overview

This guide helps you migrate from the localStorage-backed vocabulary system to the new database-backed VocabularyService. This migration ensures data persistence, scalability, and better performance for vocabulary management.

## What's Changing

### Before (localStorage)
- Vocabulary data stored in browser localStorage
- Data limited to single browser/device
- No server-side validation or processing
- Limited query capabilities
- Risk of data loss on cache clear

### After (Supabase Database)
- Vocabulary data stored in Supabase PostgreSQL
- Data accessible across all devices
- Server-side validation and security
- Advanced querying and filtering
- Automatic backups and data recovery

## Breaking Changes

### 1. Data Structure Changes

**OLD (localStorage):**
```typescript
interface LocalVocabularyItem {
  id: string;
  word: string;
  translation: string;
  category: string;
}
```

**NEW (Database):**
```typescript
interface VocabularyItem {
  id: string;
  spanish_text: string;          // renamed from 'word'
  english_translation: string;    // renamed from 'translation'
  category: string;
  difficulty_level: number;       // NEW: 1-5 scale
  part_of_speech: string;        // NEW: noun, verb, etc.
  frequency_score: number;       // NEW: usage frequency
  context_sentence_spanish?: string;  // NEW
  context_sentence_english?: string;  // NEW
  created_at: string;
  updated_at?: string;
}
```

### 2. API Method Changes

**Renamed Methods:**
- `getVocabulary()` → `getAllVocabularyItems()`
- `addWord()` → `addVocabularyItem()`
- `updateWord()` → `updateVocabularyItem()`
- `deleteWord()` → `deleteVocabularyItem()`

**New Methods:**
- `getVocabularyItems(listId)` - Get items by list
- `getVocabularyLists()` - Get all vocabulary lists
- `createVocabularyList(data)` - Create new list
- `searchVocabulary(query)` - Full-text search

### 3. Return Type Changes

**Before:**
```typescript
// Synchronous, throws errors
const items = vocabularyService.getVocabulary();
```

**After:**
```typescript
// Asynchronous, returns null on error
const items = await vocabularyService.getAllVocabularyItems();
// Returns VocabularyItem[] or empty array on error
```

## Migration Steps

### Step 1: Export Existing Data

Before upgrading, export your existing localStorage vocabulary data:

```bash
# Run the migration export script
npm run migrate:export-vocabulary
```

Or manually in browser console:
```javascript
const existingData = localStorage.getItem('vocabulary_items');
console.log(existingData); // Copy this data
```

### Step 2: Install Dependencies

Ensure you have the latest dependencies:

```bash
npm install @supabase/supabase-js
npm install --save-dev @types/node
```

### Step 3: Configure Supabase

1. Set up Supabase project at https://supabase.com
2. Create environment variables:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run database migrations:

```bash
npm run migrate:db
```

### Step 4: Run Data Migration Script

Execute the migration script to transfer localStorage data to database:

```bash
# Migrate vocabulary data from localStorage to Supabase
node scripts/migrate-vocabulary-to-db.js
```

The script will:
- Read data from localStorage backup
- Transform data to new schema
- Validate all fields
- Batch insert to Supabase
- Provide detailed migration report

### Step 5: Update Code References

Update your code to use the new async API:

**Before:**
```typescript
import vocabularyService from '@/lib/services/vocabularyService';

// Synchronous usage
const items = vocabularyService.getVocabulary();
```

**After:**
```typescript
import { vocabularyService } from '@/lib/services/vocabularyService';

// Async usage with error handling
const items = await vocabularyService.getAllVocabularyItems();
if (!items.length) {
  console.error('Failed to load vocabulary');
}
```

### Step 6: Update Component Code

**Before:**
```typescript
const MyComponent = () => {
  const [vocab, setVocab] = useState([]);

  useEffect(() => {
    const data = vocabularyService.getVocabulary();
    setVocab(data);
  }, []);

  return <div>{vocab.map(...)}</div>;
};
```

**After:**
```typescript
const MyComponent = () => {
  const [vocab, setVocab] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVocabulary = async () => {
      setLoading(true);
      const data = await vocabularyService.getAllVocabularyItems();
      setVocab(data);
      setLoading(false);
    };

    loadVocabulary();
  }, []);

  if (loading) return <Spinner />;
  return <div>{vocab.map(...)}</div>;
};
```

### Step 7: Test Migration

Verify the migration was successful:

```bash
# Run test suite
npm run test:vocabulary

# Run integration tests
npm run test:integration
```

### Step 8: Cleanup

After confirming successful migration:

```bash
# Remove localStorage backups (optional)
node scripts/cleanup-local-storage.js
```

## Data Migration Script Details

The migration script (`scripts/migrate-vocabulary-to-db.js`) performs:

### Data Transformation

```typescript
// localStorage format → Database format
{
  id: "123",
  word: "casa",
  translation: "house",
  category: "home"
}
↓
{
  id: "123",
  spanish_text: "casa",
  english_translation: "house",
  category: "home",
  difficulty_level: 1,        // Auto-calculated
  part_of_speech: "noun",     // Auto-detected
  frequency_score: 95,        // From frequency database
  context_sentence_spanish: "", // Auto-generated
  context_sentence_english: "",
  created_at: new Date().toISOString()
}
```

### Validation Rules

1. **Required Fields:** spanish_text, english_translation, category
2. **Field Lengths:**
   - spanish_text: 1-100 characters
   - english_translation: 1-200 characters
   - category: Must be valid category enum
3. **Data Types:**
   - difficulty_level: 1-5
   - frequency_score: 0-100
   - part_of_speech: noun, verb, adjective, adverb, other

### Batch Processing

- Processes 100 items per batch
- Automatic retry on transient failures
- Progress reporting every 10%
- Detailed error logging

## Rollback Procedures

If you encounter issues and need to rollback:

### Option 1: Restore from localStorage Backup

```bash
# Restore from backup file
node scripts/restore-from-backup.js --file backup-YYYY-MM-DD.json
```

### Option 2: Revert Code Changes

```bash
# Checkout previous version
git checkout tags/v1.0.0 -- src/lib/services/vocabularyService.ts

# Reinstall dependencies
npm install
```

### Option 3: Database Rollback

```bash
# Rollback database migration
npm run migrate:rollback

# Or manually delete migrated data
psql -h your-db-host -U your-user -d your-db
> DELETE FROM vocabulary_items WHERE migrated_from = 'localStorage';
```

## Troubleshooting

### Issue: Migration Script Fails

**Symptoms:** Script exits with error
**Solutions:**
1. Check Supabase connection:
   ```bash
   node scripts/test-db-connection.js
   ```
2. Verify environment variables are set
3. Check localStorage backup file exists
4. Review error logs in `logs/migration-error.log`

### Issue: Data Missing After Migration

**Symptoms:** Some vocabulary items not appearing
**Solutions:**
1. Check migration report: `logs/migration-report.json`
2. Verify data transformation:
   ```bash
   node scripts/verify-migration.js
   ```
3. Check for validation errors in skipped items
4. Manually import skipped items

### Issue: Performance Degradation

**Symptoms:** Slow vocabulary loading
**Solutions:**
1. Check database indexes:
   ```sql
   CREATE INDEX idx_vocabulary_category ON vocabulary_items(category);
   CREATE INDEX idx_vocabulary_difficulty ON vocabulary_items(difficulty_level);
   ```
2. Enable query caching
3. Implement pagination for large datasets

### Issue: Duplicate Items

**Symptoms:** Same word appearing multiple times
**Solutions:**
1. Run deduplication script:
   ```bash
   node scripts/deduplicate-vocabulary.js
   ```
2. Check migration logs for duplicate IDs
3. Manually merge duplicates in database

## Verification Checklist

After migration, verify:

- [ ] All vocabulary items migrated (count matches)
- [ ] No data corruption (spot-check 10+ items)
- [ ] Search functionality works
- [ ] Filtering by category works
- [ ] User progress data preserved
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Mobile app syncs correctly
- [ ] Export/import still works
- [ ] Backup system functional

## Support

Need help with migration?

- **Documentation:** `/docs/api/VOCABULARY_SERVICE_API.md`
- **Developer Guide:** `/docs/development/VOCABULARY_SERVICE_GUIDE.md`
- **GitHub Issues:** https://github.com/your-org/describe-it/issues
- **Email Support:** support@example.com
- **Discord:** https://discord.gg/your-server

## Migration Timeline

Recommended migration schedule:

1. **Week 1:** Test migration on development environment
2. **Week 2:** Beta test with 10% of users
3. **Week 3:** Roll out to 50% of users
4. **Week 4:** Complete rollout to all users
5. **Week 5:** Monitor and address issues
6. **Week 6:** Remove old localStorage code

## Next Steps

After successful migration:

1. Review new VocabularyService features
2. Implement vocabulary lists feature
3. Set up automated backups
4. Configure monitoring and alerts
5. Train team on new API
6. Update user documentation

---

**Last Updated:** 2025-10-03
**Version:** 2.0.0
**Status:** Active
