/**
 * Admin Role Service
 * 
 * This module provides database operations for admin role management.
 * It uses the core functions for validation and permission checking.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { supabaseAdmin } from './supabase';
import { auditService } from './auditService';
import {
  validateCreateAdminRoleInput,
  validateUpdateAdminRoleInput,
  mergePermissions,
  checkPermission,
  canManageAdminRole,
  getDefaultPermissions,
} from './adminRoleCore';
import type {
  AdminRole,
  AdminWithRole,
  AdminPermission,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
  AdminListResponse,
  PermissionCheckResult,
} from '@/types/adminRole';

/**
 * Get admin role for a user
 */
export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const { data, error } = await supabaseAdmin
    .from('admin_roles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get admin role: ${error.message}`);
  }

  return data as AdminRole;
}

/**
 * Check if a user has a specific permission
 * 
 * Property 7: Permission Enforcement - For any admin with a specific role,
 * attempting an action outside their permissions SHALL result in a permission
 * denied response.
 */
export async function hasPermission(
  userId: string,
  permission: AdminPermission
): Promise<PermissionCheckResult> {
  const adminRole = await getAdminRole(userId);
  return checkPermission(adminRole, permission);
}

/**
 * Require a specific permission, throwing an error if not allowed
 */
export async function requirePermission(
  userId: string,
  permission: AdminPermission
): Promise<void> {
  const result = await hasPermission(userId, permission);
  if (!result.allowed) {
    throw new Error(result.reason);
  }
}

/**
 * Get all admins with their roles and activity stats
 * 
 * Requirement 9.1: Display all admins with their roles, last active time, and action counts
 */
export async function getAdminList(
  page: number = 1,
  limit: number = 20
): Promise<AdminListResponse> {
  const offset = (page - 1) * limit;

  // Get admin roles with user info
  const { data: admins, error: adminsError, count } = await supabaseAdmin
    .from('admin_roles')
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (adminsError) {
    throw new Error(`Failed to get admin list: ${adminsError.message}`);
  }

  // Get action counts for each admin from audit logs
  const adminIds = admins?.map(a => a.user_id) ?? [];
  
  const { data: actionCounts, error: countError } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('admin_id')
    .in('admin_id', adminIds);

  if (countError) {
    console.error('Failed to get action counts:', countError);
  }

  // Count actions per admin
  const actionCountMap: Record<string, number> = {};
  actionCounts?.forEach(log => {
    actionCountMap[log.admin_id] = (actionCountMap[log.admin_id] ?? 0) + 1;
  });

  // Get user emails from auth.users (requires service role)
  const { data: users, error: usersError } = await supabaseAdmin
    .auth.admin.listUsers();

  if (usersError) {
    console.error('Failed to get user emails:', usersError);
  }

  const emailMap: Record<string, string> = {};
  users?.users?.forEach(user => {
    emailMap[user.id] = user.email ?? '';
  });

  // Transform to AdminWithRole
  const adminWithRoles: AdminWithRole[] = (admins ?? []).map(admin => ({
    id: admin.id,
    user_id: admin.user_id,
    role: admin.role,
    permissions: admin.permissions,
    email: emailMap[admin.user_id] ?? '',
    username: admin.profiles?.username,
    full_name: admin.profiles?.full_name,
    avatar_url: admin.profiles?.avatar_url,
    action_count: actionCountMap[admin.user_id] ?? 0,
    created_by: admin.created_by,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
  }));

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    admins: adminWithRoles,
    total,
    page,
    totalPages,
  };
}

/**
 * Create a new admin role
 * 
 * Requirement 9.2: Support role assignment with granular permissions
 */
