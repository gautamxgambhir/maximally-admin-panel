/**
 * Property-Based Tests for Audit Log Immutability
 * 
 * Feature: admin-moderation-system, Property 1: Audit Log Immutability
 * Validates: Requirements 5.1, 5.3
 * 
 * Property: For any admin action performed on the platform, an audit log entry
 * SHALL be created that cannot be modified or deleted after creation.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateAuditLogInput,
  isValidActionType,
  isValidTargetType,
  isImmutableAuditLogEntry,
  createAuditLogEntry,
  auditLogEntriesEqual,
  computeDiff,
  deepEqual,
  VALID_ACTION_TYPES,
  VALID_TARGET_TYPES,
} from './auditLogCore';
import type { CreateAuditLogInput, AuditLogEntry } from '@/types/audit';

/**
 * Arbitrary generator for valid action types
 */
const validActionTypeArb = fc.constantFrom(...VALID_ACTION_TYPES);

/**
 * Arbitrary generator for valid target types
 */
const validTargetTypeArb = fc.constantFrom(...VALID_TARGET_TYPES);

/**
 * Arbitrary generator for valid email addresses
 */
const emailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
  fc.constantFrom('example.com', 'test.org', 'admin.io')
).map(([local, domain]) => `${local}@${domain}`);

/**
 * Arbitrary generator for UUID-like strings
 */
const uuidArb = fc.uuid();

/**
 * Arbitrary generator for non-empty strings (for reason, target_id)
 */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary generator for JSON-serializable objects (for before/after state)
 */
const jsonObjectArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
  fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()))
  ),
  { minKeys: 0, maxKeys: 10 }
);

/**
 * Arbitrary generator for valid CreateAuditLogInput
 */
const validAuditLogInputArb: fc.Arbitrary<CreateAuditLogInput> = fc.record({
  action_type: validActionTypeArb,
  admin_id: uuidArb,
  admin_email: emailArb,
  target_type: validTargetTypeArb,
  target_id: nonEmptyStringArb,
  reason: nonEmptyStringArb,
  before_state: fc.option(jsonObjectArb, { nil: null }),
  after_state: fc.option(jsonObjectArb, { nil: null }),
  ip_address: fc.option(fc.ipV4(), { nil: null }),
  user_agent: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
});

