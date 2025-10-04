-- Analytics and Monitoring Tables for Describe It App
-- Run this script in your Supabase SQL editor

-- Create analytics_events table for storing all analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'premium', 'admin')),
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  properties JSONB DEFAULT '{}',
  
  -- Indexes for performance
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_tier ON analytics_events(user_tier);

-- Create GIN index for JSONB properties
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING GIN(properties);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_data ON analytics_events USING GIN(event_data);

-- Create system_alerts table for monitoring alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  event_data JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for system_alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_alert_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged ON system_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- Create performance_metrics table for detailed performance tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT DEFAULT 'ms',
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_route ON performance_metrics(route);

-- Create error_logs table for detailed error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_tier TEXT DEFAULT 'free',
  route TEXT,
  user_agent TEXT,
  component TEXT,
  recoverable BOOLEAN DEFAULT TRUE,
  sentry_event_id TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_route ON error_logs(route);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_sentry_event_id ON error_logs(sentry_event_id);

-- Create user_sessions table for session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_tier TEXT DEFAULT 'free',
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  learning_words_count INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  entry_page TEXT,
  exit_page TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ended_at ON user_sessions(ended_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_duration ON user_sessions(duration_seconds);

-- Create api_usage_logs table for API monitoring
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  api_key_used TEXT,
  rate_limited BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  request_headers JSONB,
  response_headers JSONB,
  request_body JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for api_usage_logs
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_method ON api_usage_logs(method);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_session_id ON api_usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_rate_limited ON api_usage_logs(rate_limited);

-- Create feature_usage_stats table for feature analytics
CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  user_tier TEXT DEFAULT 'free',
  success BOOLEAN DEFAULT TRUE,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for feature_usage_stats
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_name ON feature_usage_stats(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_action ON feature_usage_stats(action);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_session_id ON feature_usage_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_timestamp ON feature_usage_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_feature_usage_success ON feature_usage_stats(success);

-- Create RLS (Row Level Security) policies

-- Enable RLS on all tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_stats ENABLE ROW LEVEL SECURITY;

-- Admin access policies (full access for admin users)
CREATE POLICY "Admin full access" ON analytics_events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Admin full access" ON system_alerts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Admin full access" ON performance_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Admin full access" ON error_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Admin full access" ON user_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Admin full access" ON api_usage_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Admin full access" ON feature_usage_stats
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- User access policies (users can only see their own data)
CREATE POLICY "Users see own analytics" ON analytics_events
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users see own performance" ON performance_metrics
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users see own errors" ON error_logs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users see own sessions" ON user_sessions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users see own API usage" ON api_usage_logs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users see own feature usage" ON feature_usage_stats
FOR SELECT USING (user_id = auth.uid());

-- Insert policies for analytics (allow inserting analytics data)
CREATE POLICY "Allow analytics inserts" ON analytics_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow performance inserts" ON performance_metrics
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow error inserts" ON error_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow session inserts" ON user_sessions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow API log inserts" ON api_usage_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow feature usage inserts" ON feature_usage_stats
FOR INSERT WITH CHECK (true);

-- Create aggregated views for common queries

-- Daily analytics summary
CREATE OR REPLACE VIEW daily_analytics_summary AS
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE event_name = 'learning_session_started') as learning_sessions,
  COUNT(*) FILTER (WHERE event_name = 'vocabulary_learned') as words_learned,
  COUNT(*) FILTER (WHERE event_name = 'error_occurred') as errors,
  AVG(CASE WHEN event_name = 'learning_session_ended' 
           THEN (event_data->>'sessionDuration')::integer 
           END) as avg_session_duration
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Feature usage summary
CREATE OR REPLACE VIEW feature_usage_summary AS
SELECT 
  feature_name,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(duration_ms) as avg_duration_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
FROM feature_usage_stats
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY feature_name
ORDER BY usage_count DESC;

-- Error summary view
CREATE OR REPLACE VIEW error_summary AS
SELECT 
  error_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  severity,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_errors,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_errors
FROM error_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY error_type, severity
ORDER BY error_count DESC;

-- API performance summary
CREATE OR REPLACE VIEW api_performance_summary AS
SELECT 
  endpoint,
  method,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate,
  COUNT(*) FILTER (WHERE rate_limited) as rate_limited_count
FROM api_usage_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY endpoint, method
ORDER BY request_count DESC;

-- Grant access to views for authenticated users
GRANT SELECT ON daily_analytics_summary TO authenticated;
GRANT SELECT ON feature_usage_summary TO authenticated;
GRANT SELECT ON error_summary TO authenticated;
GRANT SELECT ON api_performance_summary TO authenticated;

-- Create a function to clean up old analytics data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_analytics(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_events 
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM performance_metrics 
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  DELETE FROM api_usage_logs 
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  DELETE FROM feature_usage_stats 
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Stores all analytics events from the application';
COMMENT ON TABLE system_alerts IS 'Stores system alerts and monitoring notifications';
COMMENT ON TABLE performance_metrics IS 'Stores detailed performance measurements';
COMMENT ON TABLE error_logs IS 'Stores detailed error information and stack traces';
COMMENT ON TABLE user_sessions IS 'Tracks user session information and behavior';
COMMENT ON TABLE api_usage_logs IS 'Logs all API requests for monitoring and rate limiting';
COMMENT ON TABLE feature_usage_stats IS 'Tracks usage statistics for application features';

COMMENT ON FUNCTION cleanup_old_analytics IS 'Removes analytics data older than specified days (default 90 days)';

-- Final success message
SELECT 'Analytics and monitoring tables created successfully!' as status;