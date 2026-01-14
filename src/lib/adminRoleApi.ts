/**
 * Admin Role API
 * 
 * This module provides API functions for admin role management.
 * These functions are used by React components and hooks.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import {
  getAdminRole,
  hasPermission,
  requirePermission,
  getAdminList,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getAdminActivity,
} from './adminRoleService';
import type {
  AdminRole,
  AdminWithRole,
  AdminPermission,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
  AdminListResponse,
  PermissionCheckResult,
} from '@/types/adminRole';

export {
  // Re-export service functions
  getAdminRole,
  hasPermission,
  requirePermission,
  getAdminList,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getAdminActivity,
};

// Re-export types
export type {
  AdminRole,
  AdminWithRole,
  AdminPermission,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
  AdminListResponse,
  PermissionCheckResult,
};

// Re-export core functions for use in components
export {
  VALID_ADMIN_ROLES,
  VALID_PERMISSIONS,
  DEFAULT_PERMISSIONS_BY_ROLE,
  isValidAdminRole,
  isValidPermission,
  getDefaultPermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  canManageAdminRole,
  getRoleLevel,
  hasHigherOrEqualRole,
  countEnabledPermissions,
  getEnabledPermissions,
  getDisabledPermissions,
} from './adminRoleCore';

