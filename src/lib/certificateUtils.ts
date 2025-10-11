import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import QRCode from 'qrcode'
import { supabase } from './supabase'
import { CERTIFICATE_CONFIG, getVerificationUrl } from '@/config/constants'
import type { 
  CertificateTemplate, 
  CertificateGenerationOptions, 
  CertificateType,
  CreateCertificateData 
} from '@/types/certificate'

// Maximally brand colors
const BRAND_COLORS = {
  primary: '#3B82F6', // Blue
  secondary: '#1E40AF', // Dark Blue
  accent: '#F59E0B', // Amber
  success: '#10B981', // Green
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  black: '#1F2937'
}

// Default fallback templates for backwards compatibility
export const CERTIFICATE_TEMPLATES: Record<CertificateType, CertificateTemplate> = {
  winner: {
    type: 'winner',
    title: 'Certificate of Excellence',
    subtitle: 'Winner Recognition',
    description: 'This certificate is awarded in recognition of outstanding achievement and excellence',
    backgroundColor: BRAND_COLORS.lightGray,
    primaryColor: BRAND_COLORS.accent,
    secondaryColor: BRAND_COLORS.primary
  },
  participant: {
    type: 'participant',
    title: 'Certificate of Participation',
    subtitle: 'Participant Recognition',
    description: 'This certificate is awarded in recognition of active participation and contribution',
    backgroundColor: BRAND_COLORS.lightGray,
    primaryColor: BRAND_COLORS.primary,
    secondaryColor: BRAND_COLORS.secondary
  },
  judge: {
    type: 'judge',
    title: 'Certificate of Appreciation',
    subtitle: 'Judge Recognition',
    description: 'This certificate is awarded in appreciation of valuable service as a judge',
    backgroundColor: BRAND_COLORS.lightGray,
    primaryColor: BRAND_COLORS.success,
    secondaryColor: BRAND_COLORS.primary
  }
}

/**
 * Generate a unique certificate ID
 */
