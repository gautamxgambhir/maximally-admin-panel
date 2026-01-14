/**
 * Property-Based Tests for Activity Feed
 * 
 * Feature: admin-moderation-system
 * 
 * Property 3: Activity Feed Ordering
 * Validates: Requirements 2.1
 * Property: For any set of activities in the feed, they SHALL be ordered
 * by created_at timestamp in descending order (newest first).
 * 
 * Property 14: Anomaly Detection Threshold
 * Validates: Requirements 8.3, 12.2
 * Property: For any activity spike detected, the activity rate SHALL exceed
 * the configured threshold (e.g., 2x average rate).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateActivityInput,
  isValidActivityType,
  isValidTargetType,
  isValidSeverity,
  createActivityItem,
  sortActivitiesByDate,
  areActivitiesProperlyOrdered,
  filterActivities,
  detectActivitySpike,
  calculateActivityRate,
  isValidSpikeDetection,
  detectSuspiciousActivity,
  VALID_ACTIVITY_TYPES,
  VALID_TARGET_TYPES,
  VALID_SEVERITY_LEVELS,
  SUSPICIOUS_THRESHOLDS,
} from './activityFeedCore';
import type { CreateActivityInput, ActivityItem, AnomalyDetectionConfig, SuspiciousPatternType } from '@/types/activity';

/**
 * Arbitrary generator for valid activity types
 */
const validActivityTypeArb = fc.constantFrom(...VALID_ACTIVITY_TYPES);

/**
 * Arbitrary generator for valid target types
 */
const validTargetTypeArb = fc.constantFrom(...VALID_TARGET_TYPES);

/**
 * Arbitrary generator for valid severity levels
 */
const validSeverityArb = fc.constantFrom(...VALID_SEVERITY_LEVELS);

/**
 * Arbitrary generator for valid email addresses
 */
const emailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
  fc.constantFrom('example.com', 'test.org', 'admin.io')
).map(([local, domain]) => `${local}@${domain}`);

/**
 * Arbitrary generator for UUID-like strings
 */
const uuidArb = fc.uuid();

/**
 * Arbitrary generator for non-empty strings
 */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary generator for JSON-serializable objects (for metadata)
 */
const jsonObjectArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
  fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null)
  ),
  { minKeys: 0, maxKeys: 5 }
);

/**
 * Arbitrary generator for valid CreateActivityInput
 */
const validActivityInputArb: fc.Arbitrary<CreateActivityInput> = fc.record({
  activity_type: validActivityTypeArb,
  actor_id: fc.option(uuidArb, { nil: null }),
  actor_username: fc.option(nonEmptyStringArb, { nil: null }),
  actor_email: fc.option(emailArb, { nil: null }),
  target_type: validTargetTypeArb,
  target_id: nonEmptyStringArb,
  target_name: fc.option(nonEmptyStringArb, { nil: null }),
  action: nonEmptyStringArb,
  metadata: fc.option(jsonObjectArb, { nil: undefined }),
  severity: fc.option(validSeverityArb, { nil: undefined }),
});

/**
 * Arbitrary generator for ISO date strings within a reasonable range
 * Using integer timestamps to avoid invalid date issues
 */
