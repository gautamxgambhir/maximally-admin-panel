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

  const { data, error } = await supabase.functions.invoke('send-certificate-email', {
    body: { certificates: items },
  })

  if (error) {
    console.error('Failed to invoke send-certificate-email function:', error)
    return { sent: 0, failed: items.length, errors: [error.message || 'Invoke error'] }
  }

  return data as { sent: number; failed: number; errors?: string[] }
}
