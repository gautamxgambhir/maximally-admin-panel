/**
 * Core Admin Role Functions (Pure, Testable)
 * 
 * This module contains pure functions for admin role operations that can be
 * tested without database access. These functions implement the core logic
 * for permission checking and role validation.
 * 
 * Requirements: 9.1, 9.2, 9.4
 */

import type {
  AdminRoleType,
  AdminPermission,
  AdminPermissions,
  AdminRole,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
  PermissionCheckResult,
} from '@/types/adminRole';

/**
 * Valid admin role types in order of privilege (highest to lowest)
 */
export const VALID_ADMIN_ROLES: readonly AdminRoleType[] = [
  'super_admin',
  'admin',
  'moderator',
  'viewer',
] as const;

/**
 * All valid permission keys
 */
export const VALID_PERMISSIONS: readonly AdminPermission[] = [
  'can_approve_hackathons',
  'can_reject_hackathons',
  'can_delete_hackathons',
  'can_edit_hackathons',
  'can_unpublish_hackathons',
  'can_feature_hackathons',
  'can_moderate_users',
  'can_ban_users',
  'can_delete_users',
  'can_manage_admins',
  'can_view_audit_logs',
  'can_export_data',
  'can_access_analytics',
  'can_send_announcements',
  'can_manage_queue',
  'can_revoke_organizers',
] as const;

/**
 * Default permissions for each role type
 */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<AdminRoleType, AdminPermissions> = {
  super_admin: {
    can_approve_hackathons: true,
    can_reject_hackathons: true,
    can_delete_hackathons: true,
    can_edit_hackathons: true,
    can_unpublish_hackathons: true,
    can_feature_hackathons: true,
    can_moderate_users: true,
    can_ban_users: true,
    can_delete_users: true,
    can_manage_admins: true,
    can_view_audit_logs: true,
    can_export_data: true,
    can_access_analytics: true,
    can_send_announcements: true,
    can_manage_queue: true,
    can_revoke_organizers: true,
  },
  admin: {
    can_approve_hackathons: true,
    can_reject_hackathons: true,
    can_delete_hackathons: true,
    can_edit_hackathons: true,
    can_unpublish_hackathons: true,
    can_feature_hackathons: true,
    can_moderate_users: true,
    can_ban_users: true,
    can_delete_users: false,
    can_manage_admins: false,
    can_view_audit_logs: true,
    can_export_data: true,
    can_access_analytics: true,
    can_send_announcements: true,
    can_manage_queue: true,
    can_revoke_organizers: true,
  },
  moderator: {
    can_approve_hackathons: true,
    can_reject_hackathons: true,
    can_delete_hackathons: false,
    can_edit_hackathons: false,
    can_unpublish_hackathons: false,
    can_feature_hackathons: false,
    can_moderate_users: true,
    can_ban_users: false,
    can_delete_users: false,
    can_manage_admins: false,
    can_view_audit_logs: true,
    can_export_data: false,
    can_access_analytics: true,
    can_send_announcements: false,
    can_manage_queue: true,
    can_revoke_organizers: false,
  },
  viewer: {
    can_approve_hackathons: false,
    can_reject_hackathons: false,
    can_delete_hackathons: false,
    can_edit_hackathons: false,
    can_unpublish_hackathons: false,
    can_feature_hackathons: false,
    can_moderate_users: false,
    can_ban_users: false,
    can_delete_users: false,
    can_manage_admins: false,
    can_view_audit_logs: false,
    can_export_data: false,
    can_access_analytics: true,
    can_send_announcements: false,
    can_manage_queue: false,
    can_revoke_organizers: false,
  },
};

/**
 * Check if a value is a valid admin role type
 */
export function isValidAdminRole(value: unknown): value is AdminRoleType {
  return typeof value === 'string' && VALID_ADMIN_ROLES.includes(value as AdminRoleType);
}

/**
 * Check if a value is a valid permission key
 */
export function isValidPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && VALID_PERMISSIONS.includes(value as AdminPermission);
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate create admin role input
 */
