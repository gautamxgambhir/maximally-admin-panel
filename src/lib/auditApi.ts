/**
 * Audit Log API Functions
 * 
 * Provides API functions for querying and exporting audit logs.
 * Requirements: 5.2, 5.4
 */

import { supabaseAdmin } from './supabase';
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogResponse,
  AuditExportFormat,
  AuditDiff,
} from '@/types/audit';
import { computeDiff } from './auditLogCore';

/**
 * Query audit logs with filtering and pagination
 * 
 * Requirement 5.2: Support filtering by admin, action type, target type,
 * date range with pagination.
 * 
 * @param filters - The filters to apply to the query
 * @returns Paginated audit log response
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 50, 100); // Cap at 100
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('admin_audit_logs')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.admin_id) {
    query = query.eq('admin_id', filters.admin_id);
  }

  if (filters.action_type) {
    if (Array.isArray(filters.action_type)) {
      query = query.in('action_type', filters.action_type);
    } else {
      query = query.eq('action_type', filters.action_type);
    }
  }

  if (filters.target_type) {
    if (Array.isArray(filters.target_type)) {
      query = query.in('target_type', filters.target_type);
    } else {
      query = query.eq('target_type', filters.target_type);
    }
  }

  if (filters.target_id) {
    query = query.eq('target_id', filters.target_id);
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  // Order by created_at descending (newest first)
  query = query.order('created_at', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to query audit logs: ${error.message}`);
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    logs: (data ?? []) as AuditLogEntry[],
    total,
    page,
    totalPages,
  };
}

/**
 * Get a single audit log entry by ID
 * 
 * @param id - The audit log ID
 * @returns The audit log entry or null if not found
 */
export async function getAuditLogById(id: string): Promise<AuditLogEntry | null> {
  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get audit log: ${error.message}`);
  }

  return data as AuditLogEntry;
}

/**
 * Get audit logs for a specific target
 * 
 * @param targetType - The type of target
 * @param targetId - The ID of the target
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getAuditLogsForTarget(
  targetType: string,
  targetId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get audit logs for target: ${error.message}`);
  }

  return (data ?? []) as AuditLogEntry[];
}

/**
 * Get audit logs by admin
 * 
 * @param adminId - The admin's user ID
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getAuditLogsByAdmin(
  adminId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get audit logs by admin: ${error.message}`);
  }

  return (data ?? []) as AuditLogEntry[];
}

/**
 * Export audit logs in the specified format
 * 
 * Requirement 5.4: Support CSV, JSON export formats with date range
 * and filter selection.
 * 
 * @param filters - The filters to apply
 * @param format - The export format ('csv' or 'json')
 * @returns The exported data as a string
 */
export async function exportAuditLogs(
  filters: Omit<AuditLogFilters, 'page' | 'limit'>,
  format: AuditExportFormat
): Promise<string> {
  // Fetch all logs matching the filters (no pagination for export)
  let query = supabaseAdmin
    .from('admin_audit_logs')
    .select('*');

  // Apply filters
  if (filters.admin_id) {
    query = query.eq('admin_id', filters.admin_id);
  }

  if (filters.action_type) {
    if (Array.isArray(filters.action_type)) {
      query = query.in('action_type', filters.action_type);
    } else {
      query = query.eq('action_type', filters.action_type);
    }
  }

  if (filters.target_type) {
    if (Array.isArray(filters.target_type)) {
      query = query.in('target_type', filters.target_type);
    } else {
      query = query.eq('target_type', filters.target_type);
    }
  }

  if (filters.target_id) {
    query = query.eq('target_id', filters.target_id);
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to export audit logs: ${error.message}`);
  }

  const logs = (data ?? []) as AuditLogEntry[];

  if (format === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  // CSV format
  return convertToCSV(logs);
}

/**
 * Convert audit logs to CSV format
 */
function convertToCSV(logs: AuditLogEntry[]): string {
  if (logs.length === 0) {
    return 'id,action_type,admin_id,admin_email,target_type,target_id,reason,ip_address,user_agent,created_at';
  }

  const headers = [
    'id',
    'action_type',
    'admin_id',
    'admin_email',
    'target_type',
    'target_id',
    'reason',
    'ip_address',
    'user_agent',
    'created_at',
    'before_state',
    'after_state',
  ];

  const rows = logs.map((log) => {
    return headers.map((header) => {
      const value = log[header as keyof AuditLogEntry];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        // Escape JSON for CSV
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Escape strings with quotes or commas
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Get the diff for an audit log entry
 * 
 * Requirement 5.5: Display full diff of changes made with highlighted
 * additions and removals.
 * 
 * @param logId - The audit log ID
 * @returns The computed diff or null if log not found
 */
export async function getAuditLogDiff(logId: string): Promise<AuditDiff | null> {
  const log = await getAuditLogById(logId);
  
  if (!log) {
    return null;
  }

  return computeDiff(log.before_state, log.after_state);
}

/**
 * Get audit log statistics
 * 
 * @param dateFrom - Start date for statistics
 * @param dateTo - End date for statistics
 * @returns Statistics about audit logs
 */
export async function getAuditLogStats(
  dateFrom?: string,
  dateTo?: string
): Promise<{
  totalLogs: number;
  logsByActionType: Record<string, number>;
  logsByTargetType: Record<string, number>;
  logsByAdmin: Record<string, number>;
}> {
  let query = supabaseAdmin
    .from('admin_audit_logs')
    .select('action_type, target_type, admin_email');

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get audit log stats: ${error.message}`);
  }

  const logs = data ?? [];
  
  const logsByActionType: Record<string, number> = {};
  const logsByTargetType: Record<string, number> = {};
  const logsByAdmin: Record<string, number> = {};

  for (const log of logs) {
    // Count by action type
    logsByActionType[log.action_type] = (logsByActionType[log.action_type] ?? 0) + 1;
    
    // Count by target type
    logsByTargetType[log.target_type] = (logsByTargetType[log.target_type] ?? 0) + 1;
    
    // Count by admin
    logsByAdmin[log.admin_email] = (logsByAdmin[log.admin_email] ?? 0) + 1;
  }

  return {
    totalLogs: logs.length,
    logsByActionType,
    logsByTargetType,
    logsByAdmin,
  };
}
