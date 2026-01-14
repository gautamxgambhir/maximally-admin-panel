/**
 * Data Management Service
 * 
 * Service layer for data management operations including orphan detection,
 * cleanup with backup, and storage management.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */

import {
  detectOrphans,
  cleanupOrphans,
  getStorageStats,
  getDataManagementOverview,
  getOrphanSummary,
  verifyOrphanStatus,
} from './dataManagementApi';
import type {
  OrphanType,
  OrphanDetectionResult,
  OrphanDetectionFilters,
  CleanupRequest,
  CleanupResult,
  StorageStats,
  DataManagementOverview,
} from '@/types/dataManagement';

/**
 * DataManagementService class for managing data cleanup operations
 * 
 * This service provides methods to:
 * - Detect orphaned records (Requirement 11.1)
 * - Clean up orphans with backup (Requirement 11.2)
 * - Get storage statistics (Requirement 11.4)
 */
export class DataManagementService {
  private static instance: DataManagementService;

  private constructor() {}

  /**
   * Get singleton instance of DataManagementService
   */
  public static getInstance(): DataManagementService {
    if (!DataManagementService.instance) {
      DataManagementService.instance = new DataManagementService();
    }
    return DataManagementService.instance;
  }

  /**
   * Detect orphaned records in the database
   * 
   * Requirement 11.1: Display orphaned records (hackathons without organizers,
   * registrations without users) with cleanup options.
   * 
   * @param filters - Optional filters for detection
   * @returns Detection result with all orphans found
   */
  async detectOrphans(filters?: OrphanDetectionFilters): Promise<OrphanDetectionResult> {
    return detectOrphans(filters);
  }

  /**
   * Get a quick summary of orphaned records
   * 
   * @returns Summary with counts by type
   */
  async getOrphanSummary(): Promise<{
    total_orphans: number;
    by_type: Record<string, number>;
    last_scan: string;
  }> {
    return getOrphanSummary();
  }

  /**
   * Clean up orphaned records with backup
   * 
   * Requirement 11.2: Delete orphans with confirmation, create backup,
   * and log all deletions.
   * 
   * @param request - The cleanup request
   * @param adminId - The admin performing the cleanup
   * @param adminEmail - The admin's email
   * @returns Cleanup result with success/failure counts
   */
  async cleanupOrphans(
    request: CleanupRequest,
    adminId: string,
    adminEmail: string
  ): Promise<CleanupResult> {
    return cleanupOrphans(request, adminId, adminEmail);
  }

  /**
   * Clean up orphans by type
   * 
   * Convenience method to clean up all orphans of a specific type.
   * 
   * @param orphanType - The type of orphans to clean up
   * @param reason - The reason for cleanup
   * @param adminId - The admin performing the cleanup
   * @param adminEmail - The admin's email
   * @param createBackup - Whether to create a backup
   * @returns Cleanup result
   */
  async cleanupOrphansByType(
    orphanType: OrphanType,
    reason: string,
    adminId: string,
    adminEmail: string,
    createBackup: boolean = true
  ): Promise<CleanupResult> {
    // First detect orphans of this type
    const detection = await this.detectOrphans({ types: [orphanType] });
    
    if (detection.orphans.length === 0) {
      return {
        total: 0,
        deleted: 0,
        failed: 0,
        errors: [],
      };
    }

    // Clean up all detected orphans
    const orphanIds = detection.orphans.map(o => o.id);
    
    return this.cleanupOrphans(
      {
        orphan_ids: orphanIds,
        orphan_type: orphanType,
        reason,
        create_backup: createBackup,
      },
      adminId,
      adminEmail
    );
  }

  /**
   * Get storage usage statistics
   * 
   * Requirement 11.4: Display storage consumption by category with
   * cleanup recommendations.
   * 
   * @returns Storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    return getStorageStats();
  }

  /**
   * Get complete data management overview
   * 
   * @returns Overview including orphan summary, storage stats, and cleanup history
   */
  async getOverview(): Promise<DataManagementOverview> {
    return getDataManagementOverview();
  }

  /**
   * Verify if a specific record is truly orphaned
   * 
   * Property 12: For any record identified as orphaned, there SHALL NOT
   * exist a valid parent record in the referenced table.
   * 
   * @param orphanId - The orphan record ID
   * @param orphanType - The type of orphan
   * @returns True if the record is truly orphaned
   */
  async verifyOrphanStatus(
    orphanId: string | number,
    orphanType: OrphanType
  ): Promise<boolean> {
    // Detect the specific orphan
    const detection = await this.detectOrphans({ types: [orphanType], limit: 1000 });
    const orphan = detection.orphans.find(o => o.id === orphanId);
    
    if (!orphan) {
      return false; // Not found in orphan list
    }

    return verifyOrphanStatus(orphan);
  }
}

// Export singleton instance
export const dataManagementService = DataManagementService.getInstance();
