import { supabase } from './supabase'
import type { 
  Certificate, 
  CreateCertificateData, 
  CertificateFilters,
  CertificateStatus 
} from '@/types/certificate'
import { 
  generateCertificateId, 
  generateCertificateFiles, 
  uploadCertificateFiles,
  CERTIFICATE_TEMPLATES 
} from './certificateUtils'

/**
 * Create a single certificate
 */
export async function createCertificate(data: CreateCertificateData): Promise<Certificate> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }
  
  // Get user profile to fetch email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()
    
  if (profileError) {
    console.warn('Failed to fetch user profile:', profileError)
  }

  // Generate unique certificate ID
  const certificateId = generateCertificateId()
  
  // Get template for certificate type
  const template = CERTIFICATE_TEMPLATES[data.type]
  
  // Generate certificate files
  const { pdfBlob, jpgBlob } = await generateCertificateFiles({
    data,
    template,
    certificateId
  })
  
  // Upload files to storage
  const { pdfUrl, jpgUrl } = await uploadCertificateFiles(
    certificateId,
    pdfBlob,
    jpgBlob
  )

  // Save certificate record to database
  const { data: certificate, error } = await supabase
    .from('certificates')
    .insert({
      certificate_id: certificateId,
      participant_name: data.participant_name,
      participant_email: data.participant_email,
      hackathon_name: data.hackathon_name,
      type: data.type,
      position: data.position,
      pdf_url: pdfUrl,
      jpg_url: jpgUrl,
      status: 'active',
      generated_by: user.id,
      admin_email: profile?.email || user.email
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create certificate: ${error.message}`)
  }

  return certificate
}

/**
 * Create multiple certificates from bulk data
 */
export async function createBulkCertificates(
  certificates: CreateCertificateData[]
): Promise<Certificate[]> {
  const results: Certificate[] = []
  const errors: string[] = []

  for (const certData of certificates) {
    try {
      const certificate = await createCertificate(certData)
      results.push(certificate)
    } catch (error) {
      console.error(`Failed to create certificate for ${certData.participant_name}:`, error)
      errors.push(`${certData.participant_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (errors.length > 0) {
    console.warn('Some certificates failed to create:', errors)
  }

  return results
}

/**
 * Get all certificates with optional filtering
 */
export async function getCertificates(filters: CertificateFilters = {}): Promise<Certificate[]> {
  let query = supabase
    .from('certificates')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.hackathon_name) {
    query = query.eq('hackathon_name', filters.hackathon_name)
  }

  if (filters.search) {
    query = query.or(
      `participant_name.ilike.%${filters.search}%,certificate_id.ilike.%${filters.search}%,admin_email.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch certificates: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single certificate by ID
 */
export async function getCertificateById(id: string): Promise<Certificate | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch certificate: ${error.message}`)
  }

  return data
}

/**
 * Get certificate by certificate_id
 */
export async function getCertificateByCertificateId(certificateId: string): Promise<Certificate | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('certificate_id', certificateId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch certificate: ${error.message}`)
  }

  return data
}

/**
 * Update certificate status (activate/deactivate)
 */
export async function updateCertificateStatus(
  id: string, 
  status: CertificateStatus
): Promise<Certificate> {
  const { data, error } = await supabase
    .from('certificates')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update certificate status: ${error.message}`)
  }

  return data
}

/**
 * Delete certificate (and files from storage)
 */
export async function deleteCertificate(id: string): Promise<void> {
  // Get certificate first to get file paths
  const certificate = await getCertificateById(id)
  if (!certificate) {
    throw new Error('Certificate not found')
  }

  // Delete files from storage
  const filesToDelete = []
  if (certificate.pdf_url) {
    const pdfPath = certificate.pdf_url.split('/').pop()
    if (pdfPath) filesToDelete.push(pdfPath)
  }
  if (certificate.jpg_url) {
    const jpgPath = certificate.jpg_url.split('/').pop()
    if (jpgPath) filesToDelete.push(jpgPath)
  }

  if (filesToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('certificates')
      .remove(filesToDelete)

    if (storageError) {
      console.warn('Failed to delete some files from storage:', storageError.message)
    }
  }

  // Delete certificate record
  const { error } = await supabase
    .from('certificates')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete certificate: ${error.message}`)
  }
}

/**
 * Get certificates statistics
 */
export async function getCertificateStats(): Promise<{
  total: number
  active: number
  inactive: number
  byType: Record<string, number>
  byHackathon: Record<string, number>
}> {
  const { data, error } = await supabase
    .from('certificates')
    .select('type, status, hackathon_name')

  if (error) {
    throw new Error(`Failed to fetch certificate statistics: ${error.message}`)
  }

  const stats = {
    total: data?.length || 0,
    active: 0,
    inactive: 0,
    byType: {} as Record<string, number>,
    byHackathon: {} as Record<string, number>
  }

  if (!data) return stats

  for (const cert of data) {
    // Count by status
    if (cert.status === 'active') {
      stats.active++
    } else {
      stats.inactive++
    }

    // Count by type
    stats.byType[cert.type] = (stats.byType[cert.type] || 0) + 1

    // Count by hackathon
    stats.byHackathon[cert.hackathon_name] = (stats.byHackathon[cert.hackathon_name] || 0) + 1
  }

  return stats
}

/**
 * Get unique hackathon names for filters
 */
export async function getHackathonNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('hackathon_name')

  if (error) {
    throw new Error(`Failed to fetch hackathon names: ${error.message}`)
  }

  const uniqueNames = [...new Set(data?.map(item => item.hackathon_name) || [])]
  return uniqueNames.sort()
}