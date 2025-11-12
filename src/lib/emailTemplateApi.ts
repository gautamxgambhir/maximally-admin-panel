import { supabase } from './supabase'
import type { EmailTemplate, EmailLog, SendEmailPayload, SendEmailResponse, EmailStats } from '@/types/email'

// Template Management
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createEmailTemplate(
  template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<EmailTemplate> {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      ...template,
      created_by: user?.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEmailTemplate(
  id: string,
  updates: Partial<Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>>
): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Email Sending
export async function sendCustomEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated. Please log in again.')
    }

    const { data, error } = await supabase.functions.invoke('send-custom-email', {
      body: payload,
    })

    if (error) {
      console.error('Failed to invoke send-custom-email function:', error)
      throw new Error(error.message || 'Failed to send email')
    }

    return data as SendEmailResponse
  } catch (err) {
    console.error('Exception while sending email:', err)
    throw err
  }
}

// Email Logs
export async function getEmailLogs(limit = 100): Promise<EmailLog[]> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getEmailLogsByTemplate(templateId: string): Promise<EmailLog[]> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('template_id', templateId)
    .order('sent_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function deleteEmailLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_logs')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Stats
export async function getEmailStats(): Promise<EmailStats> {
  // Get all templates
  const { data: templates, error: templatesError } = await supabase
    .from('email_templates')
    .select('category')

  if (templatesError) throw templatesError

  // Get email logs stats
  const { data: logs, error: logsError } = await supabase
    .from('email_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(10)

  if (logsError) throw logsError

  // Count by status
  const { count: sentCount } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')

  const { count: failedCount } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')

  // Group templates by category
  const templatesByCategory = (templates || []).reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalTemplates: templates?.length || 0,
    totalSent: sentCount || 0,
    totalFailed: failedCount || 0,
    recentLogs: logs || [],
    templatesByCategory
  }
}
