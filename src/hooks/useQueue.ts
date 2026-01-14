/**
 * React Hook for Moderation Queue
 * 
 * Provides React Query hooks for the moderation queue.
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addToQueue,
  getQueueItems,
  getQueueItemById,
  claimQueueItem,
  releaseQueueItem,
  resolveQueueItem,
  getPendingQueueCount,
} from '@/lib/queueApi';
import type {
  QueueItem,
  AddToQueueInput,
  ResolveQueueInput,
  QueueFilters,
  QueueResponse,
} from '@/types/queue';

/**
 * Query key factory for queue
 */
export const queueKeys = {
  all: ['queue'] as const,
  lists: () => [...queueKeys.all, 'list'] as const,
  list: (filters: QueueFilters) => [...queueKeys.lists(), filters] as const,
  details: () => [...queueKeys.all, 'detail'] as const,
  detail: (id: string) => [...queueKeys.details(), id] as const,
  pendingCount: () => [...queueKeys.all, 'pendingCount'] as const,
};

/**
 * Hook to fetch queue items with filtering
 * 
 * GET /api/admin/queue
 */
export function useQueueItems(filters: QueueFilters = {}, adminId?: string) {
  return useQuery<QueueResponse, Error>({
    queryKey: queueKeys.list(filters),
    queryFn: () => getQueueItems(filters, adminId),
    staleTime: 10000,
  });
}

/**
 * Hook to fetch a single queue item
 */
export function useQueueItem(id: string | null) {
  return useQuery<QueueItem | null, Error>({
    queryKey: queueKeys.detail(id ?? ''),
    queryFn: () => (id ? getQueueItemById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 10000,
  });
}

/**
 * Hook to get pending queue count
 */
export function usePendingQueueCount() {
  return useQuery<number, Error>({
    queryKey: queueKeys.pendingCount(),
    queryFn: getPendingQueueCount,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Hook to add item to queue
 */
export function useAddToQueue() {
  const queryClient = useQueryClient();
  
  return useMutation<QueueItem, Error, AddToQueueInput>({
    mutationFn: addToQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to claim a queue item
 * 
 * POST /api/admin/queue/:id/claim
 */
export function useClaimQueueItem() {
  const queryClient = useQueryClient();
  
  return useMutation<QueueItem, Error, { id: string; adminId: string }>({
    mutationFn: ({ id, adminId }) => claimQueueItem(id, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to release a queue item
 * 
 * POST /api/admin/queue/:id/release
 */
export function useReleaseQueueItem() {
  const queryClient = useQueryClient();
  
  return useMutation<QueueItem, Error, { id: string; adminId: string }>({
    mutationFn: ({ id, adminId }) => releaseQueueItem(id, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to resolve a queue item
 * 
 * POST /api/admin/queue/:id/resolve
 */
export function useResolveQueueItem() {
  const queryClient = useQueryClient();
  
  return useMutation<
    QueueItem,
    Error,
    { id: string; adminId: string; input: ResolveQueueInput }
  >({
    mutationFn: ({ id, adminId, input }) => resolveQueueItem(id, adminId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to invalidate queue queries
 */
export function useInvalidateQueue() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queueKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: queueKeys.lists() }),
    invalidatePendingCount: () => 
      queryClient.invalidateQueries({ queryKey: queueKeys.pendingCount() }),
  };
}
