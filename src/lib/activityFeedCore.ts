/**
 * Core Activity Feed Functions (Pure, Testable)
 * 
 * This module contains pure functions for activity feed operations that can be
 * tested without database access. These functions implement the core logic
 * for activity validation, ordering, and anomaly detection.
 * 
 * Requirements: 2.1, 2.4, 2.5
 */

import type {
  ActivityType,
  ActivityTargetType,
  ActivitySeverity,
  CreateActivityInput,
  ActivityItem,
  SuspiciousActivityResult,
  SuspiciousPatternType,
  AnomalyDetectionConfig,
  DEFAULT_ANOMALY_CONFIG,
} from '@/types/activity';

/**
 * Valid activity types
 */
export const VALID_ACTIVITY_TYPES: readonly ActivityType[] = [
  'user_signup',
  'hackathon_created',
  'hackathon_published',
  'hackathon_unpublished',
  'hackathon_ended',
  'registration_created',
  'registration_cancelled',
  'team_formed',
  'team_joined',
  'team_left',
  'submission_created',
  'submission_updated',
  'moderation_action',
  'report_filed',
  'suspicious_activity',
  'organizer_approved',
  'organizer_revoked',
  'judge_added',
  'judge_removed',
] as const;

/**
 * Valid target types for activities
 */
export const VALID_TARGET_TYPES: readonly ActivityTargetType[] = [
  'hackathon',
  'user',
  'team',
  'submission',
  'registration',
  'organizer',
  'judge',
  'report',
  'system',
] as const;

/**
 * Valid severity levels
 */
export const VALID_SEVERITY_LEVELS: readonly ActivitySeverity[] = [
  'info',
  'warning',
  'critical',
] as const;

/**
 * Check if a value is a valid activity type
 */
export function isValidActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && VALID_ACTIVITY_TYPES.includes(value as ActivityType);
}

/**
 * Check if a value is a valid target type
 */
export function isValidTargetType(value: unknown): value is ActivityTargetType {
  return typeof value === 'string' && VALID_TARGET_TYPES.includes(value as ActivityTargetType);
}

/**
 * Check if a value is a valid severity level
 */
export function isValidSeverity(value: unknown): value is ActivitySeverity {
  return typeof value === 'string' && VALID_SEVERITY_LEVELS.includes(value as ActivitySeverity);
}

/**
 * Validation result for activity input
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate activity input
 * 
 * Requirement 2.1: Validate that all required fields are present and valid
 * for creating an activity entry.
 * 
 * @param input - The activity input to validate
 * @returns Validation result with any errors
 */
export function validateActivityInput(input: Partial<CreateActivityInput>): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!input.activity_type) {
    errors.push('activity_type is required');
  } else if (!isValidActivityType(input.activity_type)) {
    errors.push(`Invalid activity_type: ${input.activity_type}`);
  }

  if (!input.target_type) {
    errors.push('target_type is required');
  } else if (!isValidTargetType(input.target_type)) {
    errors.push(`Invalid target_type: ${input.target_type}`);
  }

  if (!input.target_id) {
    errors.push('target_id is required');
  } else if (typeof input.target_id !== 'string' || input.target_id.trim() === '') {
    errors.push('target_id must be a non-empty string');
  }

  if (!input.action) {
    errors.push('action is required');
  } else if (typeof input.action !== 'string' || input.action.trim() === '') {
    errors.push('action must be a non-empty string');
  }

  // Validate optional severity if provided
  if (input.severity !== undefined && !isValidSeverity(input.severity)) {
    errors.push(`Invalid severity: ${input.severity}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create an activity item (for testing purposes)
 * 
 * This function creates an activity item object without database access,
 * useful for testing.
 * 
 * @param input - The activity input
 * @returns The created activity item
 */
export function createActivityItem(input: CreateActivityInput): ActivityItem {
  const validation = validateActivityInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid activity input: ${validation.errors.join(', ')}`);
  }

  return {
    id: crypto.randomUUID(),
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
    created_at: new Date().toISOString(),
  };
}

/**
 * Sort activities by created_at in descending order (newest first)
 * 
 * Requirement 2.1: Activity feed should display activities in real-time,
 * ordered by creation time with newest first.
 * 
 * Property 3: Activity Feed Ordering - For any set of activities in the feed,
 * they SHALL be ordered by created_at timestamp in descending order.
 * 
 * @param activities - Array of activities to sort
 * @returns Sorted array (newest first)
 */
export function sortActivitiesByDate(activities: ActivityItem[]): ActivityItem[] {
  return [...activities].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // Descending order (newest first)
  });
}

/**
 * Check if activities are properly ordered (newest first)
 * 
 * Property 3: Activity Feed Ordering validation
 * 
 * @param activities - Array of activities to check
 * @returns True if activities are in descending order by created_at
 */
export function areActivitiesProperlyOrdered(activities: ActivityItem[]): boolean {
  if (activities.length <= 1) {
    return true;
  }

  for (let i = 0; i < activities.length - 1; i++) {
    const currentDate = new Date(activities[i].created_at).getTime();
    const nextDate = new Date(activities[i + 1].created_at).getTime();
    
    if (currentDate < nextDate) {
      return false; // Current is older than next, wrong order
    }
  }

  return true;
}

