/**
 * Admin Roles Hook
 * 
 * React Query hooks for admin role management.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAdminRole,
  hasPermission,
  getAdminList,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getAdminActivity,
} from '@/lib/adminRoleApi';
import type {
  AdminRole,
  AdminPermission,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
  AdminListResponse,
  PermissionCheckResult,
} from '@/types/adminRole';

// Query keys
export const adminRolesKeys = {
  all: ['adminRoles'] as const,
  lists: () => [...adminRolesKeys.all, 'list'] as const,
  list: (page?: number, limit?: number) => [...adminRolesKeys.lists(), { page, limit }] as const,
  details: () => [...adminRolesKeys.all, 'detail'] as const,
  detail: (userId: string) => [...adminRolesKeys.details(), userId] as const,
  permissions: () => [...adminRolesKeys.all, 'permission'] as const,
  permission: (userId: string, permission: AdminPermission) => 
    [...adminRolesKeys.permissions(), userId, permission] as const,
  activity: () => [...adminRolesKeys.all, 'activity'] as const,
  adminActivity: (adminId: string, options?: { dateFrom?: string; dateTo?: string; page?: number }) =>
    [...adminRolesKeys.activity(), adminId, options] as const,
};

/**
 * Get list of all admins with roles
 * 
 * Requirement 9.1: Display all admins with their roles, last active time, and action counts
 */
export function useAdminList(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: adminRolesKeys.list(page, limit),
    queryFn: () => getAdminList(page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get admin role for a specific user
 */
export function useAdminRole(userId: string | undefined) {
  return useQuery({
    queryKey: adminRolesKeys.detail(userId ?? ''),
    queryFn: () => getAdminRole(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if a user has a specific permission
 * 
 * Property 7: Permission Enforcement
 */
export function useHasPermission(userId: string | undefined, permission: AdminPermission) {
  return useQuery({
    queryKey: adminRolesKeys.permission(userId ?? '', permission),
    queryFn: () => hasPermission(userId!, permission),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new admin role
 * 
 * Requirement 9.2: Support role assignment with granular permissions
 */
export function useCreateAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, actingAdminId }: { input: CreateAdminRoleInput; actingAdminId: string }) =>
      createAdminRole(input, actingAdminId),
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: adminRolesKeys.lists() });
      queryClient.setQueryData(adminRolesKeys.detail(newRole.user_id), newRole);
      toast.success('Admin role created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create admin role: ${error.message}`);
    },
  });
}

/**
 * Update an admin role
 * 
 * Requirement 9.2, 9.3: Update admin roles with audit logging
 */
export function useUpdateAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetUserId,
      input,
      actingAdminId,
    }: {
      targetUserId: string;
      input: UpdateAdminRoleInput;
      actingAdminId: string;
    }) => updateAdminRole(targetUserId, input, actingAdminId),
    onSuccess: (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: adminRolesKeys.lists() });
      queryClient.setQueryData(adminRolesKeys.detail(updatedRole.user_id), updatedRole);
      // Invalidate permission checks for this user
      queryClient.invalidateQueries({ 
        queryKey: adminRolesKeys.permissions(),
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.includes(updatedRole.user_id);
        }
      });
      toast.success('Admin role updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update admin role: ${error.message}`);
    },
  });
}

/**
 * Delete an admin role
 */
export function useDeleteAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetUserId,
      actingAdminId,
      reason,
    }: {
      targetUserId: string;
      actingAdminId: string;
      reason: string;
    }) => deleteAdminRole(targetUserId, actingAdminId, reason),
    onSuccess: (_, { targetUserId }) => {
      queryClient.invalidateQueries({ queryKey: adminRolesKeys.lists() });
      queryClient.removeQueries({ queryKey: adminRolesKeys.detail(targetUserId) });
      // Invalidate permission checks for this user
      queryClient.invalidateQueries({ 
        queryKey: adminRolesKeys.permissions(),
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.includes(targetUserId);
        }
      });
      toast.success('Admin role deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete admin role: ${error.message}`);
    },
  });
}

/**
 * Get admin activity (actions taken by a specific admin)
 * 
 * Requirement 9.5: Show actions taken by each admin with filtering by date range
 */
export function useAdminActivity(
  adminId: string | undefined,
  options: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  return useQuery({
    queryKey: adminRolesKeys.adminActivity(adminId ?? '', options),
    queryFn: () => getAdminActivity(adminId!, options),
    enabled: !!adminId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