export function generateCertificateId(): string {
  const chars = CERTIFICATE_CONFIG.ID_CHARS
  let result = 'CERT-'
  for (let i = 0; i < CERTIFICATE_CONFIG.ID_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate QR code for certificate verification
 */
export async function generateQRCode(certificateId: string): Promise<string> {
  const verificationUrl = getVerificationUrl(certificateId)
  try {
    return await QRCode.toDataURL(verificationUrl, {
      width: CERTIFICATE_CONFIG.QR_CODE_SETTINGS.width,
      margin: CERTIFICATE_CONFIG.QR_CODE_SETTINGS.margin,
      color: CERTIFICATE_CONFIG.QR_CODE_SETTINGS.color
    })
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    return ''
  }
}

/**
 * Create certificate HTML content
 */
export async function createCertificateHTML(options: CertificateGenerationOptions): Promise<string> {
  const { data, template, certificateId } = options
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // Generate QR code for verification
  const qrCodeDataUrl = await generateQRCode(certificateId)

  return `
    <div style="
      width: 1200px;
      height: 800px;
      background: linear-gradient(135deg, ${template.backgroundColor} 0%, ${template.primaryColor}15 100%);
      padding: 80px;
      box-sizing: border-box;
      font-family: 'Arial', sans-serif;
      position: relative;
      border: 8px solid ${template.primaryColor};
      border-radius: 20px;
    ">
      <!-- Decorative corners -->
      <div style="
        position: absolute;
        top: 20px;
        left: 20px;
        width: 100px;
        height: 100px;
        background: ${template.primaryColor};
        clip-path: polygon(0 0, 100% 0, 0 100%);
        opacity: 0.1;
      "></div>
      <div style="
        position: absolute;
        top: 20px;
        right: 20px;
        width: 100px;
        height: 100px;
        background: ${template.primaryColor};
        clip-path: polygon(100% 0, 100% 100%, 0 0);
        opacity: 0.1;
      "></div>
      <div style="
        position: absolute;
        bottom: 20px;
        left: 20px;
        width: 100px;
        height: 100px;
        background: ${template.primaryColor};
        clip-path: polygon(0 100%, 100% 100%, 0 0);
        opacity: 0.1;
      "></div>
      <div style="
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 100px;
        height: 100px;
        background: ${template.primaryColor};
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
        opacity: 0.1;
      "></div>

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 60px;">
        <h1 style="
          font-size: 52px;
          font-weight: bold;
          color: ${template.primaryColor};
          margin: 0 0 10px 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        ">MAXIMALLY</h1>
        <div style="
          width: 200px;
          height: 4px;
          background: linear-gradient(90deg, ${template.primaryColor}, ${template.secondaryColor});
          margin: 0 auto 20px auto;
        "></div>
        <p style="
          font-size: 18px;
          color: ${BRAND_COLORS.gray};
          margin: 0;
          font-weight: 500;
        ">${template.subtitle}</p>
      </div>

      <!-- Certificate Title -->
      <div style="text-align: center; margin-bottom: 50px;">
        <h2 style="
          font-size: 42px;
          font-weight: bold;
          color: ${template.secondaryColor};
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 2px;
        ">${template.title}</h2>
      </div>

      <!-- Main Content -->
      <div style="text-align: center; margin-bottom: 50px;">
        <p style="
          font-size: 20px;
          color: ${BRAND_COLORS.black};
          margin: 0 0 30px 0;
          line-height: 1.6;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        ">${template.description}</p>
        
        <div style="
          background: ${BRAND_COLORS.white};
          border: 3px solid ${template.primaryColor};
          border-radius: 15px;
          padding: 40px;
          margin: 40px auto;
          max-width: 600px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        ">
          <p style="
            font-size: 24px;
            color: ${BRAND_COLORS.gray};
            margin: 0 0 15px 0;
            font-weight: 500;
          ">This is to certify that</p>
          
          <h3 style="
            font-size: 38px;
            font-weight: bold;
            color: ${template.primaryColor};
            margin: 0 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          ">${data.participant_name}</h3>
          
          ${data.position ? `
            <p style="
              font-size: 22px;
              color: ${template.secondaryColor};
              margin: 0 0 20px 0;
              font-weight: 600;
            ">achieved ${data.position}</p>
          ` : ''}
          
          <p style="
            font-size: 20px;
            color: ${BRAND_COLORS.gray};
            margin: 0 0 10px 0;
          ">in</p>
          
          <h4 style="
            font-size: 28px;
            font-weight: bold;
            color: ${template.secondaryColor};
            margin: 0;
            text-transform: uppercase;
          ">${data.hackathon_name}</h4>
        </div>
      </div>

      <!-- QR Code positioned in top-right corner -->
      ${qrCodeDataUrl ? `
        <div style="
          position: absolute;
          top: 30px;
          right: 30px;
          background: ${BRAND_COLORS.white};
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 2px solid ${template.primaryColor};
        ">
          <img src="${qrCodeDataUrl}" alt="Verification QR Code" style="
            width: 100px;
            height: 100px;
            display: block;
          " />
          <p style="
            font-size: 10px;
            color: ${BRAND_COLORS.gray};
            text-align: center;
            margin: 5px 0 0 0;
            font-weight: 500;
          ">Verify Certificate</p>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 60px;
        padding-top: 30px;
        border-top: 2px solid ${template.primaryColor};
        position: relative;
      ">
        <div style="text-align: left;">
          <p style="
            font-size: 16px;
            color: ${BRAND_COLORS.gray};
            margin: 0 0 5px 0;
          ">Certificate ID</p>
          <p style="
            font-size: 18px;
            font-weight: bold;
            color: ${template.primaryColor};
            margin: 0;
            font-family: monospace;
          ">${certificateId}</p>
        </div>
        
        <div style="text-align: center;">
          <p style="
            font-size: 12px;
            color: ${BRAND_COLORS.gray};
            margin: 0;
          ">Verify this certificate at:</p>
          <p style="
            font-size: 14px;
            font-weight: bold;
            color: ${template.primaryColor};
            margin: 5px 0 0 0;
            font-family: monospace;
          ">${CERTIFICATE_CONFIG.VERIFICATION_BASE_URL.replace('https://', '').replace('http://', '')}/certificates/verify/${certificateId}</p>
        </div>
        
        <div style="text-align: right;">
          <p style="
            font-size: 16px;
            color: ${BRAND_COLORS.gray};
            margin: 0 0 5px 0;
          ">Date Issued</p>
          <p style="
            font-size: 18px;
            font-weight: bold;
            color: ${template.primaryColor};
            margin: 0;
          ">${currentDate}</p>
        </div>
      </div>
    </div>
  `
}

/**
 * Generate certificate as PDF and JPG
 */
export async function generateCertificateFiles(options: CertificateGenerationOptions): Promise<{
  pdfBlob: Blob
  jpgBlob: Blob
}> {
  // Create temporary container
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  container.innerHTML = await createCertificateHTML(options)
  document.body.appendChild(container)

  try {
    // Generate canvas from HTML
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      width: CERTIFICATE_CONFIG.CANVAS_SETTINGS.width,
      height: CERTIFICATE_CONFIG.CANVAS_SETTINGS.height,
      scale: CERTIFICATE_CONFIG.CANVAS_SETTINGS.scale,
      backgroundColor: null,
      logging: false,
      useCORS: true
    })

    // Generate JPG
    const jpgBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, 'image/jpeg', 0.95)
    })

    // Generate PDF
    const pdf = new jsPDF({
      orientation: CERTIFICATE_CONFIG.PDF_SETTINGS.orientation,
      unit: CERTIFICATE_CONFIG.PDF_SETTINGS.unit,
      format: CERTIFICATE_CONFIG.PDF_SETTINGS.format
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(imgData, 'JPEG', 10, 10, 277, 190)

    const pdfBlob = new Blob([pdf.output('arraybuffer')], {
      type: 'application/pdf'
    })

    return { pdfBlob, jpgBlob }
  } finally {
    // Clean up
    document.body.removeChild(container)
  }
}

/**
 * Upload certificate files to Supabase Storage
 */
export async function uploadCertificateFiles(
  certificateId: string,
  pdfBlob: Blob,
  jpgBlob: Blob
): Promise<{ pdfUrl: string; jpgUrl: string }> {
  const pdfFileName = `${certificateId}.pdf`
  const jpgFileName = `${certificateId}.jpg`

  // Upload PDF
  const { data: pdfData, error: pdfError } = await supabase.storage
    .from('certificates')
    .upload(pdfFileName, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (pdfError) {
    throw new Error(`Failed to upload PDF: ${pdfError.message}`)
  }

  // Upload JPG
  const { data: jpgData, error: jpgError } = await supabase.storage
    .from('certificates')
    .upload(jpgFileName, jpgBlob, {
      contentType: 'image/jpeg',
      upsert: true
    })

  if (jpgError) {
    throw new Error(`Failed to upload JPG: ${jpgError.message}`)
  }

  // Get signed URLs (since bucket is private)
  const { data: pdfUrlData, error: pdfUrlError } = await supabase.storage
    .from('certificates')
    .createSignedUrl(pdfFileName, 31536000) // 1 year expiry

  const { data: jpgUrlData, error: jpgUrlError } = await supabase.storage
    .from('certificates')
    .createSignedUrl(jpgFileName, 31536000) // 1 year expiry

  if (pdfUrlError) {
    console.warn('Failed to create signed URL for PDF:', pdfUrlError)
  }
  
  if (jpgUrlError) {
    console.warn('Failed to create signed URL for JPG:', jpgUrlError)
  }

  return {
    pdfUrl: pdfUrlData?.signedUrl || '',
    jpgUrl: jpgUrlData?.signedUrl || ''
  }
}

/**
 * Create ZIP file with multiple certificates
 */
export async function createCertificateZip(certificates: Array<{
  certificate_id: string
  participant_name: string
  pdf_url?: string
  jpg_url?: string
}>): Promise<Blob> {
  const zip = new JSZip()

  for (const cert of certificates) {
    try {
      // Download PDF if available
      if (cert.pdf_url) {
        const pdfResponse = await fetch(cert.pdf_url)
        if (pdfResponse.ok) {
          const pdfBlob = await pdfResponse.blob()
          zip.file(`${cert.certificate_id}_${cert.participant_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, pdfBlob)
        }
      }

      // Download JPG if available
      if (cert.jpg_url) {
        const jpgResponse = await fetch(cert.jpg_url)
        if (jpgResponse.ok) {
          const jpgBlob = await jpgResponse.blob()
          zip.file(`${cert.certificate_id}_${cert.participant_name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`, jpgBlob)
        }
      }
    } catch (error) {
      console.error(`Failed to download files for certificate ${cert.certificate_id}:`, error)
      // Continue with other certificates
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Create ZIP file with format selection support
 */
export async function createBulkCertificateZip(
  certificateIds: string[],
  format: 'pdf' | 'jpg' | 'both' = 'both'
): Promise<Blob> {
  // This is a simplified implementation for now
  // In a real implementation, you'd fetch the certificate data from your API
  // and then create the zip based on the format preference
  
  const zip = new JSZip()
  
  // For now, create a simple zip structure
  // This should be replaced with actual certificate file downloads
  const readme = `Bulk Certificate Download\n\nFormat: ${format}\nCertificates: ${certificateIds.length}\n\nGenerated on: ${new Date().toISOString()}`
  zip.file('README.txt', readme)
  
  // Note: In production, you would:
  // 1. Fetch certificate details for each ID
  // 2. Download the appropriate files (PDF, JPG, or both) based on format parameter
  // 3. Add them to the zip with proper naming
  
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}