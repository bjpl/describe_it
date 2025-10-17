# Known Issues

## Analytics Route - Missing Database Table (TypeScript Errors)

**File:** `src/app/api/admin/analytics/route.ts`

**Issue:** The analytics route attempts to query an `analytics_events` table that does not exist in the current Supabase database schema.

**TypeScript Errors:**
- Multiple `TS2769` errors: `analytics_events` is not assignable to valid table names
- Property access errors on unknown types due to missing table definition

**Root Cause:**
The database types in `src/types/supabase.ts` are generated from the actual Supabase schema, which currently includes these tables:
- users
- sessions
- images
- vocabulary_lists
- vocabulary_items
- learning_progress
- descriptions
- questions
- answers
- phrases

The `analytics_events` table is referenced in the code but not present in the schema.

**Resolution Options:**

1. **Add analytics_events table to Supabase schema** (Recommended)
   - Create table with appropriate columns (event_name, user_id, timestamp, metadata, etc.)
   - Run `supabase gen types typescript --project-id <id> > src/types/supabase.ts` to regenerate types
   - Analytics route will work correctly

2. **Refactor analytics to use existing tables**
   - Track analytics events in existing tables or use Supabase's built-in analytics
   - Update route to query appropriate existing tables

3. **Use Supabase Analytics or external service**
   - Leverage Supabase's built-in analytics features
   - Or integrate external analytics service (Mixpanel, Amplitude, etc.)

**Temporary Workaround:**
The route is currently non-functional for analytics_events queries. Other parts of the application work correctly.

**Priority:** Medium - Analytics functionality is important but not blocking core features

**Date Identified:** 2025-10-07
