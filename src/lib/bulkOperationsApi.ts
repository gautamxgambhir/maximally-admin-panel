/**
 * Bulk Operations API Functions
 * 
 * Provides API functions for bulk admin operations on hackathons and users.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { supabaseAdmin } from './supabase';
import { auditService } from './auditService';
import { activityService } from './activityService';
import type {
  BulkHackathonRequest,
  BulkUserRequest,
  BulkActionResponse,
  BulkActionItemResult,
} from '@/types/bulkOperations';
import type { AuditActionType } from '@/types/audit';
import {
  validateBulkHackathonRequest,
  validateBulkUserRequest,
  createBulkActionResponse,
  createSuccessResult,
  createFailureResult,
} from './bulkOperationsCore';

/**
 * Execute bulk hackathon operations
 * 
 * Requirement 4.1: Enable bulk actions including approve, reject, unpublish,
 * delete, feature, unfeature on multiple hackathons.
 * 
 * @param request - The bulk hackathon request
 * @param adminId - The admin's user ID
 * @param adminEmail - The admin's email
 * @returns Bulk action response with results
 */
export async function bulkHackathonAction(
  request: BulkHackathonRequest,
  adminId: string,
  adminEmail: string
): Promise<BulkActionResponse> {
  // Validate request
  const validation = validateBulkHackathonRequest(request);
  if (!validation.valid) {
    throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
  }

  const results: BulkActionItemResult[] = [];

  // Process each hackathon
  for (const id of request.ids) {
    try {
      await processHackathonAction(id, request.action, request.reason, adminId, adminEmail);
      results.push(createSuccessResult(id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push(createFailureResult(id, errorMessage));
    }
  }

  // Log bulk action to audit
  await auditService.createLog({
    action_type: 'bulk_action',
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'hackathon',
    target_id: `bulk:${request.ids.join(',')}`,
    reason: request.reason,
    before_state: { ids: request.ids, action: request.action },
    after_state: createBulkActionResponse(results) as unknown as Record<string, unknown>,
  });

  return createBulkActionResponse(results);
}

/**
 * Process a single hackathon action
 */
async function processHackathonAction(
  id: number,
  action: string,
  reason: string,
  adminId: string,
  adminEmail: string
): Promise<void> {
  // Get current hackathon state
  const { data: hackathon, error: getError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .eq('id', id)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new Error('Hackathon not found');
    }
    throw new Error(`Failed to get hackathon: ${getError.message}`);
  }

  let updateData: Record<string, unknown> = {};
  let actionType: AuditActionType = 'hackathon_edited';

  switch (action) {
    case 'approve':
      if (hackathon.status !== 'pending_review') {
        throw new Error('Only pending hackathons can be approved');
      }
      updateData = {
        status: 'published',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      };
      actionType = 'hackathon_approved';
      break;

    case 'reject':
      if (hackathon.status !== 'pending_review') {
        throw new Error('Only pending hackathons can be rejected');
      }
      updateData = {
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      };
      actionType = 'hackathon_rejected';
      break;

    case 'unpublish':
      if (hackathon.status !== 'published') {
        throw new Error('Only published hackathons can be unpublished');
      }
      updateData = {
        status: 'unpublished',
        admin_notes: reason,
      };
      actionType = 'hackathon_unpublished';
      break;

    case 'delete':
      // Delete the hackathon
      const { error: deleteError } = await supabaseAdmin
        .from('organizer_hackathons')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Failed to delete hackathon: ${deleteError.message}`);
      }

      // Log deletion
      await auditService.createLog({
        action_type: 'hackathon_deleted',
        admin_id: adminId,
        admin_email: adminEmail,
        target_type: 'hackathon',
        target_id: String(id),
        reason,
        before_state: hackathon as Record<string, unknown>,
        after_state: null,
      });

      return; // Exit early for delete

    case 'feature':
      if (hackathon.featured_badge) {
        throw new Error('Hackathon is already featured');
      }
      updateData = { featured_badge: true };
      actionType = 'hackathon_featured';
      break;

    case 'unfeature':
      if (!hackathon.featured_badge) {
        throw new Error('Hackathon is not featured');
      }
      updateData = { featured_badge: false };
      actionType = 'hackathon_unfeatured';
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  // Update hackathon
  updateData.updated_at = new Date().toISOString();

  const { data: updatedHackathon, error: updateError } = await supabaseAdmin
    .from('organizer_hackathons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update hackathon: ${updateError.message}`);
  }

  // Log individual action
  await auditService.createLog({
    action_type: actionType,
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'hackathon',
    target_id: String(id),
    reason,
    before_state: hackathon as Record<string, unknown>,
    after_state: updatedHackathon as Record<string, unknown>,
  });
}

