/**
 * React Query Hooks for Admin Hackathon Management
 * 
 * Provides hooks for admin hackathon operations with caching and mutations.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAdminHackathons,
  getAdminHackathonById,
  unpublishHackathon,
  featureHackathon,
  unfeatureHackathon,
  editHackathon,
} from '@/lib/adminHackathonApi';
import type {
  AdminHackathonFilters,
  UnpublishHackathonRequest,
  FeatureHackathonRequest,
  EditHackathonRequest,
} from '@/types/adminHackathon';

export const ADMIN_HACKATHON_KEYS = {
  all: ['admin-hackathons'] as const,
  lists: () => [...ADMIN_HACKATHON_KEYS.all, 'list'] as const,
  list: (filters?: AdminHackathonFilters) => [...ADMIN_HACKATHON_KEYS.lists(), filters] as const,
  details: () => [...ADMIN_HACKATHON_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...ADMIN_HACKATHON_KEYS.details(), id] as const,
};

/**
 * Hook for fetching admin hackathons with filtering
 * Requirement 1.1: Display all organizer hackathons with filtering
 */
export function useAdminHackathons(filters?: AdminHackathonFilters) {
  return useQuery({
    queryKey: ADMIN_HACKATHON_KEYS.list(filters),
    queryFn: () => getAdminHackathons(filters ?? {}),
  });
}

/**
 * Hook for fetching a single hackathon with full details
 * Requirement 1.4: Display complete hackathon data
 */
export function useAdminHackathon(id: number) {
  return useQuery({
    queryKey: ADMIN_HACKATHON_KEYS.detail(id),
    queryFn: () => getAdminHackathonById(id),
    enabled: id > 0,
  });
}

/**
 * Hook for unpublishing a hackathon
 * Requirement 1.3: Unpublish with audit log and notification
 */
export function useUnpublishHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
      adminId,
      adminEmail,
    }: {
      id: number;
      request: UnpublishHackathonRequest;
      adminId: string;
      adminEmail: string;
    }) => unpublishHackathon(id, request, adminId, adminEmail),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_HACKATHON_KEYS.lists() });
      if (data.hackathon) {
        queryClient.invalidateQueries({
          queryKey: ADMIN_HACKATHON_KEYS.detail(data.hackathon.id),
        });
      }
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to unpublish hackathon: ${error.message}`);
    },
  });
}

/**
 * Hook for featuring a hackathon
 * Requirement 1.2: Toggle featured status with audit logging
 */
export function useFeatureHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
      adminId,
      adminEmail,
    }: {
      id: number;
      request: FeatureHackathonRequest;
      adminId: string;
      adminEmail: string;
    }) => featureHackathon(id, request, adminId, adminEmail),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_HACKATHON_KEYS.lists() });
      if (data.hackathon) {
        queryClient.invalidateQueries({
          queryKey: ADMIN_HACKATHON_KEYS.detail(data.hackathon.id),
        });
      }
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to feature hackathon: ${error.message}`);
    },
  });
}

/**
 * Hook for unfeaturing a hackathon
 * Requirement 1.2: Toggle featured status with audit logging
 */
export function useUnfeatureHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
      adminId,
      adminEmail,
    }: {
      id: number;
      request: FeatureHackathonRequest;
      adminId: string;
      adminEmail: string;
    }) => unfeatureHackathon(id, request, adminId, adminEmail),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_HACKATHON_KEYS.lists() });
      if (data.hackathon) {
        queryClient.invalidateQueries({
          queryKey: ADMIN_HACKATHON_KEYS.detail(data.hackathon.id),
        });
      }
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to unfeature hackathon: ${error.message}`);
    },
  });
}

/**
 * Hook for directly editing a hackathon
 * Requirement 1.6: Allow admins to edit any field with audit logging
 */
export function useEditHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
      adminId,
      adminEmail,
    }: {
      id: number;
      request: EditHackathonRequest;
      adminId: string;
      adminEmail: string;
    }) => editHackathon(id, request, adminId, adminEmail),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_HACKATHON_KEYS.lists() });
      if (data.hackathon) {
        queryClient.invalidateQueries({
          queryKey: ADMIN_HACKATHON_KEYS.detail(data.hackathon.id),
        });
      }
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to edit hackathon: ${error.message}`);
    },
  });
}
