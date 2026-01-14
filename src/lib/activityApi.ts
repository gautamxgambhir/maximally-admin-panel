/**
 * Activity Feed API Functions
 * 
 * Provides API functions for querying and managing the activity feed.
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { supabaseAdmin } from './supabase';
import type {
  ActivityItem,
  ActivityFilters,
  ActivityFeedResponse,
  ActivityStatsResponse,
  SuspiciousActivityResult,
  SuspiciousPatternType,
  AnomalyDetectionConfig,
} from '@/types/activity';
import {
  detectSuspiciousActivity,
  detectActivitySpike,
  getActivityStats as getActivityStatsCore,
  SUSPICIOUS_THRESHOLDS,
} from './activityFeedCore';

/**
 * Default anomaly detection configuration
 */
const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  spikeThreshold: 2.0,
  averageWindowMinutes: 60,
  currentWindowMinutes: 5,
  minimumActivities: 10,
};

/**
 * Query activities with filtering and cursor pagination
 * 
 * Requirement 2.2: Support filtering by activity type, user, hackathon,
 * severity level, and time range with instant results.
 * 
 * GET /api/admin/activity
 * 
 * @param filters - The filters to apply to the query
 * @returns Paginated activity feed response
 */
export async function getActivities(
  filters: ActivityFilters = {}
): Promise<ActivityFeedResponse> {
  const limit = Math.min(filters.limit ?? 50, 100); // Cap at 100

  let query = supabaseAdmin
    .from('admin_activity_feed')
    .select('*');

  // Apply filters
  if (filters.activity_type) {
    if (Array.isArray(filters.activity_type)) {
      query = query.in('activity_type', filters.activity_type);
    } else {
      query = query.eq('activity_type', filters.activity_type);
    }
  }

  if (filters.severity) {
    if (Array.isArray(filters.severity)) {
      query = query.in('severity', filters.severity);
    } else {
      query = query.eq('severity', filters.severity);
    }
  }

  if (filters.actor_id) {
    query = query.eq('actor_id', filters.actor_id);
  }

  if (filters.target_type) {
    if (Array.isArray(filters.target_type)) {
      query = query.in('target_type', filters.target_type);
    } else {
      query = query.eq('target_type', filters.target_type);
    }
  }

  if (filters.target_id) {
    query = query.eq('target_id', filters.target_id);
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  // Cursor pagination - use created_at as cursor
  if (filters.cursor) {
    query = query.lt('created_at', filters.cursor);
  }

  // Order by created_at descending (newest first) - Property 3
  query = query.order('created_at', { ascending: false });

  // Fetch one extra to determine if there are more results
  query = query.limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query activities: ${error.message}`);
  }

  const activities = (data ?? []) as ActivityItem[];
  const hasMore = activities.length > limit;
  
  // Remove the extra item if present
  if (hasMore) {
    activities.pop();
  }

  const nextCursor = hasMore && activities.length > 0
    ? activities[activities.length - 1].created_at
    : null;

  return {
    activities,
    hasMore,
    nextCursor,
  };
}

/**
 * Get a single activity by ID
 * 
 * @param id - The activity ID
 * @returns The activity item or null if not found
 */
export async function getActivityById(id: string): Promise<ActivityItem | null> {
  const { data, error } = await supabaseAdmin
    .from('admin_activity_feed')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get activity: ${error.message}`);
  }

  return data as ActivityItem;
}

/**
 * Get activities for a specific target
 * 
 * @param targetType - The type of target
 * @param targetId - The ID of the target
 * @param limit - Maximum number of activities to return
 * @returns Array of activity items
 */
export async function getActivitiesForTarget(
  targetType: string,
  targetId: string,
  limit: number = 50
): Promise<ActivityItem[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_activity_feed')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get activities for target: ${error.message}`);
  }

  return (data ?? []) as ActivityItem[];
}

/**
 * Get activities by actor
 * 
 * @param actorId - The actor's user ID
 * @param limit - Maximum number of activities to return
 * @returns Array of activity items
 */
