import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendCustomEmail,
  getEmailLogs,
  getEmailStats,
  deleteEmailLog
} from '@/lib/emailTemplateApi'
import type { EmailTemplate, SendEmailPayload } from '@/types/email'
import { toast } from 'sonner'

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: getEmailTemplates,
  })
}

export function useEmailTemplate(id: string) {
  return useQuery({
    queryKey: ['email-template', id],
    queryFn: () => getEmailTemplate(id),
    enabled: !!id,
  })
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      createEmailTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['email-stats'] })
      toast.success('Template created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EmailTemplate> }) =>
      updateEmailTemplate(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['email-template', variables.id] })
      toast.success('Template updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['email-stats'] })
      toast.success('Template deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })
}

export function useSendEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SendEmailPayload) => sendCustomEmail(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] })
      queryClient.invalidateQueries({ queryKey: ['email-stats'] })
      
      if (data.failed === 0) {
        toast.success(`Successfully sent ${data.sent} email(s)`)
      } else if (data.sent === 0) {
        toast.error(`Failed to send all ${data.failed} email(s)`)
      } else {
        toast.warning(`Sent ${data.sent} email(s), ${data.failed} failed`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`)
    },
  })
}

export function useEmailLogs(limit = 100) {
  return useQuery({
    queryKey: ['email-logs', limit],
    queryFn: () => getEmailLogs(limit),
  })
}

export function useEmailStats() {
  return useQuery({
    queryKey: ['email-stats'],
    queryFn: getEmailStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 1000,
  })
}

export function useDeleteEmailLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEmailLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] })
      queryClient.invalidateQueries({ queryKey: ['email-stats'] })
      toast.success('Log deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete log: ${error.message}`)
    },
  })
}
