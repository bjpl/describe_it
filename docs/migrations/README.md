# Database Migration Guide

## Run migrations in this order:

1. **STEP-1-create-enums-only.sql** - Creates 12 ENUM types
2. **../safe-migration-001-complete.sql** - Creates all tables  
3. **../../supabase/migrations/002_seed_data.sql** - Sample data
4. **../../supabase/migrations/003_advanced_features.sql** - Advanced features
5. **../../supabase/migrations/20250111_create_analytics_tables.sql** - Analytics

## Current Error: "column spanish_level does not exist"

**This means:** You need to run STEP-1 first!

**Quick fix:** Run `STEP-1-create-enums-only.sql` in Supabase SQL Editor now.
