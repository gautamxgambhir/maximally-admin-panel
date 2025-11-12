export type EmailCategory = 'judges' | 'sponsors' | 'participants' | 'general' | 'custom'

export type EmailStatus = 'sent' | 'failed' | 'pending'

export interface EmailTemplate {
  id: string
  name: string
  category: EmailCategory
  subject: string
  body: string
  placeholders: string[]
  created_at: string
  updated_at: string
  created_by?: string
  is_active: boolean
}

export interface EmailLog {
  id: string
  template_id?: string
  template_name: string
  recipients: string[]
  subject: string
  body: string
  status: EmailStatus
  error_message?: string
  sent_at: string
  sent_by?: string
  metadata?: {
    placeholders?: Record<string, string>
    [key: string]: any
  }
}

export interface SendEmailPayload {
  recipients: string[]
  subject: string
  body: string
  templateId?: string
  templateName?: string
  placeholders?: Record<string, string>
}

export interface SendEmailResponse {
  sent: number
  failed: number
  errors?: string[]
}

export interface EmailStats {
  totalTemplates: number
  totalSent: number
  totalFailed: number
  recentLogs: EmailLog[]
  templatesByCategory: Record<EmailCategory, number>
}