export async function createAdminRole(
  input: CreateAdminRoleInput,
  actingAdminId: string
): Promise<AdminRole> {
  // Validate input
  const validation = validateCreateAdminRoleInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Check if acting admin can manage roles
  const actingAdminRole = await getAdminRole(actingAdminId);
  const canManage = canManageAdminRole(actingAdminRole);
  if (!canManage.allowed) {
    throw new Error(canManage.reason);
  }

  // Check if user already has a role
  const existingRole = await getAdminRole(input.user_id);
  if (existingRole) {
    throw new Error('User already has an admin role');
  }

  // Merge permissions with defaults
  const permissions = mergePermissions(input.role, input.permissions);

  // Create the role
  const { data, error } = await supabaseAdmin
    .from('admin_roles')
    .insert({
      user_id: input.user_id,
      role: input.role,
      permissions,
      created_by: actingAdminId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create admin role: ${error.message}`);
  }

  // Get acting admin email for audit log
  const { data: actingUser } = await supabaseAdmin
    .auth.admin.getUserById(actingAdminId);

  // Log the action
  await auditService.createLog({
    action_type: 'role_changed',
    admin_id: actingAdminId,
    admin_email: actingUser?.user?.email ?? 'unknown',
    target_type: 'admin_role',
    target_id: input.user_id,
    reason: `Created admin role: ${input.role}`,
    before_state: null,
    after_state: {
      role: input.role,
      permissions,
    },
  });

  return data as AdminRole;
}

/**
 * Update an admin role
 * 
 * Requirement 9.2, 9.3: Update admin roles with audit logging
 */
export async function updateAdminRole(
  targetUserId: string,
  input: UpdateAdminRoleInput,
  actingAdminId: string
): Promise<AdminRole> {
  // Validate input
  const validation = validateUpdateAdminRoleInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Get existing role
  const existingRole = await getAdminRole(targetUserId);
  if (!existingRole) {
    throw new Error('Admin role not found');
  }

  // Check if acting admin can manage this role
  const actingAdminRole = await getAdminRole(actingAdminId);
  const canManage = canManageAdminRole(actingAdminRole, existingRole);
  if (!canManage.allowed) {
    throw new Error(canManage.reason);
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {};
  
  if (input.role !== undefined) {
    updateData.role = input.role;
    // If role changed, reset to default permissions for new role
    // then apply any custom permissions
    updateData.permissions = mergePermissions(input.role, input.permissions);
  } else if (input.permissions !== undefined) {
    // Just update permissions
    updateData.permissions = { ...existingRole.permissions, ...input.permissions };
  }

  // Update the role
  const { data, error } = await supabaseAdmin
    .from('admin_roles')
    .update(updateData)
    .eq('user_id', targetUserId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update admin role: ${error.message}`);
  }

  // Get acting admin email for audit log
  const { data: actingUser } = await supabaseAdmin
    .auth.admin.getUserById(actingAdminId);

  // Log the action
  await auditService.createLog({
    action_type: 'role_changed',
    admin_id: actingAdminId,
    admin_email: actingUser?.user?.email ?? 'unknown',
    target_type: 'admin_role',
    target_id: targetUserId,
    reason: `Updated admin role${input.role ? ` to ${input.role}` : ''}`,
    before_state: {
      role: existingRole.role,
      permissions: existingRole.permissions,
    },
    after_state: {
      role: data.role,
      permissions: data.permissions,
    },
  });

  return data as AdminRole;
}

/**
 * Delete an admin role
 */
export async function deleteAdminRole(
  targetUserId: string,
  actingAdminId: string,
  reason: string
): Promise<void> {
  // Get existing role
  const existingRole = await getAdminRole(targetUserId);
  if (!existingRole) {
    throw new Error('Admin role not found');
  }

  // Check if acting admin can manage this role
  const actingAdminRole = await getAdminRole(actingAdminId);
  const canManage = canManageAdminRole(actingAdminRole, existingRole);
  if (!canManage.allowed) {
    throw new Error(canManage.reason);
  }

  // Cannot delete your own role
  if (targetUserId === actingAdminId) {
    throw new Error('Cannot delete your own admin role');
  }

  // Delete the role
  const { error } = await supabaseAdmin
    .from('admin_roles')
    .delete()
    .eq('user_id', targetUserId);

  if (error) {
    throw new Error(`Failed to delete admin role: ${error.message}`);
  }

  // Get acting admin email for audit log
  const { data: actingUser } = await supabaseAdmin
    .auth.admin.getUserById(actingAdminId);

  // Log the action
  await auditService.createLog({
    action_type: 'role_changed',
    admin_id: actingAdminId,
    admin_email: actingUser?.user?.email ?? 'unknown',
    target_type: 'admin_role',
    target_id: targetUserId,
    reason: `Deleted admin role: ${reason}`,
    before_state: {
      role: existingRole.role,
      permissions: existingRole.permissions,
    },
    after_state: null,
  });
}

/**
 * Get admin activity (actions taken by a specific admin)
 * 
 * Requirement 9.5: Show actions taken by each admin with filtering by date range
 */
export async function getAdminActivity(
  adminId: string,
  options: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const { dateFrom, dateTo, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('admin_audit_logs')
    .select('*', { count: 'exact' })
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get admin activity: ${error.message}`);
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    logs: data ?? [],
    total,
    page,
    totalPages,
  };
}

