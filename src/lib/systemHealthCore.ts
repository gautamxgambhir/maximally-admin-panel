/**
 * System Health Core Functions
 * 
 * Pure functions for system health calculations and metrics processing.
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import type {
  SystemHealthStatus,
  SystemHealthOverview,
  SystemHealthAlert,
  SystemAlertType,
  SystemHealthThresholds,
  EndpointMetrics,
  MetricDataPoint,
  SystemMetric,
} from '@/types/systemHealth';
import { DEFAULT_SYSTEM_THRESHOLDS } from '@/types/systemHealth';

/**
 * Determine system health status based on metrics
 * 
 * Requirement 12.1: Display API response times, database query performance, and error rates
 * Requirement 12.4: Highlight slow queries and resource-intensive operations
 * 
 * @param avgResponseTime - Average API response time in ms
 * @param errorRate - Error rate as percentage
 * @param dbQueryTime - Average database query time in ms
 * @param thresholds - Threshold configuration
 * @returns System health status
 */
export function determineSystemHealthStatus(
  avgResponseTime: number,
  errorRate: number,
  dbQueryTime: number,
  thresholds: SystemHealthThresholds = DEFAULT_SYSTEM_THRESHOLDS
): SystemHealthStatus {
  // Critical if any metric exceeds critical threshold
  if (
    avgResponseTime >= thresholds.response_time_critical_ms ||
    errorRate >= thresholds.error_rate_critical_percent ||
    dbQueryTime >= thresholds.database_time_critical_ms
  ) {
    return 'critical';
  }

  // Degraded if any metric exceeds warning threshold
  if (
    avgResponseTime >= thresholds.response_time_warning_ms ||
    errorRate >= thresholds.error_rate_warning_percent ||
    dbQueryTime >= thresholds.database_time_warning_ms
  ) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Calculate error rate from request and error counts
 * 
 * @param totalRequests - Total number of requests
 * @param errorCount - Number of errors
 * @returns Error rate as percentage (0-100)
 */
export function calculateErrorRate(totalRequests: number, errorCount: number): number {
  if (totalRequests === 0) return 0;
  return (errorCount / totalRequests) * 100;
}

/**
 * Calculate percentile from sorted values
 * 
 * @param sortedValues - Array of values sorted in ascending order
 * @param percentile - Percentile to calculate (0-100)
 * @returns Percentile value
 */
export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Calculate average from values
 * 
 * @param values - Array of numeric values
 * @returns Average value
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Create a system health alert
 * 
 * Requirement 12.2: Display alert banner when errors spike above threshold
 * 
 * @param type - Alert type
 * @param severity - Alert severity
 * @param title - Alert title
 * @param message - Alert message
 * @param metric - Optional metric name
 * @param currentValue - Optional current value
 * @param threshold - Optional threshold value
 * @param affectedEndpoints - Optional affected endpoints
 * @returns System health alert
 */
export function createSystemAlert(
  type: SystemAlertType,
  severity: 'info' | 'warning' | 'critical',
  title: string,
  message: string,
  metric?: string,
  currentValue?: number,
  threshold?: number,
  affectedEndpoints?: string[]
): SystemHealthAlert {
  return {
    id: crypto.randomUUID(),
    type,
    severity,
    title,
    message,
    metric,
    current_value: currentValue,
    threshold,
    affected_endpoints: affectedEndpoints,
    detected_at: new Date().toISOString(),
    acknowledged: false,
  };
}

/**
 * Check metrics and generate alerts if thresholds exceeded
 * 
 * Requirement 12.2: Display alert banner when errors spike above threshold
 * Requirement 12.4: Highlight slow queries and resource-intensive operations
 * 
 * @param avgResponseTime - Average response time in ms
 * @param errorRate - Error rate as percentage
 * @param dbQueryTime - Database query time in ms
 * @param thresholds - Threshold configuration
 * @returns Array of alerts
 */
export function checkMetricsForAlerts(
  avgResponseTime: number,
  errorRate: number,
  dbQueryTime: number,
  thresholds: SystemHealthThresholds = DEFAULT_SYSTEM_THRESHOLDS
): SystemHealthAlert[] {
  const alerts: SystemHealthAlert[] = [];

  // Check error rate
  if (errorRate >= thresholds.error_rate_critical_percent) {
    alerts.push(createSystemAlert(
      'high_error_rate',
      'critical',
      'Critical Error Rate',
      `Error rate is at ${errorRate.toFixed(1)}%, exceeding the critical threshold of ${thresholds.error_rate_critical_percent}%`,
      'error_rate',
      errorRate,
      thresholds.error_rate_critical_percent
    ));
  } else if (errorRate >= thresholds.error_rate_warning_percent) {
    alerts.push(createSystemAlert(
      'high_error_rate',
      'warning',
      'Elevated Error Rate',
      `Error rate is at ${errorRate.toFixed(1)}%, exceeding the warning threshold of ${thresholds.error_rate_warning_percent}%`,
      'error_rate',
      errorRate,
      thresholds.error_rate_warning_percent
    ));
  }

  // Check response time
  if (avgResponseTime >= thresholds.response_time_critical_ms) {
    alerts.push(createSystemAlert(
      'slow_response_time',
      'critical',
      'Critical Response Time',
      `Average response time is ${avgResponseTime.toFixed(0)}ms, exceeding the critical threshold of ${thresholds.response_time_critical_ms}ms`,
      'response_time',
      avgResponseTime,
      thresholds.response_time_critical_ms
    ));
  } else if (avgResponseTime >= thresholds.response_time_warning_ms) {
    alerts.push(createSystemAlert(
      'slow_response_time',
      'warning',
      'Slow Response Time',
      `Average response time is ${avgResponseTime.toFixed(0)}ms, exceeding the warning threshold of ${thresholds.response_time_warning_ms}ms`,
      'response_time',
      avgResponseTime,
      thresholds.response_time_warning_ms
    ));
  }

  // Check database query time
  if (dbQueryTime >= thresholds.database_time_critical_ms) {
    alerts.push(createSystemAlert(
      'database_slow',
      'critical',
      'Critical Database Performance',
      `Database query time is ${dbQueryTime.toFixed(0)}ms, exceeding the critical threshold of ${thresholds.database_time_critical_ms}ms`,
      'database_time',
      dbQueryTime,
      thresholds.database_time_critical_ms
    ));
  } else if (dbQueryTime >= thresholds.database_time_warning_ms) {
    alerts.push(createSystemAlert(
      'database_slow',
      'warning',
      'Slow Database Queries',
      `Database query time is ${dbQueryTime.toFixed(0)}ms, exceeding the warning threshold of ${thresholds.database_time_warning_ms}ms`,
      'database_time',
      dbQueryTime,
      thresholds.database_time_warning_ms
    ));
  }

  return alerts;
}

/**
 * Aggregate metrics by endpoint
 * 
 * @param metrics - Array of system metrics
 * @returns Aggregated endpoint metrics
 */
export function aggregateEndpointMetrics(
  metrics: SystemMetric[]
): EndpointMetrics[] {
  const endpointMap = new Map<string, {
    responseTimes: number[];
    errorCount: number;
    requestCount: number;
    method: string;
  }>();

  for (const metric of metrics) {
    if (metric.metric_type !== 'api_response_time') continue;
    
    const endpoint = metric.metadata.endpoint as string || 'unknown';
    const method = metric.metadata.method as string || 'GET';
    const isError = metric.metadata.is_error as boolean || false;
    const key = `${method}:${endpoint}`;

    const existing = endpointMap.get(key) || {
      responseTimes: [],
      errorCount: 0,
      requestCount: 0,
      method,
    };

    existing.responseTimes.push(metric.value);
    existing.requestCount++;
    if (isError) existing.errorCount++;
    
    endpointMap.set(key, existing);
  }

  return Array.from(endpointMap.entries()).map(([key, data]) => {
    const [method, endpoint] = key.split(':');
    const sortedTimes = [...data.responseTimes].sort((a, b) => a - b);
    
    return {
      endpoint,
      method,
      avg_response_time_ms: calculateAverage(data.responseTimes),
      p95_response_time_ms: calculatePercentile(sortedTimes, 95),
      p99_response_time_ms: calculatePercentile(sortedTimes, 99),
      request_count: data.requestCount,
      error_count: data.errorCount,
      error_rate: calculateErrorRate(data.requestCount, data.errorCount),
    };
  });
}

/**
 * Group metrics into time series data points
 * 
 * @param metrics - Array of system metrics
 * @param intervalMinutes - Interval for grouping in minutes
 * @returns Array of data points
 */
export function groupMetricsToTimeSeries(
  metrics: SystemMetric[],
  intervalMinutes: number = 5
): MetricDataPoint[] {
  if (metrics.length === 0) return [];

  const buckets = new Map<string, number[]>();
  
  for (const metric of metrics) {
    const date = new Date(metric.recorded_at);
    // Round to interval
    const minutes = Math.floor(date.getMinutes() / intervalMinutes) * intervalMinutes;
    date.setMinutes(minutes, 0, 0);
    const key = date.toISOString();
    
    const existing = buckets.get(key) || [];
    existing.push(metric.value);
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries())
    .map(([timestamp, values]) => ({
      timestamp,
      value: calculateAverage(values),
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Calculate uptime percentage from metrics
 * 
 * @param metrics - Array of system metrics with health checks
 * @returns Uptime percentage (0-100)
 */
export function calculateUptimePercentage(metrics: SystemMetric[]): number {
  const healthChecks = metrics.filter(m => m.metric_name === 'health_check');
  if (healthChecks.length === 0) return 100; // Assume healthy if no data
  
  const successfulChecks = healthChecks.filter(m => m.value === 1).length;
  return (successfulChecks / healthChecks.length) * 100;
}

/**
 * Format response time for display
 * 
 * @param ms - Response time in milliseconds
 * @returns Formatted string
 */
export function formatResponseTime(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format error rate for display
 * 
 * @param rate - Error rate as percentage
 * @returns Formatted string
 */
export function formatErrorRate(rate: number): string {
  if (rate === 0) return '0%';
  if (rate < 0.01) return '<0.01%';
  if (rate < 1) return `${rate.toFixed(2)}%`;
  return `${rate.toFixed(1)}%`;
}

/**
 * Get status color class based on health status
 * 
 * @param status - System health status
 * @returns Tailwind color class
 */
export function getStatusColorClass(status: SystemHealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600 dark:text-green-400';
    case 'degraded':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'critical':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get status background class based on health status
 * 
 * @param status - System health status
 * @returns Tailwind background class
 */
export function getStatusBgClass(status: SystemHealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'degraded':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/30';
    default:
      return 'bg-muted';
  }
}

/**
 * Get time range boundaries for metrics query
 * 
 * @param timeRange - Time range option
 * @returns Start and end dates
 */
export function getMetricsTimeRange(
  timeRange: '1h' | '6h' | '24h' | '7d'
): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (timeRange) {
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }

  return { start, end };
}
