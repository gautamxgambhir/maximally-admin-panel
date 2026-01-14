/**
 * Data Management Core Logic (Pure, Testable)
 * 
 * This module contains pure functions for data management operations that can be
 * tested without database access. These functions implement the core logic
 * for orphan detection validation, cleanup verification, and storage calculations.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */

import type {
  OrphanType,
  OrphanRecord,
  OrphanDetectionResult,
  OrphanDetectionFilters,
  CleanupRequest,
  CleanupResult,
  OrphanValidationResult,
  StorageUsage,
  StorageStats,
} from '@/types/dataManagement';

import { VALID_ORPHAN_TYPES } from '@/types/dataManagement';

/**
 * Table mappings for orphan types
 */
export const ORPHAN_TYPE_TABLE_MAP: Record<OrphanType, { table: string; reference_table: string; reference_column: string }> = {
  'hackathon_without_organizer': {
    table: 'organizer_hackathons',
    reference_table: 'organizer_profiles',
    reference_column: 'organizer_id',
  },
  'registration_without_user': {
    table: 'hackathon_registrations',
    reference_table: 'profiles',
    reference_column: 'user_id',
  },
  'registration_without_hackathon': {
    table: 'hackathon_registrations',
    reference_table: 'organizer_hackathons',
    reference_column: 'hackathon_id',
  },
  'team_without_hackathon': {
    table: 'hackathon_teams',
    reference_table: 'organizer_hackathons',
    reference_column: 'hackathon_id',
  },
  'submission_without_hackathon': {
    table: 'hackathon_submissions',
    reference_table: 'organizer_hackathons',
    reference_column: 'hackathon_id',
  },
  'submission_without_team': {
    table: 'hackathon_submissions',
    reference_table: 'hackathon_teams',
    reference_column: 'team_id',
  },
  'certificate_without_generator': {
    table: 'certificates',
    reference_table: 'auth.users',
    reference_column: 'generated_by',
  },
  'feedback_without_hackathon': {
    table: 'hackathon_participant_feedback',
    reference_table: 'organizer_hackathons',
    reference_column: 'hackathon_id',
  },
  'announcement_without_hackathon': {
    table: 'hackathon_announcements',
    reference_table: 'organizer_hackathons',
    reference_column: 'hackathon_id',
  },
};

/**
 * Check if a value is a valid orphan type
 */
export function isValidOrphanType(value: unknown): value is OrphanType {
  return typeof value === 'string' && VALID_ORPHAN_TYPES.includes(value as OrphanType);
}

/**
 * Validate orphan detection filters
 * 
 * @param filters - The filters to validate
 * @returns Validation result with any errors
 */
