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
import type { ExtendedCertificateTemplate } from '@/lib/certificateTemplates'
import type { CustomTemplate } from '@/hooks/useCustomTemplates'

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
 * Convert ExtendedCertificateTemplate (including custom templates) to basic CertificateTemplate
 * for use with certificate generation
 */
export function convertToCertificateTemplate(template: ExtendedCertificateTemplate | CustomTemplate): CertificateTemplate {
  // Check if it's a custom template with templateConfig
  if ('templateConfig' in template && template.templateConfig) {
    const config = template.templateConfig
    // For custom templates, we need to render them differently
    // For now, we'll use the basic template structure but with custom colors
    return {
      type: template.type,
      title: config.name || template.title,
      subtitle: template.subtitle || 'Custom Template', 
      description: config.description || template.description,
      backgroundColor: template.backgroundColor,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor
    }
  }
  
  // For built-in extended templates, extract the basic properties
  return {
    type: template.type,
    title: template.title,
    subtitle: template.subtitle,
    description: template.description,
    backgroundColor: template.backgroundColor,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor
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
 * Create certificate HTML content for custom templates
 */
export async function createCustomCertificateHTML(options: CertificateGenerationOptions & { customTemplate: CustomTemplate }): Promise<string> {
  const { data, customTemplate, certificateId } = options
  const templateConfig = customTemplate.templateConfig
  
  if (!templateConfig) {
    // Fallback to regular template if no config
    return createCertificateHTML(options)
  }
  
  // Generate QR code for verification
  const qrCodeDataUrl = await generateQRCode(certificateId)
  
  // Render elements with placeholder substitution
  const renderElement = (element: any) => {
    let content = element.content
    
    // Replace placeholders with actual data
    switch (element.content) {
      case 'participant_name':
        content = data.participant_name
        break
      case 'hackathon_name':
        content = data.hackathon_name
        break
      case 'position':
        content = data.position || ''
        break
      case 'date':
        content = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        break
      case 'signature':
        content = 'Authorized Signature'
        break
      case 'organizer':
        content = 'MAXIMALLY'
        break
      case 'verification_url':
        // For QR codes, we'll handle this separately
        break
    }
    
    const style = {
      position: 'absolute',
      left: `${element.position.x}px`,
      top: `${element.position.y}px`,
      width: `${element.size.width}px`,
      height: `${element.size.height}px`,
      transform: `rotate(${element.rotation}deg)`,
      zIndex: element.zIndex,
      fontSize: `${element.style.fontSize || 16}px`,
      fontFamily: element.style.fontFamily || 'Arial',
      fontWeight: element.style.fontWeight || 'normal',
      fontStyle: element.style.fontStyle || 'normal',
      textDecoration: element.style.textDecoration || 'none',
      textAlign: element.style.textAlign || 'left',
      color: element.style.color || '#000000',
      backgroundColor: element.style.backgroundColor || 'transparent',
      border: element.style.borderWidth ? `${element.style.borderWidth}px solid ${element.style.borderColor || '#cccccc'}` : 'none',
      borderRadius: `${element.style.borderRadius || 0}px`,
      opacity: (element.style.opacity || 100) / 100,
      padding: `${element.style.padding || 0}px`,
      overflow: 'hidden',
      wordBreak: 'break-word',
      display: 'flex',
      alignItems: 'center',
      justifyContent: element.style.textAlign === 'center' ? 'center' : element.style.textAlign === 'right' ? 'flex-end' : 'flex-start'
    }
    
    const styleString = Object.entries(style)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ')
    
    if (element.type === 'qr_code' && element.content === 'verification_url') {
      return qrCodeDataUrl ? `
        <div style="${styleString}">
          <img src="${qrCodeDataUrl}" alt="Verification QR Code" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
      ` : ''
    }
    
    if (element.type === 'image') {
      return `
        <div style="${styleString}">
          <div style="width: 100%; height: 100%; background: ${element.style.backgroundColor}; border-radius: ${element.style.borderRadius || 0}px;"></div>
        </div>
      `
    }
    
    if (element.type === 'shape') {
      return `
        <div style="${styleString}">
        </div>
      `
    }
    
    return `
      <div style="${styleString}">
        ${content}
      </div>
    `
  }
  
  const elementsHTML = templateConfig.elements.map(renderElement).join('')
  
  // If there's a background image, we want to ensure the certificate matches the image dimensions
  const certificateStyle = templateConfig.canvas.backgroundImage 
    ? `
      position: relative;
      width: ${templateConfig.canvas.width}px;
      height: ${templateConfig.canvas.height}px;
      background: ${templateConfig.canvas.backgroundColor};
      background-image: url(${templateConfig.canvas.backgroundImage});
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center;
      font-family: Arial, sans-serif;
      overflow: hidden;
    `
    : `
      position: relative;
      width: ${templateConfig.canvas.width}px;
      height: ${templateConfig.canvas.height}px;
      background: ${templateConfig.canvas.backgroundColor};
      font-family: Arial, sans-serif;
      overflow: hidden;
    `

  return `
    <div style="${certificateStyle}">
      ${elementsHTML}
    </div>
  `
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
  
  // Check if this is a custom template that needs special rendering
  let htmlContent: string
  if (options.template && 'isCustom' in options.template && options.template.isCustom) {
    htmlContent = await createCustomCertificateHTML({
      ...options,
      customTemplate: options.template as CustomTemplate
    })
  } else {
    htmlContent = await createCertificateHTML(options)
  }
  
  container.innerHTML = htmlContent
  document.body.appendChild(container)

  try {
    // Determine canvas dimensions based on template type
    let canvasWidth = CERTIFICATE_CONFIG.CANVAS_SETTINGS.width
    let canvasHeight = CERTIFICATE_CONFIG.CANVAS_SETTINGS.height
    
    // Use custom template dimensions if available
    if (options.template && 'isCustom' in options.template && options.template.isCustom) {
      const customTemplate = options.template as CustomTemplate
      if (customTemplate.templateConfig) {
        canvasWidth = customTemplate.templateConfig.canvas.width
        canvasHeight = customTemplate.templateConfig.canvas.height
      }
    }
    
    // Generate canvas from HTML
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      width: canvasWidth,
      height: canvasHeight,
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

    // Generate PDF with appropriate dimensions
    let pdfOrientation: 'portrait' | 'landscape' = CERTIFICATE_CONFIG.PDF_SETTINGS.orientation
    let pdfFormat = CERTIFICATE_CONFIG.PDF_SETTINGS.format
    
    // Determine orientation based on canvas aspect ratio
    if (canvasWidth > canvasHeight) {
      pdfOrientation = 'landscape'
    } else {
      pdfOrientation = 'portrait'
    }
    
    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: CERTIFICATE_CONFIG.PDF_SETTINGS.unit,
      format: pdfFormat
    })
    
    // Calculate PDF dimensions to fit the canvas while maintaining aspect ratio
    const pdfPageWidth = pdf.internal.pageSize.getWidth()
    const pdfPageHeight = pdf.internal.pageSize.getHeight()
    const aspectRatio = canvasWidth / canvasHeight
    
    let imgWidth = pdfPageWidth - 20 // 10px margin on each side
    let imgHeight = imgWidth / aspectRatio
    
    // If height is too large, scale based on height instead
    if (imgHeight > pdfPageHeight - 20) {
      imgHeight = pdfPageHeight - 20
      imgWidth = imgHeight * aspectRatio
    }
    
    // Center the image
    const xOffset = (pdfPageWidth - imgWidth) / 2
    const yOffset = (pdfPageHeight - imgHeight) / 2

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight)

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
    
  }
  
  if (jpgUrlError) {
    
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
  let successCount = 0
  let errorCount = 0
  const errors: string[] = []
  
  

  for (const cert of certificates) {
    let certSuccessCount = 0
    let certErrors: string[] = []
    
    try {
      // Download PDF if available
      if (cert.pdf_url) {
        
        try {
          const pdfResponse = await fetch(cert.pdf_url, {
            method: 'GET',
            headers: {
              'Accept': 'application/pdf,*/*'
            }
          })
          
          
          
          if (pdfResponse.ok) {
            const pdfBlob = await pdfResponse.blob()
            const filename = `${cert.certificate_id}_${cert.participant_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
            zip.file(filename, pdfBlob)
            certSuccessCount++
          } else {
            const errorMsg = `PDF download failed: ${pdfResponse.status} ${pdfResponse.statusText}`
            console.error(`${cert.certificate_id}: ${errorMsg}`)
            certErrors.push(`PDF: ${errorMsg}`)
          }
        } catch (pdfError) {
          const errorMsg = `PDF fetch error: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
          console.error(`${cert.certificate_id}: ${errorMsg}`, pdfError)
          certErrors.push(`PDF: ${errorMsg}`)
        }
      } else {
        
        certErrors.push('PDF: No URL available')
      }

      // Download JPG if available
      if (cert.jpg_url) {
        
        try {
          const jpgResponse = await fetch(cert.jpg_url, {
            method: 'GET',
            headers: {
              'Accept': 'image/jpeg,image/*,*/*'
            }
          })
          
          
          
          if (jpgResponse.ok) {
            const jpgBlob = await jpgResponse.blob()
            const filename = `${cert.certificate_id}_${cert.participant_name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
            zip.file(filename, jpgBlob)
            certSuccessCount++
          } else {
            const errorMsg = `JPG download failed: ${jpgResponse.status} ${jpgResponse.statusText}`
            console.error(`${cert.certificate_id}: ${errorMsg}`)
            certErrors.push(`JPG: ${errorMsg}`)
          }
        } catch (jpgError) {
          const errorMsg = `JPG fetch error: ${jpgError instanceof Error ? jpgError.message : 'Unknown error'}`
          console.error(`${cert.certificate_id}: ${errorMsg}`, jpgError)
          certErrors.push(`JPG: ${errorMsg}`)
        }
      } else {
        
        certErrors.push('JPG: No URL available')
      }
      
      if (certSuccessCount > 0) {
        successCount++
      } else {
        errorCount++
        errors.push(`${cert.certificate_id}: ${certErrors.join(', ')}`)
      }
    } catch (error) {
      errorCount++
      const errorMsg = `General error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`Failed to process certificate ${cert.certificate_id}:`, error)
      errors.push(`${cert.certificate_id}: ${errorMsg}`)
    }
  }

  // Add a summary file to the ZIP
  const summary = `Certificate Download Summary\n` +
    `Generated: ${new Date().toISOString()}\n` +
    `Total Certificates: ${certificates.length}\n` +
    `Successfully Downloaded: ${successCount}\n` +
    `Failed Downloads: ${errorCount}\n\n` +
    (errors.length > 0 ? `Errors:\n${errors.join('\n')}\n\n` : '') +
    `Certificate List:\n` +
    certificates.map(c => `- ${c.certificate_id}: ${c.participant_name} (PDF: ${c.pdf_url ? 'Available' : 'N/A'}, JPG: ${c.jpg_url ? 'Available' : 'N/A'})`).join('\n')
    
  zip.file('DOWNLOAD_SUMMARY.txt', summary)
  
  
  
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