export async function getActivitiesByActor(
  actorId: string,
  limit: number = 50
): Promise<ActivityItem[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_activity_feed')
    .select('*')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get activities by actor: ${error.message}`);
  }

  return (data ?? []) as ActivityItem[];
}


/**
 * Detect suspicious activity patterns
 * 
 * Requirement 2.4: Automatically flag and highlight unusual activity such as
 * rapid registrations, bulk account creation, or spam patterns.
 * 
 * @param patternType - Type of suspicious pattern to detect
 * @param actorId - Optional actor ID to filter by
 * @returns Detection result
 */
export async function detectSuspiciousPattern(
  patternType: SuspiciousPatternType,
  actorId?: string
): Promise<SuspiciousActivityResult> {
  const threshold = SUSPICIOUS_THRESHOLDS[patternType];
  const windowStart = new Date(Date.now() - threshold.timeWindowMinutes * 60 * 1000);

  // Fetch recent activities
  let query = supabaseAdmin
    .from('admin_activity_feed')
    .select('*')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });

  if (actorId) {
    query = query.eq('actor_id', actorId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to detect suspicious activity: ${error.message}`);
  }

  const activities = (data ?? []) as ActivityItem[];
  return detectSuspiciousActivity(activities, patternType, actorId);
}

/**
 * Check all suspicious patterns for an actor
 * 
 * @param actorId - The actor ID to check
 * @returns Array of detected suspicious patterns
 */
export async function checkAllSuspiciousPatterns(
  actorId: string
): Promise<SuspiciousActivityResult[]> {
  const patterns: SuspiciousPatternType[] = [
    'rapid_registrations',
    'bulk_account_creation',
    'spam_submissions',
    'mass_team_joins',
    'repeated_reports',
  ];

  const results: SuspiciousActivityResult[] = [];

  for (const pattern of patterns) {
    const result = await detectSuspiciousPattern(pattern, actorId);
    if (result.isDetected) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Get activity statistics
 * 
 * Requirement 2.5: Return activities per minute, average rate, spike detection.
 * 
 * GET /api/admin/activity/stats
 * 
 * @param config - Anomaly detection configuration
 * @returns Activity statistics
 */
export async function getActivityStats(
  config: AnomalyDetectionConfig = DEFAULT_ANOMALY_CONFIG
): Promise<ActivityStatsResponse> {
  // Fetch activities from the average window (longest time period needed)
  const windowStart = new Date(
    Date.now() - config.averageWindowMinutes * 60 * 1000
  );

  const { data, error } = await supabaseAdmin
    .from('admin_activity_feed')
    .select('*')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get activity stats: ${error.message}`);
  }

  const activities = (data ?? []) as ActivityItem[];
  return getActivityStatsCore(activities, config);
}

/**
 * Detect activity spike
 * 
 * Property 14: Anomaly Detection Threshold - For any activity spike detected,
 * the activity rate SHALL exceed the configured threshold.
 * 
 * @param config - Anomaly detection configuration
 * @returns Spike detection result
 */
export async function detectSpike(
  config: AnomalyDetectionConfig = DEFAULT_ANOMALY_CONFIG
): Promise<{
  isSpike: boolean;
  currentRate: number;
  averageRate: number;
  threshold: number;
  ratio: number;
}> {
  // Fetch activities from the average window
  const windowStart = new Date(
    Date.now() - config.averageWindowMinutes * 60 * 1000
  );

  const { data, error } = await supabaseAdmin
    .from('admin_activity_feed')
    .select('*')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to detect activity spike: ${error.message}`);
  }

  const activities = (data ?? []) as ActivityItem[];
  return detectActivitySpike(activities, config);
}

/**
 * Get suspicious activities (critical severity or suspicious_activity type)
 * 
 * @param limit - Maximum number of activities to return
 * @returns Array of suspicious activity items
 */
export async function getSuspiciousActivities(
  limit: number = 50
): Promise<ActivityItem[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_activity_feed')
    .select('*')
    .or('severity.eq.critical,activity_type.eq.suspicious_activity')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get suspicious activities: ${error.message}`);
  }

  return (data ?? []) as ActivityItem[];
}

/**
 * Get activity counts by type for a time period
 * 
 * @param dateFrom - Start date
 * @param dateTo - End date
 * @returns Activity counts by type
 */
export async function getActivityCountsByType(
  dateFrom?: string,
  dateTo?: string
): Promise<Record<string, number>> {
  let query = supabaseAdmin
    .from('admin_activity_feed')
    .select('activity_type');

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get activity counts: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const activity of data ?? []) {
    counts[activity.activity_type] = (counts[activity.activity_type] ?? 0) + 1;
  }

  return counts;
}

/**
 * Get activity counts by severity for a time period
 * 
 * @param dateFrom - Start date
 * @param dateTo - End date
 * @returns Activity counts by severity
 */
export async function getActivityCountsBySeverity(
  dateFrom?: string,
  dateTo?: string
): Promise<Record<string, number>> {
  let query = supabaseAdmin
    .from('admin_activity_feed')
    .select('severity');

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get activity counts by severity: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const activity of data ?? []) {
    counts[activity.severity] = (counts[activity.severity] ?? 0) + 1;
  }

  return counts;
}
