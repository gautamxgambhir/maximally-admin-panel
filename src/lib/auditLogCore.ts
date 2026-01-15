/**
 * Core Audit Log Functions (Pure, Testable)
 * 
 * This module contains pure functions for audit log operations that can be
 * tested without database access. These functions implement the core logic
 * for audit log validation, diff computation, and immutability checks.
 * 
 * Requirements: 5.1, 5.3, 5.5
 */

import type {
  AuditActionType,
  AuditTargetType,
  CreateAuditLogInput,
  AuditLogEntry,
  AuditDiff,
  AuditDiffEntry,
} from '@/types/audit';

/**
 * Valid action types for audit logging
 */
export const VALID_ACTION_TYPES: readonly AuditActionType[] = [
  // Hackathon actions
  'hackathon_created',
  'hackathon_approved',
  'hackathon_rejected',
  'hackathon_published',
  'hackathon_unpublished',
  'hackathon_deleted',
  'hackathon_edited',
  'hackathon_featured',
  'hackathon_unfeatured',
  'hackathon_archived',
  'hackathon_restored',
  'hackathon_cloned',
  
  // User moderation actions
  'user_warned',
  'user_muted',
  'user_unmuted',
  'user_suspended',
  'user_unsuspended',
  'user_banned',
  'user_unbanned',
  'user_deleted',
  'user_restored',
  'user_profile_edited',
  'user_email_verified',
  'user_password_reset',
  
  // Organizer actions
  'organizer_approved',
  'organizer_rejected',
  'organizer_revoked',
  'organizer_flagged',
  'organizer_unflagged',
  'organizer_suspended',
  'organizer_unsuspended',
  'organizer_promoted',
  'organizer_demoted',
  
  // Blog actions
  'blog_created',
  'blog_updated',
  'blog_deleted',
  'blog_published',
  'blog_unpublished',
  'blog_featured',
  'blog_unfeatured',
  'blog_archived',
  
  // Submission actions
  'submission_approved',
  'submission_rejected',
  'submission_disqualified',
  'submission_flagged',
  'submission_unflagged',
  'submission_deleted',
  'submission_restored',
  'submission_scored',
  
  // Project/Gallery actions
  'project_approved',
  'project_rejected',
  'project_featured',
  'project_unfeatured',
  'project_deleted',
  'project_flagged',
  'project_unflagged',
  
  // Certificate actions
  'certificate_generated',
  'certificate_revoked',
  'certificate_regenerated',
  'certificate_bulk_generated',
  
  // Admin role actions
  'admin_role_granted',
  'admin_role_revoked',
  'admin_role_updated',
  'admin_invited',
  'admin_removed',
  'admin_permissions_changed',
  
  // Featured content actions
  'featured_blogs_updated',
  'featured_hackathons_updated',
  'featured_content_reordered',
  
  // Email actions
  'email_sent',
  'email_template_created',
  'email_template_updated',
  'email_template_deleted',
  'bulk_email_sent',
  'announcement_sent',
  
  // System actions
  'system_settings_updated',
  'system_maintenance_enabled',
  'system_maintenance_disabled',
  'system_backup_created',
  'system_backup_restored',
  'system_cache_cleared',
  
  // Queue actions
  'queue_item_claimed',
  'queue_item_released',
  'queue_item_resolved',
  'queue_item_dismissed',
  'queue_item_escalated',
  'queue_item_reassigned',
  
  // Report actions
  'report_created',
  'report_reviewed',
  'report_resolved',
  'report_dismissed',
  'report_escalated',
  
  // Judge actions
  'judge_invited',
  'judge_removed',
  'judge_assigned',
  'judge_unassigned',
  'judge_scoring_link_sent',
  
  // Sponsor actions
  'sponsor_added',
  'sponsor_removed',
  'sponsor_updated',
  'sponsor_featured',
  'sponsor_unfeatured',
  
  // Track actions
  'track_created',
  'track_updated',
  'track_deleted',
  'track_reordered',
  
  // Prize actions
  'prize_created',
  'prize_updated',
  'prize_deleted',
  'prize_awarded',
  'prize_revoked',
  
  // Winner actions
  'winner_announced',
  'winner_updated',
  'winner_removed',
  'winners_published',
  'winners_unpublished',
  
  // Registration actions
  'registration_approved',
  'registration_rejected',
  'registration_cancelled',
  'registration_bulk_approved',
  'registration_bulk_rejected',
  
  // Data management actions
  'data_exported',
  'data_imported',
  'data_deleted',
  'data_anonymized',
  'bulk_action',
  
  // Content moderation
  'content_flagged',
  'content_unflagged',
  'content_hidden',
  'content_unhidden',
  'content_edited',
  
  // Miscellaneous
  'role_changed',
  'permissions_updated',
  'settings_changed',
  'notification_sent',
  'api_key_generated',
  'api_key_revoked',
] as const;

/**
 * Valid target types for audit logging
 */
export const VALID_TARGET_TYPES: readonly AuditTargetType[] = [
  'hackathon',
  'user',
  'organizer',
  'project',
  'submission',
  'registration',
  'queue_item',
  'admin_role',
  'system',
  'blog',
  'certificate',
  'email_template',
  'featured_content',
  'judge',
  'sponsor',
  'track',
  'prize',
  'winner',
  'report',
  'content',
  'notification',
  'api_key',
  'settings',
  'data',
] as const;

/**
 * Check if a value is a valid action type
 */
export function isValidActionType(value: unknown): value is AuditActionType {
  return typeof value === 'string' && VALID_ACTION_TYPES.includes(value as AuditActionType);
}

