# Migration 001 Verification Checklist

Use this checklist to verify the migration was applied successfully.

---

## Pre-Migration Checklist

- [ ] **Backup Database** (recommended for production)
  ```bash
  # Via Supabase Dashboard: Settings > Database > Backup & Restore
  ```

- [ ] **Verify Prerequisites**
  - [ ] `setup-database.sql` applied (base tables exist)
  - [ ] `setup-supabase-tables.sql` applied (analytics tables exist)
  - [ ] Supabase connection working

- [ ] **Review Migration SQL**
  - [ ] Opened `001_create_missing_tables.sql`
  - [ ] Reviewed table definitions
  - [ ] Understood changes being made

---

## During Migration

- [ ] **Execute Migration**
  - [ ] Copied SQL to Supabase SQL Editor
  - [ ] Clicked "Run"
  - [ ] Waited for completion (15-30 seconds)

- [ ] **Check for Errors**
  - [ ] No red error messages
  - [ ] Success message displayed
  - [ ] Output shows "MIGRATION 001 COMPLETED SUCCESSFULLY!"

---

## Post-Migration Verification

### 1. Table Existence (Required)

- [ ] **Run Table Count Query**
  ```sql
  SELECT COUNT(*) as table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'images', 'descriptions', 'phrases', 'qa_items',
      'answer_validations', 'session_progress', 'qa_responses',
      'user_settings', 'user_preferences', 'user_data', 'image_history'
    );
  ```
  - [ ] Result: `table_count = 11` ✅

- [ ] **List All Tables**
  ```sql
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'images', 'descriptions', 'phrases', 'qa_items',
      'answer_validations', 'session_progress', 'qa_responses',
      'user_settings', 'user_preferences', 'user_data', 'image_history'
    )
  ORDER BY table_name;
  ```
  - [ ] All 11 tables listed ✅

### 2. RLS Policies (Required)

- [ ] **Check RLS Enabled**
  ```sql
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'images', 'descriptions', 'phrases', 'qa_items',
      'answer_validations', 'session_progress', 'qa_responses',
      'user_settings', 'user_preferences', 'user_data', 'image_history'
    )
  ORDER BY tablename;
  ```
  - [ ] All tables have `rowsecurity = true` ✅

- [ ] **Check Policy Count**
  ```sql
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE tablename IN (
    'images', 'descriptions', 'phrases', 'qa_items',
    'answer_validations', 'session_progress', 'qa_responses',
    'user_settings', 'user_preferences', 'user_data', 'image_history'
  )
  GROUP BY tablename
  ORDER BY tablename;
  ```
  - [ ] All tables have policies (count > 0) ✅

### 3. Indexes (Required)

- [ ] **Check Index Count**
  ```sql
  SELECT tablename, COUNT(*) as index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'images', 'descriptions', 'phrases', 'qa_items',
      'answer_validations', 'session_progress', 'qa_responses',
      'user_settings', 'user_preferences', 'user_data', 'image_history'
    )
  GROUP BY tablename
  ORDER BY tablename;
  ```
  - [ ] All tables have indexes ✅

### 4. Foreign Keys (Required)

- [ ] **Check Foreign Key Constraints**
  ```sql
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
      'images', 'descriptions', 'phrases', 'qa_items',
      'answer_validations', 'session_progress', 'qa_responses',
      'user_settings', 'user_preferences', 'user_data', 'image_history'
    )
  ORDER BY tc.table_name, kcu.column_name;
  ```
  - [ ] Foreign keys created correctly ✅

### 5. Views (Required)

- [ ] **Check Views Created**
  ```sql
  SELECT table_name
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('image_statistics', 'user_qa_performance')
  ORDER BY table_name;
  ```
  - [ ] Both views exist ✅

### 6. Triggers (Required)

- [ ] **Check Triggers Created**
  ```sql
  SELECT
    event_object_table as table_name,
    trigger_name
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table IN (
      'images', 'descriptions', 'phrases', 'qa_items',
      'session_progress', 'user_settings', 'user_preferences', 'user_data'
    )
  ORDER BY event_object_table;
  ```
  - [ ] `update_*_updated_at` triggers exist ✅

---

## Functional Testing

### 7. Basic CRUD Operations

- [ ] **Test Images Table**
  ```sql
  -- Insert test
  INSERT INTO public.images (source_url, alt_text, source_platform)
  VALUES ('https://test.com/test.jpg', 'Test image', 'unsplash')
  RETURNING *;
  ```
  - [ ] Insert successful ✅
  - [ ] `id` generated automatically ✅
  - [ ] `created_at` populated ✅

- [ ] **Test Descriptions Table**
  ```sql
  -- Insert test (use image_id from previous test)
  INSERT INTO public.descriptions (
    image_id,
    english_text,
    spanish_text
  )
  VALUES (
    '[image-id]',
    'Test description',
    'Descripción de prueba'
  )
  RETURNING *;
  ```
  - [ ] Insert successful ✅
  - [ ] Foreign key working ✅

- [ ] **Test QA Items Table**
  ```sql
  -- Insert test
  INSERT INTO public.qa_items (
    question,
    answer,
    difficulty,
    category
  )
  VALUES (
    '¿Qué es esto?',
    'Una prueba',
    'facil',
    'test'
  )
  RETURNING *;
  ```
  - [ ] Insert successful ✅
  - [ ] CHECK constraints working ✅

