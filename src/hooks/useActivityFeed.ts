/**
 * React Hook for Activity Feed
 * 
 * Provides React Query hooks for fetching and managing the activity feed.
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActivities,
  getActivityById,
  getActivitiesForTarget,
  getActivitiesByActor,
  detectSuspiciousPattern,
  checkAllSuspiciousPatterns,
  getActivityStats as fetchActivityStats,
  detectSpike,
  getSuspiciousActivities,
  getActivityCountsByType,
  getActivityCountsBySeverity,
} from '@/lib/activityApi';
import type {
  ActivityItem,
  ActivityFilters,
  ActivityFeedResponse,
  ActivityStatsResponse,
  SuspiciousActivityResult,
  SuspiciousPatternType,
  AnomalyDetectionConfig,
} from '@/types/activity';

/**
 * Query key factory for activity feed
 */
export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (filters: ActivityFilters) => [...activityKeys.lists(), filters] as const,
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,
  target: (targetType: string, targetId: string) => 
    [...activityKeys.all, 'target', targetType, targetId] as const,
  actor: (actorId: string) => [...activityKeys.all, 'actor', actorId] as const,
  stats: (config?: AnomalyDetectionConfig) => [...activityKeys.all, 'stats', config] as const,
  spike: (config?: AnomalyDetectionConfig) => [...activityKeys.all, 'spike', config] as const,
  suspicious: () => [...activityKeys.all, 'suspicious'] as const,
  suspiciousPattern: (pattern: SuspiciousPatternType, actorId?: string) => 
    [...activityKeys.all, 'suspiciousPattern', pattern, actorId] as const,
  countsByType: (dateFrom?: string, dateTo?: string) => 
    [...activityKeys.all, 'countsByType', dateFrom, dateTo] as const,
  countsBySeverity: (dateFrom?: string, dateTo?: string) => 
    [...activityKeys.all, 'countsBySeverity', dateFrom, dateTo] as const,
};

/**
 * Hook to fetch paginated activities with filtering
 * 
 * Requirement 2.2: Support filtering by activity type, user, hackathon,
 * severity level, and time range with instant results.
 */
export function useActivities(filters: ActivityFilters = {}) {
  return useQuery<ActivityFeedResponse, Error>({
    queryKey: activityKeys.list(filters),
    queryFn: () => getActivities(filters),
    staleTime: 10000, // 10 seconds - activity feed should be relatively fresh
  });
}

/**
 * Hook to fetch a single activity by ID
 */
export function useActivity(id: string | null) {
  return useQuery<ActivityItem | null, Error>({
    queryKey: activityKeys.detail(id ?? ''),
    queryFn: () => (id ? getActivityById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch activities for a specific target
 */
export function useActivitiesForTarget(
  targetType: string | null,
  targetId: string | null,
  limit: number = 50
) {
  return useQuery<ActivityItem[], Error>({
    queryKey: activityKeys.target(targetType ?? '', targetId ?? ''),
    queryFn: () => 
      targetType && targetId 
        ? getActivitiesForTarget(targetType, targetId, limit) 
        : Promise.resolve([]),
    enabled: !!targetType && !!targetId,
    staleTime: 10000,
  });
}

/**
 * Hook to fetch activities by actor
 */
export function useActivitiesByActor(actorId: string | null, limit: number = 50) {
  return useQuery<ActivityItem[], Error>({
    queryKey: activityKeys.actor(actorId ?? ''),
    queryFn: () => 
      actorId ? getActivitiesByActor(actorId, limit) : Promise.resolve([]),
    enabled: !!actorId,
    staleTime: 10000,
  });
}


/**
 * Hook to get activity statistics
 * 
 * Requirement 2.5: Return activities per minute, average rate, spike detection.
 * 
 * GET /api/admin/activity/stats
 */
export function useActivityStats(config?: AnomalyDetectionConfig) {
  return useQuery<ActivityStatsResponse, Error>({
    queryKey: activityKeys.stats(config),
    queryFn: () => fetchActivityStats(config),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for real-time monitoring
  });
}

/**
 * Hook to detect activity spike
 * 
 * Property 14: Anomaly Detection Threshold - For any activity spike detected,
 * the activity rate SHALL exceed the configured threshold.
 */
export function useActivitySpike(config?: AnomalyDetectionConfig) {
  return useQuery<{
    isSpike: boolean;
    currentRate: number;
    averageRate: number;
    threshold: number;
    ratio: number;
  }, Error>({
    queryKey: activityKeys.spike(config),
    queryFn: () => detectSpike(config),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to get suspicious activities
 * 
 * Requirement 2.4: Automatically flag and highlight unusual activity.
 */
export function useSuspiciousActivities(limit: number = 50) {
  return useQuery<ActivityItem[], Error>({
    queryKey: activityKeys.suspicious(),
    queryFn: () => getSuspiciousActivities(limit),
    staleTime: 30000,
  });
}

/**
 * Hook to detect a specific suspicious pattern
 * 
 * Requirement 2.4: Detect rapid registrations, bulk account creation, spam patterns.
 */
export function useSuspiciousPattern(
  patternType: SuspiciousPatternType | null,
  actorId?: string
) {
  return useQuery<SuspiciousActivityResult | null, Error>({
    queryKey: activityKeys.suspiciousPattern(patternType ?? 'rapid_registrations', actorId),
    queryFn: () => 
      patternType 
        ? detectSuspiciousPattern(patternType, actorId) 
        : Promise.resolve(null),
    enabled: !!patternType,
    staleTime: 30000,
  });
}

/**
 * Hook to check all suspicious patterns for an actor
 */
export function useCheckAllSuspiciousPatterns(actorId: string | null) {
  return useQuery<SuspiciousActivityResult[], Error>({
    queryKey: [...activityKeys.all, 'allPatterns', actorId],
    queryFn: () => 
      actorId ? checkAllSuspiciousPatterns(actorId) : Promise.resolve([]),
    enabled: !!actorId,
    staleTime: 30000,
  });
}

/**
 * Hook to get activity counts by type
 */
export function useActivityCountsByType(dateFrom?: string, dateTo?: string) {
  return useQuery<Record<string, number>, Error>({
    queryKey: activityKeys.countsByType(dateFrom, dateTo),
    queryFn: () => getActivityCountsByType(dateFrom, dateTo),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get activity counts by severity
 */
export function useActivityCountsBySeverity(dateFrom?: string, dateTo?: string) {
  return useQuery<Record<string, number>, Error>({
    queryKey: activityKeys.countsBySeverity(dateFrom, dateTo),
    queryFn: () => getActivityCountsBySeverity(dateFrom, dateTo),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to invalidate activity feed queries
 */
export function useInvalidateActivityFeed() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: activityKeys.lists() }),
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: activityKeys.stats() }),
    invalidateSuspicious: () => queryClient.invalidateQueries({ queryKey: activityKeys.suspicious() }),
  };
}
