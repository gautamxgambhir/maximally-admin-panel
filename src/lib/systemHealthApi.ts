/**
 * System Health API Functions
 * 
 * Provides API functions for querying system health data.
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { supabaseAdmin } from './supabase';
import type {
  SystemHealthOverview,
  SystemMetric,
  ErrorLogEntry,
  SystemHealthQueryParams,
  SystemMetricsTimeSeries,
  SystemMetricType,
  DEFAULT_SYSTEM_THRESHOLDS,
} from '@/types/systemHealth';
import {
  determineSystemHealthStatus,
  calculateErrorRate,
  calculateAverage,
  calculatePercentile,
  checkMetricsForAlerts,
  aggregateEndpointMetrics,
  groupMetricsToTimeSeries,
  calculateUptimePercentage,
  getMetricsTimeRange,
} from './systemHealthCore';

/**
 * Record a system metric
 * 
 * Requirement 12.1: Track API response times, error rates
 * 
 * @param metricType - Type of metric
 * @param metricName - Name of the metric
 * @param value - Metric value
 * @param metadata - Additional metadata
 */
export async function recordSystemMetric(
  metricType: SystemMetricType,
  metricName: string,
  value: number,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('system_metrics')
    .insert({
      metric_type: metricType,
      metric_name: metricName,
      value,
      metadata,
      recorded_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to record system metric:', error);
  }
}

/**
 * Record API response time metric
 * 
 * @param endpoint - API endpoint
 * @param method - HTTP method
 * @param responseTimeMs - Response time in milliseconds
 * @param isError - Whether the request resulted in an error
 * @param statusCode - HTTP status code
 */
export async function recordApiResponseTime(
  endpoint: string,
  method: string,
  responseTimeMs: number,
  isError: boolean = false,
  statusCode?: number
): Promise<void> {
  await recordSystemMetric(
    'api_response_time',
    `${method} ${endpoint}`,
    responseTimeMs,
    {
      endpoint,
      method,
      is_error: isError,
      status_code: statusCode,
    }
  );
}

/**
 * Record database query time metric
 * 
 * @param queryName - Name/description of the query
 * @param queryTimeMs - Query execution time in milliseconds
 * @param tableName - Table being queried
 */
export async function recordDatabaseQueryTime(
  queryName: string,
  queryTimeMs: number,
  tableName?: string
): Promise<void> {
  await recordSystemMetric(
    'database_query_time',
    queryName,
    queryTimeMs,
    {
      table_name: tableName,
    }
  );
}

/**
 * Get system health overview
 * 
 * Requirement 12.1: Display API response times, database query performance, and error rates
 * Requirement 12.2: Display alert banner when errors spike above threshold
 * 
 * GET /api/admin/system/health
 * 
 * @param params - Query parameters
 * @returns System health overview
 */
export async function getSystemHealthOverview(
  params: SystemHealthQueryParams = {}
): Promise<SystemHealthOverview> {
  const timeRange = params.time_range || '24h';
  const { start, end } = getMetricsTimeRange(timeRange);

  // Fetch all metrics in the time range
  const { data: metrics, error: metricsError } = await supabaseAdmin
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
    .order('recorded_at', { ascending: false });

  if (metricsError) {
    throw new Error(`Failed to fetch system metrics: ${metricsError.message}`);
  }

  const allMetrics = (metrics || []) as SystemMetric[];

  // Calculate response time metrics
  const responseTimeMetrics = allMetrics.filter(m => m.metric_type === 'api_response_time');
  const responseTimes = responseTimeMetrics.map(m => m.value);
  const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
  const avgResponseTime = calculateAverage(responseTimes);
  const p95ResponseTime = calculatePercentile(sortedResponseTimes, 95);

  // Calculate error rate
  const totalRequests = responseTimeMetrics.length;
  const errorCount = responseTimeMetrics.filter(m => m.metadata.is_error).length;
  const errorRate = calculateErrorRate(totalRequests, errorCount);

  // Calculate database query time
  const dbMetrics = allMetrics.filter(m => m.metric_type === 'database_query_time');
  const dbQueryTimes = dbMetrics.map(m => m.value);
  const avgDbQueryTime = calculateAverage(dbQueryTimes);

  // Get active connections (latest value)
  const connectionMetrics = allMetrics.filter(m => m.metric_type === 'active_connections');
  const activeConnections = connectionMetrics.length > 0 ? connectionMetrics[0].value : 0;

  // Determine health status
  const status = determineSystemHealthStatus(avgResponseTime, errorRate, avgDbQueryTime);

  // Calculate uptime
  const uptimePercentage = calculateUptimePercentage(allMetrics);

  // Generate alerts
  const alerts = checkMetricsForAlerts(avgResponseTime, errorRate, avgDbQueryTime);

  // Aggregate endpoint metrics if requested
  let endpoints: SystemHealthOverview['endpoints'] = [];
  if (params.include_endpoints !== false) {
    endpoints = aggregateEndpointMetrics(responseTimeMetrics);
  }

  // Get recent errors if requested
  let recentErrors: ErrorLogEntry[] = [];
  if (params.include_errors !== false) {
    recentErrors = await getRecentErrors(10);
  }

  return {
    status,
    uptime_percentage: uptimePercentage,
    last_check: new Date().toISOString(),
    metrics: {
      avg_response_time_ms: avgResponseTime,
      p95_response_time_ms: p95ResponseTime,
      error_rate: errorRate,
      active_connections: activeConnections,
      database_query_time_ms: avgDbQueryTime,
    },
    endpoints,
    recent_errors: recentErrors,
    alerts,
  };
}

/**
 * Get recent error logs
 * 
 * Requirement 12.3: Display recent errors with stack traces, affected users, and frequency
 * 
 * @param limit - Maximum number of errors to return
 * @returns Array of error log entries
 */
export async function getRecentErrors(limit: number = 20): Promise<ErrorLogEntry[]> {
  // Query error metrics from system_metrics
  const { data: errorMetrics, error } = await supabaseAdmin
    .from('system_metrics')
    .select('*')
    .eq('metric_type', 'error_rate')
    .order('recorded_at', { ascending: false })
    .limit(limit * 2);

  if (error) {
    console.error('Failed to fetch error logs:', error);
    return [];
  }

  // Also check for errors in API response metrics
  const { data: apiErrors } = await supabaseAdmin
    .from('system_metrics')
    .select('*')
    .eq('metric_type', 'api_response_time')
    .eq('metadata->>is_error', 'true')
    .order('recorded_at', { ascending: false })
    .limit(limit);

  // Aggregate errors by type
  const errorMap = new Map<string, ErrorLogEntry>();

  for (const metric of [...(errorMetrics || []), ...(apiErrors || [])]) {
    const errorType = (metric.metadata?.error_type as string) || 'unknown';
    const message = (metric.metadata?.message as string) || 'Unknown error';
    const key = `${errorType}:${message}`;

    const existing = errorMap.get(key);
    if (existing) {
      existing.frequency++;
      if (metric.recorded_at > existing.last_seen) {
        existing.last_seen = metric.recorded_at;
      }
      if (metric.recorded_at < existing.first_seen) {
        existing.first_seen = metric.recorded_at;
      }
    } else {
      errorMap.set(key, {
        id: metric.id,
        error_type: errorType,
        message,
        stack_trace: metric.metadata?.stack_trace as string,
        endpoint: metric.metadata?.endpoint as string,
        user_id: metric.metadata?.user_id as string,
        frequency: 1,
        first_seen: metric.recorded_at,
        last_seen: metric.recorded_at,
        metadata: metric.metadata || {},
      });
    }
  }

  return Array.from(errorMap.values())
    .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
    .slice(0, limit);
}

/**
 * Get system metrics time series
 * 
 * @param metricType - Type of metric to fetch
 * @param timeRange - Time range
 * @returns Time series data
 */
export async function getSystemMetricsTimeSeries(
  metricType: SystemMetricType,
  timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<SystemMetricsTimeSeries> {
  const { start, end } = getMetricsTimeRange(timeRange);

  const { data: metrics, error } = await supabaseAdmin
    .from('system_metrics')
    .select('*')
    .eq('metric_type', metricType)
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
    .order('recorded_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch metrics time series: ${error.message}`);
  }

  const allMetrics = (metrics || []) as SystemMetric[];
  const values = allMetrics.map(m => m.value);

  // Determine interval based on time range
  const intervalMinutes = timeRange === '1h' ? 1 : timeRange === '6h' ? 5 : timeRange === '24h' ? 15 : 60;

  return {
    metric_type: metricType,
    data: groupMetricsToTimeSeries(allMetrics, intervalMinutes),
    avg: calculateAverage(values),
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
  };
}

/**
 * Get slow endpoints
 * 
 * Requirement 12.4: Highlight slow queries and resource-intensive operations
 * 
 * @param thresholdMs - Response time threshold in ms
 * @param limit - Maximum number of endpoints to return
 * @returns Array of slow endpoints
 */
export async function getSlowEndpoints(
  thresholdMs: number = 1000,
  limit: number = 10
): Promise<SystemHealthOverview['endpoints']> {
  const { start, end } = getMetricsTimeRange('24h');

  const { data: metrics, error } = await supabaseAdmin
    .from('system_metrics')
    .select('*')
    .eq('metric_type', 'api_response_time')
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString());

  if (error) {
    throw new Error(`Failed to fetch slow endpoints: ${error.message}`);
  }

  const allMetrics = (metrics || []) as SystemMetric[];
  const endpoints = aggregateEndpointMetrics(allMetrics);

  return endpoints
    .filter(e => e.avg_response_time_ms >= thresholdMs)
    .sort((a, b) => b.avg_response_time_ms - a.avg_response_time_ms)
    .slice(0, limit);
}

/**
 * Get high error rate endpoints
 * 
 * @param thresholdPercent - Error rate threshold as percentage
 * @param limit - Maximum number of endpoints to return
 * @returns Array of high error rate endpoints
 */
export async function getHighErrorEndpoints(
  thresholdPercent: number = 5,
  limit: number = 10
): Promise<SystemHealthOverview['endpoints']> {
  const { start, end } = getMetricsTimeRange('24h');

  const { data: metrics, error } = await supabaseAdmin
    .from('system_metrics')
    .select('*')
    .eq('metric_type', 'api_response_time')
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString());

  if (error) {
    throw new Error(`Failed to fetch high error endpoints: ${error.message}`);
  }

  const allMetrics = (metrics || []) as SystemMetric[];
  const endpoints = aggregateEndpointMetrics(allMetrics);

  return endpoints
    .filter(e => e.error_rate >= thresholdPercent)
    .sort((a, b) => b.error_rate - a.error_rate)
    .slice(0, limit);
}

/**
 * Cleanup old system metrics
 * 
 * @param retentionDays - Number of days to retain metrics
 * @returns Number of deleted records
 */
export async function cleanupOldMetrics(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data, error } = await supabaseAdmin
    .from('system_metrics')
    .delete()
    .lt('recorded_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    throw new Error(`Failed to cleanup old metrics: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Get system health summary for dashboard
 * 
 * @returns Quick health summary
 */
export async function getSystemHealthSummary(): Promise<{
  status: SystemHealthOverview['status'];
  avgResponseTime: number;
  errorRate: number;
  alertCount: number;
}> {
  const overview = await getSystemHealthOverview({
    time_range: '1h',
    include_errors: false,
    include_endpoints: false,
  });

  return {
    status: overview.status,
    avgResponseTime: overview.metrics.avg_response_time_ms,
    errorRate: overview.metrics.error_rate,
    alertCount: overview.alerts.filter(a => !a.acknowledged).length,
  };
}