- [ ] **Cleanup Test Data**
  ```sql
  DELETE FROM public.images WHERE alt_text = 'Test image';
  ```
  - [ ] Delete successful ✅
  - [ ] CASCADE delete working ✅

### 8. Application Integration

- [ ] **Restart Application**
  ```bash
  npm run dev
  ```
  - [ ] Application starts without errors ✅

- [ ] **Test Image Features**
  - [ ] Search for images (no errors) ✅
  - [ ] Select an image (no errors) ✅
  - [ ] View image details (no errors) ✅

- [ ] **Test Description Features**
  - [ ] Generate description (no errors) ✅
  - [ ] Description saves to DB ✅
  - [ ] Can view saved descriptions ✅

- [ ] **Test Q&A Features**
  - [ ] Generate Q&A (no errors) ✅
  - [ ] Answer a question ✅
  - [ ] Validation works ✅

- [ ] **Check Browser Console**
  - [ ] No Supabase errors ✅
  - [ ] No database errors ✅

### 9. Database Verification

- [ ] **Check Data in Tables**
  ```sql
  -- Verify data created
  SELECT
    (SELECT COUNT(*) FROM public.images) as images,
    (SELECT COUNT(*) FROM public.descriptions) as descriptions,
    (SELECT COUNT(*) FROM public.qa_items) as qa_items,
    (SELECT COUNT(*) FROM public.answer_validations) as validations;
  ```
  - [ ] Data exists in tables ✅

- [ ] **Test Views**
  ```sql
  -- Test image_statistics view
  SELECT * FROM public.image_statistics LIMIT 5;

  -- Test user_qa_performance view
  SELECT * FROM public.user_qa_performance LIMIT 5;
  ```
  - [ ] Views return data (or empty if no data yet) ✅

---

## Performance Verification

### 10. Query Performance

- [ ] **Test Index Usage**
  ```sql
  -- Explain query to check index usage
  EXPLAIN ANALYZE
  SELECT * FROM public.images
  WHERE source_platform = 'unsplash'
  LIMIT 10;
  ```
  - [ ] Index scan used (not sequential scan) ✅

- [ ] **Test Full-Text Search**
  ```sql
  -- Test Spanish full-text search
  SELECT * FROM public.descriptions
  WHERE to_tsvector('spanish', spanish_text) @@ to_tsquery('spanish', 'hermosa')
  LIMIT 5;
  ```
  - [ ] Search works ✅
  - [ ] Results returned quickly ✅

### 11. RLS Performance

- [ ] **Test RLS Policies**
  ```sql
  -- Set user context (if testing with auth)
  SET request.jwt.claim.sub = '[user-id]';

  -- Query should only return user's data
  SELECT * FROM public.user_settings LIMIT 5;
  ```
  - [ ] RLS filtering works ✅
  - [ ] Performance acceptable ✅

---

## Documentation Verification

- [ ] **Documentation Files Exist**
  - [ ] `scripts/migrations/README.md` ✅
  - [ ] `scripts/migrations/MIGRATION_REPORT.md` ✅
  - [ ] `scripts/migrations/QUICK_START.md` ✅
  - [ ] `scripts/migrations/VERIFICATION_CHECKLIST.md` (this file) ✅

- [ ] **Migration Files Exist**
  - [ ] `scripts/migrations/001_create_missing_tables.sql` ✅
  - [ ] `scripts/migrations/001_create_missing_tables_rollback.sql` ✅

---

## Production Readiness

### 12. Final Checks

- [ ] **All Verifications Passed**
  - [ ] All checkboxes above marked ✅
  - [ ] No errors encountered
  - [ ] Application working correctly

- [ ] **Monitoring Setup** (if applicable)
  - [ ] Supabase logs being monitored
  - [ ] Error tracking configured
  - [ ] Performance metrics baseline recorded

- [ ] **Documentation Complete**
  - [ ] Team notified of migration
  - [ ] Migration documented in changelog
  - [ ] Rollback procedure understood

- [ ] **Backup Verified** (for production)
  - [ ] Database backup completed
  - [ ] Backup can be restored if needed
  - [ ] Recovery procedure tested

---

## Issue Resolution

### If Any Checks Fail

1. **Review Error Messages**
   - Check Supabase logs
   - Note exact error message
   - Search MIGRATION_REPORT.md for troubleshooting

2. **Common Solutions**
   - **Table exists error:** Migration already applied
   - **Permission error:** Check user permissions
   - **Foreign key error:** Check prerequisite migrations applied

3. **Rollback if Needed**
   - Run: `001_create_missing_tables_rollback.sql`
   - Review issue
   - Fix and retry migration

4. **Contact Support**
   - If issues persist, contact development team
   - Provide error messages and logs

---

## Sign-Off

**Migration Applied By:** _________________

**Date:** _________________

**Environment:** [ ] Development [ ] Staging [ ] Production

**All Checks Passed:** [ ] Yes [ ] No (explain below)

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Approved By:** _________________

**Date:** _________________

---

## Quick Summary

✅ **Success Criteria:**
- [ ] 11 tables created
- [ ] RLS policies active
- [ ] Indexes working
- [ ] Views created
- [ ] Foreign keys enforced
- [ ] Application working
- [ ] No errors in logs

❌ **Rollback if:**
- Any critical check fails
- Application breaks
- Data integrity issues
- Performance problems

---

**Last Updated:** 2025-10-03
**Migration Version:** 001
