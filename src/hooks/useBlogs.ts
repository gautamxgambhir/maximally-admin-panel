import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadCoverImage,
} from '@/lib/blogApi'

export const BLOG_KEYS = {
  all: ['blogs'] as const,
  lists: () => [...BLOG_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...BLOG_KEYS.lists(), filters] as const,
  details: () => [...BLOG_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BLOG_KEYS.details(), id] as const,
}

export function useBlogs() {
  return useQuery({
    queryKey: BLOG_KEYS.list(),
    queryFn: getBlogs,
  })
}

export function useBlog(id: string) {
  return useQuery({
    queryKey: BLOG_KEYS.detail(id),
    queryFn: () => getBlogById(id),
    enabled: !!id,
  })
}

export function useCreateBlog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_KEYS.lists() })
      toast.success('Blog created successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create blog: ${error.message}`)
    },
  })
}

export function useUpdateBlog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateBlog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BLOG_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: BLOG_KEYS.detail(data.id) })
      toast.success('Blog updated successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update blog: ${error.message}`)
    },
  })
}

export function useDeleteBlog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_KEYS.lists() })
      toast.success('Blog deleted successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete blog: ${error.message}`)
    },
  })
}

export function useUploadImage() {
  return useMutation({
    mutationFn: uploadCoverImage,
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`)
    },
  })
}
