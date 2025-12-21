import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOrganizers,
  getOrganizersCount,
  updateOrganizer,
  deleteOrganizer,
  type Organizer,
  type OrganizerUpdate
} from '@/lib/organizersApi'
import { toast } from 'sonner'

// Query keys
export const organizersKeys = {
  all: ['organizers'] as const,
  lists: () => [...organizersKeys.all, 'list'] as const,
  list: () => [...organizersKeys.lists()] as const,
  details: () => [...organizersKeys.all, 'detail'] as const,
  detail: (id: number) => [...organizersKeys.details(), id] as const,
  count: () => [...organizersKeys.all, 'count'] as const,
}

// Get all organizers
export function useOrganizers() {
  return useQuery({
    queryKey: organizersKeys.list(),
    queryFn: getOrganizers,
    staleTime: 5 * 60 * 1000,
  })
}

// Get organizers count
export function useOrganizersCount() {
  return useQuery({
    queryKey: organizersKeys.count(),
    queryFn: getOrganizersCount,
    staleTime: 2 * 60 * 1000,
  })
}

// Update organizer mutation
export function useUpdateOrganizer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateOrganizer,
    onSuccess: (updatedOrganizer) => {
      queryClient.setQueryData(
        organizersKeys.detail(updatedOrganizer.id),
        updatedOrganizer
      )
      queryClient.invalidateQueries({ queryKey: organizersKeys.lists() })
      queryClient.invalidateQueries({ queryKey: organizersKeys.count() })
      toast.success('Organizer updated successfully!')
    },
    onError: (error) => {
      toast.error('Failed to update organizer. Please try again.')
    },
  })
}

// Delete organizer mutation
export function useDeleteOrganizer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteOrganizer,
    onSuccess: async (_, deletedId) => {
      queryClient.removeQueries({ queryKey: organizersKeys.detail(deletedId) })
      await queryClient.invalidateQueries({ queryKey: organizersKeys.all })
      await queryClient.refetchQueries({ queryKey: organizersKeys.list() })
      toast.success('Organizer deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(`Failed to delete organizer: ${error.message || 'Please try again.'}`)
    },
  })
}
