/**
 * Activity Service for Admin Moderation System
 * 
 * Provides activity logging and monitoring for all platform events.
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { supabaseAdmin } from './supabase';
import type {
  ActivityItem,
  CreateActivityInput,
  ActivityFilters,
  ActivityFeedResponse,
  ActivityStatsResponse,
  SuspiciousActivityResult,
  SuspiciousPatternType,
  AnomalyDetectionConfig,
} from '@/types/activity';
import {
  validateActivityInput,
  sortActivitiesByDate,
  filterActivities,
  detectSuspiciousActivity,
  detectActivitySpike,
  getActivityStats,
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
 * ActivityService class for managing activity feed
 * 
 * This service provides methods to:
 * - Log platform activities (Requirement 2.1)
 * - Query activities with filtering (Requirement 2.2)
 * - Detect suspicious activity patterns (Requirement 2.4)
 * - Calculate activity statistics (Requirement 2.5)
 */
export class ActivityService {
  private static instance: ActivityService;

  private constructor() {}

  /**
   * Get singleton instance of ActivityService
   */
  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  /**
   * Log a new activity
   * 
   * Requirement 2.1: Display a real-time feed of activities including new
   * registrations, submissions, team formations, hackathon creations,
   * user signups, and moderation events.
   * 
   * @param input - The activity data to log
   * @returns The created activity item
   * @throws Error if the activity creation fails
   */
  async logActivity(input: CreateActivityInput): Promise<ActivityItem> {
    // Validate input
    const validation = validateActivityInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid activity input: ${validation.errors.join(', ')}`);
    }

    const { data, error } = await supabaseAdmin
      .from('admin_activity_feed')
      .insert({
        activity_type: input.activity_type,
        actor_id: input.actor_id ?? null,
        actor_username: input.actor_username ?? null,
        actor_email: input.actor_email ?? null,
        target_type: input.target_type,
        target_id: input.target_id,
        target_name: input.target_name ?? null,
        action: input.action.trim(),
        metadata: input.metadata ?? {},
        severity: input.severity ?? 'info',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log activity: ${error.message}`);
    }

    return data as ActivityItem;
  }

  /**
   * Query activities with filtering and cursor pagination
   * 
   * Requirement 2.2: Support filtering by activity type, user, hackathon,
   * severity level, and time range with instant results.
   * 
   * @param filters - The filters to apply to the query
   * @returns Paginated activity feed response
   */
  async queryActivities(filters: ActivityFilters = {}): Promise<ActivityFeedResponse> {
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
  async getActivityById(id: string): Promise<ActivityItem | null> {
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
   * Detect suspicious activity patterns
   * 
   * Requirement 2.4: Automatically flag and highlight unusual activity such as
   * rapid registrations, bulk account creation, or spam patterns.
   * 
   * @param patternType - Type of suspicious pattern to detect
   * @param actorId - Optional actor ID to filter by
   * @returns Detection result
   */
  async detectSuspiciousPattern(
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
  async checkAllSuspiciousPatterns(actorId: string): Promise<SuspiciousActivityResult[]> {
    const patterns: SuspiciousPatternType[] = [
      'rapid_registrations',
      'bulk_account_creation',
      'spam_submissions',
      'mass_team_joins',
      'repeated_reports',
    ];

    const results: SuspiciousActivityResult[] = [];

    for (const pattern of patterns) {
      const result = await this.detectSuspiciousPattern(pattern, actorId);
      if (result.isDetected) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Log suspicious activity when detected
   * 
   * @param result - The suspicious activity detection result
   * @returns The created activity item
   */
  async logSuspiciousActivity(result: SuspiciousActivityResult): Promise<ActivityItem> {
    return this.logActivity({
      activity_type: 'suspicious_activity',
      actor_id: result.actorId,
      target_type: 'system',
      target_id: 'suspicious_activity_detection',
      target_name: result.patternType ?? 'Unknown Pattern',
      action: result.details,
      metadata: {
        pattern_type: result.patternType,
        count: result.count,
        threshold: result.threshold,
        time_window_minutes: result.timeWindowMinutes,
      },
      severity: 'critical',
    });
  }

  /**
   * Get activity statistics
   * 
   * Requirement 2.5: Show activity count per minute and highlight spikes
   * above normal thresholds.
   * 
   * @param config - Anomaly detection configuration
   * @returns Activity statistics
   */
  async getStats(
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
    return getActivityStats(activities, config);
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
  async detectSpike(
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
   * Get recent activities for a specific target
   * 
   * @param targetType - The type of target
   * @param targetId - The ID of the target
   * @param limit - Maximum number of activities to return
   * @returns Array of activity items
   */
  async getActivitiesForTarget(
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
   * Get recent activities by an actor
   * 
   * @param actorId - The actor's user ID
   * @param limit - Maximum number of activities to return
   * @returns Array of activity items
   */
  async getActivitiesByActor(
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
}

// Export singleton instance
export const activityService = ActivityService.getInstance();
