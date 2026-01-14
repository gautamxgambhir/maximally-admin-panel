/**
 * Admin Role Types for Admin Moderation System
 * Requirements: 9.1, 9.2, 9.4
 */

/**
 * Valid admin role types
 */
export type AdminRoleType = 'super_admin' | 'admin' | 'moderator' | 'viewer';

/**
 * Permission keys for admin roles
 */
export type AdminPermission =
  | 'can_approve_hackathons'
  | 'can_reject_hackathons'
  | 'can_delete_hackathons'
  | 'can_edit_hackathons'
  | 'can_unpublish_hackathons'
  | 'can_feature_hackathons'
  | 'can_moderate_users'
  | 'can_ban_users'
  | 'can_delete_users'
  | 'can_manage_admins'
  | 'can_view_audit_logs'
  | 'can_export_data'
  | 'can_access_analytics'
  | 'can_send_announcements'
  | 'can_manage_queue'
  | 'can_revoke_organizers';

/**
 * Permissions object structure
 */
export interface AdminPermissions {
  can_approve_hackathons: boolean;
  can_reject_hackathons: boolean;
  can_delete_hackathons: boolean;
  can_edit_hackathons: boolean;
  can_unpublish_hackathons: boolean;
  can_feature_hackathons: boolean;
  can_moderate_users: boolean;
  can_ban_users: boolean;
  can_delete_users: boolean;
  can_manage_admins: boolean;
  can_view_audit_logs: boolean;
  can_export_data: boolean;
  can_access_analytics: boolean;
  can_send_announcements: boolean;
  can_manage_queue: boolean;
  can_revoke_organizers: boolean;
}

/**
 * Admin role as stored in the database
 */
export interface AdminRole {
  id: string;
  user_id: string;
  role: AdminRoleType;
  permissions: AdminPermissions;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Admin with role information for listing
 */
export interface AdminWithRole {
  id: string;
  user_id: string;
  role: AdminRoleType;
  permissions: AdminPermissions;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  last_active?: string;
  action_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new admin role
 */
export interface CreateAdminRoleInput {
  user_id: string;
  role: AdminRoleType;
  permissions?: Partial<AdminPermissions>;
}

/**
 * Input for updating an admin role
 */
export interface UpdateAdminRoleInput {
  role?: AdminRoleType;
  permissions?: Partial<AdminPermissions>;
}

/**
 * Response for admin list queries
 */
export interface AdminListResponse {
  admins: AdminWithRole[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  requiredPermission?: AdminPermission;
  userRole?: AdminRoleType;
}

