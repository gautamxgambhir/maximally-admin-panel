/**
 * Audit Service for Admin Moderation System
 * 
 * Provides immutable audit logging for all admin actions.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { supabaseAdmin } from './supabase';
import type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogResponse,
  AuditExportFormat,
  AuditDiff,
  AuditDiffEntry,
} from '@/types/audit';

/**
 * AuditService class for managing audit logs
 * 
 * This service provides methods to:
 * - Create immutable audit log entries (Requirement 5.1)
 * - Query audit logs with filtering (Requirement 5.2)
 * - Export audit logs in various formats (Requirement 5.4)
 * - Compute diffs between before/after states (Requirement 5.5)
 * 
 * Note: Audit logs are immutable - once created, they cannot be modified or deleted (Requirement 5.3)
 */
export class AuditService {
  private static instance: AuditService;

  private constructor() {}

  /**
   * Get singleton instance of AuditService
   */
  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Create a new audit log entry
   * 
   * Requirement 5.1: Create an immutable audit log entry with action type,
   * target entity, target ID, admin ID, admin email, timestamp, reason,
   * IP address, and before/after state snapshot.
   * 
   * @param input - The audit log data to create
   * @returns The created audit log entry
   * @throws Error if the audit log creation fails
   */
  async createLog(input: CreateAuditLogInput): Promise<AuditLogEntry> {
    // Validate required fields
    if (!input.action_type) {
      throw new Error('action_type is required');
    }
    if (!input.admin_id) {
      throw new Error('admin_id is required');
    }
    if (!input.admin_email) {
      throw new Error('admin_email is required');
    }
    if (!input.target_type) {
      throw new Error('target_type is required');
    }
    if (!input.target_id) {
      throw new Error('target_id is required');
    }
    if (!input.reason || input.reason.trim() === '') {
      throw new Error('reason is required');
    }

    const { data, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        action_type: input.action_type,
        admin_id: input.admin_id,
        admin_email: input.admin_email,
        target_type: input.target_type,
        target_id: input.target_id,
        reason: input.reason.trim(),
        before_state: input.before_state ?? null,
        after_state: input.after_state ?? null,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create audit log: ${error.message}`);
    }

    return data as AuditLogEntry;
  }

  /**
   * Query audit logs with filtering and pagination
   * 
   * Requirement 5.2: Support filtering by admin, action type, target type,
   * date range, and severity with pagination.
   * 
   * @param filters - The filters to apply to the query
   * @returns Paginated audit log response
   */
  async queryLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
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
  async getLogById(id: string): Promise<AuditLogEntry | null> {
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
   * Export audit logs in the specified format
   * 
   * Requirement 5.4: Support CSV, JSON export formats with date range
   * and filter selection.
   * 
   * @param filters - The filters to apply
   * @param format - The export format ('csv' or 'json')
   * @returns The exported data as a string
   */
  async exportLogs(
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
    return this.convertToCSV(logs);
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: AuditLogEntry[]): string {
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
   * Compute diff between before and after states
   * 
   * Requirement 5.5: Display full diff of changes made with highlighted
   * additions and removals.
   * 
   * @param beforeState - The state before the action
   * @param afterState - The state after the action
   * @returns The computed diff
   */
  computeDiff(
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null
  ): AuditDiff {
    const entries: AuditDiffEntry[] = [];

    const before = beforeState ?? {};
    const after = afterState ?? {};

    // Get all unique keys from both states
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const beforeValue = before[key];
      const afterValue = after[key];

      const beforeExists = key in before;
      const afterExists = key in after;

      if (!beforeExists && afterExists) {
        // Field was added
        entries.push({
          field: key,
          before: undefined,
          after: afterValue,
          changeType: 'added',
        });
      } else if (beforeExists && !afterExists) {
        // Field was removed
        entries.push({
          field: key,
          before: beforeValue,
          after: undefined,
          changeType: 'removed',
        });
      } else if (!this.deepEqual(beforeValue, afterValue)) {
        // Field was modified
        entries.push({
          field: key,
          before: beforeValue,
          after: afterValue,
          changeType: 'modified',
        });
      }
    }

    return {
      entries,
      hasChanges: entries.length > 0,
    };
  }

  /**
   * Deep equality check for comparing values
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object' && typeof b === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      
      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);

      if (aKeys.length !== bKeys.length) return false;

      for (const key of aKeys) {
        if (!bKeys.includes(key)) return false;
        if (!this.deepEqual(aObj[key], bObj[key])) return false;
      }

      return true;
    }

    return false;
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();
