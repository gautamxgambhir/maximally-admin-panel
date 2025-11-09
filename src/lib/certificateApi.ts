import { supabase } from './supabase'
import type { 
  Certificate, 
  CreateCertificateData, 
  CertificateFilters,
  CertificateStatus,
  CertificateTemplate
} from '@/types/certificate'
import type { ExtendedCertificateTemplate } from '@/lib/certificateTemplates'
import type { CustomTemplate } from '@/hooks/useCustomTemplates'
import { 
  generateCertificateId, 
  generateCertificateFiles, 
  uploadCertificateFiles,
  CERTIFICATE_TEMPLATES,
  convertToCertificateTemplate
} from './certificateUtils'
import { sendCertificateEmails } from './emailApi'

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
    
  }

  // Generate unique certificate ID
  const certificateId = generateCertificateId()
  
  // Use custom template if provided, otherwise fall back to default template for certificate type
  let template: CertificateTemplate
  if (data.template) {
    // Convert extended template (including custom templates) to basic template format
    template = convertToCertificateTemplate(data.template as ExtendedCertificateTemplate | CustomTemplate)
  } else {
    template = CERTIFICATE_TEMPLATES[data.type]
  }
  
  // Generate certificate files
  const { pdfBlob, jpgBlob } = await generateCertificateFiles({
    data,
    template: data.template || template, // Pass original template for custom template detection
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
      admin_email: profile?.email || user?.email || 'admin@maximally.com',
      maximally_username: data.maximally_username,
      template_id: (data.template && 'id' in data.template && !('isCustom' in data.template)) ? data.template.id : null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create certificate: ${error.message}`)
  }

  // Email sending is handled at the UI layer (hooks) to provide immediate feedback and avoid double-sending.
  return certificate
}

/**
 * Create multiple certificates from bulk data
 */
export async function createBulkCertificates(
  certificates: CreateCertificateData[]
): Promise<Certificate[]> {
  // Generate a unique batch ID for this bulk operation
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const results: Certificate[] = []
  const errors: string[] = []

  for (const certData of certificates) {
    try {
      // Add batch ID to certificate data
      const certificate = await createCertificateWithBatch({ ...certData, batch_id: batchId })
      results.push(certificate)
    } catch (error) {
      console.error(`Failed to create certificate for ${certData.participant_name}:`, error)
      errors.push(`${certData.participant_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (errors.length > 0) {
    
  }

  return results
}

/**
 * Create a single certificate with batch ID (internal function)
 */
export async function createCertificateWithBatch(data: CreateCertificateData & { batch_id?: string }): Promise<Certificate> {
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
    
  }

  // Generate unique certificate ID
  const certificateId = generateCertificateId()
  
  // Use custom template if provided, otherwise fall back to default template for certificate type
  let template: CertificateTemplate
  if (data.template) {
    // Convert extended template (including custom templates) to basic template format
    template = convertToCertificateTemplate(data.template as ExtendedCertificateTemplate | CustomTemplate)
  } else {
    template = CERTIFICATE_TEMPLATES[data.type]
  }
  
  // Generate certificate files
  const { pdfBlob, jpgBlob } = await generateCertificateFiles({
    data,
    template: data.template || template, // Pass original template for custom template detection
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
      admin_email: profile?.email || user?.email || 'admin@maximally.com',
      maximally_username: data.maximally_username,
      template_id: (data.template && 'id' in data.template && !('isCustom' in data.template)) ? data.template.id : null,
      batch_id: data.batch_id // Add batch ID for bulk generation tracking
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create certificate: ${error.message}`)
  }

  // Email sending is handled at the UI layer (hooks) to provide immediate feedback and avoid double-sending.
  return certificate
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
  const filesToDelete: string[] = []
  
  // Extract file paths from full URLs
  if (certificate.pdf_url) {
    try {
      // Handle both full URLs and direct paths
      let pdfPath = certificate.pdf_url
      if (pdfPath.includes('supabase.co')) {
        // Extract the file path from the full Supabase URL
        // URL format: https://[project].supabase.co/storage/v1/object/public|sign/certificates/[filename]
        const urlParts = pdfPath.split('/storage/v1/object/')
        if (urlParts.length > 1) {
          const pathPart = urlParts[1]
          if (pathPart.startsWith('public/certificates/')) {
            pdfPath = pathPart.replace('public/certificates/', '')
          } else if (pathPart.startsWith('sign/certificates/')) {
            pdfPath = pathPart.replace('sign/certificates/', '').split('?')[0] // Remove query params
          }
        }
      } else {
        // If it's just a filename, use it as is
        pdfPath = pdfPath.split('/').pop() || pdfPath
      }
      if (pdfPath) {
        filesToDelete.push(pdfPath)
      }
    } catch (error) {
      
    }
  }
  
  if (certificate.jpg_url) {
    try {
      // Handle both full URLs and direct paths
      let jpgPath = certificate.jpg_url
      if (jpgPath.includes('supabase.co')) {
        // Extract the file path from the full Supabase URL
        const urlParts = jpgPath.split('/storage/v1/object/')
        if (urlParts.length > 1) {
          const pathPart = urlParts[1]
          if (pathPart.startsWith('public/certificates/')) {
            jpgPath = pathPart.replace('public/certificates/', '')
          } else if (pathPart.startsWith('sign/certificates/')) {
            jpgPath = pathPart.replace('sign/certificates/', '').split('?')[0] // Remove query params
          }
        }
      } else {
        // If it's just a filename, use it as is
        jpgPath = jpgPath.split('/').pop() || jpgPath
      }
      if (jpgPath) {
        filesToDelete.push(jpgPath)
      }
    } catch (error) {
      
    }
  }

  // Also attempt deletion using deterministic filenames as a fallback
  filesToDelete.push(`${certificate.certificate_id}.pdf`, `${certificate.certificate_id}.jpg`)

  // Deduplicate paths
  const uniquePaths = Array.from(new Set(filesToDelete.filter(Boolean)))

  // Delete files from storage if any were found
  if (uniquePaths.length > 0) {
    
    
    const { data: deletedFiles, error: storageError } = await supabase.storage
      .from('certificates')
      .remove(uniquePaths)

    if (storageError) {
      console.error('Failed to delete files from storage:', storageError)
      // Don't throw error here - we still want to delete the database record
      
    } else {
      
    }
  } else {
    
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