import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getHackathons,
  getHackathonById,
  createHackathon,
  updateHackathon,
  deleteHackathon,
  uploadHackathonCoverImage,
} from '@/lib/hackathonApi'

export const HACKATHON_KEYS = {
  all: ['hackathons'] as const,
  lists: () => [...HACKATHON_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...HACKATHON_KEYS.lists(), filters] as const,
  details: () => [...HACKATHON_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...HACKATHON_KEYS.details(), id] as const,
}

export function useHackathons() {
  return useQuery({
    queryKey: HACKATHON_KEYS.list(),
    queryFn: getHackathons,
  })
}

export function useHackathon(id: string) {
  return useQuery({
    queryKey: HACKATHON_KEYS.detail(id),
    queryFn: () => getHackathonById(id),
    enabled: !!id,
  })
}

export function useCreateHackathon() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createHackathon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HACKATHON_KEYS.lists() })
      toast.success('Hackathon created successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create hackathon: ${error.message}`)
    },
  })
}

export function useUpdateHackathon() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateHackathon,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: HACKATHON_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: HACKATHON_KEYS.detail(data.id) })
      toast.success('Hackathon updated successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update hackathon: ${error.message}`)
    },
  })
}

export function useDeleteHackathon() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteHackathon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HACKATHON_KEYS.lists() })
      toast.success('Hackathon deleted successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete hackathon: ${error.message}`)
    },
  })
}

export function useUploadHackathonImage() {
  return useMutation({
    mutationFn: uploadHackathonCoverImage,
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`)
    },
  })
}
