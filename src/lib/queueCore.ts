/**
 * Core Moderation Queue Functions (Pure, Testable)
 * 
 * This module contains pure functions for moderation queue operations that can be
 * tested without database access.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import type {
  QueueItem,
  QueueItemType,
  QueueItemStatus,
  AddToQueueInput,
  QueueFilters,
} from '@/types/queue';

/**
 * Valid queue item types
 */
export const VALID_QUEUE_ITEM_TYPES: readonly QueueItemType[] = [
  'hackathon',
  'user',
  'project',
  'report',
] as const;

/**
 * Valid queue item statuses
 */
export const VALID_QUEUE_STATUSES: readonly QueueItemStatus[] = [
  'pending',
  'claimed',
  'resolved',
  'dismissed',
] as const;

/**
 * Priority weights for different content types
 */
export const CONTENT_TYPE_PRIORITY_WEIGHTS: Record<QueueItemType, number> = {
  report: 3,      // Reports are highest priority
  user: 2,        // User issues are high priority
  hackathon: 1,   // Hackathon reviews are standard
  project: 1,     // Project reviews are standard
};

/**
 * Priority thresholds
 */
export const PRIORITY_THRESHOLDS = {
  high: 7,    // Priority >= 7 is high
  medium: 4,  // Priority >= 4 is medium
  low: 1,     // Priority >= 1 is low
} as const;

/**
 * Check if a value is a valid queue item type
 */
export function isValidQueueItemType(value: unknown): value is QueueItemType {
  return typeof value === 'string' && VALID_QUEUE_ITEM_TYPES.includes(value as QueueItemType);
}

/**
 * Check if a value is a valid queue status
 */