/**
 * Execute bulk user operations
 * 
 * Requirement 4.2: Enable bulk actions including warn, mute, suspend, ban,
 * unban on multiple users.
 * 
 * @param request - The bulk user request
 * @param adminId - The admin's user ID
 * @param adminEmail - The admin's email
 * @returns Bulk action response with results
 */
export async function bulkUserAction(
  request: BulkUserRequest,
  adminId: string,
  adminEmail: string
): Promise<BulkActionResponse> {
  // Validate request
  const validation = validateBulkUserRequest(request);
  if (!validation.valid) {
    throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
  }

  const results: BulkActionItemResult[] = [];

  // Process each user
  for (const id of request.ids) {
    try {
      await processUserAction(
        id,
        request.action,
        request.reason,
        request.duration_hours,
        adminId,
        adminEmail
      );
      results.push(createSuccessResult(id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push(createFailureResult(id, errorMessage));
    }
  }

  // Log bulk action to audit
  await auditService.createLog({
    action_type: 'bulk_action',
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'user',
    target_id: `bulk:${request.ids.join(',')}`,
    reason: request.reason,
    before_state: { ids: request.ids, action: request.action, duration_hours: request.duration_hours },
    after_state: createBulkActionResponse(results) as unknown as Record<string, unknown>,
  });

  return createBulkActionResponse(results);
}

/**
 * Process a single user action
 */
async function processUserAction(
  id: string,
  action: string,
  reason: string,
  durationHours: number | undefined,
  adminId: string,
  adminEmail: string
): Promise<void> {
  // Get current user state
  const { data: user, error: getError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new Error('User not found');
    }
    throw new Error(`Failed to get user: ${getError.message}`);
  }

  let actionType: AuditActionType = 'user_warned';
  let metadata: Record<string, unknown> = {};

  switch (action) {
    case 'warn':
      actionType = 'user_warned';
      metadata = { warning_reason: reason };
      break;

    case 'mute':
      if (!durationHours) {
        throw new Error('duration_hours is required for mute action');
      }
      actionType = 'user_muted';
      metadata = {
        mute_reason: reason,
        mute_duration_hours: durationHours,
        mute_expires_at: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
      };
      break;

    case 'suspend':
      if (!durationHours) {
        throw new Error('duration_hours is required for suspend action');
      }
      actionType = 'user_suspended';
      metadata = {
        suspend_reason: reason,
        suspend_duration_hours: durationHours,
        suspend_expires_at: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
      };
      break;

    case 'ban':
      actionType = 'user_banned';
      metadata = { ban_reason: reason };
      break;

    case 'unban':
      actionType = 'user_unbanned';
      metadata = { unban_reason: reason };
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  // Log the action to audit
  await auditService.createLog({
    action_type: actionType,
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'user',
    target_id: id,
    reason,
    before_state: user as Record<string, unknown>,
    after_state: { ...user, moderation_action: action, ...metadata },
  });

  // Log activity
  await activityService.logActivity({
    activity_type: 'moderation_action',
    actor_id: adminId,
    actor_email: adminEmail,
    target_type: 'user',
    target_id: id,
    target_name: user.username ?? user.email,
    action: `User ${action}`,
    metadata: {
      reason,
      ...metadata,
    },
    severity: action === 'ban' ? 'critical' : action === 'warn' ? 'info' : 'warning',
  });
}