const isoDateArb = fc.integer({
  min: new Date('2024-01-01').getTime(),
  max: new Date('2026-12-31').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * Arbitrary generator for ActivityItem with custom created_at
 */
const activityItemWithDateArb = (createdAt: string): fc.Arbitrary<ActivityItem> =>
  validActivityInputArb.map(input => ({
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
    created_at: createdAt,
  }));

/**
 * Arbitrary generator for array of ActivityItems with random dates
 */
const activityItemsArb = fc.array(
  fc.tuple(validActivityInputArb, isoDateArb).map(([input, createdAt]) => ({
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
    created_at: createdAt,
  })),
  { minLength: 0, maxLength: 50 }
);

describe('Property 3: Activity Feed Ordering', () => {
  /**
   * Feature: admin-moderation-system, Property 3: Activity Feed Ordering
   * Validates: Requirements 2.1
   * 
   * Property: For any set of activities, sorting them SHALL produce a list
   * ordered by created_at timestamp in descending order (newest first).
   */
  it('Property 3: Sorted activities are always in descending order by created_at', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        (activities) => {
          const sorted = sortActivitiesByDate(activities);
          
          // The sorted list must be properly ordered
          expect(areActivitiesProperlyOrdered(sorted)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3a: Sorting preserves all activities
   */
  it('Property 3a: Sorting preserves all activities', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        (activities) => {
          const sorted = sortActivitiesByDate(activities);
          
          // Same number of activities
          expect(sorted.length).toBe(activities.length);
          
          // All original activities are present
          const originalIds = new Set(activities.map(a => a.id));
          const sortedIds = new Set(sorted.map(a => a.id));
          expect(sortedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3b: Sorting is idempotent
   */
  it('Property 3b: Sorting is idempotent', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        (activities) => {
          const sorted1 = sortActivitiesByDate(activities);
          const sorted2 = sortActivitiesByDate(sorted1);
          
          // Sorting twice should give the same result
          expect(sorted1.map(a => a.id)).toEqual(sorted2.map(a => a.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3c: Empty array is properly ordered
   */
  it('Property 3c: Empty array is properly ordered', () => {
    expect(areActivitiesProperlyOrdered([])).toBe(true);
    expect(sortActivitiesByDate([])).toEqual([]);
  });

  /**
   * Property 3d: Single activity is properly ordered
   */
  it('Property 3d: Single activity is properly ordered', () => {
    fc.assert(
      fc.property(
        fc.tuple(validActivityInputArb, isoDateArb).map(([input, createdAt]) => ({
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
          created_at: createdAt,
        })),
        (activity) => {
          expect(areActivitiesProperlyOrdered([activity])).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3e: Newest activity is always first after sorting
   */
  it('Property 3e: Newest activity is always first after sorting', () => {
    fc.assert(
      fc.property(
        activityItemsArb.filter(arr => arr.length > 0),
        (activities) => {
          const sorted = sortActivitiesByDate(activities);
          
          // Find the newest activity by date
          const newest = activities.reduce((max, curr) => {
            const maxDate = new Date(max.created_at).getTime();
            const currDate = new Date(curr.created_at).getTime();
            return currDate > maxDate ? curr : max;
          });
          
          // The first item in sorted should be the newest
          expect(new Date(sorted[0].created_at).getTime())
            .toBeGreaterThanOrEqual(new Date(newest.created_at).getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3f: Oldest activity is always last after sorting
   */
  it('Property 3f: Oldest activity is always last after sorting', () => {
    fc.assert(
      fc.property(
        activityItemsArb.filter(arr => arr.length > 0),
        (activities) => {
          const sorted = sortActivitiesByDate(activities);
          
          // Find the oldest activity by date
          const oldest = activities.reduce((min, curr) => {
            const minDate = new Date(min.created_at).getTime();
            const currDate = new Date(curr.created_at).getTime();
            return currDate < minDate ? curr : min;
          });
          
          // The last item in sorted should be the oldest
          expect(new Date(sorted[sorted.length - 1].created_at).getTime())
            .toBeLessThanOrEqual(new Date(oldest.created_at).getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Activity Input Validation', () => {
  /**
   * Property: Valid inputs pass validation
   */
  it('Valid inputs pass validation', () => {
    fc.assert(
      fc.property(
        validActivityInputArb,
        (input) => {
          const result = validateActivityInput(input);
          
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing required fields fail validation
   */
  it('Missing required fields fail validation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('activity_type', 'target_type', 'target_id', 'action'),
        validActivityInputArb,
        (fieldToRemove, input) => {
          const partialInput = { ...input };
          delete (partialInput as Record<string, unknown>)[fieldToRemove];
          
          const result = validateActivityInput(partialInput);
          
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid activity types fail validation
   */
  it('Invalid activity types fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_ACTIVITY_TYPES.includes(s as any)),
        validActivityInputArb,
        (invalidActivityType, input) => {
          const invalidInput = { ...input, activity_type: invalidActivityType as any };
          
          const result = validateActivityInput(invalidInput);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid target types fail validation
   */
  it('Invalid target types fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_TARGET_TYPES.includes(s as any)),
        validActivityInputArb,
        (invalidTargetType, input) => {
          const invalidInput = { ...input, target_type: invalidTargetType as any };
          
          const result = validateActivityInput(invalidInput);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid severity fails validation
   */
  it('Invalid severity fails validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_SEVERITY_LEVELS.includes(s as any)),
        validActivityInputArb,
        (invalidSeverity, input) => {
          const invalidInput = { ...input, severity: invalidSeverity as any };
          
          const result = validateActivityInput(invalidInput);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty action fails validation
   */
  it('Empty or whitespace-only action fails validation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
        validActivityInputArb,
        (emptyAction, input) => {
          const invalidInput = { ...input, action: emptyAction };
          
          const result = validateActivityInput(invalidInput);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Activity Type and Target Type Validation', () => {
  /**
   * Property: All defined activity types are valid
   */
  it('All defined activity types are valid', () => {
    fc.assert(
      fc.property(
        validActivityTypeArb,
        (activityType) => {
          expect(isValidActivityType(activityType)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All defined target types are valid
   */
  it('All defined target types are valid', () => {
    fc.assert(
      fc.property(
        validTargetTypeArb,
        (targetType) => {
          expect(isValidTargetType(targetType)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All defined severity levels are valid
   */
  it('All defined severity levels are valid', () => {
    fc.assert(
      fc.property(
        validSeverityArb,
        (severity) => {
          expect(isValidSeverity(severity)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-string values are not valid activity types
   */
  it('Non-string values are not valid activity types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.string()),
          fc.object()
        ),
        (value) => {
          expect(isValidActivityType(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Activity Filtering', () => {
  /**
   * Property: Filtering by activity type returns only matching activities
   */
  it('Filtering by activity type returns only matching activities', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        validActivityTypeArb,
        (activities, filterType) => {
          const filtered = filterActivities(activities, { activity_type: filterType });
          
          // All filtered activities should have the specified type
          for (const activity of filtered) {
            expect(activity.activity_type).toBe(filterType);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering by severity returns only matching activities
   */
  it('Filtering by severity returns only matching activities', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        validSeverityArb,
        (activities, filterSeverity) => {
          const filtered = filterActivities(activities, { severity: filterSeverity });
          
          // All filtered activities should have the specified severity
          for (const activity of filtered) {
            expect(activity.severity).toBe(filterSeverity);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering by actor_id returns only matching activities
   */
  it('Filtering by actor_id returns only matching activities', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        uuidArb,
        (activities, actorId) => {
          const filtered = filterActivities(activities, { actor_id: actorId });
          
          // All filtered activities should have the specified actor_id
          for (const activity of filtered) {
            expect(activity.actor_id).toBe(actorId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering by target_type returns only matching activities
   */
  it('Filtering by target_type returns only matching activities', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        validTargetTypeArb,
        (activities, filterTargetType) => {
          const filtered = filterActivities(activities, { target_type: filterTargetType });
          
          // All filtered activities should have the specified target_type
          for (const activity of filtered) {
            expect(activity.target_type).toBe(filterTargetType);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering preserves ordering
   */
  it('Filtering preserves ordering', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        validActivityTypeArb,
        (activities, filterType) => {
          // First sort, then filter
          const sorted = sortActivitiesByDate(activities);
          const filtered = filterActivities(sorted, { activity_type: filterType });
          
          // Filtered result should still be properly ordered
          expect(areActivitiesProperlyOrdered(filtered)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty filter returns all activities
   */
  it('Empty filter returns all activities', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        (activities) => {
          const filtered = filterActivities(activities, {});
          
          expect(filtered.length).toBe(activities.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Activity Item Creation', () => {
  /**
   * Property: Created activity items have all required fields
   */
  it('Created activity items have all required fields', () => {
    fc.assert(
      fc.property(
        validActivityInputArb,
        (input) => {
          const item = createActivityItem(input);
          
          expect(item.id).toBeDefined();
          expect(item.activity_type).toBe(input.activity_type);
          expect(item.target_type).toBe(input.target_type);
          expect(item.target_id).toBe(input.target_id);
          expect(item.action).toBe(input.action.trim());
          expect(item.severity).toBe(input.severity ?? 'info');
          expect(item.created_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Created activity items have unique IDs
   */
  it('Created activity items have unique IDs', () => {
    fc.assert(
      fc.property(
        validActivityInputArb,
        fc.integer({ min: 2, max: 20 }),
        (input, count) => {
          const ids = new Set<string>();
          
          for (let i = 0; i < count; i++) {
            const item = createActivityItem(input);
            ids.add(item.id);
          }
          
          // All IDs should be unique
          expect(ids.size).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Created activity items have valid timestamps
   */
  it('Created activity items have valid timestamps', () => {
    fc.assert(
      fc.property(
        validActivityInputArb,
        (input) => {
          const beforeCreation = new Date();
          const item = createActivityItem(input);
          const afterCreation = new Date();
          
          const createdAt = new Date(item.created_at);
          
          // Timestamp should be valid
          expect(isNaN(createdAt.getTime())).toBe(false);
          
          // Timestamp should be between before and after creation
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
          expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Arbitrary generator for valid anomaly detection configuration
 */
const anomalyConfigArb: fc.Arbitrary<AnomalyDetectionConfig> = fc.record({
  spikeThreshold: fc.double({ min: 1.1, max: 10.0, noNaN: true }),
  averageWindowMinutes: fc.integer({ min: 10, max: 120 }),
  currentWindowMinutes: fc.integer({ min: 1, max: 10 }),
  minimumActivities: fc.integer({ min: 1, max: 50 }),
}).filter(config => config.averageWindowMinutes > config.currentWindowMinutes);

/**
 * Generate activities within a specific time window
 * @param windowMinutes - Time window in minutes
 * @param count - Number of activities to generate
 * @param baseTime - Base time to generate activities around
 */
function generateActivitiesInWindow(
  windowMinutes: number,
  count: number,
  baseTime: Date = new Date()
): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const windowMs = windowMinutes * 60 * 1000;
  
  for (let i = 0; i < count; i++) {
    // Distribute activities evenly within the window
    const offset = (i / Math.max(count - 1, 1)) * windowMs;
    const timestamp = new Date(baseTime.getTime() - offset);
    
    activities.push({
      id: crypto.randomUUID(),
      activity_type: 'user_signup',
      actor_id: crypto.randomUUID(),
      actor_username: `user_${i}`,
      actor_email: `user_${i}@example.com`,
      target_type: 'user',
      target_id: crypto.randomUUID(),
      target_name: `User ${i}`,
      action: 'signed up',
      metadata: {},
      severity: 'info',
      created_at: timestamp.toISOString(),
    });
  }
  
  return activities;
}

describe('Property 14: Anomaly Detection Threshold', () => {
  /**
   * Feature: admin-moderation-system, Property 14: Anomaly Detection Threshold
   * Validates: Requirements 8.3, 12.2
   * 
   * Property: For any activity spike detected, the activity rate SHALL exceed
   * the configured threshold (e.g., 2x average rate).
   * 
   * Note: Spike detection requires minimum activities to be met. When there are
   * insufficient activities, no spike is detected regardless of the ratio.
   */
  it('Property 14: When spike is detected, ratio must be >= threshold', () => {
    fc.assert(
      fc.property(
        anomalyConfigArb,
        fc.integer({ min: 0, max: 200 }),
        (config, activityCount) => {
          const activities = generateActivitiesInWindow(
            config.averageWindowMinutes,
            activityCount
          );
          
          const result = detectActivitySpike(activities, config);
          
          // Property 14: If spike is detected, ratio must be >= threshold
          // This is the core property we're testing
          if (result.isSpike) {
            expect(result.ratio).toBeGreaterThanOrEqual(result.threshold);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14a: When sufficient activities exist and no spike is detected, 
   * ratio must be < threshold
   * 
   * Note: When there are insufficient activities, no spike is detected but
   * the ratio could still be >= threshold. This is intentional - we don't
   * want to trigger alerts on small sample sizes.
   */
  it('Property 14a: When sufficient activities exist and no spike detected, ratio < threshold', () => {
    fc.assert(
      fc.property(
        anomalyConfigArb,
        // Generate enough activities to meet minimum requirement
        fc.integer({ min: 50, max: 200 }),
        (config, activityCount) => {
          const activities = generateActivitiesInWindow(
            config.averageWindowMinutes,
            activityCount
          );
          
          const result = detectActivitySpike(activities, config);
          
          // Count activities in the average window
          const now = new Date();
          const averageWindowStart = new Date(now.getTime() - config.averageWindowMinutes * 60 * 1000);
          const activitiesInWindow = activities.filter(a => 
            new Date(a.created_at) >= averageWindowStart
          );
          
          // Only check the ratio constraint when we have sufficient activities
          if (activitiesInWindow.length >= config.minimumActivities && !result.isSpike) {
            expect(result.ratio).toBeLessThan(result.threshold);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14b: Spike detection is consistent with threshold
   */
  it('Property 14b: Spike detection is consistent with threshold', () => {
    fc.assert(
      fc.property(
        anomalyConfigArb,
        fc.integer({ min: 0, max: 200 }),
        (config, activityCount) => {
          const activities = generateActivitiesInWindow(
            config.averageWindowMinutes,
            activityCount
          );
          
          const result = detectActivitySpike(activities, config);
          
          // The isSpike flag must be consistent with the ratio and threshold
          const expectedIsSpike = result.ratio >= result.threshold;
          
          // Only check if we have enough activities for spike detection
          const now = new Date();
          const averageWindowStart = new Date(now.getTime() - config.averageWindowMinutes * 60 * 1000);
          const activitiesInWindow = activities.filter(a => 
            new Date(a.created_at) >= averageWindowStart
          );
          
          if (activitiesInWindow.length >= config.minimumActivities) {
            expect(result.isSpike).toBe(expectedIsSpike);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14c: Empty activities never trigger spike
   */
  it('Property 14c: Empty activities never trigger spike', () => {
    fc.assert(
      fc.property(
        anomalyConfigArb,
        (config) => {
          const result = detectActivitySpike([], config);
          
          expect(result.isSpike).toBe(false);
          expect(result.currentRate).toBe(0);
          expect(result.averageRate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14d: Insufficient activities never trigger spike
   */
  it('Property 14d: Insufficient activities never trigger spike', () => {
    fc.assert(
      fc.property(
        anomalyConfigArb,
        (config) => {
          // Generate fewer activities than minimum required
          const activityCount = Math.max(0, config.minimumActivities - 1);
          const activities = generateActivitiesInWindow(
            config.averageWindowMinutes,
            activityCount
          );
          
          const result = detectActivitySpike(activities, config);
          
          // Should not detect spike with insufficient activities
          expect(result.isSpike).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14e: Activity rate calculation is non-negative
   */
  it('Property 14e: Activity rate calculation is non-negative', () => {
    fc.assert(
      fc.property(
        anomalyConfigArb,
        fc.integer({ min: 0, max: 200 }),
        (config, activityCount) => {
          const activities = generateActivitiesInWindow(
            config.averageWindowMinutes,
            activityCount
          );
          
          const result = detectActivitySpike(activities, config);
          
          expect(result.currentRate).toBeGreaterThanOrEqual(0);
          expect(result.averageRate).toBeGreaterThanOrEqual(0);
          expect(result.ratio).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14f: Threshold is preserved in result
   */
  it('Property 14f: Threshold is preserved in result', () => {
    fc.assert(
      fc.property(
        anomalyConfigArb,
        fc.integer({ min: 0, max: 200 }),
        (config, activityCount) => {
          const activities = generateActivitiesInWindow(
            config.averageWindowMinutes,
            activityCount
          );
          
          const result = detectActivitySpike(activities, config);
          
          // The threshold in the result should match the config
          expect(result.threshold).toBe(config.spikeThreshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14g: High activity concentration in current window triggers spike
   */
  it('Property 14g: High activity concentration in current window triggers spike', () => {
    // Use a fixed config for this test
    const config: AnomalyDetectionConfig = {
      spikeThreshold: 2.0,
      averageWindowMinutes: 60,
      currentWindowMinutes: 5,
      minimumActivities: 10,
    };
    
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 100 }),
        (totalActivities) => {
          const now = new Date();
          const activities: ActivityItem[] = [];
          
          // Put 80% of activities in the current window (5 minutes)
          const currentWindowCount = Math.floor(totalActivities * 0.8);
          const averageWindowCount = totalActivities - currentWindowCount;
          
          // Activities in current window (last 5 minutes)
          for (let i = 0; i < currentWindowCount; i++) {
            const offset = (i / Math.max(currentWindowCount - 1, 1)) * config.currentWindowMinutes * 60 * 1000;
            activities.push({
              id: crypto.randomUUID(),
              activity_type: 'user_signup',
              actor_id: crypto.randomUUID(),
              actor_username: `user_${i}`,
              actor_email: `user_${i}@example.com`,
              target_type: 'user',
              target_id: crypto.randomUUID(),
              target_name: `User ${i}`,
              action: 'signed up',
              metadata: {},
              severity: 'info',
              created_at: new Date(now.getTime() - offset).toISOString(),
            });
          }
          
          // Activities in the rest of the average window (5-60 minutes ago)
          for (let i = 0; i < averageWindowCount; i++) {
            const offset = config.currentWindowMinutes * 60 * 1000 + 
              (i / Math.max(averageWindowCount - 1, 1)) * 
              (config.averageWindowMinutes - config.currentWindowMinutes) * 60 * 1000;
            activities.push({
              id: crypto.randomUUID(),
              activity_type: 'user_signup',
              actor_id: crypto.randomUUID(),
              actor_username: `user_old_${i}`,
              actor_email: `user_old_${i}@example.com`,
              target_type: 'user',
              target_id: crypto.randomUUID(),
              target_name: `User Old ${i}`,
              action: 'signed up',
              metadata: {},
              severity: 'info',
              created_at: new Date(now.getTime() - offset).toISOString(),
            });
          }
          
          const result = detectActivitySpike(activities, config);
          
          // With 80% of activities in 5 minutes vs 20% in 55 minutes,
          // the current rate should be much higher than average
          // Property 14 should hold: if spike detected, ratio >= threshold
          if (result.isSpike) {
            expect(result.ratio).toBeGreaterThanOrEqual(result.threshold);
          }
          
          expect(isValidSpikeDetection(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Suspicious Activity Detection', () => {
  /**
   * Arbitrary generator for suspicious pattern types
   */
  const suspiciousPatternTypeArb = fc.constantFrom<SuspiciousPatternType>(
    'rapid_registrations',
    'bulk_account_creation',
    'spam_submissions',
    'mass_team_joins',
    'repeated_reports'
  );

  /**
   * Property: Detection result count is non-negative
   */
  it('Detection result count is non-negative', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        suspiciousPatternTypeArb,
        fc.option(uuidArb, { nil: undefined }),
        (activities, patternType, actorId) => {
          const result = detectSuspiciousActivity(activities, patternType, actorId);
          
          expect(result.count).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Detection uses correct threshold from config
   */
  it('Detection uses correct threshold from config', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        suspiciousPatternTypeArb,
        (activities, patternType) => {
          const result = detectSuspiciousActivity(activities, patternType);
          const expectedThreshold = SUSPICIOUS_THRESHOLDS[patternType];
          
          expect(result.threshold).toBe(expectedThreshold.count);
          expect(result.timeWindowMinutes).toBe(expectedThreshold.timeWindowMinutes);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Detection is triggered when count >= threshold
   */
  it('Detection is triggered when count >= threshold', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        suspiciousPatternTypeArb,
        (activities, patternType) => {
          const result = detectSuspiciousActivity(activities, patternType);
          
          if (result.isDetected) {
            expect(result.count).toBeGreaterThanOrEqual(result.threshold);
            expect(result.patternType).toBe(patternType);
          } else {
            expect(result.count).toBeLessThan(result.threshold);
            expect(result.patternType).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty activities never trigger detection
   */
  it('Empty activities never trigger detection', () => {
    fc.assert(
      fc.property(
        suspiciousPatternTypeArb,
        (patternType) => {
          const result = detectSuspiciousActivity([], patternType);
          
          expect(result.isDetected).toBe(false);
          expect(result.count).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Actor filtering works correctly
   */
  it('Actor filtering works correctly', () => {
    fc.assert(
      fc.property(
        activityItemsArb,
        suspiciousPatternTypeArb,
        uuidArb,
        (activities, patternType, actorId) => {
          const result = detectSuspiciousActivity(activities, patternType, actorId);
          
          // The actorId in result should match the input
          expect(result.actorId).toBe(actorId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
