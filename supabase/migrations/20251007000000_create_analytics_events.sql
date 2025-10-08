-- ==============================================
-- ANALYTICS EVENTS TABLE
-- ==============================================
-- Comprehensive event tracking for analytics, monitoring, and insights
-- Created: 2025-10-07
-- Purpose: Track user actions, sessions, features, and system events

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identification
  event_name TEXT NOT NULL,
  event_type TEXT DEFAULT 'custom',

  -- User identification (optional - some events may be anonymous)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_tier TEXT DEFAULT 'free',

  -- Session tracking
  session_id TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event metadata (flexible JSONB for any additional data)
  properties JSONB DEFAULT '{}'::jsonb,

  -- Context information
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  page_path TEXT,

  -- Error tracking (for error events)
  severity TEXT,
  error_message TEXT,
  error_stack TEXT,

  -- Performance tracking
  duration_ms INTEGER,

  -- Indexing for fast queries
  CONSTRAINT valid_event_name CHECK (event_name IS NOT NULL AND LENGTH(event_name) > 0),
  CONSTRAINT valid_user_tier CHECK (user_tier IN ('free', 'pro', 'enterprise', 'admin'))
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp
  ON analytics_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
  ON analytics_events(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
  ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
  ON analytics_events(session_id) WHERE session_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp
  ON analytics_events(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_timestamp
  ON analytics_events(event_name, timestamp DESC);

-- Error tracking index
CREATE INDEX IF NOT EXISTS idx_analytics_events_errors
  ON analytics_events(severity, timestamp DESC) WHERE severity IS NOT NULL;

-- Performance queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_duration
  ON analytics_events(duration_ms) WHERE duration_ms IS NOT NULL;

-- JSONB property indexes (for common queries)
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties_feature
  ON analytics_events USING gin ((properties->'featureName'));

CREATE INDEX IF NOT EXISTS idx_analytics_events_properties_action
  ON analytics_events USING gin ((properties->'action'));

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin policy: Full access for admin users
CREATE POLICY "Admins can manage all analytics events"
  ON analytics_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- User policy: Users can view their own events
CREATE POLICY "Users can view their own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert policy: Service can insert events
CREATE POLICY "Service can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anonymous events policy (for tracking before login)
CREATE POLICY "Anonymous events can be inserted"
  ON analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- ==============================================
-- HELPFUL VIEWS
-- ==============================================

-- Daily analytics summary
CREATE OR REPLACE VIEW daily_analytics_summary AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(*) FILTER (WHERE event_name = 'error_occurred') AS error_count,
  AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS avg_duration_ms
FROM analytics_events
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- Popular features view
CREATE OR REPLACE VIEW popular_features AS
SELECT
  properties->>'featureName' AS feature_name,
  COUNT(*) AS usage_count,
  COUNT(DISTINCT user_id) AS unique_users,
  AVG(duration_ms) AS avg_duration_ms
FROM analytics_events
WHERE event_name = 'feature_used'
  AND properties->>'featureName' IS NOT NULL
GROUP BY properties->>'featureName'
ORDER BY usage_count DESC;

-- Error summary view
CREATE OR REPLACE VIEW error_summary AS
SELECT
  severity,
  error_message,
  COUNT(*) AS occurrence_count,
  MAX(timestamp) AS last_occurred,
  COUNT(DISTINCT user_id) AS affected_users
FROM analytics_events
WHERE event_name = 'error_occurred'
  AND severity IS NOT NULL
GROUP BY severity, error_message
ORDER BY occurrence_count DESC;

-- ==============================================
-- DATA RETENTION POLICY
-- ==============================================

-- Function to clean up old analytics events (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_events
  WHERE timestamp < NOW() - INTERVAL '90 days'
    AND event_name NOT IN ('error_occurred', 'security_alert'); -- Keep errors and security events longer
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to track an event
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_event_name TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_properties JSONB DEFAULT '{}'::jsonb,
  p_user_tier TEXT DEFAULT 'free'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    event_name,
    user_id,
    session_id,
    properties,
    user_tier
  ) VALUES (
    p_event_name,
    p_user_id,
    p_session_id,
    p_properties,
    p_user_tier
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE analytics_events IS 'Stores all analytics events for tracking user behavior, features, errors, and performance';
COMMENT ON COLUMN analytics_events.event_name IS 'Name of the event (e.g., feature_used, error_occurred, learning_session_ended)';
COMMENT ON COLUMN analytics_events.properties IS 'Flexible JSONB field for event-specific metadata';
COMMENT ON COLUMN analytics_events.severity IS 'Error severity level for error events (error, warn, critical)';
COMMENT ON COLUMN analytics_events.duration_ms IS 'Duration in milliseconds for timed events';

-- ==============================================
-- SAMPLE EVENT TYPES
-- ==============================================
/*
Common event_name values:
- 'feature_used' - Feature usage tracking
- 'learning_session_started' - Session start
- 'learning_session_ended' - Session end (with duration)
- 'error_occurred' - Error/exception tracking
- 'api_request' - API endpoint calls
- 'page_view' - Page navigation
- 'user_login' - Authentication events
- 'user_logout' - Logout events
- 'export_completed' - Data export events
- 'settings_changed' - Settings modifications

Common properties fields:
{
  "featureName": "description_generator",
  "action": "generate",
  "sessionDuration": 1200000,
  "errorMessage": "API timeout",
  "endpoint": "/api/generate",
  "responseTime": 350
}
*/
