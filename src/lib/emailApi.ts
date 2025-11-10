import { supabase } from '@/lib/supabase'
import type { Certificate } from '@/types/certificate'
import { getVerificationUrl } from '@/config/constants'

export interface SendCertificateEmailPayloadItem {
  to: string
  participant_name: string
  certificate_id: string
  hackathon_name: string
  type: string
  position?: string
  pdf_url?: string
  jpg_url?: string
  verification_url: string
}

export async function sendCertificateEmails(certificates: Certificate[]): Promise<{ sent: number; failed: number; errors?: string[] }> {
  const items: SendCertificateEmailPayloadItem[] = certificates
    .filter(c => !!c.participant_email)
    .map(c => ({
      to: c.participant_email!,
      participant_name: c.participant_name,
      certificate_id: c.certificate_id,
      hackathon_name: c.hackathon_name,
      type: c.type,
      position: c.position,
      pdf_url: c.pdf_url,
      jpg_url: c.jpg_url,
      verification_url: getVerificationUrl(c.certificate_id),
    }))

  if (items.length === 0) return { sent: 0, failed: 0 }

  try {
    // Get the current session to ensure we have auth token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('No active session found')
      return { sent: 0, failed: items.length, errors: ['Not authenticated. Please log in again.'] }
    }

    const { data, error } = await supabase.functions.invoke('send-certificate-email', {
      body: { certificates: items },
    })

    if (error) {
      console.error('Failed to invoke send-certificate-email function:', error)
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        context: error.context,
      })
      
      let errorMsg = 'Failed to send email'
      if (error.message) {
        errorMsg = error.message
      } else if (error.context?.error) {
        errorMsg = error.context.error
      }
      
      // Check for common issues
      if (errorMsg.includes('Failed to send a request')) {
        errorMsg = 'Email service is unavailable. Please check your internet connection and try again.'
      } else if (errorMsg.includes('FunctionsRelayError')) {
        errorMsg = 'Email service connection error. Please try again in a moment.'
      } else if (errorMsg.includes('FunctionsFetchError')) {
        errorMsg = 'Unable to reach email service. Please check your network connection.'
      }
      
      return { sent: 0, failed: items.length, errors: [errorMsg] }
    }

    if (!data) {
      console.error('No data returned from send-certificate-email function')
      return { sent: 0, failed: items.length, errors: ['No response from email service'] }
    }

    return data as { sent: number; failed: number; errors?: string[] }
  } catch (err) {
    console.error('Exception while invoking send-certificate-email function:', err)
    const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
    return { sent: 0, failed: items.length, errors: [errorMsg] }
  }
}
