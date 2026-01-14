/**
 * Property-Based Tests for Admin Role Permission Enforcement
 * 
 * Feature: admin-moderation-system, Property 7: Permission Enforcement
 * Validates: Requirements 9.4
 * 
 * Property: For any admin with a specific role, attempting an action outside
 * their permissions SHALL result in a permission denied response.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateCreateAdminRoleInput,
  validateUpdateAdminRoleInput,
  isValidAdminRole,
  isValidPermission,
  getDefaultPermissions,
  mergePermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  canManageAdminRole,
  getRoleLevel,
  hasHigherOrEqualRole,
  createAdminRole,
  updateAdminRole,
  countEnabledPermissions,
  getEnabledPermissions,
  getDisabledPermissions,
  VALID_ADMIN_ROLES,
  VALID_PERMISSIONS,
  DEFAULT_PERMISSIONS_BY_ROLE,
} from './adminRoleCore';
import type {
  AdminRoleType,
  AdminPermission,
  AdminPermissions,
  AdminRole,
  CreateAdminRoleInput,
} from '@/types/adminRole';

/**
 * Arbitrary generators
 */
const validAdminRoleTypeArb = fc.constantFrom(...VALID_ADMIN_ROLES);
const validPermissionArb = fc.constantFrom(...VALID_PERMISSIONS);
const uuidArb = fc.uuid();

/**
 * Arbitrary generator for partial permissions
 */
const partialPermissionsArb: fc.Arbitrary<Partial<AdminPermissions>> = fc.dictionary(
  validPermissionArb,
  fc.boolean(),
  { minKeys: 0, maxKeys: 5 }
) as fc.Arbitrary<Partial<AdminPermissions>>;

/**
 * Arbitrary generator for valid CreateAdminRoleInput
 */
const validCreateAdminRoleInputArb: fc.Arbitrary<CreateAdminRoleInput> = fc.record({
  user_id: uuidArb,
  role: validAdminRoleTypeArb,
  permissions: fc.option(partialPermissionsArb, { nil: undefined }),
});

/**
 * Arbitrary generator for ISO date strings (constrained to valid range)
 */
const isoDateArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * Arbitrary generator for AdminRole
 */
const adminRoleArb: fc.Arbitrary<AdminRole> = fc.record({
  id: uuidArb,
  user_id: uuidArb,
  role: validAdminRoleTypeArb,
  permissions: fc.constantFrom(...VALID_ADMIN_ROLES).map(role => getDefaultPermissions(role)),
  created_by: fc.option(uuidArb, { nil: null }),
  created_at: isoDateArb,
  updated_at: isoDateArb,
});

