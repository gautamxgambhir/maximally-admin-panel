/**
 * Property-Based Tests for Data Management - Orphan Detection
 * 
 * Feature: admin-moderation-system, Property 12: Orphan Detection Accuracy
 * Validates: Requirements 11.1
 * 
 * Property: For any record identified as orphaned, there SHALL NOT exist a valid
 * parent record in the referenced table.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidOrphanType,
  validateOrphanDetectionFilters,
  validateCleanupRequest,
  createOrphanRecord,
  createOrphanDetectionResult,
  verifyOrphanAccuracy,
  verifyCleanupResultAccuracy,
  createCleanupResult,
  formatBytes,
  createStorageUsage,
  createStorageStats,
  filterOrphansByType,
  getTableForOrphanType,
  getReferenceInfoForOrphanType,
  ORPHAN_TYPE_TABLE_MAP,
} from './dataManagementCore';
import type {
  OrphanType,
  OrphanRecord,
  CleanupRequest,
} from '@/types/dataManagement';
import { VALID_ORPHAN_TYPES } from '@/types/dataManagement';

/**
 * Arbitrary generator for valid orphan types
 */
const validOrphanTypeArb = fc.constantFrom(...VALID_ORPHAN_TYPES);

/**
 * Arbitrary generator for record IDs (string or number)
 */
const recordIdArb = fc.oneof(
  fc.integer({ min: 1, max: 1000000 }),
  fc.uuid()
);

/**
 * Arbitrary generator for non-empty strings
 */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary generator for valid ISO date strings
 */
const isoDateArb = fc.integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
  .map(ts => new Date(ts).toISOString());

/**
 * Arbitrary generator for record data (simplified JSON object)
 */
const recordDataArb = fc.record({
  id: recordIdArb,
  created_at: isoDateArb,
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  status: fc.option(fc.constantFrom('active', 'inactive', 'pending'), { nil: undefined }),
});

/**
 * Arbitrary generator for orphan records
 */
const orphanRecordArb: fc.Arbitrary<OrphanRecord> = fc.tuple(
  recordIdArb,
  validOrphanTypeArb,
  recordDataArb,
  fc.option(recordIdArb, { nil: null })
).map(([id, type, recordData, missingId]) => 
  createOrphanRecord(id, type, recordData as Record<string, unknown>, missingId)
);

/**
 * Arbitrary generator for valid cleanup requests
 */
const validCleanupRequestArb: fc.Arbitrary<CleanupRequest> = fc.record({
  orphan_ids: fc.array(recordIdArb, { minLength: 1, maxLength: 20 }),
  orphan_type: validOrphanTypeArb,
  reason: nonEmptyStringArb,
  create_backup: fc.boolean(),
});

