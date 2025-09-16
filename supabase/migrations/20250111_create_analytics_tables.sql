-- Create analytics_events table for storing all analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_tier VARCHAR(50) DEFAULT 'free',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Create system_alerts table for storing critical alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  event_data JSONB,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for system_alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_alert_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- Create analytics_summary table for aggregated metrics
CREATE TABLE IF NOT EXISTS analytics_summary (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  count BIGINT DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, event_name)
);

-- Create index for analytics_summary
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_event_name ON analytics_summary(event_name);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics_events
-- Allow service role full access
CREATE POLICY "Service role can do everything with analytics_events" ON analytics_events
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own events
CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Allow authenticated users to view their own events
CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Create policies for system_alerts
-- Only service role can manage alerts
CREATE POLICY "Service role can manage system_alerts" ON system_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Create policies for analytics_summary
-- Anyone can view summary data (public analytics)
CREATE POLICY "Public can view analytics_summary" ON analytics_summary
  FOR SELECT USING (true);

-- Only service role can update summary
CREATE POLICY "Service role can manage analytics_summary" ON analytics_summary
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update analytics_summary automatically
CREATE OR REPLACE FUNCTION update_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analytics_summary (date, event_name, count, unique_users, unique_sessions)
  VALUES (
    DATE(NEW.timestamp),
    NEW.event_name,
    1,
    CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (date, event_name)
  DO UPDATE SET
    count = analytics_summary.count + 1,
    unique_users = analytics_summary.unique_users + 
      CASE 
        WHEN NEW.user_id IS NOT NULL AND 
             NEW.user_id NOT IN (
               SELECT DISTINCT user_id 
               FROM analytics_events 
               WHERE date = DATE(NEW.timestamp) 
                 AND event_name = NEW.event_name 
                 AND user_id IS NOT NULL
             ) 
        THEN 1 
        ELSE 0 
      END,
    unique_sessions = analytics_summary.unique_sessions + 
      CASE 
        WHEN NEW.session_id NOT IN (
          SELECT DISTINCT session_id 
          FROM analytics_events 
          WHERE date = DATE(NEW.timestamp) 
            AND event_name = NEW.event_name
        ) 
        THEN 1 
        ELSE 0 
      END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic summary updates
CREATE TRIGGER analytics_summary_trigger
  AFTER INSERT ON analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_summary();

-- Create function to clean old analytics data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  -- Delete events older than 90 days
  DELETE FROM analytics_events 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete resolved alerts older than 30 days
  DELETE FROM system_alerts 
  WHERE resolved = true 
    AND resolved_at < NOW() - INTERVAL '30 days';
  
  -- Delete old summaries (keep last 180 days)
  DELETE FROM analytics_summary 
  WHERE date < CURRENT_DATE - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON system_alerts TO service_role;
GRANT ALL ON analytics_summary TO service_role;
GRANT SELECT ON analytics_summary TO anon;
GRANT INSERT, SELECT ON analytics_events TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON SEQUENCE analytics_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE analytics_events_id_seq TO service_role;
GRANT USAGE ON SEQUENCE system_alerts_id_seq TO service_role;
GRANT USAGE ON SEQUENCE analytics_summary_id_seq TO service_role;