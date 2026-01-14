/**
 * Data Management Hook
 * 
 * React hook for data management operations including orphan detection,
 * cleanup, and storage management.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataManagementService } from '@/lib/dataManagementService';
import type {
  OrphanType,
  OrphanDetectionFilters,
  CleanupRequest,
} from '@/types/dataManagement';

/**
 * Query keys for data management
 */
export const dataManagementKeys = {
  all: ['dataManagement'] as const,
  overview: () => [...dataManagementKeys.all, 'overview'] as const,
  orphans: (filters?: OrphanDetectionFilters) => 
    [...dataManagementKeys.all, 'orphans', filters] as const,
  orphanSummary: () => [...dataManagementKeys.all, 'orphanSummary'] as const,
  storage: () => [...dataManagementKeys.all, 'storage'] as const,
};

/**
 * Hook for fetching data management overview
 */
export function useDataManagementOverview() {
  return useQuery({
    queryKey: dataManagementKeys.overview(),
    queryFn: () => dataManagementService.getOverview(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for detecting orphaned records
 */
export function useOrphanDetection(filters?: OrphanDetectionFilters) {
  return useQuery({
    queryKey: dataManagementKeys.orphans(filters),
    queryFn: () => dataManagementService.detectOrphans(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting orphan summary
 */
export function useOrphanSummary() {
  return useQuery({
    queryKey: dataManagementKeys.orphanSummary(),
    queryFn: () => dataManagementService.getOrphanSummary(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting storage statistics
 */
export function useStorageStats() {
  return useQuery({
    queryKey: dataManagementKeys.storage(),
    queryFn: () => dataManagementService.getStorageStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for cleaning up orphaned records
 */
export function useCleanupOrphans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request,
      adminId,
      adminEmail,
    }: {
      request: CleanupRequest;
      adminId: string;
      adminEmail: string;
    }) => {
      return dataManagementService.cleanupOrphans(request, adminId, adminEmail);
    },
    onSuccess: () => {
      // Invalidate all data management queries after cleanup
      queryClient.invalidateQueries({ queryKey: dataManagementKeys.all });
    },
  });
}

/**
 * Hook for cleaning up orphans by type
 */
export function useCleanupOrphansByType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orphanType,
      reason,
      adminId,
      adminEmail,
      createBackup = true,
    }: {
      orphanType: OrphanType;
      reason: string;
      adminId: string;
      adminEmail: string;
      createBackup?: boolean;
    }) => {
      return dataManagementService.cleanupOrphansByType(
        orphanType,
        reason,
        adminId,
        adminEmail,
        createBackup
      );
    },
    onSuccess: () => {
      // Invalidate all data management queries after cleanup
      queryClient.invalidateQueries({ queryKey: dataManagementKeys.all });
    },
  });
}

/**
 * Hook for verifying orphan status
 */
export function useVerifyOrphanStatus() {
  return useMutation({
    mutationFn: async ({
      orphanId,
      orphanType,
    }: {
      orphanId: string | number;
      orphanType: OrphanType;
    }) => {
      return dataManagementService.verifyOrphanStatus(orphanId, orphanType);
    },
  });
}
