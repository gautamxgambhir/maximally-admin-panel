import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getJudgesByHackathon,
  getJudgeById,
  createJudge,
  updateJudge,
  deleteJudge,
  uploadJudgeProfileImage,
} from '@/lib/judgeApi'

export const JUDGE_KEYS = {
  all: ['judges'] as const,
  lists: () => [...JUDGE_KEYS.all, 'list'] as const,
  list: (hackathonId?: string) => [...JUDGE_KEYS.lists(), hackathonId] as const,
  details: () => [...JUDGE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...JUDGE_KEYS.details(), id] as const,
}

export function useJudges(hackathonId: string) {
  return useQuery({
    queryKey: JUDGE_KEYS.list(hackathonId),
    queryFn: () => getJudgesByHackathon(hackathonId),
    enabled: !!hackathonId,
  })
}

export function useJudge(id: string) {
  return useQuery({
    queryKey: JUDGE_KEYS.detail(id),
    queryFn: () => getJudgeById(id),
    enabled: !!id,
  })
}

export function useCreateJudge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createJudge,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: JUDGE_KEYS.list(data.hackathon_id) })
      toast.success('Judge added successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add judge: ${error.message}`)
    },
  })
}

export function useUpdateJudge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateJudge,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: JUDGE_KEYS.list(data.hackathon_id) })
      queryClient.invalidateQueries({ queryKey: JUDGE_KEYS.detail(data.id) })
      toast.success('Judge updated successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update judge: ${error.message}`)
    },
  })
}

export function useDeleteJudge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteJudge,
    onSuccess: () => {
      // Invalidate all judge lists since we don't know which hackathon this belonged to
      queryClient.invalidateQueries({ queryKey: JUDGE_KEYS.lists() })
      toast.success('Judge removed successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove judge: ${error.message}`)
    },
  })
}

export function useUploadJudgeImage() {
  return useMutation({
    mutationFn: uploadJudgeProfileImage,
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`)
    },
  })
}
