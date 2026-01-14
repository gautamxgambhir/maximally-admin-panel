/**
 * React Hook for Audit Logs
 * 
 * Provides React Query hooks for fetching and managing audit logs.
 * Requirements: 5.2, 5.4, 5.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsForTarget,
  getAuditLogsByAdmin,
  exportAuditLogs,
  getAuditLogDiff,
  getAuditLogStats,
} from '@/lib/auditApi';
import type {
  AuditLogFilters,
  AuditLogResponse,
  AuditLogEntry,
  AuditExportFormat,
  AuditDiff,
} from '@/types/audit';

/**
 * Query key factory for audit logs
 */
export const auditLogKeys = {
  all: ['auditLogs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.lists(), filters] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditLogKeys.details(), id] as const,
  target: (targetType: string, targetId: string) => 
    [...auditLogKeys.all, 'target', targetType, targetId] as const,
  admin: (adminId: string) => [...auditLogKeys.all, 'admin', adminId] as const,
  diff: (id: string) => [...auditLogKeys.all, 'diff', id] as const,
  stats: (dateFrom?: string, dateTo?: string) => 
    [...auditLogKeys.all, 'stats', dateFrom, dateTo] as const,
};

/**
 * Hook to fetch paginated audit logs with filtering
 * 
 * Requirement 5.2: Support filtering by admin, action type, target type,
 * date range with pagination.
 */
export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery<AuditLogResponse, Error>({
    queryKey: auditLogKeys.list(filters),
    queryFn: () => getAuditLogs(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch a single audit log by ID
 */
export function useAuditLog(id: string | null) {
  return useQuery<AuditLogEntry | null, Error>({
    queryKey: auditLogKeys.detail(id ?? ''),
    queryFn: () => (id ? getAuditLogById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 60000, // 1 minute (audit logs are immutable)
  });
}

/**
 * Hook to fetch audit logs for a specific target
 */
export function useAuditLogsForTarget(
  targetType: string | null,
  targetId: string | null,
  limit: number = 50
) {
  return useQuery<AuditLogEntry[], Error>({
    queryKey: auditLogKeys.target(targetType ?? '', targetId ?? ''),
    queryFn: () => 
      targetType && targetId 
        ? getAuditLogsForTarget(targetType, targetId, limit) 
        : Promise.resolve([]),
    enabled: !!targetType && !!targetId,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch audit logs by admin
 */
export function useAuditLogsByAdmin(adminId: string | null, limit: number = 50) {
  return useQuery<AuditLogEntry[], Error>({
    queryKey: auditLogKeys.admin(adminId ?? ''),
    queryFn: () => 
      adminId ? getAuditLogsByAdmin(adminId, limit) : Promise.resolve([]),
    enabled: !!adminId,
    staleTime: 30000,
  });
}

/**
 * Hook to get the diff for an audit log entry
 * 
 * Requirement 5.5: Display full diff of changes made with highlighted
 * additions and removals.
 */
export function useAuditLogDiff(logId: string | null) {
  return useQuery<AuditDiff | null, Error>({
    queryKey: auditLogKeys.diff(logId ?? ''),
    queryFn: () => (logId ? getAuditLogDiff(logId) : Promise.resolve(null)),
    enabled: !!logId,
    staleTime: 60000, // 1 minute (audit logs are immutable)
  });
}

/**
 * Hook to get audit log statistics
 */
export function useAuditLogStats(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: auditLogKeys.stats(dateFrom, dateTo),
    queryFn: () => getAuditLogStats(dateFrom, dateTo),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to export audit logs
 * 
 * Requirement 5.4: Support CSV, JSON export formats with date range
 * and filter selection.
 */
export function useExportAuditLogs() {
  return useMutation<
    string,
    Error,
    { filters: Omit<AuditLogFilters, 'page' | 'limit'>; format: AuditExportFormat }
  >({
    mutationFn: ({ filters, format }) => exportAuditLogs(filters, format),
  });
}

/**
 * Helper function to download exported data as a file
 */
export function downloadExport(data: string, format: AuditExportFormat, filename?: string) {
  const mimeType = format === 'json' ? 'application/json' : 'text/csv';
  const extension = format === 'json' ? 'json' : 'csv';
  const defaultFilename = `audit-logs-${new Date().toISOString().split('T')[0]}.${extension}`;
  
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