export function isValidQueueStatus(value: unknown): value is QueueItemStatus {
  return typeof value === 'string' && VALID_QUEUE_STATUSES.includes(value as QueueItemStatus);
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate add to queue input
 */
export function validateAddToQueueInput(input: Partial<AddToQueueInput>): ValidationResult {
  const errors: string[] = [];

  if (!input.item_type) {
    errors.push('item_type is required');
  } else if (!isValidQueueItemType(input.item_type)) {
    errors.push(`Invalid item_type: ${input.item_type}`);
  }

  if (!input.title) {
    errors.push('title is required');
  } else if (typeof input.title !== 'string' || input.title.trim() === '') {
    errors.push('title must be a non-empty string');
  }

  if (!input.target_type) {
    errors.push('target_type is required');
  } else if (typeof input.target_type !== 'string' || input.target_type.trim() === '') {
    errors.push('target_type must be a non-empty string');
  }

  if (!input.target_id) {
    errors.push('target_id is required');
  } else if (typeof input.target_id !== 'string' || input.target_id.trim() === '') {
    errors.push('target_id must be a non-empty string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


/**
 * Calculate priority for a queue item
 * 
 * Requirement 6.1: Calculate priority from report count, reporter trust scores,
 * and content type.
 * 
 * Priority is calculated as:
 * - Base priority from content type (1-3)
 * - +1 for each report (up to +3)
 * - +1 for high trust reporter (trust score > 70)
 * - +2 for very high trust reporter (trust score > 90)
 * 
 * Final priority is clamped to 1-10 range.
 * 
 * @param input - The queue item input
 * @param existingReportCount - Number of existing reports for this item
 * @returns Priority value between 1 and 10
 */
export function calculatePriority(
  input: AddToQueueInput,
  existingReportCount: number = 0
): number {
  // Base priority from content type
  let priority = CONTENT_TYPE_PRIORITY_WEIGHTS[input.item_type] ?? 1;

  // Add priority for report count (up to +3)
  const totalReports = existingReportCount + (input.reporter_id ? 1 : 0);
  priority += Math.min(totalReports, 3);

  // Add priority for reporter trust score
  if (input.reporter_trust_score !== undefined) {
    if (input.reporter_trust_score > 90) {
      priority += 2;
    } else if (input.reporter_trust_score > 70) {
      priority += 1;
    }
  }

  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, priority));
}

/**
 * Sort queue items by priority (descending)
 * 
 * Property 4: Moderation Queue Priority Sorting - For any set of items in the
 * moderation queue, they SHALL be sorted by priority in descending order.
 * 
 * @param items - Array of queue items to sort
 * @returns Sorted array (highest priority first)
 */
export function sortQueueByPriority(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    // Primary sort: priority descending
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    // Secondary sort: created_at ascending (older items first)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * Check if queue items are properly sorted by priority
 * 
 * Property 4: Validation helper
 * 
 * @param items - Array of queue items to check
 * @returns True if items are sorted by priority descending
 */
export function areQueueItemsProperlyOrdered(items: QueueItem[]): boolean {
  if (items.length <= 1) {
    return true;
  }

  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i];
    const next = items[i + 1];
    
    // Current priority should be >= next priority
    if (current.priority < next.priority) {
      return false;
    }
    
    // If same priority, current should be older or same age
    if (current.priority === next.priority) {
      const currentDate = new Date(current.created_at).getTime();
      const nextDate = new Date(next.created_at).getTime();
      if (currentDate > nextDate) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Filter queue items by criteria
 * 
 * Requirement 6.2: Filter by type, priority, status, claimed_by
 * 
 * @param items - Array of queue items to filter
 * @param filters - Filter criteria
 * @returns Filtered array of queue items
 */
export function filterQueueItems(
  items: QueueItem[],
  filters: QueueFilters
): QueueItem[] {
  return items.filter((item) => {
    // Filter by item type
    if (filters.item_type) {
      const types = Array.isArray(filters.item_type)
        ? filters.item_type
        : [filters.item_type];
      if (!types.includes(item.item_type)) {
        return false;
      }
    }

    // Filter by priority level
    if (filters.priority && filters.priority !== 'all') {
      if (filters.priority === 'high' && item.priority < PRIORITY_THRESHOLDS.high) {
        return false;
      }
      if (filters.priority === 'medium' && 
          (item.priority < PRIORITY_THRESHOLDS.medium || item.priority >= PRIORITY_THRESHOLDS.high)) {
        return false;
      }
      if (filters.priority === 'low' && item.priority >= PRIORITY_THRESHOLDS.medium) {
        return false;
      }
    }

    // Filter by status
    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      if (!statuses.includes(item.status)) {
        return false;
      }
    }

    // Filter by claimed_by
    if (filters.claimed_by) {
      if (filters.claimed_by === 'unclaimed' && item.claimed_by !== null) {
        return false;
      }
      if (filters.claimed_by !== 'unclaimed' && filters.claimed_by !== 'mine' && 
          item.claimed_by !== filters.claimed_by) {
        return false;
      }
    }

    // Filter by date range
    if (filters.date_from) {
      const itemDate = new Date(item.created_at);
      const fromDate = new Date(filters.date_from);
      if (itemDate < fromDate) {
        return false;
      }
    }

    if (filters.date_to) {
      const itemDate = new Date(item.created_at);
      const toDate = new Date(filters.date_to);
      if (itemDate > toDate) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if a queue item can be claimed
 * 
 * Property 5: Queue Claim Exclusivity - For any queue item that is claimed by
 * an admin, no other admin SHALL be able to claim the same item.
 * 
 * @param item - The queue item to check
 * @param adminId - The admin trying to claim
 * @returns Object with canClaim boolean and reason
 */
export function canClaimQueueItem(
  item: QueueItem,
  adminId: string
): { canClaim: boolean; reason: string } {
  // Already claimed by another admin
  if (item.claimed_by !== null && item.claimed_by !== adminId) {
    return {
      canClaim: false,
      reason: 'Item is already claimed by another admin',
    };
  }

  // Already claimed by this admin
  if (item.claimed_by === adminId) {
    return {
      canClaim: false,
      reason: 'Item is already claimed by you',
    };
  }

  // Item is resolved or dismissed
  if (item.status === 'resolved' || item.status === 'dismissed') {
    return {
      canClaim: false,
      reason: `Item is already ${item.status}`,
    };
  }

  return {
    canClaim: true,
    reason: 'Item can be claimed',
  };
}

/**
 * Check if a queue item can be released
 * 
 * @param item - The queue item to check
 * @param adminId - The admin trying to release
 * @returns Object with canRelease boolean and reason
 */
export function canReleaseQueueItem(
  item: QueueItem,
  adminId: string
): { canRelease: boolean; reason: string } {
  // Not claimed
  if (item.claimed_by === null) {
    return {
      canRelease: false,
      reason: 'Item is not claimed',
    };
  }

  // Claimed by another admin
  if (item.claimed_by !== adminId) {
    return {
      canRelease: false,
      reason: 'Item is claimed by another admin',
    };
  }

  // Item is resolved or dismissed
  if (item.status === 'resolved' || item.status === 'dismissed') {
    return {
      canRelease: false,
      reason: `Item is already ${item.status}`,
    };
  }

  return {
    canRelease: true,
    reason: 'Item can be released',
  };
}

/**
 * Check if a queue item can be resolved
 * 
 * Property 16: Queue Processing Completeness - For any queue item that is resolved,
 * it SHALL be removed from the pending queue and have a resolution logged.
 * 
 * @param item - The queue item to check
 * @param adminId - The admin trying to resolve
 * @returns Object with canResolve boolean and reason
 */
export function canResolveQueueItem(
  item: QueueItem,
  adminId: string
): { canResolve: boolean; reason: string } {
  // Item is already resolved or dismissed
  if (item.status === 'resolved' || item.status === 'dismissed') {
    return {
      canResolve: false,
      reason: `Item is already ${item.status}`,
    };
  }

  // Item must be claimed by this admin to resolve
  if (item.claimed_by !== adminId) {
    return {
      canResolve: false,
      reason: 'You must claim the item before resolving it',
    };
  }

  return {
    canResolve: true,
    reason: 'Item can be resolved',
  };
}

/**
 * Get queue counts by status and type
 * 
 * @param items - Array of queue items
 * @returns Counts object
 */
export function getQueueCounts(items: QueueItem[]): {
  total: number;
  pending: number;
  claimed: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  let pending = 0;
  let claimed = 0;

  for (const item of items) {
    // Count by type
    byType[item.item_type] = (byType[item.item_type] ?? 0) + 1;

    // Count by status
    if (item.status === 'pending') {
      pending++;
    } else if (item.status === 'claimed') {
      claimed++;
    }
  }

  return {
    total: items.length,
    pending,
    claimed,
    byType,
  };
}

/**
 * Create a queue item (for testing purposes)
 * 
 * @param input - The queue item input
 * @param existingReportCount - Number of existing reports
 * @returns The created queue item
 */
export function createQueueItem(
  input: AddToQueueInput,
  existingReportCount: number = 0
): QueueItem {
  const validation = validateAddToQueueInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid queue input: ${validation.errors.join(', ')}`);
  }

  const now = new Date().toISOString();
  const priority = calculatePriority(input, existingReportCount);

  return {
    id: crypto.randomUUID(),
    item_type: input.item_type,
    priority,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    target_type: input.target_type,
    target_id: input.target_id,
    target_data: input.target_data ?? null,
    report_count: existingReportCount + (input.reporter_id ? 1 : 0),
    reporter_ids: input.reporter_id ? [input.reporter_id] : [],
    claimed_by: null,
    claimed_at: null,
    status: 'pending',
    resolution: null,
    resolved_by: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
  };
}
