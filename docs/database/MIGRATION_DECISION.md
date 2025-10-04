# Database Migration System Unification

## Decision Date: 2025-10-02

## Problem Statement
The project had duplicate migration systems:
- **Supabase migrations** in `/supabase/migrations/` (3 files + 1 analytics)
- **Application migrations** in `/src/lib/database/migrations/` (11 files)

This duplication created:
- Confusion about which system is authoritative
- Risk of schema drift between systems
- Maintenance overhead
- Potential deployment issues

## Analysis

### Supabase Migration System
**Location**: `/supabase/migrations/`

**Files**:
1. `001_initial_schema.sql` - Comprehensive schema with 11 tables, ENUMs, indexes, triggers, RLS policies
2. `002_seed_data.sql` - Sample vocabulary lists, images, default settings
3. `003_advanced_features.sql` - Functions, views, analytics, GDPR export
4. `20250111_create_analytics_tables.sql` - Additional analytics tables

**Strengths**:
- Complete, production-ready schema
- Proper RLS (Row Level Security) policies
- Advanced features (functions, views, triggers)
- GDPR compliance features
- Follows Supabase best practices
- Integrated with Supabase CLI and deployment
- Uses proper naming conventions

### Application Migration System
**Location**: `/src/lib/database/migrations/`

**Files**: 11 individual migration files (001-011)

**Strengths**:
- Granular migration history
- Individual table migrations
- Created earlier (August 31, 2024)

**Weaknesses**:
- No RLS policies
- Missing advanced features
- Not integrated with deployment
- Fragmented across many files

## Decision: Use Supabase as Canonical System

**Rationale**:
1. **Production Ready**: Supabase migrations include RLS, security, and advanced features
2. **Deployment Integration**: Supabase CLI automatically applies migrations on deploy
3. **Best Practices**: Follows PostgreSQL and Supabase conventions
4. **Completeness**: Includes all features from app migrations plus more
5. **Maintainability**: Fewer, well-organized files

## Migration Comparison Matrix

| Feature | Supabase | App Migrations |
|---------|----------|----------------|
| Tables | 11 tables | 11 tables |
| ENUMs | 13 ENUMs | Limited ENUMs |
| RLS Policies | 20+ policies | None |
| Functions | 10+ functions | 1 function |
| Views | 3 analytical views | None |
| Triggers | 6 triggers | 2 triggers |
| Indexes | 35+ indexes | Basic indexes |
| Seed Data | Yes | No |
| GDPR Export | Yes | No |
| Analytics | Yes | Basic |

## Implementation Plan

### Phase 1: Protect Test Routes (COMPLETED)
- Delete or protect all `/api/test*` and `/api/debug/*` routes
- Ensure they only work in development environment

### Phase 2: Archive Application Migrations
- Move `/src/lib/database/migrations/` to `/src/lib/database/migrations.archived/`
- Preserve historical record but prevent confusion
- Document why they were archived

### Phase 3: Document Canonical System
- Update documentation to reference Supabase migrations only
- Create migration guide for future schema changes
- Document how to run migrations locally and in production

### Phase 4: Remove Duplicate Code
- Remove any database client code that references old migrations
- Update any scripts that might run old migrations
- Clean up imports and references

## Migration Workflow Going Forward

### Development
```bash
# Create new migration
supabase migration new <migration_name>

# Apply migrations locally
supabase db reset
```

### Production
```bash
# Migrations apply automatically on deploy
supabase db push
```

### Rollback
```bash
# Rollback to specific migration
supabase db reset --db-url <database-url> --version <timestamp>
```

## Security Improvements from Unification

1. **Row Level Security (RLS)**: All tables have proper RLS policies
2. **Authentication**: Integrated with Supabase auth.uid()
3. **Data Privacy**: Users can only access their own data
4. **Audit Logging**: Sensitive operations are logged
5. **GDPR Compliance**: User data export function included

## Performance Improvements

1. **Advanced Indexes**: 35+ optimized indexes including:
   - Composite indexes for common queries
   - Full-text search indexes (GIN)
   - JSONB indexes for metadata queries
   - Partial indexes for filtered queries

2. **Materialized Views**: 3 analytical views for dashboards
3. **Optimized Functions**: Spaced repetition, statistics, recommendations

## Files Modified/Removed

### Test Routes Removed (9 files):
- `/src/app/api/test-images/route.ts`
- `/src/app/api/test-cors/route.ts`
- `/src/app/api/test-simple/route.ts`
- `/src/app/api/test/vision-direct/route.ts`
- `/src/app/api/test/vision/route.ts`
- `/src/app/api/test/verify-key/route.ts`
- `/src/app/api/debug/env/route.ts`
- `/src/app/api/debug/unsplash/route.ts`
- `/src/app/api/debug/auth/route.ts`

### Migrations Archived:
- `/src/lib/database/migrations/` → `/src/lib/database/migrations.archived/`

## Validation Steps

1. ✅ Verify Supabase migrations include all features from app migrations
2. ✅ Confirm RLS policies protect user data
3. ✅ Test migration application on clean database
4. ✅ Verify seed data populates correctly
5. ✅ Confirm functions and views work as expected

## Rollback Plan

If issues arise:
1. Restore archived migrations from `/src/lib/database/migrations.archived/`
2. Revert test route deletions from git history
3. Document specific issues encountered
4. Re-evaluate decision with new information

## Maintenance Guidelines

### Adding New Tables
1. Create migration in `/supabase/migrations/`
2. Include RLS policies from the start
3. Add appropriate indexes
4. Update documentation

### Modifying Existing Schema
1. Never modify existing migration files
2. Create new migration with changes
3. Test locally before deploying
4. Document breaking changes

### Data Migrations
1. Keep schema and data migrations separate
2. Use transactions for data integrity
3. Include rollback scripts
4. Test with production-like data

## References

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Conclusion

The Supabase migration system provides:
- **Better Security**: RLS, auth integration, audit logging
- **Better Performance**: Advanced indexes, views, functions
- **Better Maintainability**: Fewer files, clear organization
- **Better Integration**: CLI tooling, automatic deployment
- **Better Features**: Analytics, GDPR, spaced repetition

This unification eliminates confusion and establishes a clear, professional database architecture.
