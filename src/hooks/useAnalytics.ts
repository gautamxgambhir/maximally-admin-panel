/**
 * React Hooks for Analytics
 * 
 * Provides React Query hooks for fetching analytics data.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { useQuery } from '@tanstack/react-query';
import {
  getAnalyticsOverview,
  getDashboardMetrics,
  getTimeSeriesWithComparison,
  detectAnomalies,
  getPeriodComparison,
  getTopOrganizers,
  getTopHackathons,
  getActivityBreakdown,
  getModerationBreakdown,
  getHackathonStatusDistribution,
} from '@/lib/analyticsApi';
import type {
  AnalyticsTimeRange,
  AnalyticsOverviewResponse,
  DashboardMetrics,
  TimeSeriesResponse,
  TimeSeriesQueryParams,
  AnalyticsAlert,
  PeriodComparison,
  OrganizerStats,
  HackathonStats,
} from '@/types/analytics';

/**
 * Query key factory for analytics
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (timeRange: AnalyticsTimeRange) => [...analyticsKeys.all, 'overview', timeRange] as const,
  metrics: () => [...analyticsKeys.all, 'metrics'] as const,
  timeSeries: (params: TimeSeriesQueryParams, dataType: string) => 
    [...analyticsKeys.all, 'timeSeries', dataType, params] as const,
  anomalies: (timeRange: AnalyticsTimeRange) => [...analyticsKeys.all, 'anomalies', timeRange] as const,
  comparison: (metric: string, timeRange: AnalyticsTimeRange) => 
    [...analyticsKeys.all, 'comparison', metric, timeRange] as const,
  topOrganizers: (limit: number) => [...analyticsKeys.all, 'topOrganizers', limit] as const,
  topHackathons: (limit: number) => [...analyticsKeys.all, 'topHackathons', limit] as const,
  activityBreakdown: (timeRange: AnalyticsTimeRange) => 
    [...analyticsKeys.all, 'activityBreakdown', timeRange] as const,
  moderationBreakdown: (timeRange: AnalyticsTimeRange) => 
    [...analyticsKeys.all, 'moderationBreakdown', timeRange] as const,
  hackathonStatus: () => [...analyticsKeys.all, 'hackathonStatus'] as const,
};

/**
 * Hook to fetch analytics overview
 * 
 * Requirement 8.1: Display key metrics including total users, new users,
 * active hackathons, pending reviews, total registrations, and moderation actions.
 */
export function useAnalyticsOverview(timeRange: AnalyticsTimeRange = '7d') {
  return useQuery<AnalyticsOverviewResponse, Error>({
    queryKey: analyticsKeys.overview(timeRange),
    queryFn: () => getAnalyticsOverview(timeRange),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

/**
 * Hook to fetch dashboard metrics only
 */
export function useDashboardMetrics() {
  return useQuery<DashboardMetrics, Error>({
    queryKey: analyticsKeys.metrics(),
    queryFn: getDashboardMetrics,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

/**
 * Hook to fetch time series data with optional comparison
 * 
 * Requirement 8.2: Show interactive charts for user growth, registration trends,
 * submission patterns, and hackathon creation over customizable time periods.
 */
export function useTimeSeries(
  params: TimeSeriesQueryParams,
  dataType: 'users' | 'hackathons' | 'registrations'
) {
  return useQuery<TimeSeriesResponse, Error>({
    queryKey: analyticsKeys.timeSeries(params, dataType),
    queryFn: () => getTimeSeriesWithComparison(params, dataType),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to detect anomalies
 * 
 * Requirement 8.3: Highlight unusual patterns with alerts such as sudden drops,
 * unusual spikes, or trending issues.
 */
export function useAnomalies(timeRange: AnalyticsTimeRange = '7d') {
  return useQuery<AnalyticsAlert[], Error>({
    queryKey: analyticsKeys.anomalies(timeRange),
    queryFn: () => detectAnomalies(timeRange),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

/**
 * Hook to get period comparison for a metric
 * 
 * Requirement 8.4: Show comparison with previous period with percentage change indicators.
 */
export function usePeriodComparison(
  metric: 'users' | 'hackathons' | 'registrations' | 'moderation_actions',
  timeRange: AnalyticsTimeRange = '7d'
) {
  return useQuery<PeriodComparison, Error>({
    queryKey: analyticsKeys.comparison(metric, timeRange),
    queryFn: () => getPeriodComparison(metric, timeRange),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get top organizers
 */
export function useTopOrganizers(limit: number = 10) {
  return useQuery<OrganizerStats[], Error>({
    queryKey: analyticsKeys.topOrganizers(limit),
    queryFn: () => getTopOrganizers(limit),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get top hackathons
 */
export function useTopHackathons(limit: number = 10) {
  return useQuery<HackathonStats[], Error>({
    queryKey: analyticsKeys.topHackathons(limit),
    queryFn: () => getTopHackathons(limit),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get activity breakdown by type
 */
export function useActivityBreakdown(timeRange: AnalyticsTimeRange = '7d') {
  return useQuery<Record<string, number>, Error>({
    queryKey: analyticsKeys.activityBreakdown(timeRange),
    queryFn: () => getActivityBreakdown(timeRange),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get moderation action breakdown
 */
export function useModerationBreakdown(timeRange: AnalyticsTimeRange = '7d') {
  return useQuery<Record<string, number>, Error>({
    queryKey: analyticsKeys.moderationBreakdown(timeRange),
    queryFn: () => getModerationBreakdown(timeRange),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get hackathon status distribution
 */
export function useHackathonStatusDistribution() {
  return useQuery<Record<string, number>, Error>({
    queryKey: analyticsKeys.hackathonStatus(),
    queryFn: getHackathonStatusDistribution,
    staleTime: 60000, // 1 minute
  });
}
