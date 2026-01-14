/**
 * Audit Log Types for Admin Moderation System
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Valid action types for audit logging
 */
export type AuditActionType =
  | 'hackathon_approved'
  | 'hackathon_rejected'
  | 'hackathon_unpublished'
  | 'hackathon_deleted'
  | 'hackathon_edited'
  | 'hackathon_featured'
  | 'hackathon_unfeatured'
  | 'user_warned'
  | 'user_muted'
  | 'user_suspended'
  | 'user_banned'
  | 'user_unbanned'
  | 'user_deleted'
  | 'organizer_revoked'
  | 'organizer_flagged'
  | 'organizer_unflagged'
  | 'bulk_action'
  | 'role_changed'
  | 'queue_item_claimed'
  | 'queue_item_released'
  | 'queue_item_resolved'
  | 'queue_item_dismissed';

/**
 * Valid target types for audit logging
 */
export type AuditTargetType =
  | 'hackathon'
  | 'user'
  | 'organizer'
  | 'project'
  | 'submission'
  | 'queue_item'
  | 'admin_role'
  | 'system';

/**
 * Audit log entry as stored in the database
 */
export interface AuditLogEntry {
  id: string;
  action_type: AuditActionType;
  admin_id: string;
  admin_email: string;
  target_type: AuditTargetType;
  target_id: string;
  reason: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Input for creating a new audit log entry
 */
export interface CreateAuditLogInput {
  action_type: AuditActionType;
  admin_id: string;
  admin_email: string;
  target_type: AuditTargetType;
  target_id: string;
  reason: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  admin_id?: string;
  action_type?: AuditActionType | AuditActionType[];
  target_type?: AuditTargetType | AuditTargetType[];
  target_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

/**
 * Response for paginated audit log queries
 */
export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Export format options
 */
export type AuditExportFormat = 'csv' | 'json';

/**
 * Diff entry for showing changes between before and after states
 */
export interface AuditDiffEntry {
  field: string;
  before: unknown;
  after: unknown;
  changeType: 'added' | 'removed' | 'modified';
}

/**
 * Result of computing diff between before and after states
 */
export interface AuditDiff {
  entries: AuditDiffEntry[];
  hasChanges: boolean;
}
