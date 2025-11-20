/**
 * Monitoring and analytics types
 */

import type { JsonValue, UnknownObject } from '../core/json-types';

/**
 * Monitoring and analytics types
 */
export interface MonitoringConfiguration {
  metrics: MetricsConfiguration;
  logging: LoggingConfiguration;
  tracing: TracingConfiguration;
  alerting: AlertingConfiguration;
}

export interface MetricsConfiguration {
  enabled: boolean;
  provider: 'prometheus' | 'datadog' | 'newrelic' | 'custom';
  collection_interval: number;
  retention_period: number;
  custom_metrics: CustomMetricDefinition[];
}

export interface CustomMetricDefinition {
  name: string;
  type: 'counter' | 'histogram' | 'gauge' | 'summary';
  description: string;
  labels: string[];
  buckets?: number[];
}

export interface LoggingConfiguration {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'remote';
  structured_logging: boolean;
  sensitive_field_masks: string[];
  retention_days: number;
}

export interface TracingConfiguration {
  enabled: boolean;
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'custom';
  sampling_rate: number;
  max_spans: number;
  export_batch_size: number;
  export_timeout: number;
}

export interface AlertingConfiguration {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  escalation_policies: EscalationPolicy[];
}

export interface AlertChannel {
  name: string;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  configuration: UnknownObject;
  enabled: boolean;
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  window: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  enabled: boolean;
}

export interface EscalationPolicy {
  name: string;
  steps: EscalationStep[];
  repeat_interval?: number;
}

export interface EscalationStep {
  delay: number;
  channels: string[];
  users?: string[];
  groups?: string[];
}

export interface MonitoringData {
  metrics: MetricData[];
  logs: LogEntry[];
  traces: TraceData[];
  alerts: AlertData[];
  health_checks: HealthCheckResult[];
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  labels: Record<string, string>;
  type: 'counter' | 'histogram' | 'gauge' | 'summary';
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  trace_id?: string;
  user_id?: string;
  request_id?: string;
  fields: UnknownObject;
}

export interface TraceData {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation_name: string;
  start_time: string;
  duration: number;
  status: 'ok' | 'error' | 'timeout';
  tags: Record<string, JsonValue>;
  logs: TraceLog[];
}

export interface TraceLog {
  timestamp: string;
  level: string;
  message: string;
  fields?: UnknownObject;
}

export interface AlertData {
  id: string;
  rule_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved';
  message: string;
  labels: Record<string, string>;
  started_at: string;
  resolved_at?: string;
  escalation_level: number;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time: number;
  timestamp: string;
  details?: UnknownObject;
  error?: string;
}
