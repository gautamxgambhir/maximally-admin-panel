/**
 * Queue Service for Admin Moderation System
 * 
 * Provides queue management for moderation tasks.
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import { supabaseAdmin } from './supabase';
import type {
  QueueItem,
  AddToQueueInput,
  ResolveQueueInput,
  QueueFilters,
  QueueResponse,
} from '@/types/queue';
import {
  validateAddToQueueInput,
  calculatePriority,
  sortQueueByPriority,
  filterQueueItems,
  canClaimQueueItem,
  canReleaseQueueItem,
  canResolveQueueItem,
  getQueueCounts,
  PRIORITY_THRESHOLDS,
} from './queueCore';

/**
 * QueueService class for managing moderation queue
 * 
 * This service provides methods to:
 * - Add items to the queue (Requirement 6.1)
 * - Query queue with filtering (Requirement 6.2)
 * - Process queue items (Requirement 6.3)
 * - Claim/release items (Requirement 6.5)
 */
export class QueueService {
  private static instance: QueueService;

  private constructor() {}

  /**
   * Get singleton instance of QueueService
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Add an item to the moderation queue
   * 
   * Requirement 6.1: Calculate priority from report count, reporter trust scores,
   * and content type.
   * 
   * @param input - The queue item input
   * @returns The created queue item
   */
  async addToQueue(input: AddToQueueInput): Promise<QueueItem> {
    // Validate input
    const validation = validateAddToQueueInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid queue input: ${validation.errors.join(', ')}`);
    }

    // Check if item already exists in queue
    const { data: existing } = await supabaseAdmin
      .from('moderation_queue')
      .select('*')
      .eq('target_type', input.target_type)
      .eq('target_id', input.target_id)
      .in('status', ['pending', 'claimed'])
      .single();

    if (existing) {
      // Update existing item with new report
      const updatedReporterIds = input.reporter_id
        ? [...(existing.reporter_ids || []), input.reporter_id]
        : existing.reporter_ids || [];
      
      const newReportCount = existing.report_count + (input.reporter_id ? 1 : 0);
      const newPriority = calculatePriority(input, newReportCount - 1);

      const { data, error } = await supabaseAdmin
        .from('moderation_queue')
        .update({
          report_count: newReportCount,
          reporter_ids: updatedReporterIds,
          priority: Math.max(existing.priority, newPriority),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update queue item: ${error.message}`);
      }

      return data as QueueItem;
    }

    // Create new queue item
    const priority = calculatePriority(input, 0);

    const { data, error } = await supabaseAdmin
      .from('moderation_queue')
      .insert({
        item_type: input.item_type,
        priority,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        target_type: input.target_type,
        target_id: input.target_id,
        target_data: input.target_data ?? null,
        report_count: input.reporter_id ? 1 : 0,
        reporter_ids: input.reporter_id ? [input.reporter_id] : [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add to queue: ${error.message}`);
    }

    return data as QueueItem;
  }


  /**
   * Query queue items with filtering
   * 
   * Requirement 6.2: Display items sorted by priority with tabs for different
   * content types.
   * 
   * @param filters - The filters to apply
   * @param adminId - Current admin ID (for 'mine' filter)
   * @returns Paginated queue response
   */
  async queryQueue(
    filters: QueueFilters = {},
    adminId?: string
  ): Promise<QueueResponse> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('moderation_queue')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.item_type) {
      if (Array.isArray(filters.item_type)) {
        query = query.in('item_type', filters.item_type);
      } else {
        query = query.eq('item_type', filters.item_type);
      }
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.priority && filters.priority !== 'all') {
      if (filters.priority === 'high') {
        query = query.gte('priority', PRIORITY_THRESHOLDS.high);
      } else if (filters.priority === 'medium') {
        query = query.gte('priority', PRIORITY_THRESHOLDS.medium)
          .lt('priority', PRIORITY_THRESHOLDS.high);
      } else if (filters.priority === 'low') {
        query = query.lt('priority', PRIORITY_THRESHOLDS.medium);
      }
    }

    if (filters.claimed_by) {
      if (filters.claimed_by === 'unclaimed') {
        query = query.is('claimed_by', null);
      } else if (filters.claimed_by === 'mine' && adminId) {
        query = query.eq('claimed_by', adminId);
      } else if (filters.claimed_by !== 'mine') {
        query = query.eq('claimed_by', filters.claimed_by);
      }
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Order by priority descending, then created_at ascending
    query = query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to query queue: ${error.message}`);
    }

    const items = (data ?? []) as QueueItem[];
    const total = count ?? 0;

    // Get counts for all items (unfiltered by pagination)
    const { data: allItems } = await supabaseAdmin
      .from('moderation_queue')
      .select('item_type, status')
      .in('status', ['pending', 'claimed']);

    const counts = getQueueCounts((allItems ?? []) as QueueItem[]);

    return {
      items,
      counts,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single queue item by ID
   * 
   * @param id - The queue item ID
   * @returns The queue item or null
   */
  async getQueueItem(id: string): Promise<QueueItem | null> {
    const { data, error } = await supabaseAdmin
      .from('moderation_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get queue item: ${error.message}`);
    }

    return data as QueueItem;
  }

  /**
   * Claim a queue item
   * 
   * Requirement 6.5: Lock item to admin, prevent duplicate claims.
   * Property 5: Queue Claim Exclusivity
   * 
   * @param id - The queue item ID
   * @param adminId - The admin claiming the item
   * @returns The claimed queue item
   */
  async claimItem(id: string, adminId: string): Promise<QueueItem> {
    // Get current item state
    const item = await this.getQueueItem(id);
    if (!item) {
      throw new Error('Queue item not found');
    }

    // Check if can claim
    const { canClaim, reason } = canClaimQueueItem(item, adminId);
    if (!canClaim) {
      throw new Error(reason);
    }

    // Claim the item
    const { data, error } = await supabaseAdmin
      .from('moderation_queue')
      .update({
        claimed_by: adminId,
        claimed_at: new Date().toISOString(),
        status: 'claimed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('claimed_by', null) // Ensure no race condition
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to claim item: ${error.message}`);
    }

    if (!data) {
      throw new Error('Item was claimed by another admin');
    }

    return data as QueueItem;
  }

  /**
   * Release a claimed queue item
   * 
   * Requirement 6.5: Release claimed item back to queue.
   * 
   * @param id - The queue item ID
   * @param adminId - The admin releasing the item
   * @returns The released queue item
   */
  async releaseItem(id: string, adminId: string): Promise<QueueItem> {
    // Get current item state
    const item = await this.getQueueItem(id);
    if (!item) {
      throw new Error('Queue item not found');
    }

    // Check if can release
    const { canRelease, reason } = canReleaseQueueItem(item, adminId);
    if (!canRelease) {
      throw new Error(reason);
    }

    // Release the item
    const { data, error } = await supabaseAdmin
      .from('moderation_queue')
      .update({
        claimed_by: null,
        claimed_at: null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('claimed_by', adminId) // Ensure only claimer can release
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to release item: ${error.message}`);
    }

    return data as QueueItem;
  }

  /**
   * Resolve a queue item
   * 
   * Requirement 6.3: Mark as resolved, log decision, remove from queue.
   * Property 16: Queue Processing Completeness
   * 
   * @param id - The queue item ID
   * @param adminId - The admin resolving the item
   * @param input - Resolution details
   * @returns The resolved queue item
   */
  async resolveItem(
    id: string,
    adminId: string,
    input: ResolveQueueInput
  ): Promise<QueueItem> {
    // Get current item state
    const item = await this.getQueueItem(id);
    if (!item) {
      throw new Error('Queue item not found');
    }

    // Check if can resolve
    const { canResolve, reason } = canResolveQueueItem(item, adminId);
    if (!canResolve) {
      throw new Error(reason);
    }

    // Determine final status
    const finalStatus = input.resolution === 'dismissed' ? 'dismissed' : 'resolved';

    // Resolve the item
    const { data, error } = await supabaseAdmin
      .from('moderation_queue')
      .update({
        status: finalStatus,
        resolution: `${input.resolution}: ${input.reason}${input.action_taken ? ` (Action: ${input.action_taken})` : ''}`,
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('claimed_by', adminId) // Ensure only claimer can resolve
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resolve item: ${error.message}`);
    }

    return data as QueueItem;
  }

  /**
   * Get pending queue count
   * 
   * Requirement 6.4: Display count badge in navigation.
   * 
   * @returns Number of pending items
   */
  async getPendingCount(): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('moderation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to get pending count: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Get queue items for a specific target
   * 
   * @param targetType - The target type
   * @param targetId - The target ID
   * @returns Array of queue items
   */
  async getQueueItemsForTarget(
    targetType: string,
    targetId: string
  ): Promise<QueueItem[]> {
    const { data, error } = await supabaseAdmin
      .from('moderation_queue')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get queue items for target: ${error.message}`);
    }

    return (data ?? []) as QueueItem[];
  }
}

// Export singleton instance
export const queueService = QueueService.getInstance();
