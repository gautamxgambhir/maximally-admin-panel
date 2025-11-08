import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getJudges,
  getJudge,
  createJudge,
  updateJudge,
  deleteJudge,
  getJudgesCount,
  type Judge,
  type JudgeInput,
  type JudgeUpdate
} from '@/lib/judgesApi'
import { toast } from 'sonner'

// Query keys
export const generalJudgesKeys = {
  all: ['general-judges'] as const,
  lists: () => [...generalJudgesKeys.all, 'list'] as const,
  list: () => [...generalJudgesKeys.lists()] as const,
  details: () => [...generalJudgesKeys.all, 'detail'] as const,
  detail: (id: number) => [...generalJudgesKeys.details(), id] as const,
  count: () => [...generalJudgesKeys.all, 'count'] as const,
}

// Get all judges
export function useGeneralJudges() {
  return useQuery({
    queryKey: generalJudgesKeys.list(),
    queryFn: getJudges,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}


// Get a single judge
export function useGeneralJudge(id: number) {
  return useQuery({
    queryKey: generalJudgesKeys.detail(id),
    queryFn: () => getJudge(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get judges count
export function useGeneralJudgesCount() {
  return useQuery({
    queryKey: generalJudgesKeys.count(),
    queryFn: getJudgesCount,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create judge mutation
export function useCreateGeneralJudge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createJudge,
    onSuccess: (newJudge) => {
      // Invalidate and refetch all judges queries
      queryClient.invalidateQueries({ queryKey: generalJudgesKeys.all })
      
      // Update list query if it exists
      queryClient.setQueryData(
        generalJudgesKeys.list(),
        (oldData: Judge[] | undefined) => {
          if (!oldData) return [newJudge]
          return [...oldData, newJudge].sort((a, b) => a.display_order - b.display_order)
        }
      )

      toast.success('Judge created successfully!')
    },
    onError: (error) => {
      toast.error('Failed to create judge. Please try again.')
    },
  })
}

// Update judge mutation
export function useUpdateGeneralJudge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateJudge,
    onSuccess: (updatedJudge) => {
      // Update the specific judge in cache
      queryClient.setQueryData(
        generalJudgesKeys.detail(updatedJudge.id),
        updatedJudge
      )

      // Invalidate list queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: generalJudgesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: generalJudgesKeys.count() })

      toast.success('Judge updated successfully!')
    },
    onError: (error) => {
      toast.error('Failed to update judge. Please try again.')
    },
  })
}

// Delete judge mutation
export function useDeleteGeneralJudge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteJudge,
    onSuccess: async (_, deletedId) => {
      console.log('✅ Delete mutation success for ID:', deletedId)
      
      // Remove from all relevant queries
      queryClient.removeQueries({ queryKey: generalJudgesKeys.detail(deletedId) })
      
      // Invalidate and refetch all judges data
      await queryClient.invalidateQueries({ queryKey: generalJudgesKeys.all })
      await queryClient.refetchQueries({ queryKey: generalJudgesKeys.list() })
      
      toast.success('Judge deleted successfully!')
    },
    onError: (error: any) => {
      console.error('❌ Delete mutation error:', error)
      toast.error(`Failed to delete judge: ${error.message || 'Please try again.'}`)
    },
  })
}