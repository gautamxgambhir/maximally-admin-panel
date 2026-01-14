/**
 * Analytics Types for Admin Moderation System
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

/**
 * Time range options for analytics queries
 */
export type AnalyticsTimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  previousValue?: number;
}

/**
 * Dashboard metrics overview
 * Requirement 8.1: Display key metrics including total users, new users,
 * active hackathons, pending reviews, total registrations, and moderation actions
 */
export interface DashboardMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  activeHackathons: number;
  pendingReviews: number;
  totalRegistrations: number;
  moderationActionsToday: number;
  systemHealth: SystemHealthStatus;
}

/**
 * System health status
 */
export type SystemHealthStatus = 'healthy' | 'degraded' | 'critical';

/**
 * Alert for anomalies or issues
 * Requirement 8.3: Highlight unusual patterns with alerts
 */
export interface AnalyticsAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  detectedAt: string;
  acknowledged: boolean;
}

/**
 * Alert types
 */
export type AlertType =
  | 'spike'
  | 'drop'
  | 'threshold_exceeded'
  | 'anomaly'
  | 'system_error'
  | 'performance_degradation';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Analytics overview response
 * GET /api/admin/analytics/overview
 */
export interface AnalyticsOverviewResponse {
  metrics: DashboardMetrics;
  trends: {
    users: TimeSeriesDataPoint[];
    hackathons: TimeSeriesDataPoint[];
    registrations: TimeSeriesDataPoint[];
  };
  alerts: AnalyticsAlert[];
}

/**
 * Time series query parameters
 */
export interface TimeSeriesQueryParams {
  timeRange: AnalyticsTimeRange;
  dateFrom?: string;
  dateTo?: string;
  comparison?: boolean;
  granularity?: TimeSeriesGranularity;
}

/**
 * Time series granularity
 */
export type TimeSeriesGranularity = 'hour' | 'day' | 'week' | 'month';

/**
 * Time series response
 */
export interface TimeSeriesResponse {
  data: TimeSeriesDataPoint[];
  total: number;
  previousTotal?: number;
  percentageChange?: number;
  granularity: TimeSeriesGranularity;
  timeRange: AnalyticsTimeRange;
}

/**
 * Period comparison result
 * Requirement 8.4: Show comparison with previous period with percentage change
 */
export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Organizer statistics
 */
export interface OrganizerStats {
  organizerId: string;
  organizerName: string;
  totalHackathons: number;
  activeHackathons: number;
  totalParticipants: number;
  averageRating: number | null;
  trustScore: number;
}

/**
 * Hackathon statistics
 */
export interface HackathonStats {
  hackathonId: number;
  hackathonName: string;
  registrations: number;
  submissions: number;
  teams: number;
  status: string;
  startDate: string;
}

/**
 * Analytics export format
 * Requirement 8.5: Support CSV and PDF export
 */
export type AnalyticsExportFormat = 'csv' | 'pdf';

/**
 * Analytics export request
 */
export interface AnalyticsExportRequest {
  format: AnalyticsExportFormat;
  timeRange: AnalyticsTimeRange;
  dateFrom?: string;
  dateTo?: string;
  metrics?: string[];
  includeCharts?: boolean;
}

/**
 * Metric card configuration for dashboard
 */
export interface MetricCardConfig {
  id: string;
  title: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  href?: string;
  format?: 'number' | 'percentage' | 'currency';
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie';
  timeRange: AnalyticsTimeRange;
  comparison: boolean;
  title: string;
  dataKey: string;
}

/**
 * Analytics filter options
 */
export interface AnalyticsFilters {
  timeRange: AnalyticsTimeRange;
  dateFrom?: string;
  dateTo?: string;
  organizerId?: string;
  hackathonId?: number;
  comparison?: boolean;
}

/**
 * Threshold configuration for alerts
 */
export interface AlertThresholdConfig {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  direction: 'above' | 'below';
}

/**
 * Default alert thresholds
 */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholdConfig[] = [
  { metric: 'errorRate', warningThreshold: 5, criticalThreshold: 10, direction: 'above' },
  { metric: 'responseTime', warningThreshold: 1000, criticalThreshold: 3000, direction: 'above' },
  { metric: 'pendingReviews', warningThreshold: 50, criticalThreshold: 100, direction: 'above' },
  { metric: 'activitySpike', warningThreshold: 2, criticalThreshold: 5, direction: 'above' },
];