/**
 * Check if a value is a valid target type
 */
export function isValidTargetType(value: unknown): value is AuditTargetType {
  return typeof value === 'string' && VALID_TARGET_TYPES.includes(value as AuditTargetType);
}

/**
 * Validation result for audit log input
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate audit log input
 * 
 * Requirement 5.1: Validate that all required fields are present and valid
 * for creating an immutable audit log entry.
 * 
 * @param input - The audit log input to validate
 * @returns Validation result with any errors
 */
export function validateAuditLogInput(input: Partial<CreateAuditLogInput>): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!input.action_type) {
    errors.push('action_type is required');
  } else if (!isValidActionType(input.action_type)) {
    errors.push(`Invalid action_type: ${input.action_type}`);
  }

  if (!input.admin_id) {
    errors.push('admin_id is required');
  } else if (typeof input.admin_id !== 'string' || input.admin_id.trim() === '') {
    errors.push('admin_id must be a non-empty string');
  }

  if (!input.admin_email) {
    errors.push('admin_email is required');
  } else if (typeof input.admin_email !== 'string' || !input.admin_email.includes('@')) {
    errors.push('admin_email must be a valid email address');
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

  if (!input.reason) {
    errors.push('reason is required');
  } else if (typeof input.reason !== 'string' || input.reason.trim() === '') {
    errors.push('reason must be a non-empty string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Deep equality check for comparing values
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }

  return false;
}

/**
 * Compute diff between before and after states
 * 
 * Requirement 5.5: Display full diff of changes made with highlighted
 * additions and removals.
 * 
 * @param beforeState - The state before the action
 * @param afterState - The state after the action
 * @returns The computed diff
 */
export function computeDiff(
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null
): AuditDiff {
  const entries: AuditDiffEntry[] = [];

  const before = beforeState ?? {};
  const after = afterState ?? {};

  // Get all unique keys from both states
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    const beforeExists = key in before;
    const afterExists = key in after;

    if (!beforeExists && afterExists) {
      // Field was added
      entries.push({
        field: key,
        before: undefined,
        after: afterValue,
        changeType: 'added',
      });
    } else if (beforeExists && !afterExists) {
      // Field was removed
      entries.push({
        field: key,
        before: beforeValue,
        after: undefined,
        changeType: 'removed',
      });
    } else if (!deepEqual(beforeValue, afterValue)) {
      // Field was modified
      entries.push({
        field: key,
        before: beforeValue,
        after: afterValue,
        changeType: 'modified',
      });
    }
  }

  return {
    entries,
    hasChanges: entries.length > 0,
  };
}

/**
 * Check if an audit log entry is immutable (cannot be modified)
 * 
 * Requirement 5.3: Audit log entries are immutable - once created,
 * they cannot be modified or deleted.
 * 
 * This function verifies that an audit log entry has all required
 * immutable fields set and that they conform to the expected format.
 * 
 * @param entry - The audit log entry to check
 * @returns True if the entry is valid and immutable
 */
export function isImmutableAuditLogEntry(entry: Partial<AuditLogEntry>): boolean {
  // Check required immutable fields
  if (!entry.id || typeof entry.id !== 'string') return false;
  if (!entry.action_type || !isValidActionType(entry.action_type)) return false;
  if (!entry.admin_id || typeof entry.admin_id !== 'string') return false;
  if (!entry.admin_email || typeof entry.admin_email !== 'string') return false;
  if (!entry.target_type || !isValidTargetType(entry.target_type)) return false;
  if (!entry.target_id || typeof entry.target_id !== 'string') return false;
  if (!entry.reason || typeof entry.reason !== 'string') return false;
  if (!entry.created_at || typeof entry.created_at !== 'string') return false;

  // Verify created_at is a valid ISO date string
  const createdAt = new Date(entry.created_at);
  if (isNaN(createdAt.getTime())) return false;

  return true;
}

/**
 * Simulate creating an audit log entry (for testing purposes)
 * 
 * This function creates an audit log entry object without database access,
 * useful for testing the immutability property.
 * 
 * @param input - The audit log input
 * @returns The created audit log entry
 */
export function createAuditLogEntry(input: CreateAuditLogInput): AuditLogEntry {
  const validation = validateAuditLogInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid audit log input: ${validation.errors.join(', ')}`);
  }

  return {
    id: crypto.randomUUID(),
    action_type: input.action_type,
    admin_id: input.admin_id,
    admin_email: input.admin_email,
    target_type: input.target_type,
    target_id: input.target_id,
    reason: input.reason.trim(),
    before_state: input.before_state ?? null,
    after_state: input.after_state ?? null,
    ip_address: input.ip_address ?? null,
    user_agent: input.user_agent ?? null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Check if two audit log entries are equal (for immutability verification)
 * 
 * @param a - First audit log entry
 * @param b - Second audit log entry
 * @returns True if the entries are equal
 */
export function auditLogEntriesEqual(a: AuditLogEntry, b: AuditLogEntry): boolean {
  return (
    a.id === b.id &&
    a.action_type === b.action_type &&
    a.admin_id === b.admin_id &&
    a.admin_email === b.admin_email &&
    a.target_type === b.target_type &&
    a.target_id === b.target_id &&
    a.reason === b.reason &&
    a.ip_address === b.ip_address &&
    a.user_agent === b.user_agent &&
    a.created_at === b.created_at &&
    deepEqual(a.before_state, b.before_state) &&
    deepEqual(a.after_state, b.after_state)
  );
}
