/**
 * Data Management API Functions
 * 
 * Provides API functions for orphan detection, data cleanup, and storage management.
 * Requirements: 11.1, 11.2, 11.4
 */

import { supabaseAdmin } from './supabase';
import type {
  OrphanType,
  OrphanRecord,
  OrphanDetectionResult,
  OrphanDetectionFilters,
  CleanupRequest,
  CleanupResult,
  StorageStats,
  DataManagementOverview,
  CleanupHistoryEntry,
} from '@/types/dataManagement';
import { VALID_ORPHAN_TYPES } from '@/types/dataManagement';
import {
  createOrphanRecord,
  createOrphanDetectionResult,
  createCleanupResult,
  createStorageUsage,
  createStorageStats,
  validateOrphanDetectionFilters,
  validateCleanupRequest,
  ORPHAN_TYPE_TABLE_MAP,
} from './dataManagementCore';
import { auditService } from './auditService';

/**
 * Detect orphaned hackathons without valid organizers
 * 
 * Requirement 11.1: Find hackathons without organizers
 */
async function detectHackathonsWithoutOrganizers(limit: number): Promise<OrphanRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .limit(limit);

  if (error) {
    throw new Error(`Failed to query hackathons: ${error.message}`);
  }

  const orphans: OrphanRecord[] = [];
  
  for (const hackathon of data ?? []) {
    // Check if organizer exists in organizer_profiles
    const { data: organizer } = await supabaseAdmin
      .from('organizer_profiles')
      .select('user_id')
      .eq('user_id', hackathon.organizer_id)
      .single();

    if (!organizer) {
      orphans.push(createOrphanRecord(
        hackathon.id,
        'hackathon_without_organizer',
        hackathon,
        hackathon.organizer_id
      ));
    }
  }

  return orphans;
}

/**
 * Detect orphaned registrations without valid users
 * 
 * Requirement 11.1: Find registrations without users
 */
