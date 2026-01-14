/**
 * Data Management Types
 * 
 * Types for orphan detection, data cleanup, and storage management.
 * Requirements: 11.1, 11.2, 11.4
 */

/**
 * Types of orphaned records that can be detected
 */
export type OrphanType =
  | 'hackathon_without_organizer'
  | 'registration_without_user'
  | 'registration_without_hackathon'
  | 'team_without_hackathon'
  | 'submission_without_hackathon'
  | 'submission_without_team'
  | 'certificate_without_generator'
  | 'feedback_without_hackathon'
  | 'announcement_without_hackathon';

/**
 * An orphaned record detected in the database
 */
export interface OrphanRecord {
  id: string | number;
  type: OrphanType;
  table_name: string;
  record_data: Record<string, unknown>;
  missing_reference: {
    table: string;
    column: string;
    expected_id: string | number | null;
  };
  created_at: string;
  detected_at: string;
}

/**
 * Summary of orphan detection results
 */
export interface OrphanDetectionResult {
  orphans: OrphanRecord[];
  summary: {
    total_orphans: number;
    by_type: Record<OrphanType, number>;
  };
  scanned_at: string;
}

/**
 * Filters for orphan detection
 */
export interface OrphanDetectionFilters {
  types?: OrphanType[];
  limit?: number;
}

/**
 * Request to clean up orphaned records
 */
export interface CleanupRequest {
  orphan_ids: (string | number)[];
  orphan_type: OrphanType;
  reason: string;
  create_backup: boolean;
}

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
  total: number;
  deleted: number;
  failed: number;
  backup_id?: string;
  errors: Array<{
    id: string | number;
    error: string;
  }>;
}

/**
 * Storage usage by category
 */
export interface StorageUsage {
  category: string;
  size_bytes: number;
  size_formatted: string;
  file_count: number;
  last_updated: string;
}

/**
 * Overall storage statistics
 */
export interface StorageStats {
  total_size_bytes: number;
  total_size_formatted: string;
  by_category: StorageUsage[];
  recommendations: string[];
}

/**
 * Data management overview response
 */
export interface DataManagementOverview {
  orphan_summary: {
    total_orphans: number;
    by_type: Record<string, number>;
    last_scan: string | null;
  };
  storage_stats: StorageStats;
  cleanup_history: CleanupHistoryEntry[];
}

/**
 * History entry for cleanup operations
 */
export interface CleanupHistoryEntry {
  id: string;
  orphan_type: OrphanType;
  records_deleted: number;
  performed_by: string;
  performed_at: string;
  reason: string;
  backup_id?: string;
}

/**
 * Validation result for orphan detection
 */
export interface OrphanValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid orphan types for validation
 */
export const VALID_ORPHAN_TYPES: readonly OrphanType[] = [
  'hackathon_without_organizer',
  'registration_without_user',
  'registration_without_hackathon',
  'team_without_hackathon',
  'submission_without_hackathon',
  'submission_without_team',
  'certificate_without_generator',
  'feedback_without_hackathon',
  'announcement_without_hackathon',
] as const;
