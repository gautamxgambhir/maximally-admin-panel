/**
 * Audit Log Types for Admin Moderation System
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Valid action types for audit logging
 */
export type AuditActionType =
  // Hackathon actions
  | 'hackathon_created'
  | 'hackathon_approved'
  | 'hackathon_rejected'
  | 'hackathon_published'
  | 'hackathon_unpublished'
  | 'hackathon_deleted'
  | 'hackathon_edited'
  | 'hackathon_featured'
  | 'hackathon_unfeatured'
  | 'hackathon_archived'
  | 'hackathon_restored'
  | 'hackathon_cloned'
  
  // User moderation actions
  | 'user_warned'
  | 'user_muted'
  | 'user_unmuted'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'user_banned'
  | 'user_unbanned'
  | 'user_deleted'
  | 'user_restored'
  | 'user_profile_edited'
  | 'user_email_verified'
  | 'user_password_reset'
  
  // Organizer actions
  | 'organizer_approved'
  | 'organizer_rejected'
  | 'organizer_revoked'
  | 'organizer_flagged'
  | 'organizer_unflagged'
  | 'organizer_suspended'
  | 'organizer_unsuspended'
  | 'organizer_promoted'
  | 'organizer_demoted'
  
  // Blog actions
  | 'blog_created'
  | 'blog_updated'
  | 'blog_deleted'
  | 'blog_published'
  | 'blog_unpublished'
  | 'blog_featured'
  | 'blog_unfeatured'
  | 'blog_archived'
  
  // Submission actions
  | 'submission_approved'
  | 'submission_rejected'
  | 'submission_disqualified'
  | 'submission_flagged'
  | 'submission_unflagged'
  | 'submission_deleted'
  | 'submission_restored'
  | 'submission_scored'
  
  // Project/Gallery actions
  | 'project_approved'
  | 'project_rejected'
  | 'project_featured'
  | 'project_unfeatured'
  | 'project_deleted'
  | 'project_flagged'
  | 'project_unflagged'
  
  // Certificate actions
  | 'certificate_generated'
  | 'certificate_revoked'
  | 'certificate_regenerated'
  | 'certificate_bulk_generated'
  
  // Admin role actions
  | 'admin_role_granted'
  | 'admin_role_revoked'
  | 'admin_role_updated'
  | 'admin_invited'
  | 'admin_removed'
  | 'admin_permissions_changed'
  
  // Featured content actions
  | 'featured_blogs_updated'
  | 'featured_hackathons_updated'
  | 'featured_content_reordered'
  
  // Email actions
  | 'email_sent'
  | 'email_template_created'
  | 'email_template_updated'
  | 'email_template_deleted'
  | 'bulk_email_sent'
  | 'announcement_sent'
  
  // System actions
  | 'system_settings_updated'
  | 'system_maintenance_enabled'
  | 'system_maintenance_disabled'
  | 'system_backup_created'
  | 'system_backup_restored'
  | 'system_cache_cleared'
  
  // Queue actions
  | 'queue_item_claimed'
  | 'queue_item_released'
  | 'queue_item_resolved'
  | 'queue_item_dismissed'
  | 'queue_item_escalated'
  | 'queue_item_reassigned'
  
  // Report actions
  | 'report_created'
  | 'report_reviewed'
  | 'report_resolved'
  | 'report_dismissed'
  | 'report_escalated'
  
  // Judge actions
  | 'judge_invited'
  | 'judge_removed'
  | 'judge_assigned'
  | 'judge_unassigned'
  | 'judge_scoring_link_sent'
  
  // Sponsor actions
  | 'sponsor_added'
  | 'sponsor_removed'
  | 'sponsor_updated'
  | 'sponsor_featured'
  | 'sponsor_unfeatured'
  
  // Track actions
  | 'track_created'
  | 'track_updated'
  | 'track_deleted'
  | 'track_reordered'
  
  // Prize actions
  | 'prize_created'
  | 'prize_updated'
  | 'prize_deleted'
  | 'prize_awarded'
  | 'prize_revoked'
  
  // Winner actions
  | 'winner_announced'
  | 'winner_updated'
  | 'winner_removed'
  | 'winners_published'
  | 'winners_unpublished'
  
  // Registration actions
  | 'registration_approved'
  | 'registration_rejected'
  | 'registration_cancelled'
  | 'registration_bulk_approved'
  | 'registration_bulk_rejected'
  
  // Data management actions
  | 'data_exported'
  | 'data_imported'
  | 'data_deleted'
  | 'data_anonymized'
  | 'bulk_action'
  
  // Content moderation
  | 'content_flagged'
  | 'content_unflagged'
  | 'content_hidden'
  | 'content_unhidden'
  | 'content_edited'
  
  // Miscellaneous
  | 'role_changed'
  | 'permissions_updated'
  | 'settings_changed'
  | 'notification_sent'
  | 'api_key_generated'
  | 'api_key_revoked';

/**
 * Valid target types for audit logging
 */
export type AuditTargetType =
  | 'hackathon'
  | 'user'
  | 'organizer'
  | 'project'
  | 'submission'
  | 'registration'
  | 'queue_item'
  | 'admin_role'
  | 'system'
  | 'blog'
  | 'certificate'
  | 'email_template'
  | 'featured_content'
  | 'judge'
  | 'sponsor'
  | 'track'
  | 'prize'
  | 'winner'
  | 'report'
  | 'content'
  | 'notification'
  | 'api_key'
  | 'settings'
  | 'data';

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