async function detectRegistrationsWithoutUsers(limit: number): Promise<OrphanRecord[]> {
  // Find registrations where user_id is set but doesn't exist in profiles
  const { data, error } = await supabaseAdmin
    .from('hackathon_registrations')
    .select('*')
    .not('user_id', 'is', null)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to query registrations: ${error.message}`);
  }

  const orphans: OrphanRecord[] = [];
  
  for (const registration of data ?? []) {
    if (registration.user_id) {
      const { data: user } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', registration.user_id)
        .single();

      if (!user) {
        orphans.push(createOrphanRecord(
          registration.id,
          'registration_without_user',
          registration,
          registration.user_id
        ));
      }
    }
  }

  return orphans;
}

/**
 * Detect orphaned registrations without valid hackathons
 */
async function detectRegistrationsWithoutHackathons(limit: number): Promise<OrphanRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('hackathon_registrations')
    .select('*')
    .limit(limit);

  if (error) {
    throw new Error(`Failed to query registrations: ${error.message}`);
  }

  const orphans: OrphanRecord[] = [];
  
  for (const registration of data ?? []) {
    const { data: hackathon } = await supabaseAdmin
      .from('organizer_hackathons')
      .select('id')
      .eq('id', registration.hackathon_id)
      .single();

    if (!hackathon) {
      orphans.push(createOrphanRecord(
        registration.id,
        'registration_without_hackathon',
        registration,
        registration.hackathon_id
      ));
    }
  }

  return orphans;
}

/**
 * Detect orphaned teams without valid hackathons
 */
async function detectTeamsWithoutHackathons(limit: number): Promise<OrphanRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('hackathon_teams')
    .select('*')
    .limit(limit);

  if (error) {
    throw new Error(`Failed to query teams: ${error.message}`);
  }

  const orphans: OrphanRecord[] = [];
  
  for (const team of data ?? []) {
    const { data: hackathon } = await supabaseAdmin
      .from('organizer_hackathons')
      .select('id')
      .eq('id', team.hackathon_id)
      .single();

    if (!hackathon) {
      orphans.push(createOrphanRecord(
        team.id,
        'team_without_hackathon',
        team,
        team.hackathon_id
      ));
    }
  }

  return orphans;
}

/**
 * Detect orphaned submissions without valid hackathons
 */
async function detectSubmissionsWithoutHackathons(limit: number): Promise<OrphanRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('hackathon_submissions')
    .select('*')
    .limit(limit);

  if (error) {
    throw new Error(`Failed to query submissions: ${error.message}`);
  }

  const orphans: OrphanRecord[] = [];
  
  for (const submission of data ?? []) {
    const { data: hackathon } = await supabaseAdmin
      .from('organizer_hackathons')
      .select('id')
      .eq('id', submission.hackathon_id)
      .single();

    if (!hackathon) {
      orphans.push(createOrphanRecord(
        submission.id,
        'submission_without_hackathon',
        submission,
        submission.hackathon_id
      ));
    }
  }

  return orphans;
}

/**
 * Detect all orphaned records
 * 
 * Requirement 11.1: Display orphaned records with cleanup options
 * 
 * @param filters - Optional filters for detection
 * @returns Detection result with all orphans found
 */
export async function detectOrphans(
  filters: OrphanDetectionFilters = {}
): Promise<OrphanDetectionResult> {
  const validation = validateOrphanDetectionFilters(filters);
  if (!validation.valid) {
    throw new Error(`Invalid filters: ${validation.errors.join(', ')}`);
  }

  const limit = filters.limit ?? 100;
  const types = filters.types ?? [...VALID_ORPHAN_TYPES];
  
  const allOrphans: OrphanRecord[] = [];

  // Run detection for each requested type
  const detectionPromises: Promise<OrphanRecord[]>[] = [];

  if (types.includes('hackathon_without_organizer')) {
    detectionPromises.push(detectHackathonsWithoutOrganizers(limit));
  }
  if (types.includes('registration_without_user')) {
    detectionPromises.push(detectRegistrationsWithoutUsers(limit));
  }
  if (types.includes('registration_without_hackathon')) {
    detectionPromises.push(detectRegistrationsWithoutHackathons(limit));
  }
  if (types.includes('team_without_hackathon')) {
    detectionPromises.push(detectTeamsWithoutHackathons(limit));
  }
  if (types.includes('submission_without_hackathon')) {
    detectionPromises.push(detectSubmissionsWithoutHackathons(limit));
  }

  const results = await Promise.all(detectionPromises);
  
  for (const orphans of results) {
    allOrphans.push(...orphans);
  }

  return createOrphanDetectionResult(allOrphans);
}

/**
 * Get orphan detection summary (quick count without full data)
 */
export async function getOrphanSummary(): Promise<{
  total_orphans: number;
  by_type: Record<string, number>;
  last_scan: string;
}> {
  const result = await detectOrphans({ limit: 1000 });
  
  return {
    total_orphans: result.summary.total_orphans,
    by_type: result.summary.by_type,
    last_scan: result.scanned_at,
  };
}

/**
 * Clean up orphaned records with backup
 * 
 * Requirement 11.2: Delete orphans with confirmation and audit logging
 * 
 * @param request - The cleanup request
 * @param adminId - The admin performing the cleanup
 * @param adminEmail - The admin's email
 * @returns Cleanup result
 */
export async function cleanupOrphans(
  request: CleanupRequest,
  adminId: string,
  adminEmail: string
): Promise<CleanupResult> {
  const validation = validateCleanupRequest(request);
  if (!validation.valid) {
    throw new Error(`Invalid cleanup request: ${validation.errors.join(', ')}`);
  }

  const tableName = ORPHAN_TYPE_TABLE_MAP[request.orphan_type].table;
  const deletedIds: (string | number)[] = [];
  const errors: Array<{ id: string | number; error: string }> = [];
  let backupId: string | undefined;

  // Create backup if requested
  if (request.create_backup) {
    backupId = `backup_${Date.now()}_${request.orphan_type}`;
    
    // Fetch records to backup
    const { data: recordsToBackup } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .in('id', request.orphan_ids);

    // Store backup in audit log as a special entry
    await auditService.createLog({
      action_type: 'bulk_action',
      admin_id: adminId,
      admin_email: adminEmail,
      target_type: 'system',
      target_id: backupId,
      reason: `Backup before cleanup: ${request.reason}`,
      before_state: { records: recordsToBackup },
      after_state: null,
    });
  }

  // Delete each orphan record
  for (const id of request.orphan_ids) {
    try {
      const { error } = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        errors.push({ id, error: error.message });
      } else {
        deletedIds.push(id);
      }
    } catch (err) {
      errors.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // Log the cleanup action
  await auditService.createLog({
    action_type: 'bulk_action',
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'system',
    target_id: `cleanup_${request.orphan_type}`,
    reason: request.reason,
    before_state: { orphan_ids: request.orphan_ids, orphan_type: request.orphan_type },
    after_state: { deleted: deletedIds, failed: errors.map(e => e.id) },
  });

  return createCleanupResult(
    request.orphan_ids.length,
    deletedIds,
    errors,
    backupId
  );
}

/**
 * Get storage usage statistics
 * 
 * Requirement 11.4: Display storage consumption by category
 */
export async function getStorageStats(): Promise<StorageStats> {
  // Get counts from various tables to estimate storage
  const [
    hackathonsResult,
    registrationsResult,
    submissionsResult,
    certificatesResult,
    teamsResult,
  ] = await Promise.all([
    supabaseAdmin.from('organizer_hackathons').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('hackathon_registrations').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('hackathon_submissions').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('certificates').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('hackathon_teams').select('id', { count: 'exact', head: true }),
  ]);

  // Estimate storage based on record counts (rough estimates)
  const usageEntries = [
    createStorageUsage('hackathons', (hackathonsResult.count ?? 0) * 5000, hackathonsResult.count ?? 0),
    createStorageUsage('registrations', (registrationsResult.count ?? 0) * 2000, registrationsResult.count ?? 0),
    createStorageUsage('submissions', (submissionsResult.count ?? 0) * 10000, submissionsResult.count ?? 0),
    createStorageUsage('certificates', (certificatesResult.count ?? 0) * 3000, certificatesResult.count ?? 0),
    createStorageUsage('teams', (teamsResult.count ?? 0) * 1500, teamsResult.count ?? 0),
  ];

  return createStorageStats(usageEntries);
}

/**
 * Get data management overview
 * 
 * @returns Overview of orphans, storage, and cleanup history
 */
export async function getDataManagementOverview(): Promise<DataManagementOverview> {
  const [orphanSummary, storageStats] = await Promise.all([
    getOrphanSummary(),
    getStorageStats(),
  ]);

  // Get recent cleanup history from audit logs
  const { data: auditLogs } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .eq('action_type', 'bulk_action')
    .like('target_id', 'cleanup_%')
    .order('created_at', { ascending: false })
    .limit(10);

  const cleanupHistory: CleanupHistoryEntry[] = (auditLogs ?? []).map(log => ({
    id: log.id,
    orphan_type: (log.before_state as any)?.orphan_type ?? 'unknown',
    records_deleted: ((log.after_state as any)?.deleted ?? []).length,
    performed_by: log.admin_email,
    performed_at: log.created_at,
    reason: log.reason,
    backup_id: undefined,
  }));

  return {
    orphan_summary: orphanSummary,
    storage_stats: storageStats,
    cleanup_history: cleanupHistory,
  };
}

/**
 * Verify if a specific record is truly orphaned
 * 
 * Used for Property 12 verification - checks if parent actually exists
 * 
 * @param orphan - The orphan record to verify
 * @returns True if the record is truly orphaned (parent doesn't exist)
 */
export async function verifyOrphanStatus(orphan: OrphanRecord): Promise<boolean> {
  const refInfo = ORPHAN_TYPE_TABLE_MAP[orphan.type];
  
  if (!orphan.missing_reference.expected_id) {
    return true; // Null reference is always orphaned
  }

  // Handle auth.users table specially
  const tableName = refInfo.reference_table === 'auth.users' 
    ? 'profiles' // Use profiles as proxy for auth.users
    : refInfo.reference_table;

  const idColumn = refInfo.reference_table === 'auth.users' ? 'id' : 'id';

  const { data } = await supabaseAdmin
    .from(tableName)
    .select('id')
    .eq(idColumn, orphan.missing_reference.expected_id)
    .single();

  // Record is orphaned if parent doesn't exist
  return !data;
}