describe('Property 7: Permission Enforcement', () => {
  /**
   * Feature: admin-moderation-system, Property 7: Permission Enforcement
   * Validates: Requirements 9.4
   * 
   * Property: For any admin with a specific role, attempting an action outside
   * their permissions SHALL result in a permission denied response.
   */
  it('Property 7: Admins without permission are denied access', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        validPermissionArb,
        (roleType, permission) => {
          const permissions = getDefaultPermissions(roleType);
          const adminRole: AdminRole = {
            id: crypto.randomUUID(),
            user_id: crypto.randomUUID(),
            role: roleType,
            permissions,
            created_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const result = checkPermission(adminRole, permission);

          // If the permission is enabled, access should be allowed
          // If the permission is disabled, access should be denied
          if (permissions[permission]) {
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('Permission granted');
          } else {
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Permission denied');
            expect(result.reason).toContain(permission);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7a: Null admin role always results in denied access
   */
  it('Property 7a: Null admin role always results in denied access', () => {
    fc.assert(
      fc.property(
        validPermissionArb,
        (permission) => {
          const result = checkPermission(null, permission);
          
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('No admin role assigned');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7b: Undefined admin role always results in denied access
   */
  it('Property 7b: Undefined admin role always results in denied access', () => {
    fc.assert(
      fc.property(
        validPermissionArb,
        (permission) => {
          const result = checkPermission(undefined, permission);
          
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('No admin role assigned');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7c: Super admins have all permissions enabled by default
   */
  it('Property 7c: Super admins have all permissions enabled by default', () => {
    fc.assert(
      fc.property(
        validPermissionArb,
        (permission) => {
          const permissions = getDefaultPermissions('super_admin');
          const adminRole: AdminRole = {
            id: crypto.randomUUID(),
            user_id: crypto.randomUUID(),
            role: 'super_admin',
            permissions,
            created_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const result = checkPermission(adminRole, permission);
          
          expect(result.allowed).toBe(true);
          expect(result.reason).toBe('Permission granted');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7d: Viewers have minimal permissions
   */
  it('Property 7d: Viewers have only analytics permission by default', () => {
    const viewerPermissions = getDefaultPermissions('viewer');
    
    // Viewers should only have can_access_analytics enabled
    const enabledPermissions = getEnabledPermissions(viewerPermissions);
    expect(enabledPermissions).toContain('can_access_analytics');
    expect(enabledPermissions.length).toBe(1);
  });
});

describe('Permission Check Functions', () => {
  /**
   * Property: checkAnyPermission returns true if any permission is granted
   */
  it('checkAnyPermission returns true if any permission is granted', () => {
    fc.assert(
      fc.property(
        adminRoleArb,
        fc.array(validPermissionArb, { minLength: 1, maxLength: 5 }),
        (adminRole, permissions) => {
          const result = checkAnyPermission(adminRole, permissions);
          
          // Check if any of the permissions are enabled
          const hasAny = permissions.some(p => adminRole.permissions[p] === true);
          
          expect(result.allowed).toBe(hasAny);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: checkAllPermissions returns true only if all permissions are granted
   */
  it('checkAllPermissions returns true only if all permissions are granted', () => {
    fc.assert(
      fc.property(
        adminRoleArb,
        fc.array(validPermissionArb, { minLength: 1, maxLength: 5 }),
        (adminRole, permissions) => {
          const result = checkAllPermissions(adminRole, permissions);
          
          // Check if all permissions are enabled
          const hasAll = permissions.every(p => adminRole.permissions[p] === true);
          
          expect(result.allowed).toBe(hasAll);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: checkAllPermissions with empty array returns true
   */
  it('checkAllPermissions with empty array returns true', () => {
    fc.assert(
      fc.property(
        adminRoleArb,
        (adminRole) => {
          const result = checkAllPermissions(adminRole, []);
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Role Hierarchy', () => {
  /**
   * Property: Role levels are consistent with hierarchy
   */
  it('Role levels follow expected hierarchy', () => {
    expect(getRoleLevel('super_admin')).toBeGreaterThan(getRoleLevel('admin'));
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('moderator'));
    expect(getRoleLevel('moderator')).toBeGreaterThan(getRoleLevel('viewer'));
  });

  /**
   * Property: hasHigherOrEqualRole is reflexive
   */
  it('hasHigherOrEqualRole is reflexive', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        (role) => {
          expect(hasHigherOrEqualRole(role, role)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Higher roles have higher or equal role than lower roles
   */
  it('Higher roles have higher or equal role than lower roles', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        validAdminRoleTypeArb,
        (role1, role2) => {
          const level1 = getRoleLevel(role1);
          const level2 = getRoleLevel(role2);
          
          if (level1 >= level2) {
            expect(hasHigherOrEqualRole(role1, role2)).toBe(true);
          } else {
            expect(hasHigherOrEqualRole(role1, role2)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Admin Role Management Permissions', () => {
  /**
   * Property: Only admins with can_manage_admins can manage roles
   */
  it('Only admins with can_manage_admins permission can manage roles', () => {
    fc.assert(
      fc.property(
        adminRoleArb,
        (adminRole) => {
          const result = canManageAdminRole(adminRole);
          
          if (adminRole.permissions.can_manage_admins) {
            expect(result.allowed).toBe(true);
          } else {
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('can_manage_admins');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-super admins cannot manage super admin roles
   */
  it('Non-super admins cannot manage super admin roles', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb.filter(r => r !== 'super_admin'),
        (actingRoleType) => {
          // Create an acting admin with can_manage_admins but not super_admin
          const actingAdmin: AdminRole = {
            id: crypto.randomUUID(),
            user_id: crypto.randomUUID(),
            role: actingRoleType,
            permissions: { ...getDefaultPermissions(actingRoleType), can_manage_admins: true },
            created_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Create a target super admin
          const targetAdmin: AdminRole = {
            id: crypto.randomUUID(),
            user_id: crypto.randomUUID(),
            role: 'super_admin',
            permissions: getDefaultPermissions('super_admin'),
            created_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const result = canManageAdminRole(actingAdmin, targetAdmin);
          
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('super_admin');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Super admins can manage any role
   */
  it('Super admins can manage any role', () => {
    fc.assert(
      fc.property(
        adminRoleArb,
        (targetAdmin) => {
          const superAdmin: AdminRole = {
            id: crypto.randomUUID(),
            user_id: crypto.randomUUID(),
            role: 'super_admin',
            permissions: getDefaultPermissions('super_admin'),
            created_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const result = canManageAdminRole(superAdmin, targetAdmin);
          
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Role Validation', () => {
  /**
   * Property: All defined roles are valid
   */
  it('All defined roles are valid', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        (role) => {
          expect(isValidAdminRole(role)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid strings are not valid roles
   */
  it('Invalid strings are not valid roles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_ADMIN_ROLES.includes(s as AdminRoleType)),
        (invalidRole) => {
          expect(isValidAdminRole(invalidRole)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-string values are not valid roles
   */
  it('Non-string values are not valid roles', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.string()),
          fc.object()
        ),
        (value) => {
          expect(isValidAdminRole(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Permission Validation', () => {
  /**
   * Property: All defined permissions are valid
   */
  it('All defined permissions are valid', () => {
    fc.assert(
      fc.property(
        validPermissionArb,
        (permission) => {
          expect(isValidPermission(permission)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid strings are not valid permissions
   */
  it('Invalid strings are not valid permissions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_PERMISSIONS.includes(s as AdminPermission)),
        (invalidPermission) => {
          expect(isValidPermission(invalidPermission)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Default Permissions', () => {
  /**
   * Property: Default permissions for each role have all permission keys
   */
  it('Default permissions have all permission keys', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        (role) => {
          const permissions = getDefaultPermissions(role);
          
          for (const key of VALID_PERMISSIONS) {
            expect(key in permissions).toBe(true);
            expect(typeof permissions[key]).toBe('boolean');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Higher roles have more or equal permissions than lower roles
   */
  it('Higher roles have more or equal permissions than lower roles', () => {
    const roleOrder: AdminRoleType[] = ['viewer', 'moderator', 'admin', 'super_admin'];
    
    for (let i = 0; i < roleOrder.length - 1; i++) {
      const lowerRole = roleOrder[i];
      const higherRole = roleOrder[i + 1];
      
      const lowerCount = countEnabledPermissions(getDefaultPermissions(lowerRole));
      const higherCount = countEnabledPermissions(getDefaultPermissions(higherRole));
      
      expect(higherCount).toBeGreaterThanOrEqual(lowerCount);
    }
  });
});

describe('Permission Merging', () => {
  /**
   * Property: Merging with undefined returns default permissions
   */
  it('Merging with undefined returns default permissions', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        (role) => {
          const merged = mergePermissions(role, undefined);
          const defaults = getDefaultPermissions(role);
          
          expect(merged).toEqual(defaults);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Custom permissions override defaults
   */
  it('Custom permissions override defaults', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        validPermissionArb,
        fc.boolean(),
        (role, permission, value) => {
          const customPermissions = { [permission]: value } as Partial<AdminPermissions>;
          const merged = mergePermissions(role, customPermissions);
          
          expect(merged[permission]).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-overridden permissions keep default values
   */
  it('Non-overridden permissions keep default values', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        validPermissionArb,
        fc.boolean(),
        (role, overriddenPermission, value) => {
          const customPermissions = { [overriddenPermission]: value } as Partial<AdminPermissions>;
          const merged = mergePermissions(role, customPermissions);
          const defaults = getDefaultPermissions(role);
          
          // Check that non-overridden permissions match defaults
          for (const key of VALID_PERMISSIONS) {
            if (key !== overriddenPermission) {
              expect(merged[key]).toBe(defaults[key]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Create Admin Role Input Validation', () => {
  /**
   * Property: Valid inputs pass validation
   */
  it('Valid inputs pass validation', () => {
    fc.assert(
      fc.property(
        validCreateAdminRoleInputArb,
        (input) => {
          const result = validateCreateAdminRoleInput(input);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing user_id fails validation
   */
  it('Missing user_id fails validation', () => {
    fc.assert(
      fc.property(
        validCreateAdminRoleInputArb,
        (input) => {
          const invalidInput = { ...input };
          delete (invalidInput as Record<string, unknown>).user_id;
          
          const result = validateCreateAdminRoleInput(invalidInput);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('user_id'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing role fails validation
   */
  it('Missing role fails validation', () => {
    fc.assert(
      fc.property(
        validCreateAdminRoleInputArb,
        (input) => {
          const invalidInput = { ...input };
          delete (invalidInput as Record<string, unknown>).role;
          
          const result = validateCreateAdminRoleInput(invalidInput);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('role'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid role fails validation
   */
  it('Invalid role fails validation', () => {
    fc.assert(
      fc.property(
        uuidArb,
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => !VALID_ADMIN_ROLES.includes(s as AdminRoleType)),
        (userId, invalidRole) => {
          const input = {
            user_id: userId,
            role: invalidRole as AdminRoleType,
          };
          
          const result = validateCreateAdminRoleInput(input);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('Invalid role'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Admin Role Creation', () => {
  /**
   * Property: Created roles have all required fields
   */
  it('Created roles have all required fields', () => {
    fc.assert(
      fc.property(
        validCreateAdminRoleInputArb,
        (input) => {
          const role = createAdminRole(input);
          
          expect(role.id).toBeDefined();
          expect(typeof role.id).toBe('string');
          expect(role.user_id).toBe(input.user_id);
          expect(role.role).toBe(input.role);
          expect(role.permissions).toBeDefined();
          expect(role.created_at).toBeDefined();
          expect(role.updated_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Created roles have unique IDs
   */
  it('Created roles have unique IDs', () => {
    fc.assert(
      fc.property(
        validCreateAdminRoleInputArb,
        fc.integer({ min: 2, max: 10 }),
        (input, count) => {
          const ids = new Set<string>();
          
          for (let i = 0; i < count; i++) {
            const role = createAdminRole(input);
            ids.add(role.id);
          }
          
          expect(ids.size).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Created roles have valid timestamps
   */
  it('Created roles have valid timestamps', () => {
    fc.assert(
      fc.property(
        validCreateAdminRoleInputArb,
        (input) => {
          const beforeCreation = new Date();
          const role = createAdminRole(input);
          const afterCreation = new Date();
          
          const createdAt = new Date(role.created_at);
          const updatedAt = new Date(role.updated_at);
          
          expect(isNaN(createdAt.getTime())).toBe(false);
          expect(isNaN(updatedAt.getTime())).toBe(false);
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
          expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Permission Counting', () => {
  /**
   * Property: countEnabledPermissions equals length of getEnabledPermissions
   */
  it('countEnabledPermissions equals length of getEnabledPermissions', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        (role) => {
          const permissions = getDefaultPermissions(role);
          const count = countEnabledPermissions(permissions);
          const enabled = getEnabledPermissions(permissions);
          
          expect(count).toBe(enabled.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Enabled + disabled permissions equals total permissions
   */
  it('Enabled + disabled permissions equals total permissions', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        (role) => {
          const permissions = getDefaultPermissions(role);
          const enabled = getEnabledPermissions(permissions);
          const disabled = getDisabledPermissions(permissions);
          
          expect(enabled.length + disabled.length).toBe(VALID_PERMISSIONS.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Enabled and disabled permissions are disjoint
   */
  it('Enabled and disabled permissions are disjoint', () => {
    fc.assert(
      fc.property(
        validAdminRoleTypeArb,
        (role) => {
          const permissions = getDefaultPermissions(role);
          const enabled = new Set(getEnabledPermissions(permissions));
          const disabled = new Set(getDisabledPermissions(permissions));
          
          // Check no overlap
          for (const p of enabled) {
            expect(disabled.has(p)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

