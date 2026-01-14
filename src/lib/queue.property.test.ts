/**
 * Property-Based Tests for Moderation Queue
 * 
 * Feature: admin-moderation-system
 * 
 * Property 4: Moderation Queue Priority Sorting
 * Validates: Requirements 6.2
 * 
 * Property 5: Queue Claim Exclusivity
 * Validates: Requirements 6.5
 * 
 * Property 16: Queue Processing Completeness
 * Validates: Requirements 6.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateAddToQueueInput,
  calculatePriority,
  sortQueueByPriority,
  areQueueItemsProperlyOrdered,
  filterQueueItems,
  canClaimQueueItem,
  canReleaseQueueItem,
  canResolveQueueItem,
  getQueueCounts,
  createQueueItem,
  isValidQueueItemType,
  isValidQueueStatus,
  VALID_QUEUE_ITEM_TYPES,
  VALID_QUEUE_STATUSES,
  PRIORITY_THRESHOLDS,
  CONTENT_TYPE_PRIORITY_WEIGHTS,
} from './queueCore';
import type {
  QueueItem,
  QueueItemType,
  QueueItemStatus,
  AddToQueueInput,
} from '@/types/queue';

/**
 * Arbitrary generators
 */
const validQueueItemTypeArb = fc.constantFrom(...VALID_QUEUE_ITEM_TYPES);
const validQueueStatusArb = fc.constantFrom(...VALID_QUEUE_STATUSES);
const uuidArb = fc.uuid();
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);
const priorityArb = fc.integer({ min: 1, max: 10 });
const trustScoreArb = fc.integer({ min: 0, max: 100 });

/**
 * Arbitrary generator for valid AddToQueueInput
 */
const validAddToQueueInputArb: fc.Arbitrary<AddToQueueInput> = fc.record({
  item_type: validQueueItemTypeArb,
  title: nonEmptyStringArb,
  description: fc.option(nonEmptyStringArb, { nil: undefined }),
  target_type: nonEmptyStringArb,
  target_id: nonEmptyStringArb,
  target_data: fc.option(fc.dictionary(fc.string(), fc.string()), { nil: undefined }),
  reporter_id: fc.option(uuidArb, { nil: undefined }),
  reporter_trust_score: fc.option(trustScoreArb, { nil: undefined }),
});

/**
 * Arbitrary generator for ISO date strings
 */