export function validateCreateAdminRoleInput(input: Partial<CreateAdminRoleInput>): ValidationResult {
  const errors: string[] = [];

  if (!input.user_id) {
    errors.push('user_id is required');
  } else if (typeof input.user_id !== 'string' || input.user_id.trim() === '') {
    errors.push('user_id must be a non-empty string');
  }

  if (!input.role) {
    errors.push('role is required');
  } else if (!isValidAdminRole(input.role)) {
    errors.push(`Invalid role: ${input.role}. Must be one of: ${VALID_ADMIN_ROLES.join(', ')}`);
  }

  // Validate permissions if provided
  if (input.permissions) {
    for (const key of Object.keys(input.permissions)) {
      if (!isValidPermission(key)) {
        errors.push(`Invalid permission key: ${key}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate update admin role input
 */
export function validateUpdateAdminRoleInput(input: Partial<UpdateAdminRoleInput>): ValidationResult {
  const errors: string[] = [];

  if (input.role !== undefined && !isValidAdminRole(input.role)) {
    errors.push(`Invalid role: ${input.role}. Must be one of: ${VALID_ADMIN_ROLES.join(', ')}`);
  }

  // Validate permissions if provided
  if (input.permissions) {
    for (const key of Object.keys(input.permissions)) {
      if (!isValidPermission(key)) {
        errors.push(`Invalid permission key: ${key}`);
      }
    }
  }

  // At least one field must be provided
  if (input.role === undefined && input.permissions === undefined) {
    errors.push('At least one of role or permissions must be provided');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: AdminRoleType): AdminPermissions {
  return { ...DEFAULT_PERMISSIONS_BY_ROLE[role] };
}

/**
 * Merge custom permissions with default permissions for a role
 */
export function mergePermissions(
  role: AdminRoleType,
  customPermissions?: Partial<AdminPermissions>
): AdminPermissions {
  const defaults = getDefaultPermissions(role);
  if (!customPermissions) {
    return defaults;
  }
  return { ...defaults, ...customPermissions };
}

/**
 * Check if an admin has a specific permission
 * 
 * Property 7: Permission Enforcement - For any admin with a specific role,
 * attempting an action outside their permissions SHALL result in a permission
 * denied response.
 * 
 * @param adminRole - The admin's role object
 * @param permission - The permission to check
 * @returns Permission check result
 */
export function checkPermission(
  adminRole: AdminRole | null | undefined,
  permission: AdminPermission
): PermissionCheckResult {
  // No role means no access
  if (!adminRole) {
    return {
      allowed: false,
      reason: 'No admin role assigned',
      requiredPermission: permission,
    };
  }

  // Check if the permission exists in the role's permissions
  const hasPermission = adminRole.permissions[permission] === true;

  if (hasPermission) {
    return {
      allowed: true,
      reason: 'Permission granted',
      requiredPermission: permission,
      userRole: adminRole.role,
    };
  }

  return {
    allowed: false,
    reason: `Permission denied: ${permission} is not allowed for role ${adminRole.role}`,
    requiredPermission: permission,
    userRole: adminRole.role,
  };
}

/**
 * Check if an admin has any of the specified permissions
 */
export function checkAnyPermission(
  adminRole: AdminRole | null | undefined,
  permissions: AdminPermission[]
): PermissionCheckResult {
  if (!adminRole) {
    return {
      allowed: false,
      reason: 'No admin role assigned',
    };
  }

  for (const permission of permissions) {
    if (adminRole.permissions[permission] === true) {
      return {
        allowed: true,
        reason: 'Permission granted',
        requiredPermission: permission,
        userRole: adminRole.role,
      };
    }
  }

  return {
    allowed: false,
    reason: `Permission denied: None of the required permissions (${permissions.join(', ')}) are allowed for role ${adminRole.role}`,
    userRole: adminRole.role,
  };
}

/**
 * Check if an admin has all of the specified permissions
 */
export function checkAllPermissions(
  adminRole: AdminRole | null | undefined,
  permissions: AdminPermission[]
): PermissionCheckResult {
  if (!adminRole) {
    return {
      allowed: false,
      reason: 'No admin role assigned',
    };
  }

  const missingPermissions: AdminPermission[] = [];

  for (const permission of permissions) {
    if (adminRole.permissions[permission] !== true) {
      missingPermissions.push(permission);
    }
  }

  if (missingPermissions.length === 0) {
    return {
      allowed: true,
      reason: 'All permissions granted',
      userRole: adminRole.role,
    };
  }

  return {
    allowed: false,
    reason: `Permission denied: Missing permissions (${missingPermissions.join(', ')}) for role ${adminRole.role}`,
    userRole: adminRole.role,
  };
}

/**
 * Check if an admin can manage another admin's role
 * 
 * Only super_admins can manage admin roles
 */
export function canManageAdminRole(
  actingAdmin: AdminRole | null | undefined,
  targetAdmin?: AdminRole | null
): PermissionCheckResult {
  if (!actingAdmin) {
    return {
      allowed: false,
      reason: 'No admin role assigned',
      requiredPermission: 'can_manage_admins',
    };
  }

  // Check if the acting admin has permission to manage admins
  if (!actingAdmin.permissions.can_manage_admins) {
    return {
      allowed: false,
      reason: 'Permission denied: can_manage_admins is required',
      requiredPermission: 'can_manage_admins',
      userRole: actingAdmin.role,
    };
  }

  // Super admins can manage anyone
  if (actingAdmin.role === 'super_admin') {
    return {
      allowed: true,
      reason: 'Super admin can manage all roles',
      userRole: actingAdmin.role,
    };
  }

  // Non-super admins cannot manage super admins
  if (targetAdmin && targetAdmin.role === 'super_admin') {
    return {
      allowed: false,
      reason: 'Cannot manage super_admin role',
      userRole: actingAdmin.role,
    };
  }

  return {
    allowed: true,
    reason: 'Permission granted',
    userRole: actingAdmin.role,
  };
}

/**
 * Get role hierarchy level (higher number = more privileges)
 */
export function getRoleLevel(role: AdminRoleType): number {
  const levels: Record<AdminRoleType, number> = {
    super_admin: 4,
    admin: 3,
    moderator: 2,
    viewer: 1,
  };
  return levels[role] ?? 0;
}

/**
 * Check if one role has higher or equal privileges than another
 */
export function hasHigherOrEqualRole(
  actingRole: AdminRoleType,
  targetRole: AdminRoleType
): boolean {
  return getRoleLevel(actingRole) >= getRoleLevel(targetRole);
}

/**
 * Create an admin role object (for testing purposes)
 */
export function createAdminRole(
  input: CreateAdminRoleInput,
  createdBy?: string
): AdminRole {
  const validation = validateCreateAdminRoleInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid admin role input: ${validation.errors.join(', ')}`);
  }

  const permissions = mergePermissions(input.role, input.permissions);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    role: input.role,
    permissions,
    created_by: createdBy ?? null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update an admin role object (for testing purposes)
 */
export function updateAdminRole(
  existingRole: AdminRole,
  input: UpdateAdminRoleInput
): AdminRole {
  const validation = validateUpdateAdminRoleInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid update input: ${validation.errors.join(', ')}`);
  }

  const newRole = input.role ?? existingRole.role;
  
  // If role changed, start with new role's default permissions
  // then apply any custom permissions from input
  let newPermissions: AdminPermissions;
  if (input.role && input.role !== existingRole.role) {
    newPermissions = mergePermissions(newRole, input.permissions);
  } else {
    // Keep existing permissions and merge with any updates
    newPermissions = { ...existingRole.permissions, ...input.permissions };
  }

  return {
    ...existingRole,
    role: newRole,
    permissions: newPermissions,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Count enabled permissions in a permissions object
 */
export function countEnabledPermissions(permissions: AdminPermissions): number {
  return Object.values(permissions).filter(v => v === true).length;
}

/**
 * Get list of enabled permissions
 */
export function getEnabledPermissions(permissions: AdminPermissions): AdminPermission[] {
  return (Object.entries(permissions) as [AdminPermission, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([permission]) => permission);
}

/**
 * Get list of disabled permissions
 */
export function getDisabledPermissions(permissions: AdminPermissions): AdminPermission[] {
  return (Object.entries(permissions) as [AdminPermission, boolean][])
    .filter(([, enabled]) => !enabled)
    .map(([permission]) => permission);
}

