/**
 * System Health Types for Admin Moderation System
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

/**
 * System health status
 */
export type SystemHealthStatus = 'healthy' | 'degraded' | 'critical';

/**
 * System metric type
 */
export type SystemMetricType = 
  | 'api_response_time'
  | 'error_rate'
  | 'database_query_time'
  | 'active_connections'
  | 'memory_usage'
  | 'cpu_usage';

/**
 * System metric record
 */
export interface SystemMetric {
  id: string;
  metric_type: SystemMetricType;
  metric_name: string;
  value: number;
  metadata: Record<string, unknown>;
  recorded_at: string;
}

/**
 * API endpoint health metrics
 */
export interface EndpointMetrics {
  endpoint: string;
  method: string;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  request_count: number;
  error_count: number;
  error_rate: number;
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  id: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  endpoint?: string;
  user_id?: string;
  frequency: number;
  first_seen: string;
  last_seen: string;
  metadata: Record<string, unknown>;
}

/**
 * System health overview
 * Requirement 12.1: Display API response times, database query performance, and error rates
 */
export interface SystemHealthOverview {
  status: SystemHealthStatus;
  uptime_percentage: number;
  last_check: string;
  metrics: {
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    error_rate: number;
    active_connections: number;
    database_query_time_ms: number;
  };
  endpoints: EndpointMetrics[];
  recent_errors: ErrorLogEntry[];
  alerts: SystemHealthAlert[];
}

/**
 * System health alert
 * Requirement 12.2: Display alert banner when errors spike above threshold
 */
export interface SystemHealthAlert {
  id: string;
  type: SystemAlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric?: string;
  current_value?: number;
  threshold?: number;
  affected_endpoints?: string[];
  detected_at: string;
  acknowledged: boolean;
}

/**
 * System alert types
 */
export type SystemAlertType =
  | 'high_error_rate'
  | 'slow_response_time'
  | 'database_slow'
  | 'high_memory'
  | 'connection_limit'
  | 'service_degradation';

/**
 * Time series metric data point
 */
export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

/**
 * System metrics time series
 */
export interface SystemMetricsTimeSeries {
  metric_type: SystemMetricType;
  data: MetricDataPoint[];
  avg: number;
  min: number;
  max: number;
}

/**
 * System health thresholds configuration
 */
export interface SystemHealthThresholds {
  response_time_warning_ms: number;
  response_time_critical_ms: number;
  error_rate_warning_percent: number;
  error_rate_critical_percent: number;
  database_time_warning_ms: number;
  database_time_critical_ms: number;
}

/**
 * Default system health thresholds
 */
export const DEFAULT_SYSTEM_THRESHOLDS: SystemHealthThresholds = {
  response_time_warning_ms: 1000,
  response_time_critical_ms: 3000,
  error_rate_warning_percent: 5,
  error_rate_critical_percent: 10,
  database_time_warning_ms: 500,
  database_time_critical_ms: 1500,
};

/**
 * System health query parameters
 */
export interface SystemHealthQueryParams {
  time_range?: '1h' | '6h' | '24h' | '7d';
  include_errors?: boolean;
  include_endpoints?: boolean;
}