const isoDateArb = fc.integer({
  min: new Date('2024-01-01').getTime(),
  max: new Date('2026-12-31').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * Arbitrary generator for QueueItem
 */
const queueItemArb: fc.Arbitrary<QueueItem> = fc.record({
  id: uuidArb,
  item_type: validQueueItemTypeArb,
  priority: priorityArb,
  title: nonEmptyStringArb,
  description: fc.option(nonEmptyStringArb, { nil: null }),
  target_type: nonEmptyStringArb,
  target_id: nonEmptyStringArb,
  target_data: fc.option(fc.dictionary(fc.string(), fc.string()), { nil: null }),
  report_count: fc.integer({ min: 0, max: 100 }),
  reporter_ids: fc.array(uuidArb, { minLength: 0, maxLength: 10 }),
  claimed_by: fc.option(uuidArb, { nil: null }),
  claimed_at: fc.option(isoDateArb, { nil: null }),
  status: validQueueStatusArb,
  resolution: fc.option(nonEmptyStringArb, { nil: null }),
  resolved_by: fc.option(uuidArb, { nil: null }),
  resolved_at: fc.option(isoDateArb, { nil: null }),
  created_at: isoDateArb,
  updated_at: isoDateArb,
});

/**
 * Arbitrary generator for array of QueueItems
 */
const queueItemsArb = fc.array(queueItemArb, { minLength: 0, maxLength: 50 });

describe('Property 4: Moderation Queue Priority Sorting', () => {
  /**
   * Feature: admin-moderation-system, Property 4: Moderation Queue Priority Sorting
   * Validates: Requirements 6.2
   * 
   * Property: For any set of items in the moderation queue, they SHALL be sorted
   * by priority in descending order (highest priority first).
   */
  it('Property 4: Sorted queue items are always in descending priority order', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        (items) => {
          const sorted = sortQueueByPriority(items);
          expect(areQueueItemsProperlyOrdered(sorted)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4a: Sorting preserves all items
   */
  it('Property 4a: Sorting preserves all items', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        (items) => {
          const sorted = sortQueueByPriority(items);
          expect(sorted.length).toBe(items.length);
          
          const originalIds = new Set(items.map(i => i.id));
          const sortedIds = new Set(sorted.map(i => i.id));
          expect(sortedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4b: Sorting is idempotent
   */
  it('Property 4b: Sorting is idempotent', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        (items) => {
          const sorted1 = sortQueueByPriority(items);
          const sorted2 = sortQueueByPriority(sorted1);
          expect(sorted1.map(i => i.id)).toEqual(sorted2.map(i => i.id));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4c: Highest priority item is always first
   */
  it('Property 4c: Highest priority item is always first after sorting', () => {
    fc.assert(
      fc.property(
        queueItemsArb.filter(arr => arr.length > 0),
        (items) => {
          const sorted = sortQueueByPriority(items);
          const maxPriority = Math.max(...items.map(i => i.priority));
          expect(sorted[0].priority).toBe(maxPriority);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4d: Lowest priority item is always last
   */
  it('Property 4d: Lowest priority item is always last after sorting', () => {
    fc.assert(
      fc.property(
        queueItemsArb.filter(arr => arr.length > 0),
        (items) => {
          const sorted = sortQueueByPriority(items);
          const minPriority = Math.min(...items.map(i => i.priority));
          expect(sorted[sorted.length - 1].priority).toBe(minPriority);
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Property 5: Queue Claim Exclusivity', () => {
  /**
   * Feature: admin-moderation-system, Property 5: Queue Claim Exclusivity
   * Validates: Requirements 6.5
   * 
   * Property: For any queue item that is claimed by an admin, no other admin
   * SHALL be able to claim the same item until it is released or resolved.
   */
  it('Property 5: Claimed items cannot be claimed by other admins', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        uuidArb,
        (item, adminId1, adminId2) => {
          // Skip if same admin
          if (adminId1 === adminId2) return;
          
          // Create a claimed item
          const claimedItem: QueueItem = {
            ...item,
            claimed_by: adminId1,
            claimed_at: new Date().toISOString(),
            status: 'claimed',
          };
          
          // Another admin should not be able to claim
          const result = canClaimQueueItem(claimedItem, adminId2);
          expect(result.canClaim).toBe(false);
          expect(result.reason).toContain('already claimed');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5a: Unclaimed pending items can be claimed
   */
  it('Property 5a: Unclaimed pending items can be claimed', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        (item, adminId) => {
          // Create an unclaimed pending item
          const pendingItem: QueueItem = {
            ...item,
            claimed_by: null,
            claimed_at: null,
            status: 'pending',
          };
          
          const result = canClaimQueueItem(pendingItem, adminId);
          expect(result.canClaim).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5b: Resolved items cannot be claimed
   */
  it('Property 5b: Resolved items cannot be claimed', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        fc.constantFrom('resolved', 'dismissed') as fc.Arbitrary<QueueItemStatus>,
        (item, adminId, status) => {
          const resolvedItem: QueueItem = {
            ...item,
            status,
            resolved_by: item.claimed_by,
            resolved_at: new Date().toISOString(),
          };
          
          const result = canClaimQueueItem(resolvedItem, adminId);
          expect(result.canClaim).toBe(false);
          expect(result.reason).toContain('already');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5c: Same admin cannot claim twice
   */
  it('Property 5c: Same admin cannot claim an item they already claimed', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        (item, adminId) => {
          const claimedItem: QueueItem = {
            ...item,
            claimed_by: adminId,
            claimed_at: new Date().toISOString(),
            status: 'claimed',
          };
          
          const result = canClaimQueueItem(claimedItem, adminId);
          expect(result.canClaim).toBe(false);
          expect(result.reason).toContain('already claimed by you');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 16: Queue Processing Completeness', () => {
  /**
   * Feature: admin-moderation-system, Property 16: Queue Processing Completeness
   * Validates: Requirements 6.3
   * 
   * Property: For any queue item that is resolved, it SHALL be removed from
   * the pending queue and have a resolution logged.
   */
  it('Property 16: Only claimed items can be resolved', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        (item, adminId) => {
          // Unclaimed items cannot be resolved
          const unclaimedItem: QueueItem = {
            ...item,
            claimed_by: null,
            claimed_at: null,
            status: 'pending',
          };
          
          const result = canResolveQueueItem(unclaimedItem, adminId);
          expect(result.canResolve).toBe(false);
          expect(result.reason).toContain('claim');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16a: Items claimed by the admin can be resolved
   */
  it('Property 16a: Items claimed by the admin can be resolved', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        (item, adminId) => {
          const claimedItem: QueueItem = {
            ...item,
            claimed_by: adminId,
            claimed_at: new Date().toISOString(),
            status: 'claimed',
          };
          
          const result = canResolveQueueItem(claimedItem, adminId);
          expect(result.canResolve).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16b: Items claimed by other admins cannot be resolved
   */
  it('Property 16b: Items claimed by other admins cannot be resolved', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        uuidArb,
        (item, adminId1, adminId2) => {
          if (adminId1 === adminId2) return;
          
          const claimedItem: QueueItem = {
            ...item,
            claimed_by: adminId1,
            claimed_at: new Date().toISOString(),
            status: 'claimed',
          };
          
          const result = canResolveQueueItem(claimedItem, adminId2);
          expect(result.canResolve).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16c: Already resolved items cannot be resolved again
   */
  it('Property 16c: Already resolved items cannot be resolved again', () => {
    fc.assert(
      fc.property(
        queueItemArb,
        uuidArb,
        fc.constantFrom('resolved', 'dismissed') as fc.Arbitrary<QueueItemStatus>,
        (item, adminId, status) => {
          const resolvedItem: QueueItem = {
            ...item,
            claimed_by: adminId,
            status,
            resolved_by: adminId,
            resolved_at: new Date().toISOString(),
          };
          
          const result = canResolveQueueItem(resolvedItem, adminId);
          expect(result.canResolve).toBe(false);
          expect(result.reason).toContain('already');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Priority Calculation', () => {
  /**
   * Property: Priority is always within bounds (1-10)
   */
  it('Priority is always within bounds (1-10)', () => {
    fc.assert(
      fc.property(
        validAddToQueueInputArb,
        fc.integer({ min: 0, max: 100 }),
        (input, existingReportCount) => {
          const priority = calculatePriority(input, existingReportCount);
          expect(priority).toBeGreaterThanOrEqual(1);
          expect(priority).toBeLessThanOrEqual(10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: More reports increase priority
   */
  it('More reports increase or maintain priority', () => {
    fc.assert(
      fc.property(
        validAddToQueueInputArb,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (input, baseReports, additionalReports) => {
          const priority1 = calculatePriority(input, baseReports);
          const priority2 = calculatePriority(input, baseReports + additionalReports);
          expect(priority2).toBeGreaterThanOrEqual(priority1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Higher trust score increases priority
   */
  it('Higher trust score increases or maintains priority', () => {
    fc.assert(
      fc.property(
        validAddToQueueInputArb,
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 80, max: 100 }),
        (input, lowTrust, highTrust) => {
          const inputLowTrust = { ...input, reporter_trust_score: lowTrust };
          const inputHighTrust = { ...input, reporter_trust_score: highTrust };
          
          const priorityLow = calculatePriority(inputLowTrust, 0);
          const priorityHigh = calculatePriority(inputHighTrust, 0);
          
          expect(priorityHigh).toBeGreaterThanOrEqual(priorityLow);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Queue Filtering', () => {
  /**
   * Property: Filtering by item_type returns only matching items
   */
  it('Filtering by item_type returns only matching items', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        validQueueItemTypeArb,
        (items, filterType) => {
          const filtered = filterQueueItems(items, { item_type: filterType });
          for (const item of filtered) {
            expect(item.item_type).toBe(filterType);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering by status returns only matching items
   */
  it('Filtering by status returns only matching items', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        validQueueStatusArb,
        (items, filterStatus) => {
          const filtered = filterQueueItems(items, { status: filterStatus });
          for (const item of filtered) {
            expect(item.status).toBe(filterStatus);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty filter returns all items
   */
  it('Empty filter returns all items', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        (items) => {
          const filtered = filterQueueItems(items, {});
          expect(filtered.length).toBe(items.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering preserves priority order
   */
  it('Filtering preserves priority order', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        validQueueItemTypeArb,
        (items, filterType) => {
          const sorted = sortQueueByPriority(items);
          const filtered = filterQueueItems(sorted, { item_type: filterType });
          expect(areQueueItemsProperlyOrdered(filtered)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Queue Input Validation', () => {
  /**
   * Property: Valid inputs pass validation
   */
  it('Valid inputs pass validation', () => {
    fc.assert(
      fc.property(
        validAddToQueueInputArb,
        (input) => {
          const result = validateAddToQueueInput(input);
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
        fc.constantFrom('item_type', 'title', 'target_type', 'target_id'),
        validAddToQueueInputArb,
        (fieldToRemove, input) => {
          const partialInput = { ...input };
          delete (partialInput as Record<string, unknown>)[fieldToRemove];
          
          const result = validateAddToQueueInput(partialInput);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Queue Counts', () => {
  /**
   * Property: Total count equals sum of all items
   */
  it('Total count equals number of items', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        (items) => {
          const counts = getQueueCounts(items);
          expect(counts.total).toBe(items.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Pending + claimed <= total
   */
  it('Pending + claimed is less than or equal to total', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        (items) => {
          const counts = getQueueCounts(items);
          expect(counts.pending + counts.claimed).toBeLessThanOrEqual(counts.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sum of byType equals total
   */
  it('Sum of byType equals total', () => {
    fc.assert(
      fc.property(
        queueItemsArb,
        (items) => {
          const counts = getQueueCounts(items);
          const sumByType = Object.values(counts.byType).reduce((a, b) => a + b, 0);
          expect(sumByType).toBe(counts.total);
        }
      ),
      { numRuns: 100 }
    );
  });
});
