/**
 * Analytics Core Functions
 * 
 * Pure functions for analytics calculations and data processing.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import type {
  TimeSeriesDataPoint,
  PeriodComparison,
  AnalyticsTimeRange,
  TimeSeriesGranularity,
  AnalyticsAlert,
  AlertType,
  AlertSeverity,
  DashboardMetrics,
  SystemHealthStatus,
  MetricCardConfig,
  AlertThresholdConfig,
} from '@/types/analytics';

/**
 * Calculate period comparison between current and previous values
 * 
 * Property 15: Period Comparison Accuracy
 * For any metric comparison between periods, the percentage change SHALL be
 * calculated as ((current - previous) / previous) * 100.
 * 
 * Validates: Requirements 8.4
 * 
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Period comparison result
 */
export function calculatePeriodComparison(
  current: number,
  previous: number
): PeriodComparison {
  const change = current - previous;
  
  // Handle division by zero - if previous is 0, percentage change is undefined
  // We use 0 as a fallback, but could also use Infinity or a special value
  let percentageChange: number;
  if (previous === 0) {
    percentageChange = current === 0 ? 0 : (current > 0 ? 100 : -100);
  } else {
    percentageChange = ((current - previous) / previous) * 100;
  }

  // Determine trend - use strict comparison
  let trend: 'up' | 'down' | 'stable';
  if (change > 0) {
    trend = 'up';
  } else if (change < 0) {
    trend = 'down';
  } else {
    trend = 'stable';
  }

  return {
    current,
    previous,
    change,
    percentageChange,
    trend,
  };
}

/**
 * Verify period comparison accuracy
 * 
 * Property 15: Period Comparison Accuracy
 * Validates that the percentage change is correctly calculated.
 * 
 * @param comparison - The period comparison to verify
 * @returns True if the calculation is accurate
 */
export function verifyPeriodComparisonAccuracy(
  comparison: PeriodComparison
): boolean {
  const { current, previous, change, percentageChange } = comparison;
  
  // Verify change calculation
  if (Math.abs(change - (current - previous)) > 0.0001) {
    return false;
  }

  // Verify percentage change calculation
  if (previous === 0) {
    // Special case: when previous is 0
    if (current === 0 && percentageChange !== 0) return false;
    if (current > 0 && percentageChange !== 100) return false;
    if (current < 0 && percentageChange !== -100) return false;
  } else {
    const expectedPercentage = ((current - previous) / previous) * 100;
    if (Math.abs(percentageChange - expectedPercentage) > 0.0001) {
      return false;
    }
  }

  return true;
}

/**
 * Get time range boundaries
 * 
 * @param timeRange - The time range option
 * @param customFrom - Custom start date (for 'custom' range)
 * @param customTo - Custom end date (for 'custom' range)
 * @returns Start and end dates for the range
 */
export function getTimeRangeBoundaries(
  timeRange: AnalyticsTimeRange,
  customFrom?: string,
  customTo?: string
): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (timeRange) {
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      start = customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (customTo) {
        end.setTime(new Date(customTo).getTime());
      }
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

/**
 * Get previous period boundaries for comparison
 * 
 * @param start - Current period start
 * @param end - Current period end
 * @returns Previous period start and end dates
 */
export function getPreviousPeriodBoundaries(
  start: Date,
  end: Date
): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: new Date(start.getTime()),
  };
}

/**
 * Determine appropriate granularity for time range
 * 
 * @param timeRange - The time range
 * @returns Appropriate granularity
 */
export function getGranularityForTimeRange(
  timeRange: AnalyticsTimeRange
): TimeSeriesGranularity {
  switch (timeRange) {
    case '24h':
      return 'hour';
    case '7d':
      return 'day';
    case '30d':
      return 'day';
    case '90d':
      return 'week';
    case '1y':
      return 'month';
    default:
      return 'day';
  }
}

/**
 * Group data points by granularity
 * 
 * @param data - Array of items with created_at timestamps
 * @param granularity - The grouping granularity
 * @param start - Start date
 * @param end - End date
 * @returns Time series data points
 */
