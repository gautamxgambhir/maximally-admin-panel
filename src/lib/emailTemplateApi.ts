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
  try {
    // Run all queries in parallel with timeout
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Stats query timeout')), 10000)
    )

    const statsPromise = Promise.all([
      // Get all templates
      supabase.from('email_templates').select('category'),
      
      // Get recent logs (limit to 10 for performance)
      supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(10),
      
      // Count sent emails (with limit for performance)
      supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .limit(1000), // Add limit to prevent slow count
      
      // Count failed emails (with limit for performance)
      supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .limit(1000), // Add limit to prevent slow count
    ])

    const results = await Promise.race([statsPromise, timeout]) as any[]
    
    const [templatesResult, logsResult, sentResult, failedResult] = results

    if (templatesResult.error) throw templatesResult.error
    if (logsResult.error) throw logsResult.error

    // Group templates by category with all categories initialized
    const templatesByCategory = (templatesResult.data || []).reduce((acc: Record<string, number>, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + 1
      return acc
    }, {
      custom: 0,
      judges: 0,
      sponsors: 0,
      participants: 0,
      general: 0
    } as Record<string, number>)

    return {
      totalTemplates: templatesResult.data?.length || 0,
      totalSent: sentResult.count || 0,
      totalFailed: failedResult.count || 0,
      recentLogs: logsResult.data || [],
      templatesByCategory
    }
  } catch (error) {
    console.error('Error fetching email stats:', error)
    // Return empty stats instead of throwing
    return {
      totalTemplates: 0,
      totalSent: 0,
      totalFailed: 0,
      recentLogs: [],
      templatesByCategory: {
        custom: 0,
        judges: 0,
        sponsors: 0,
        participants: 0,
        general: 0
      }
    }
  }
}
