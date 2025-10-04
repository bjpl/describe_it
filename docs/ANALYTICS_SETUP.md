# Analytics System Setup Guide

## Overview
The describe_it application includes a comprehensive analytics system for tracking user behavior, API usage, and system performance. This guide will help you set up the necessary database tables in Supabase.

## Current Status
✅ **Authentication System**: Working with rate limit fallback  
✅ **Analytics API**: Configured with graceful fallback  
✅ **localStorage Management**: Quota protection implemented  
⚠️ **Database Tables**: Need to be created in Supabase  

## Quick Setup

### Option 1: Automatic Setup (Recommended)
Run the setup script:
```bash
node scripts/setup-analytics-tables.js
```

### Option 2: Manual Setup via Supabase Dashboard

1. **Access your Supabase Dashboard**
   - Go to: https://arjrpdccaczbybbrchvc.supabase.com
   - Sign in with your credentials

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Copy and Run the Migration SQL**
   - Copy the entire contents of: `supabase/migrations/20250111_create_analytics_tables.sql`
   - Paste into the SQL editor
   - Click "Run" button

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see three new tables:
     - `analytics_events` - Stores all analytics events
     - `system_alerts` - Stores critical system alerts
     - `analytics_summary` - Stores aggregated daily metrics

## Table Structure

### analytics_events
Stores all user and system events:
- `id` - Unique identifier
- `event_name` - Type of event (e.g., 'user_login', 'api_request')
- `event_data` - Full event payload (JSONB)
- `session_id` - User session identifier
- `user_id` - Reference to authenticated user
- `timestamp` - When the event occurred
- `properties` - Additional event properties

### system_alerts
Tracks critical system issues:
- `id` - Unique identifier
- `alert_type` - Type of alert
- `message` - Alert description
- `severity` - low/medium/high/critical
- `resolved` - Whether alert is resolved
- `created_at` - When alert was triggered

### analytics_summary
Daily aggregated metrics:
- `date` - Date of the summary
- `event_name` - Type of event
- `count` - Total occurrences
- `unique_users` - Unique user count
- `unique_sessions` - Unique session count

## Features After Setup

Once the tables are created, you'll have:

1. **Event Tracking**
   - User behavior analytics
   - API usage monitoring
   - Performance metrics
   - Error tracking

2. **Real-time Alerts**
   - High error rate detection
   - Performance degradation alerts
   - Memory usage warnings
   - Critical error notifications

3. **Analytics Dashboard** (Future)
   - Daily/weekly/monthly summaries
   - User engagement metrics
   - API usage statistics
   - Performance trends

## Troubleshooting

### "Table does not exist" Error
**Solution**: Run the SQL migration in Supabase dashboard

### "Schema cache" Warning
**Solution**: This is normal - tables will work after creation

### "Quota exceeded" in localStorage
**Solution**: Already fixed with automatic cleanup

### Analytics API returns 500
**Solution**: Create tables using the migration SQL

## Testing Analytics

After setting up tables, test the system:

1. **Sign in to the application**
   - Analytics should track the login event

2. **Use various features**
   - Each interaction should generate events

3. **Check Supabase Dashboard**
   - Go to Table Editor > analytics_events
   - You should see recorded events

## Security Notes

The analytics system includes:
- Row Level Security (RLS) policies
- Service role access for API endpoints
- User privacy protection
- Automatic data cleanup (90-day retention)

## Next Steps

1. ✅ Create analytics tables in Supabase
2. ✅ Test event tracking
3. 📊 Future: Build analytics dashboard
4. 📈 Future: Add custom reports

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase credentials in `.env.local`
3. Ensure tables are created correctly
4. Test with the setup script

The system includes automatic fallbacks, so the application will continue working even if analytics setup is incomplete.