/**
 * Queue API Functions
 * 
 * Provides API functions for the moderation queue.
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
  calculatePriority,
  getQueueCounts,
  PRIORITY_THRESHOLDS,
} from './queueCore';

/**
 * Add an item to the moderation queue
 * 
 * @param input - The queue item input
 * @returns The created queue item
 */
export async function addToQueue(input: AddToQueueInput): Promise<QueueItem> {
  // Check if item already exists
  const { data: existing } = await supabaseAdmin
    .from('moderation_queue')
    .select('*')
    .eq('target_type', input.target_type)
    .eq('target_id', input.target_id)
    .in('status', ['pending', 'claimed'])
    .single();

  if (existing) {
    // Update existing item
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

    if (error) throw new Error(`Failed to update queue item: ${error.message}`);
    return data as QueueItem;
  }

  // Create new item
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

  if (error) throw new Error(`Failed to add to queue: ${error.message}`);
  return data as QueueItem;
}

/**
 * Query queue items with filtering
 * 
 * GET /api/admin/queue
 */
export async function getQueueItems(
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

  query = query
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to query queue: ${error.message}`);

  const items = (data ?? []) as QueueItem[];
  const total = count ?? 0;

  // Get counts
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
 */
export async function getQueueItemById(id: string): Promise<QueueItem | null> {
  const { data, error } = await supabaseAdmin
    .from('moderation_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get queue item: ${error.message}`);
  }

  return data as QueueItem;
}

/**
 * Claim a queue item
 * 
 * POST /api/admin/queue/:id/claim
 */
export async function claimQueueItem(
  id: string,
  adminId: string
): Promise<QueueItem> {
  const { data, error } = await supabaseAdmin
    .from('moderation_queue')
    .update({
      claimed_by: adminId,
      claimed_at: new Date().toISOString(),
      status: 'claimed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('claimed_by', null)
    .in('status', ['pending'])
    .select()
    .single();

  if (error) throw new Error(`Failed to claim item: ${error.message}`);
  if (!data) throw new Error('Item was already claimed or not found');

  return data as QueueItem;
}

/**
 * Release a queue item
 * 
 * POST /api/admin/queue/:id/release
 */
export async function releaseQueueItem(
  id: string,
  adminId: string
): Promise<QueueItem> {
  const { data, error } = await supabaseAdmin
    .from('moderation_queue')
    .update({
      claimed_by: null,
      claimed_at: null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('claimed_by', adminId)
    .select()
    .single();

  if (error) throw new Error(`Failed to release item: ${error.message}`);
  if (!data) throw new Error('Item not found or not claimed by you');

  return data as QueueItem;
}

/**
 * Resolve a queue item
 * 
 * POST /api/admin/queue/:id/resolve
 */
export async function resolveQueueItem(
  id: string,
  adminId: string,
  input: ResolveQueueInput
): Promise<QueueItem> {
  const finalStatus = input.resolution === 'dismissed' ? 'dismissed' : 'resolved';

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
    .eq('claimed_by', adminId)
    .select()
    .single();

  if (error) throw new Error(`Failed to resolve item: ${error.message}`);
  if (!data) throw new Error('Item not found or not claimed by you');

  return data as QueueItem;
}

/**
 * Get pending queue count
 */
export async function getPendingQueueCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('moderation_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw new Error(`Failed to get pending count: ${error.message}`);
  return count ?? 0;
}