describe('Property 1: Audit Log Immutability', () => {
  /**
   * Feature: admin-moderation-system, Property 1: Audit Log Immutability
   * Validates: Requirements 5.1, 5.3
   * 
   * Property: For any valid audit log input, creating an audit log entry
   * SHALL produce an immutable entry with all required fields.
   */
  it('Property 1: Created audit log entries are always immutable', () => {
    fc.assert(
      fc.property(
        validAuditLogInputArb,
        (input) => {
          const entry = createAuditLogEntry(input);
          
          // The created entry must be immutable (have all required fields)
          expect(isImmutableAuditLogEntry(entry)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1a: Audit log entries preserve all input data
   */
  it('Property 1a: Audit log entries preserve all input data', () => {
    fc.assert(
      fc.property(
        validAuditLogInputArb,
        (input) => {
          const entry = createAuditLogEntry(input);
          
          // All input fields should be preserved in the entry
          expect(entry.action_type).toBe(input.action_type);
          expect(entry.admin_id).toBe(input.admin_id);
          expect(entry.admin_email).toBe(input.admin_email);
          expect(entry.target_type).toBe(input.target_type);
          expect(entry.target_id).toBe(input.target_id);
          expect(entry.reason).toBe(input.reason.trim());
          expect(deepEqual(entry.before_state, input.before_state ?? null)).toBe(true);
          expect(deepEqual(entry.after_state, input.after_state ?? null)).toBe(true);
          expect(entry.ip_address).toBe(input.ip_address ?? null);
          expect(entry.user_agent).toBe(input.user_agent ?? null);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1b: Audit log entries have unique IDs
   */
  it('Property 1b: Audit log entries have unique IDs', () => {
    fc.assert(
      fc.property(
        validAuditLogInputArb,
        fc.integer({ min: 2, max: 20 }),
        (input, count) => {
          const ids = new Set<string>();
          
          for (let i = 0; i < count; i++) {
            const entry = createAuditLogEntry(input);
            ids.add(entry.id);
          }
          
          // All IDs should be unique
          expect(ids.size).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1c: Audit log entries have valid timestamps
   */
  it('Property 1c: Audit log entries have valid timestamps', () => {
    fc.assert(
      fc.property(
        validAuditLogInputArb,
        (input) => {
          const beforeCreation = new Date();
          const entry = createAuditLogEntry(input);
          const afterCreation = new Date();
          
          const createdAt = new Date(entry.created_at);
          
          // Timestamp should be valid
          expect(isNaN(createdAt.getTime())).toBe(false);
          
          // Timestamp should be between before and after creation
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
          expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1d: Audit log entry equality is reflexive
   */
  it('Property 1d: Audit log entry equality is reflexive', () => {
    fc.assert(
      fc.property(
        validAuditLogInputArb,
        (input) => {
          const entry = createAuditLogEntry(input);
          
          // An entry should be equal to itself
          expect(auditLogEntriesEqual(entry, entry)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1e: Audit log entry equality is symmetric
   */
  it('Property 1e: Audit log entry equality is symmetric', () => {
    fc.assert(
      fc.property(
        validAuditLogInputArb,
        (input) => {
          const entry = createAuditLogEntry(input);
          // Create a copy with same values
          const copy: AuditLogEntry = { ...entry };
          
          // Equality should be symmetric
          expect(auditLogEntriesEqual(entry, copy)).toBe(auditLogEntriesEqual(copy, entry));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Audit Log Validation', () => {
  /**
   * Property: Valid inputs pass validation
   */
  it('Valid inputs pass validation', () => {
    fc.assert(
      fc.property(
        validAuditLogInputArb,
        (input) => {
          const result = validateAuditLogInput(input);
          
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing required fields fail validation
   */
  it('Missing required fields fail validation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'action_type',
          'admin_id',
          'admin_email',
          'target_type',
          'target_id',
          'reason'
        ),
        validAuditLogInputArb,
        (fieldToRemove, input) => {
          const partialInput = { ...input };
          delete (partialInput as Record<string, unknown>)[fieldToRemove];
          
          const result = validateAuditLogInput(partialInput);
          
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid action types fail validation
   */
  it('Invalid action types fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_ACTION_TYPES.includes(s as any)),
        validAuditLogInputArb,
        (invalidActionType, input) => {
          const invalidInput = { ...input, action_type: invalidActionType as any };
          
          const result = validateAuditLogInput(invalidInput);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid target types fail validation
   */
  it('Invalid target types fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_TARGET_TYPES.includes(s as any)),
        validAuditLogInputArb,
        (invalidTargetType, input) => {
          const invalidInput = { ...input, target_type: invalidTargetType as any };
          
          const result = validateAuditLogInput(invalidInput);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty reason fails validation
   */
  it('Empty or whitespace-only reason fails validation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
        validAuditLogInputArb,
        (emptyReason, input) => {
          const invalidInput = { ...input, reason: emptyReason };
          
          const result = validateAuditLogInput(invalidInput);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Action Type and Target Type Validation', () => {
  /**
   * Property: All defined action types are valid
   */
  it('All defined action types are valid', () => {
    fc.assert(
      fc.property(
        validActionTypeArb,
        (actionType) => {
          expect(isValidActionType(actionType)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All defined target types are valid
   */
  it('All defined target types are valid', () => {
    fc.assert(
      fc.property(
        validTargetTypeArb,
        (targetType) => {
          expect(isValidTargetType(targetType)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-string values are not valid action types
   */
  it('Non-string values are not valid action types', () => {
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
          expect(isValidActionType(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-string values are not valid target types
   */
  it('Non-string values are not valid target types', () => {
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
          expect(isValidTargetType(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 11: Audit Log Diff Accuracy
 * 
 * Feature: admin-moderation-system, Property 11: Audit Log Diff Accuracy
 * Validates: Requirements 5.5
 * 
 * Property: For any audit log entry with before_state and after_state,
 * the computed diff SHALL accurately reflect all changed fields.
 */
describe('Property 11: Audit Log Diff Accuracy', () => {
  /**
   * Feature: admin-moderation-system, Property 11: Audit Log Diff Accuracy
   * Validates: Requirements 5.5
   * 
   * Property: For any before_state and after_state, the computed diff
   * SHALL accurately identify all added, removed, and modified fields.
   */
  it('Property 11: Diff accurately reflects all changed fields', () => {
    fc.assert(
      fc.property(
        jsonObjectArb,
        jsonObjectArb,
        (beforeState, afterState) => {
          const diff = computeDiff(beforeState, afterState);
          
          // Get all unique keys
          const allKeys = new Set([...Object.keys(beforeState), ...Object.keys(afterState)]);
          
          // Verify each key is correctly categorized
          for (const key of allKeys) {
            const beforeExists = key in beforeState;
            const afterExists = key in afterState;
            const beforeValue = beforeState[key];
            const afterValue = afterState[key];
            
            const diffEntry = diff.entries.find(e => e.field === key);
            
            if (!beforeExists && afterExists) {
              // Field was added
              expect(diffEntry).toBeDefined();
              expect(diffEntry?.changeType).toBe('added');
              expect(diffEntry?.before).toBeUndefined();
              expect(deepEqual(diffEntry?.after, afterValue)).toBe(true);
            } else if (beforeExists && !afterExists) {
              // Field was removed
              expect(diffEntry).toBeDefined();
              expect(diffEntry?.changeType).toBe('removed');
              expect(deepEqual(diffEntry?.before, beforeValue)).toBe(true);
              expect(diffEntry?.after).toBeUndefined();
            } else if (!deepEqual(beforeValue, afterValue)) {
              // Field was modified
              expect(diffEntry).toBeDefined();
              expect(diffEntry?.changeType).toBe('modified');
              expect(deepEqual(diffEntry?.before, beforeValue)).toBe(true);
              expect(deepEqual(diffEntry?.after, afterValue)).toBe(true);
            } else {
              // Field unchanged - should not be in diff
              expect(diffEntry).toBeUndefined();
            }
          }
          
          // Verify no extra entries in diff
          expect(diff.entries.length).toBeLessThanOrEqual(allKeys.size);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11a: Diff hasChanges flag is accurate
   */
  it('Property 11a: hasChanges flag accurately reflects whether changes exist', () => {
    fc.assert(
      fc.property(
        jsonObjectArb,
        jsonObjectArb,
        (beforeState, afterState) => {
          const diff = computeDiff(beforeState, afterState);
          
          // hasChanges should be true if and only if there are entries
          expect(diff.hasChanges).toBe(diff.entries.length > 0);
          
          // Verify hasChanges matches actual state comparison
          const statesAreEqual = deepEqual(beforeState, afterState);
          expect(diff.hasChanges).toBe(!statesAreEqual);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11b: Diff entries have correct structure
   */
  it('Property 11b: All diff entries have valid structure', () => {
    fc.assert(
      fc.property(
        jsonObjectArb,
        jsonObjectArb,
        (beforeState, afterState) => {
          const diff = computeDiff(beforeState, afterState);
          
          for (const entry of diff.entries) {
            // Every entry must have a field name
            expect(typeof entry.field).toBe('string');
            expect(entry.field.length).toBeGreaterThan(0);
            
            // Every entry must have a valid changeType
            expect(['added', 'removed', 'modified']).toContain(entry.changeType);
            
            // Validate before/after based on changeType
            if (entry.changeType === 'added') {
              expect(entry.before).toBeUndefined();
              expect(entry.after).toBeDefined();
            } else if (entry.changeType === 'removed') {
              expect(entry.before).toBeDefined();
              expect(entry.after).toBeUndefined();
            } else if (entry.changeType === 'modified') {
              // Modified entries should have both before and after
              // and they should be different
              expect(deepEqual(entry.before, entry.after)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Audit Log Diff Computation', () => {
  /**
   * Property: Diff of identical states has no changes
   */
  it('Diff of identical states has no changes', () => {
    fc.assert(
      fc.property(
        jsonObjectArb,
        (state) => {
          const diff = computeDiff(state, state);
          
          expect(diff.hasChanges).toBe(false);
          expect(diff.entries).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Diff of null states has no changes
   */
  it('Diff of null states has no changes', () => {
    const diff = computeDiff(null, null);
    
    expect(diff.hasChanges).toBe(false);
    expect(diff.entries).toHaveLength(0);
  });

  /**
   * Property: Adding a field is detected as 'added'
   */
  it('Adding a field is detected as added', () => {
    fc.assert(
      fc.property(
        jsonObjectArb,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (before, newKey, newValue) => {
          // Ensure the key doesn't already exist
          if (newKey in before) return true;
          
          const after = { ...before, [newKey]: newValue };
          const diff = computeDiff(before, after);
          
          expect(diff.hasChanges).toBe(true);
          
          const addedEntry = diff.entries.find(e => e.field === newKey);
          expect(addedEntry).toBeDefined();
          expect(addedEntry?.changeType).toBe('added');
          expect(addedEntry?.after).toBe(newValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Removing a field is detected as 'removed'
   */
  it('Removing a field is detected as removed', () => {
    // Filter out JavaScript reserved/special property names that can cause issues
    const reservedNames = ['valueOf', 'toString', 'constructor', 'prototype', '__proto__', 'hasOwnProperty'];
    const safeKeyArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) && !reservedNames.includes(s));
    
    fc.assert(
      fc.property(
        fc.dictionary(
          safeKeyArb,
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          { minKeys: 1, maxKeys: 10 }
        ),
        (before) => {
          const keys = Object.keys(before);
          if (keys.length === 0) return true;
          
          const keyToRemove = keys[0];
          const after = { ...before };
          delete after[keyToRemove];
          
          const diff = computeDiff(before, after);
          
          expect(diff.hasChanges).toBe(true);
          
          const removedEntry = diff.entries.find(e => e.field === keyToRemove);
          expect(removedEntry).toBeDefined();
          expect(removedEntry?.changeType).toBe('removed');
          expect(removedEntry?.before).toBe(before[keyToRemove]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Modifying a field is detected as 'modified'
   */
  it('Modifying a field is detected as modified', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          fc.string({ minLength: 1, maxLength: 50 }),
          { minKeys: 1, maxKeys: 10 }
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        (before, newValue) => {
          const keys = Object.keys(before);
          if (keys.length === 0) return true;
          
          const keyToModify = keys[0];
          // Ensure the new value is different
          if (before[keyToModify] === newValue) return true;
          
          const after = { ...before, [keyToModify]: newValue };
          const diff = computeDiff(before, after);
          
          expect(diff.hasChanges).toBe(true);
          
          const modifiedEntry = diff.entries.find(e => e.field === keyToModify);
          expect(modifiedEntry).toBeDefined();
          expect(modifiedEntry?.changeType).toBe('modified');
          expect(modifiedEntry?.before).toBe(before[keyToModify]);
          expect(modifiedEntry?.after).toBe(newValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Diff entry count equals number of changed fields
   */
  it('Diff entry count equals number of changed fields', () => {
    fc.assert(
      fc.property(
        jsonObjectArb,
        jsonObjectArb,
        (before, after) => {
          const diff = computeDiff(before, after);
          
          // Count expected changes
          const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
          let expectedChanges = 0;
          
          for (const key of allKeys) {
            const beforeExists = key in before;
            const afterExists = key in after;
            
            if (!beforeExists && afterExists) {
              expectedChanges++; // Added
            } else if (beforeExists && !afterExists) {
              expectedChanges++; // Removed
            } else if (!deepEqual(before[key], after[key])) {
              expectedChanges++; // Modified
            }
          }
          
          expect(diff.entries.length).toBe(expectedChanges);
          expect(diff.hasChanges).toBe(expectedChanges > 0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Deep Equality', () => {
  /**
   * Property: Deep equality is reflexive
   */
  it('Deep equality is reflexive', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          jsonObjectArb,
          fc.array(fc.oneof(fc.string(), fc.integer()))
        ),
        (value) => {
          expect(deepEqual(value, value)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Deep equality is symmetric
   */
  it('Deep equality is symmetric', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), jsonObjectArb),
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), jsonObjectArb),
        (a, b) => {
          expect(deepEqual(a, b)).toBe(deepEqual(b, a));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Different types are not equal
   */
  it('Different types are not equal', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer(),
        (str, num) => {
          expect(deepEqual(str, num)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Null is only equal to null
   */
  it('Null is only equal to null', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), jsonObjectArb),
        (value) => {
          expect(deepEqual(null, value)).toBe(false);
          expect(deepEqual(value, null)).toBe(false);
          expect(deepEqual(null, null)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