describe('Property 12: Orphan Detection Accuracy', () => {
  /**
   * Feature: admin-moderation-system, Property 12: Orphan Detection Accuracy
   * Validates: Requirements 11.1
   * 
   * Property: For any record identified as orphaned, there SHALL NOT exist a valid
   * parent record in the referenced table.
   * 
   * This test verifies the core logic: an orphan is only valid if the parent does NOT exist.
   */
  it('Property 12: Orphan is valid only when parent does not exist', () => {
    fc.assert(
      fc.property(
        orphanRecordArb,
        fc.boolean(),
        (orphan, parentExists) => {
          const isValidOrphan = verifyOrphanAccuracy(orphan, parentExists);
          
          // Property 12: An orphan is correctly identified if and only if
          // the parent record does NOT exist
          expect(isValidOrphan).toBe(!parentExists);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12a: Orphan records always have valid structure
   */
  it('Property 12a: Created orphan records have valid structure', () => {
    fc.assert(
      fc.property(
        recordIdArb,
        validOrphanTypeArb,
        recordDataArb,
        fc.option(recordIdArb, { nil: null }),
        (id, type, recordData, missingId) => {
          const orphan = createOrphanRecord(id, type, recordData as Record<string, unknown>, missingId);
          
          // Verify structure
          expect(orphan.id).toBe(id);
          expect(orphan.type).toBe(type);
          expect(orphan.table_name).toBe(ORPHAN_TYPE_TABLE_MAP[type].table);
          expect(orphan.missing_reference.table).toBe(ORPHAN_TYPE_TABLE_MAP[type].reference_table);
          expect(orphan.missing_reference.column).toBe(ORPHAN_TYPE_TABLE_MAP[type].reference_column);
          expect(orphan.missing_reference.expected_id).toBe(missingId);
          expect(typeof orphan.detected_at).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12b: Orphan detection result summary is accurate
   */
  it('Property 12b: Detection result summary accurately counts orphans by type', () => {
    fc.assert(
      fc.property(
        fc.array(orphanRecordArb, { minLength: 0, maxLength: 50 }),
        (orphans) => {
          const result = createOrphanDetectionResult(orphans);
          
          // Total should match array length
          expect(result.summary.total_orphans).toBe(orphans.length);
          
          // Sum of by_type should equal total
          const sumByType = Object.values(result.summary.by_type).reduce((a, b) => a + b, 0);
          expect(sumByType).toBe(orphans.length);
          
          // Each type count should match actual count
          for (const type of VALID_ORPHAN_TYPES) {
            const actualCount = orphans.filter(o => o.type === type).length;
            expect(result.summary.by_type[type]).toBe(actualCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12c: Filtering orphans by type is accurate
   */
  it('Property 12c: Filtering orphans returns only matching types', () => {
    fc.assert(
      fc.property(
        fc.array(orphanRecordArb, { minLength: 0, maxLength: 30 }),
        fc.array(validOrphanTypeArb, { minLength: 0, maxLength: 5 }),
        (orphans, filterTypes) => {
          const filtered = filterOrphansByType(orphans, filterTypes);
          
          if (filterTypes.length === 0) {
            // Empty filter returns all
            expect(filtered.length).toBe(orphans.length);
          } else {
            // All filtered results should match one of the filter types
            for (const orphan of filtered) {
              expect(filterTypes).toContain(orphan.type);
            }
            
            // Count should match expected
            const expectedCount = orphans.filter(o => filterTypes.includes(o.type)).length;
            expect(filtered.length).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Orphan Type Validation', () => {
  /**
   * Property: All defined orphan types are valid
   */
  it('All defined orphan types are valid', () => {
    fc.assert(
      fc.property(
        validOrphanTypeArb,
        (type) => {
          expect(isValidOrphanType(type)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Random strings that aren't orphan types are invalid
   */
  it('Invalid strings are not valid orphan types', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_ORPHAN_TYPES.includes(s as OrphanType)),
        (invalidType) => {
          expect(isValidOrphanType(invalidType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-string values are not valid orphan types
   */
  it('Non-string values are not valid orphan types', () => {
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
          expect(isValidOrphanType(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Each orphan type maps to a valid table configuration
   */
  it('Each orphan type has valid table mapping', () => {
    fc.assert(
      fc.property(
        validOrphanTypeArb,
        (type) => {
          const tableName = getTableForOrphanType(type);
          const refInfo = getReferenceInfoForOrphanType(type);
          
          expect(typeof tableName).toBe('string');
          expect(tableName.length).toBeGreaterThan(0);
          expect(typeof refInfo.table).toBe('string');
          expect(refInfo.table.length).toBeGreaterThan(0);
          expect(typeof refInfo.column).toBe('string');
          expect(refInfo.column.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Cleanup Request Validation', () => {
  /**
   * Property: Valid cleanup requests pass validation
   */
  it('Valid cleanup requests pass validation', () => {
    fc.assert(
      fc.property(
        validCleanupRequestArb,
        (request) => {
          const result = validateCleanupRequest(request);
          
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
        fc.constantFrom('orphan_ids', 'orphan_type', 'reason', 'create_backup'),
        validCleanupRequestArb,
        (fieldToRemove, request) => {
          const partialRequest = { ...request };
          delete (partialRequest as Record<string, unknown>)[fieldToRemove];
          
          const result = validateCleanupRequest(partialRequest);
          
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty orphan_ids array fails validation
   */
  it('Empty orphan_ids array fails validation', () => {
    fc.assert(
      fc.property(
        validCleanupRequestArb,
        (request) => {
          const invalidRequest = { ...request, orphan_ids: [] };
          
          const result = validateCleanupRequest(invalidRequest);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid orphan_type fails validation
   */
  it('Invalid orphan_type fails validation', () => {
    fc.assert(
      fc.property(
        validCleanupRequestArb,
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !VALID_ORPHAN_TYPES.includes(s as OrphanType)),
        (request, invalidType) => {
          const invalidRequest = { ...request, orphan_type: invalidType as OrphanType };
          
          const result = validateCleanupRequest(invalidRequest);
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Cleanup Result Accuracy', () => {
  /**
   * Property: Cleanup result totals are accurate
   * 
   * For any cleanup operation, the sum of deleted and failed operations
   * SHALL equal the total number of items requested.
   */
  it('Cleanup result: deleted + failed = total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(recordIdArb, { minLength: 0, maxLength: 50 }),
        fc.array(
          fc.record({
            id: recordIdArb,
            error: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (total, deletedIds, errors) => {
          // Ensure deleted + errors = total
          const actualDeleted = deletedIds.slice(0, Math.max(0, total - errors.length));
          const actualErrors = errors.slice(0, total - actualDeleted.length);
          
          const result = createCleanupResult(
            actualDeleted.length + actualErrors.length,
            actualDeleted,
            actualErrors
          );
          
          expect(verifyCleanupResultAccuracy(result)).toBe(true);
          expect(result.deleted + result.failed).toBe(result.total);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cleanup result with backup ID preserves it
   */
  it('Cleanup result preserves backup ID when provided', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(recordIdArb, { minLength: 1, maxLength: 20 }),
        fc.option(fc.uuid(), { nil: undefined }),
        (total, deletedIds, backupId) => {
          const result = createCleanupResult(total, deletedIds.slice(0, total), [], backupId);
          
          expect(result.backup_id).toBe(backupId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Storage Utilities', () => {
  /**
   * Property: formatBytes produces valid output for any non-negative number
   */
  it('formatBytes produces valid output for non-negative numbers', () => {
    fc.assert(
      fc.property(
        // Use a reasonable range that formatBytes can handle (up to ~1TB)
        fc.integer({ min: 0, max: 1024 * 1024 * 1024 * 1024 }),
        (bytes) => {
          const formatted = formatBytes(bytes);
          
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(0);
          
          // Should contain a unit
          const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
          const hasUnit = units.some(unit => formatted.includes(unit));
          expect(hasUnit).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: formatBytes(0) returns "0 Bytes"
   */
  it('formatBytes(0) returns "0 Bytes"', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  /**
   * Property: Storage usage has consistent formatting
   */
  it('Storage usage has consistent size formatting', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 0, max: 10000 }),
        (category, sizeBytes, fileCount) => {
          const usage = createStorageUsage(category, sizeBytes, fileCount);
          
          expect(usage.category).toBe(category);
          expect(usage.size_bytes).toBe(sizeBytes);
          expect(usage.file_count).toBe(fileCount);
          expect(usage.size_formatted).toBe(formatBytes(sizeBytes));
          expect(typeof usage.last_updated).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Storage stats total equals sum of categories
   */
  it('Storage stats total equals sum of category sizes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category: fc.string({ minLength: 1, maxLength: 20 }),
            size_bytes: fc.integer({ min: 0, max: 1000000000 }),
            file_count: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (entries) => {
          const usageEntries = entries.map(e => 
            createStorageUsage(e.category, e.size_bytes, e.file_count)
          );
          
          const stats = createStorageStats(usageEntries);
          
          const expectedTotal = entries.reduce((sum, e) => sum + e.size_bytes, 0);
          expect(stats.total_size_bytes).toBe(expectedTotal);
          expect(stats.total_size_formatted).toBe(formatBytes(expectedTotal));
          expect(stats.by_category.length).toBe(entries.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Orphan Detection Filter Validation', () => {
  /**
   * Property: Valid filters pass validation
   */
  it('Valid filters pass validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          types: fc.option(fc.array(validOrphanTypeArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
          limit: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
        }),
        (filters) => {
          const result = validateOrphanDetectionFilters(filters);
          
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid types in filter fail validation
   */
  it('Invalid types in filter fail validation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 30 })
            .filter(s => !VALID_ORPHAN_TYPES.includes(s as OrphanType)),
          { minLength: 1, maxLength: 5 }
        ),
        (invalidTypes) => {
          const result = validateOrphanDetectionFilters({ types: invalidTypes as OrphanType[] });
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-positive limit fails validation
   */
  it('Non-positive limit fails validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (invalidLimit) => {
          const result = validateOrphanDetectionFilters({ limit: invalidLimit });
          
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
