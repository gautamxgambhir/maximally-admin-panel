/**
 * React Hooks for System Health
 * 
 * Provides React Query hooks for fetching system health data.
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSystemHealthOverview,
  getRecentErrors,
  getSystemMetricsTimeSeries,
  getSlowEndpoints,
  getHighErrorEndpoints,
  getSystemHealthSummary,
  cleanupOldMetrics,
} from '@/lib/systemHealthApi';
import type {
  SystemHealthOverview,
  SystemHealthQueryParams,
  SystemMetricsTimeSeries,
  SystemMetricType,
  ErrorLogEntry,
  EndpointMetrics,
} from '@/types/systemHealth';

/**
 * Query key factory for system health
 */
export const systemHealthKeys = {
  all: ['systemHealth'] as const,
  overview: (params?: SystemHealthQueryParams) => 
    [...systemHealthKeys.all, 'overview', params] as const,
  summary: () => [...systemHealthKeys.all, 'summary'] as const,
  errors: (limit?: number) => [...systemHealthKeys.all, 'errors', limit] as const,
  timeSeries: (metricType: SystemMetricType, timeRange: string) => 
    [...systemHealthKeys.all, 'timeSeries', metricType, timeRange] as const,
  slowEndpoints: (thresholdMs?: number) => 
    [...systemHealthKeys.all, 'slowEndpoints', thresholdMs] as const,
  highErrorEndpoints: (thresholdPercent?: number) => 
    [...systemHealthKeys.all, 'highErrorEndpoints', thresholdPercent] as const,
};

/**
 * Hook to fetch system health overview
 * 
 * Requirement 12.1: Display API response times, database query performance, and error rates
 */
export function useSystemHealthOverview(params?: SystemHealthQueryParams) {
  return useQuery<SystemHealthOverview, Error>({
    queryKey: systemHealthKeys.overview(params),
    queryFn: () => getSystemHealthOverview(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to fetch system health summary (lightweight)
 */
export function useSystemHealthSummary() {
  return useQuery<{
    status: SystemHealthOverview['status'];
    avgResponseTime: number;
    errorRate: number;
    alertCount: number;
  }, Error>({
    queryKey: systemHealthKeys.summary(),
    queryFn: getSystemHealthSummary,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to fetch recent errors
 * 
 * Requirement 12.3: Display recent errors with stack traces, affected users, and frequency
 */
export function useRecentErrors(limit: number = 20) {
  return useQuery<ErrorLogEntry[], Error>({
    queryKey: systemHealthKeys.errors(limit),
    queryFn: () => getRecentErrors(limit),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to fetch system metrics time series
 */
export function useSystemMetricsTimeSeries(
  metricType: SystemMetricType,
  timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
) {
  return useQuery<SystemMetricsTimeSeries, Error>({
    queryKey: systemHealthKeys.timeSeries(metricType, timeRange),
    queryFn: () => getSystemMetricsTimeSeries(metricType, timeRange),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch slow endpoints
 * 
 * Requirement 12.4: Highlight slow queries and resource-intensive operations
 */
export function useSlowEndpoints(thresholdMs: number = 1000) {
  return useQuery<EndpointMetrics[], Error>({
    queryKey: systemHealthKeys.slowEndpoints(thresholdMs),
    queryFn: () => getSlowEndpoints(thresholdMs),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch high error rate endpoints
 */
export function useHighErrorEndpoints(thresholdPercent: number = 5) {
  return useQuery<EndpointMetrics[], Error>({
    queryKey: systemHealthKeys.highErrorEndpoints(thresholdPercent),
    queryFn: () => getHighErrorEndpoints(thresholdPercent),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to cleanup old metrics
 */
export function useCleanupOldMetrics() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, number>({
    mutationFn: (retentionDays: number) => cleanupOldMetrics(retentionDays),
    onSuccess: () => {
      // Invalidate all system health queries
      queryClient.invalidateQueries({ queryKey: systemHealthKeys.all });
    },
  });
}
