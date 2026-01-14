/**
 * Activity Feed Types for Admin Moderation System
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

/**
 * Valid activity types for the activity feed
 */
export type ActivityType =
  | 'user_signup'
  | 'hackathon_created'
  | 'hackathon_published'
  | 'hackathon_unpublished'
  | 'hackathon_ended'
  | 'registration_created'
  | 'registration_cancelled'
  | 'team_formed'
  | 'team_joined'
  | 'team_left'
  | 'submission_created'
  | 'submission_updated'
  | 'moderation_action'
  | 'report_filed'
  | 'suspicious_activity'
  | 'organizer_approved'
  | 'organizer_revoked'
  | 'judge_added'
  | 'judge_removed';

/**
 * Valid target types for activities
 */
export type ActivityTargetType =
  | 'hackathon'
  | 'user'
  | 'team'
  | 'submission'
  | 'registration'
  | 'organizer'
  | 'judge'
  | 'report'
  | 'system';

/**
 * Severity levels for activities
 */
export type ActivitySeverity = 'info' | 'warning' | 'critical';

/**
 * Activity item as stored in the database
 */
export interface ActivityItem {
  id: string;
  activity_type: ActivityType;
  actor_id: string | null;
  actor_username: string | null;
  actor_email: string | null;
  target_type: ActivityTargetType;
  target_id: string;
  target_name: string | null;
  action: string;
  metadata: Record<string, unknown>;
  severity: ActivitySeverity;
  created_at: string;
}

/**
 * Input for creating a new activity
 */
export interface CreateActivityInput {
  activity_type: ActivityType;
  actor_id?: string | null;
  actor_username?: string | null;
  actor_email?: string | null;
  target_type: ActivityTargetType;
  target_id: string;
  target_name?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  severity?: ActivitySeverity;
}

/**
 * Filters for querying activities
 */
export interface ActivityFilters {
  activity_type?: ActivityType | ActivityType[];
  severity?: ActivitySeverity | ActivitySeverity[];
  actor_id?: string;
  target_type?: ActivityTargetType | ActivityTargetType[];
  target_id?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Response for paginated activity queries with cursor pagination
 */
export interface ActivityFeedResponse {
  activities: ActivityItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Activity statistics response
 */
export interface ActivityStatsResponse {
  activitiesPerMinute: number;
  averageActivitiesPerMinute: number;
  isSpike: boolean;
  recentSuspiciousCount: number;
  totalActivitiesToday: number;
  activitiesByType: Record<string, number>;
  activitiesBySeverity: Record<string, number>;
}

/**
 * Suspicious activity pattern types
 */
export type SuspiciousPatternType =
  | 'rapid_registrations'
  | 'bulk_account_creation'
  | 'spam_submissions'
  | 'unusual_login_pattern'
  | 'mass_team_joins'
  | 'repeated_reports';

/**
 * Suspicious activity detection result
 */
export interface SuspiciousActivityResult {
  isDetected: boolean;
  patternType: SuspiciousPatternType | null;
  actorId: string | null;
  count: number;
  threshold: number;
  timeWindowMinutes: number;
  details: string;
}

/**
 * Anomaly detection configuration
 */
export interface AnomalyDetectionConfig {
  /** Multiplier for average rate to trigger spike detection */
  spikeThreshold: number;
  /** Time window in minutes for calculating average rate */
  averageWindowMinutes: number;
  /** Time window in minutes for calculating current rate */
  currentWindowMinutes: number;
  /** Minimum activities to consider for spike detection */
  minimumActivities: number;
}

/**
 * Default anomaly detection configuration
 */
export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  spikeThreshold: 2.0, // 2x average rate triggers spike
  averageWindowMinutes: 60, // 1 hour average
  currentWindowMinutes: 5, // 5 minute current window
  minimumActivities: 10, // Need at least 10 activities to detect spike
};