/**
 * Filter activities by criteria
 * 
 * Requirement 2.2: Support filtering by activity type, user, hackathon,
 * severity level, and time range.
 * 
 * @param activities - Array of activities to filter
 * @param filters - Filter criteria
 * @returns Filtered array of activities
 */
export function filterActivities(
  activities: ActivityItem[],
  filters: {
    activity_type?: ActivityType | ActivityType[];
    severity?: ActivitySeverity | ActivitySeverity[];
    actor_id?: string;
    target_type?: ActivityTargetType | ActivityTargetType[];
    target_id?: string;
    date_from?: string;
    date_to?: string;
  }
): ActivityItem[] {
  return activities.filter((activity) => {
    // Filter by activity type
    if (filters.activity_type) {
      const types = Array.isArray(filters.activity_type)
        ? filters.activity_type
        : [filters.activity_type];
      if (!types.includes(activity.activity_type)) {
        return false;
      }
    }

    // Filter by severity
    if (filters.severity) {
      const severities = Array.isArray(filters.severity)
        ? filters.severity
        : [filters.severity];
      if (!severities.includes(activity.severity)) {
        return false;
      }
    }

    // Filter by actor
    if (filters.actor_id && activity.actor_id !== filters.actor_id) {
      return false;
    }

    // Filter by target type
    if (filters.target_type) {
      const targetTypes = Array.isArray(filters.target_type)
        ? filters.target_type
        : [filters.target_type];
      if (!targetTypes.includes(activity.target_type)) {
        return false;
      }
    }

    // Filter by target ID
    if (filters.target_id && activity.target_id !== filters.target_id) {
      return false;
    }

    // Filter by date range
    if (filters.date_from) {
      const activityDate = new Date(activity.created_at);
      const fromDate = new Date(filters.date_from);
      if (activityDate < fromDate) {
        return false;
      }
    }

    if (filters.date_to) {
      const activityDate = new Date(activity.created_at);
      const toDate = new Date(filters.date_to);
      if (activityDate > toDate) {
        return false;
      }
    }

    return true;
  });
}


/**
 * Suspicious activity detection thresholds
 */
export const SUSPICIOUS_THRESHOLDS = {
  rapid_registrations: {
    count: 10,
    timeWindowMinutes: 5,
  },
  bulk_account_creation: {
    count: 5,
    timeWindowMinutes: 10,
  },
  spam_submissions: {
    count: 20,
    timeWindowMinutes: 30,
  },
  unusual_login_pattern: {
    count: 10,
    timeWindowMinutes: 5,
  },
  mass_team_joins: {
    count: 15,
    timeWindowMinutes: 10,
  },
  repeated_reports: {
    count: 5,
    timeWindowMinutes: 60,
  },
} as const;

/**
 * Detect suspicious activity patterns
 * 
 * Requirement 2.4: Automatically flag and highlight unusual activity such as
 * rapid registrations, bulk account creation, or spam patterns.
 * 
 * @param activities - Array of recent activities to analyze
 * @param patternType - Type of suspicious pattern to detect
 * @param actorId - Optional actor ID to filter by
 * @returns Detection result
 */
export function detectSuspiciousActivity(
  activities: ActivityItem[],
  patternType: SuspiciousPatternType,
  actorId?: string
): SuspiciousActivityResult {
  const threshold = SUSPICIOUS_THRESHOLDS[patternType];
  const now = new Date();
  const windowStart = new Date(now.getTime() - threshold.timeWindowMinutes * 60 * 1000);

  // Map pattern types to activity types
  const patternToActivityTypes: Record<SuspiciousPatternType, ActivityType[]> = {
    rapid_registrations: ['registration_created'],
    bulk_account_creation: ['user_signup'],
    spam_submissions: ['submission_created', 'submission_updated'],
    unusual_login_pattern: ['user_signup'], // Would need login events
    mass_team_joins: ['team_joined', 'team_formed'],
    repeated_reports: ['report_filed'],
  };

  const relevantTypes = patternToActivityTypes[patternType];

  // Filter activities within time window and matching criteria
  const relevantActivities = activities.filter((activity) => {
    const activityDate = new Date(activity.created_at);
    if (activityDate < windowStart) return false;
    if (!relevantTypes.includes(activity.activity_type)) return false;
    if (actorId && activity.actor_id !== actorId) return false;
    return true;
  });

  const count = relevantActivities.length;
  const isDetected = count >= threshold.count;

  return {
    isDetected,
    patternType: isDetected ? patternType : null,
    actorId: actorId ?? null,
    count,
    threshold: threshold.count,
    timeWindowMinutes: threshold.timeWindowMinutes,
    details: isDetected
      ? `Detected ${count} ${patternType.replace(/_/g, ' ')} events in ${threshold.timeWindowMinutes} minutes (threshold: ${threshold.count})`
      : `No suspicious pattern detected (${count}/${threshold.count} in ${threshold.timeWindowMinutes} minutes)`,
  };
}