export function validateOrphanDetectionFilters(
  filters: Partial<OrphanDetectionFilters>
): OrphanValidationResult {
  const errors: string[] = [];

  if (filters.types !== undefined) {
    if (!Array.isArray(filters.types)) {
      errors.push('types must be an array');
    } else {
      const invalidTypes = filters.types.filter(t => !isValidOrphanType(t));
      if (invalidTypes.length > 0) {
        errors.push(`Invalid orphan types: ${invalidTypes.join(', ')}`);
      }
    }
  }

  if (filters.limit !== undefined) {
    if (typeof filters.limit !== 'number' || filters.limit < 1) {
      errors.push('limit must be a positive number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate cleanup request
 * 
 * @param request - The cleanup request to validate
 * @returns Validation result with any errors
 */
export function validateCleanupRequest(
  request: Partial<CleanupRequest>
): OrphanValidationResult {
  const errors: string[] = [];

  if (!request.orphan_ids) {
    errors.push('orphan_ids is required');
  } else if (!Array.isArray(request.orphan_ids)) {
    errors.push('orphan_ids must be an array');
  } else if (request.orphan_ids.length === 0) {
    errors.push('orphan_ids cannot be empty');
  }

  if (!request.orphan_type) {
    errors.push('orphan_type is required');
  } else if (!isValidOrphanType(request.orphan_type)) {
    errors.push(`Invalid orphan_type: ${request.orphan_type}`);
  }

  if (!request.reason) {
    errors.push('reason is required');
  } else if (typeof request.reason !== 'string' || request.reason.trim() === '') {
    errors.push('reason must be a non-empty string');
  }

  if (request.create_backup === undefined) {
    errors.push('create_backup is required');
  } else if (typeof request.create_backup !== 'boolean') {
    errors.push('create_backup must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create an orphan record from raw data
 * 
 * @param id - The record ID
 * @param type - The orphan type
 * @param recordData - The raw record data
 * @param missingId - The ID of the missing reference
 * @returns The orphan record
 */
export function createOrphanRecord(
  id: string | number,
  type: OrphanType,
  recordData: Record<string, unknown>,
  missingId: string | number | null
): OrphanRecord {
  const mapping = ORPHAN_TYPE_TABLE_MAP[type];
  
  return {
    id,
    type,
    table_name: mapping.table,
    record_data: recordData,
    missing_reference: {
      table: mapping.reference_table,
      column: mapping.reference_column,
      expected_id: missingId,
    },
    created_at: (recordData.created_at as string) ?? new Date().toISOString(),
    detected_at: new Date().toISOString(),
  };
}

/**
 * Create orphan detection result from orphan records
 * 
 * @param orphans - Array of orphan records
 * @returns The detection result with summary
 */
export function createOrphanDetectionResult(
  orphans: OrphanRecord[]
): OrphanDetectionResult {
  const byType: Record<OrphanType, number> = {} as Record<OrphanType, number>;
  
  // Initialize all types to 0
  for (const type of VALID_ORPHAN_TYPES) {
    byType[type] = 0;
  }
  
  // Count orphans by type
  for (const orphan of orphans) {
    byType[orphan.type] = (byType[orphan.type] ?? 0) + 1;
  }

  return {
    orphans,
    summary: {
      total_orphans: orphans.length,
      by_type: byType,
    },
    scanned_at: new Date().toISOString(),
  };
}

/**
 * Property 12: Orphan Detection Accuracy
 * 
 * For any record identified as orphaned, there SHALL NOT exist a valid
 * parent record in the referenced table.
 * 
 * This function verifies that an orphan record is correctly identified
 * by checking that the missing reference is properly documented.
 * 
 * @param orphan - The orphan record to verify
 * @param parentExists - Whether the parent record actually exists
 * @returns True if the orphan is correctly identified (parent does not exist)
 */
export function verifyOrphanAccuracy(
  orphan: OrphanRecord,
  parentExists: boolean
): boolean {
  // Property 12: An orphan is only valid if the parent does NOT exist
  return !parentExists;
}

/**
 * Verify cleanup result accuracy
 * 
 * For any cleanup operation, the sum of deleted and failed operations
 * SHALL equal the total number of items requested.
 * 
 * @param result - The cleanup result to verify
 * @returns True if the result is accurate
 */
export function verifyCleanupResultAccuracy(result: CleanupResult): boolean {
  return result.deleted + result.failed === result.total;
}

/**
 * Create a cleanup result from individual operations
 * 
 * @param total - Total number of items to clean up
 * @param deletedIds - IDs that were successfully deleted
 * @param errors - Errors that occurred during cleanup
 * @param backupId - Optional backup ID if backup was created
 * @returns The cleanup result
 */
export function createCleanupResult(
  total: number,
  deletedIds: (string | number)[],
  errors: Array<{ id: string | number; error: string }>,
  backupId?: string
): CleanupResult {
  return {
    total,
    deleted: deletedIds.length,
    failed: errors.length,
    backup_id: backupId,
    errors,
  };
}

/**
 * Format bytes to human-readable string
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Create storage usage entry
 * 
 * @param category - Storage category name
 * @param sizeBytes - Size in bytes
 * @param fileCount - Number of files
 * @returns Storage usage entry
 */
export function createStorageUsage(
  category: string,
  sizeBytes: number,
  fileCount: number
): StorageUsage {
  return {
    category,
    size_bytes: sizeBytes,
    size_formatted: formatBytes(sizeBytes),
    file_count: fileCount,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Create storage stats from usage entries
 * 
 * @param usageEntries - Array of storage usage entries
 * @returns Storage stats with recommendations
 */
export function createStorageStats(usageEntries: StorageUsage[]): StorageStats {
  const totalBytes = usageEntries.reduce((sum, entry) => sum + entry.size_bytes, 0);
  const recommendations: string[] = [];

  // Generate recommendations based on usage
  for (const entry of usageEntries) {
    const percentOfTotal = totalBytes > 0 ? (entry.size_bytes / totalBytes) * 100 : 0;
    
    if (percentOfTotal > 50) {
      recommendations.push(
        `${entry.category} uses ${percentOfTotal.toFixed(1)}% of total storage. Consider cleanup.`
      );
    }
    
    if (entry.size_bytes > 1024 * 1024 * 1024) { // > 1GB
      recommendations.push(
        `${entry.category} exceeds 1GB. Review for unused files.`
      );
    }
  }

  return {
    total_size_bytes: totalBytes,
    total_size_formatted: formatBytes(totalBytes),
    by_category: usageEntries,
    recommendations,
  };
}

/**
 * Filter orphans by type
 * 
 * @param orphans - Array of orphan records
 * @param types - Types to filter by (empty means all)
 * @returns Filtered orphan records
 */
export function filterOrphansByType(
  orphans: OrphanRecord[],
  types: OrphanType[]
): OrphanRecord[] {
  if (types.length === 0) {
    return orphans;
  }
  return orphans.filter(orphan => types.includes(orphan.type));
}

/**
 * Get table name for orphan type
 * 
 * @param type - The orphan type
 * @returns The table name
 */
export function getTableForOrphanType(type: OrphanType): string {
  return ORPHAN_TYPE_TABLE_MAP[type].table;
}

/**
 * Get reference info for orphan type
 * 
 * @param type - The orphan type
 * @returns Reference table and column info
 */
export function getReferenceInfoForOrphanType(
  type: OrphanType
): { table: string; column: string } {
  const mapping = ORPHAN_TYPE_TABLE_MAP[type];
  return {
    table: mapping.reference_table,
    column: mapping.reference_column,
  };
}
