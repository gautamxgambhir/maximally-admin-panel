/**
 * Moderation Queue Types for Admin Moderation System
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

/**
 * Valid queue item types
 */
export type QueueItemType = 'hackathon' | 'user' | 'project' | 'report';

/**
 * Valid queue item statuses
 */
export type QueueItemStatus = 'pending' | 'claimed' | 'resolved' | 'dismissed';

/**
 * Valid resolution types
 */
export type QueueResolution = 'approved' | 'rejected' | 'dismissed' | 'escalated';

/**
 * Queue item as stored in the database
 */
export interface QueueItem {
  id: string;
  item_type: QueueItemType;
  priority: number; // 1-10, higher = more urgent
  title: string;
  description: string | null;
  target_type: string;
  target_id: string;
  target_data: Record<string, unknown> | null;
  report_count: number;
  reporter_ids: string[];
  claimed_by: string | null;
  claimed_at: string | null;
  status: QueueItemStatus;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for adding an item to the queue
 */
export interface AddToQueueInput {
  item_type: QueueItemType;
  title: string;
  description?: string;
  target_type: string;
  target_id: string;
  target_data?: Record<string, unknown>;
  reporter_id?: string;
  reporter_trust_score?: number;
}

/**
 * Input for resolving a queue item
 */
export interface ResolveQueueInput {
  resolution: QueueResolution;
  reason: string;
  action_taken?: string;
}

/**
 * Filters for querying queue items
 */
export interface QueueFilters {
  item_type?: QueueItemType | QueueItemType[];
  priority?: 'all' | 'high' | 'medium' | 'low';
  status?: QueueItemStatus | QueueItemStatus[];
  claimed_by?: string | 'unclaimed' | 'mine';
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

/**
 * Response for queue queries
 */
export interface QueueResponse {
  items: QueueItem[];
  counts: {
    total: number;
    pending: number;
    claimed: number;
    byType: Record<string, number>;
  };
  page: number;
  totalPages: number;
}