/**
 * Calculate activity rate (activities per minute)
 * 
 * @param activities - Array of activities
 * @param windowMinutes - Time window in minutes
 * @returns Activities per minute
 */
export function calculateActivityRate(
  activities: ActivityItem[],
  windowMinutes: number
): number {
  if (activities.length === 0 || windowMinutes <= 0) {
    return 0;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const activitiesInWindow = activities.filter((activity) => {
    const activityDate = new Date(activity.created_at);
    return activityDate >= windowStart;
  });

  return activitiesInWindow.length / windowMinutes;
}

/**
 * Detect activity spike (anomaly detection)
 * 
 * Requirement 2.5: Show activity count per minute and highlight spikes
 * above normal thresholds.
 * 
 * Property 14: Anomaly Detection Threshold - For any activity spike detected,
 * the activity rate SHALL exceed the configured threshold (e.g., 2x average rate).
 * 
 * @param activities - Array of activities to analyze
 * @param config - Anomaly detection configuration
 * @returns Whether a spike is detected and the rates
 */
export function detectActivitySpike(
  activities: ActivityItem[],
  config: AnomalyDetectionConfig = {
    spikeThreshold: 2.0,
    averageWindowMinutes: 60,
    currentWindowMinutes: 5,
    minimumActivities: 10,
  }
): {
  isSpike: boolean;
  currentRate: number;
  averageRate: number;
  threshold: number;
  ratio: number;
} {
  const currentRate = calculateActivityRate(activities, config.currentWindowMinutes);
  const averageRate = calculateActivityRate(activities, config.averageWindowMinutes);

  // Need minimum activities to detect spike
  const now = new Date();
  const averageWindowStart = new Date(now.getTime() - config.averageWindowMinutes * 60 * 1000);
  const activitiesInAverageWindow = activities.filter((activity) => {
    const activityDate = new Date(activity.created_at);
    return activityDate >= averageWindowStart;
  });

  if (activitiesInAverageWindow.length < config.minimumActivities) {
    return {
      isSpike: false,
      currentRate,
      averageRate,
      threshold: config.spikeThreshold,
      ratio: averageRate > 0 ? currentRate / averageRate : 0,
    };
  }

  // Calculate ratio and check if it exceeds threshold
  const ratio = averageRate > 0 ? currentRate / averageRate : 0;
  const isSpike = ratio >= config.spikeThreshold;

  return {
    isSpike,
    currentRate,
    averageRate,
    threshold: config.spikeThreshold,
    ratio,
  };
}

/**
 * Check if spike detection is valid according to Property 14
 * 
 * Property 14: Anomaly Detection Threshold - For any activity spike detected,
 * the activity rate SHALL exceed the configured threshold.
 * 
 * @param spikeResult - Result from detectActivitySpike
 * @returns True if the spike detection is valid
 */
export function isValidSpikeDetection(spikeResult: {
  isSpike: boolean;
  currentRate: number;
  averageRate: number;
  threshold: number;
  ratio: number;
}): boolean {
  // If spike is detected, ratio must be >= threshold
  if (spikeResult.isSpike) {
    return spikeResult.ratio >= spikeResult.threshold;
  }
  
  // If no spike, ratio must be < threshold
  return spikeResult.ratio < spikeResult.threshold;
}

/**
 * Get activity statistics
 * 
 * Requirement 2.5: Return activities per minute, average rate, spike detection.
 * 
 * @param activities - Array of activities
 * @param config - Anomaly detection configuration
 * @returns Activity statistics
 */
export function getActivityStats(
  activities: ActivityItem[],
  config: AnomalyDetectionConfig = {
    spikeThreshold: 2.0,
    averageWindowMinutes: 60,
    currentWindowMinutes: 5,
    minimumActivities: 10,
  }
): {
  activitiesPerMinute: number;
  averageActivitiesPerMinute: number;
  isSpike: boolean;
  recentSuspiciousCount: number;
  totalActivitiesToday: number;
  activitiesByType: Record<string, number>;
  activitiesBySeverity: Record<string, number>;
} {
  const spikeResult = detectActivitySpike(activities, config);

  // Count suspicious activities (critical severity)
  const recentSuspiciousCount = activities.filter(
    (a) => a.severity === 'critical' || a.activity_type === 'suspicious_activity'
  ).length;

  // Count activities today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalActivitiesToday = activities.filter((a) => {
    const activityDate = new Date(a.created_at);
    return activityDate >= today;
  }).length;

  // Count by type
  const activitiesByType: Record<string, number> = {};
  for (const activity of activities) {
    activitiesByType[activity.activity_type] =
      (activitiesByType[activity.activity_type] ?? 0) + 1;
  }

  // Count by severity
  const activitiesBySeverity: Record<string, number> = {};
  for (const activity of activities) {
    activitiesBySeverity[activity.severity] =
      (activitiesBySeverity[activity.severity] ?? 0) + 1;
  }

  return {
    activitiesPerMinute: spikeResult.currentRate,
    averageActivitiesPerMinute: spikeResult.averageRate,
    isSpike: spikeResult.isSpike,
    recentSuspiciousCount,
    totalActivitiesToday,
    activitiesByType,
    activitiesBySeverity,
  };
}
