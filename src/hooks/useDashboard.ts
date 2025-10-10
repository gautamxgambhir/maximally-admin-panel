import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, setFeaturedCore, setFeaturedJudges, DashboardRow } from '@/lib/dashboardApi'
import { toast } from 'sonner'

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: () => [...dashboardKeys.all, 'detail'] as const,
}

// Get dashboard data
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.detail(),
    queryFn: getDashboard,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Update featured core team
export function useSetFeaturedCore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setFeaturedCore,
    onSuccess: (updatedDashboard) => {
      // Update dashboard cache
      queryClient.setQueryData(dashboardKeys.detail(), updatedDashboard)
      toast.success('Featured core team updated successfully!')
    },
    onError: (error) => {
      toast.error('Failed to update featured core team. Please try again.')
    },
  })
}

// Update featured judges
export function useSetFeaturedJudges() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setFeaturedJudges,
    onSuccess: (updatedDashboard) => {
      // Update dashboard cache
      queryClient.setQueryData(dashboardKeys.detail(), updatedDashboard)
      toast.success('Featured judges updated successfully!')
    },
    onError: (error) => {
      toast.error('Failed to update featured judges. Please try again.')
    },
  })
}