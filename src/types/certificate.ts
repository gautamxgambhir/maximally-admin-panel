export type CertificateType = 'winner' | 'participant' | 'judge'
export type CertificateStatus = 'active' | 'inactive'

export interface Certificate {
  id: string
  certificate_id: string
  participant_name: string
  participant_email?: string
  hackathon_name: string
  type: CertificateType
  position?: string
  pdf_url?: string
  jpg_url?: string
  status: CertificateStatus
  generated_by: string
  admin_email?: string
  maximally_username: string
  created_at: string
  updated_at: string
}

export interface CreateCertificateData {
  participant_name: string
  participant_email?: string
  hackathon_name: string
  type: CertificateType
  position?: string
  maximally_username: string
  template?: CertificateTemplate // Optional template for custom designs
}

export interface BulkCreateCertificateData extends CreateCertificateData {
  // For CSV upload, all fields from CreateCertificateData are included
}

export interface CertificateTemplate {
  type: CertificateType
  title: string
  subtitle: string
  description: string
  backgroundColor: string
  primaryColor: string
  secondaryColor: string
}

export interface CertificateGenerationOptions {
  data: CreateCertificateData
  template: CertificateTemplate
  certificateId: string
}

export interface CertificateFilters {
  type?: CertificateType
  status?: CertificateStatus
  hackathon_name?: string
  search?: string
}

export interface BulkDownloadOptions {
  selectedIds: string[]
  format: 'pdf' | 'jpg' | 'both'
}