export function groupByGranularity<T extends { created_at: string }>(
  data: T[],
  granularity: TimeSeriesGranularity,
  start: Date,
  end: Date
): TimeSeriesDataPoint[] {
  const buckets = new Map<string, number>();
  
  // Initialize buckets
  const current = new Date(start);
  while (current <= end) {
    const key = formatDateKey(current, granularity);
    buckets.set(key, 0);
    incrementDate(current, granularity);
  }

  // Count items in each bucket
  for (const item of data) {
    const date = new Date(item.created_at);
    const key = formatDateKey(date, granularity);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  // Convert to array
  return Array.from(buckets.entries()).map(([date, value]) => ({
    date,
    value,
  }));
}

/**
 * Format date as bucket key based on granularity
 */
function formatDateKey(date: Date, granularity: TimeSeriesGranularity): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');

  switch (granularity) {
    case 'hour':
      return `${year}-${month}-${day}T${hour}:00`;
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week':
      // Get start of week (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    case 'month':
      return `${year}-${month}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Increment date by granularity
 */
function incrementDate(date: Date, granularity: TimeSeriesGranularity): void {
  switch (granularity) {
    case 'hour':
      date.setHours(date.getHours() + 1);
      break;
    case 'day':
      date.setDate(date.getDate() + 1);
      break;
    case 'week':
      date.setDate(date.getDate() + 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() + 1);
      break;
  }
}

/**
 * Merge current and previous period data for comparison
 * 
 * @param current - Current period data points
 * @param previous - Previous period data points
 * @returns Merged data points with previousValue
 */
export function mergeTimeSeriesForComparison(
  current: TimeSeriesDataPoint[],
  previous: TimeSeriesDataPoint[]
): TimeSeriesDataPoint[] {
  return current.map((point, index) => ({
    ...point,
    previousValue: previous[index]?.value,
  }));
}

/**
 * Calculate total from time series data
 * 
 * @param data - Time series data points
 * @returns Total value
 */
export function calculateTimeSeriesTotal(data: TimeSeriesDataPoint[]): number {
  return data.reduce((sum, point) => sum + point.value, 0);
}

/**
 * Detect anomalies in time series data
 * 
 * @param data - Time series data points
 * @param threshold - Standard deviations for anomaly detection
 * @returns Indices of anomalous points
 */
export function detectTimeSeriesAnomalies(
  data: TimeSeriesDataPoint[],
  threshold: number = 2
): number[] {
  if (data.length < 3) return [];

  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return [];

  const anomalies: number[] = [];
  values.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push(index);
    }
  });

  return anomalies;
}

/**
 * Create an analytics alert
 * 
 * @param type - Alert type
 * @param severity - Alert severity
 * @param title - Alert title
 * @param message - Alert message
 * @param metric - Optional metric name
 * @param currentValue - Optional current value
 * @param threshold - Optional threshold value
 * @returns Analytics alert
 */
export function createAlert(
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  metric?: string,
  currentValue?: number,
  threshold?: number
): AnalyticsAlert {
  return {
    id: crypto.randomUUID(),
    type,
    severity,
    title,
    message,
    metric,
    currentValue,
    threshold,
    detectedAt: new Date().toISOString(),
    acknowledged: false,
  };
}

/**
 * Check if a metric exceeds threshold and create alert if needed
 * 
 * @param metric - Metric name
 * @param value - Current value
 * @param config - Threshold configuration
 * @returns Alert if threshold exceeded, null otherwise
 */
export function checkThresholdAlert(
  metric: string,
  value: number,
  config: AlertThresholdConfig
): AnalyticsAlert | null {
  const exceedsCritical = config.direction === 'above'
    ? value >= config.criticalThreshold
    : value <= config.criticalThreshold;

  const exceedsWarning = config.direction === 'above'
    ? value >= config.warningThreshold
    : value <= config.warningThreshold;

  if (exceedsCritical) {
    return createAlert(
      'threshold_exceeded',
      'critical',
      `Critical: ${metric} threshold exceeded`,
      `${metric} is at ${value}, which exceeds the critical threshold of ${config.criticalThreshold}`,
      metric,
      value,
      config.criticalThreshold
    );
  }

  if (exceedsWarning) {
    return createAlert(
      'threshold_exceeded',
      'warning',
      `Warning: ${metric} threshold exceeded`,
      `${metric} is at ${value}, which exceeds the warning threshold of ${config.warningThreshold}`,
      metric,
      value,
      config.warningThreshold
    );
  }

  return null;
}

/**
 * Determine system health status based on metrics
 * 
 * @param errorRate - Current error rate percentage
 * @param responseTime - Average response time in ms
 * @param pendingReviews - Number of pending reviews
 * @returns System health status
 */
export function determineSystemHealth(
  errorRate: number,
  responseTime: number,
  pendingReviews: number
): SystemHealthStatus {
  // Critical if error rate > 10% or response time > 3000ms
  if (errorRate > 10 || responseTime > 3000) {
    return 'critical';
  }

  // Degraded if error rate > 5% or response time > 1000ms or pending reviews > 100
  if (errorRate > 5 || responseTime > 1000 || pendingReviews > 100) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Create metric card configuration
 * 
 * @param id - Metric ID
 * @param title - Display title
 * @param value - Current value
 * @param previousValue - Previous period value for comparison
 * @param icon - Optional icon name
 * @param href - Optional link
 * @param format - Value format
 * @returns Metric card configuration
 */
export function createMetricCard(
  id: string,
  title: string,
  value: number,
  previousValue?: number,
  icon?: string,
  href?: string,
  format: 'number' | 'percentage' | 'currency' = 'number'
): MetricCardConfig {
  let change: number | undefined;
  let changeType: 'increase' | 'decrease' | 'neutral' | undefined;

  if (previousValue !== undefined) {
    const comparison = calculatePeriodComparison(value, previousValue);
    change = comparison.percentageChange;
    changeType = comparison.trend === 'up' ? 'increase' 
      : comparison.trend === 'down' ? 'decrease' 
      : 'neutral';
  }

  return {
    id,
    title,
    value,
    change,
    changeType,
    icon,
    href,
    format,
  };
}

/**
 * Format number for display
 * 
 * @param value - Number to format
 * @param format - Format type
 * @returns Formatted string
 */
export function formatMetricValue(
  value: number,
  format: 'number' | 'percentage' | 'currency' = 'number'
): string {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
  }
}

/**
 * Calculate growth rate between two values
 * 
 * @param current - Current value
 * @param previous - Previous value
 * @returns Growth rate as percentage
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Get date range label for display
 * 
 * @param timeRange - Time range option
 * @returns Human-readable label
 */
export function getTimeRangeLabel(timeRange: AnalyticsTimeRange): string {
  switch (timeRange) {
    case '24h':
      return 'Last 24 Hours';
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case '90d':
      return 'Last 90 Days';
    case '1y':
      return 'Last Year';
    case 'custom':
      return 'Custom Range';
    default:
      return 'Unknown';
  }
}

/**
 * Export data to CSV format
 * 
 * @param data - Array of objects to export
 * @param headers - Column headers
 * @returns CSV string
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: string[]
): string {
  if (data.length === 0) {
    return headers.join(',') + '\n';
  }

  const rows = data.map(item => 
    headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Count items in date range
 * 
 * @param items - Array of items with created_at
 * @param start - Start date
 * @param end - End date
 * @returns Count of items in range
 */
export function countInDateRange<T extends { created_at: string }>(
  items: T[],
  start: Date,
  end: Date
): number {
  return items.filter(item => {
    const date = new Date(item.created_at);
    return date >= start && date <= end;
  }).length;
}

/**
 * Filter items by date range
 * 
 * @param items - Array of items with created_at
 * @param start - Start date
 * @param end - End date
 * @returns Filtered items
 */
export function filterByDateRange<T extends { created_at: string }>(
  items: T[],
  start: Date,
  end: Date
): T[] {
  return items.filter(item => {
    const date = new Date(item.created_at);
    return date >= start && date <= end;
  });
}
