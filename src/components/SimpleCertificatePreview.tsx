import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Eye, Download, X } from 'lucide-react'
import { createCertificateHTML, createCustomCertificateHTML, CERTIFICATE_TEMPLATES, generateCertificateId, convertToCertificateTemplate } from '@/lib/certificateUtils'
import { getVerificationUrl } from '@/config/constants'
import type { ExtendedCertificateTemplate } from '@/lib/certificateTemplates'
import type { CreateCertificateData } from '@/types/certificate'
import type { CustomTemplate } from '@/hooks/useCustomTemplates'

interface SimpleCertificatePreviewProps {
  data: CreateCertificateData
  onGenerate?: () => void
  isGenerating?: boolean
  disabled?: boolean
  selectedTemplate?: ExtendedCertificateTemplate | null
}

export function SimpleCertificatePreview({ 
  data, 
  onGenerate,
  isGenerating = false,
  disabled = false,
  selectedTemplate = null
}: SimpleCertificatePreviewProps) {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [certificateId] = useState(() => generateCertificateId())

  const generatePreview = async () => {
    if (!data.participant_name || !data.hackathon_name || !data.type) {
      return
    }

    setIsLoading(true)
    try {
      // Use selected template or fallback to default
      let html: string
      
      if (selectedTemplate && 'isCustom' in selectedTemplate && selectedTemplate.isCustom) {
        // Use custom template rendering for custom templates
        html = await createCustomCertificateHTML({
          data,
          template: convertToCertificateTemplate(selectedTemplate),
          certificateId,
          customTemplate: selectedTemplate as CustomTemplate
        })
      } else {
        // Use standard template rendering
        const template = selectedTemplate 
          ? convertToCertificateTemplate(selectedTemplate) 
          : CERTIFICATE_TEMPLATES[data.type]
        
        html = await createCertificateHTML({
          data,
          template,
          certificateId
        })
      }
      setHtmlContent(html)
    } catch (error) {
      console.error('Failed to generate preview:', error)
      setHtmlContent('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      generatePreview()
    }
  }

  const handleGenerate = () => {
    onGenerate?.()
    setOpen(false)
  }

  const isFormValid = data.participant_name && data.hackathon_name && data.type

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="outline"
          className="flex items-center gap-2"
          disabled={disabled}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Certificate Preview
          </DialogTitle>
          <DialogDescription>
            Preview your certificate before generating. The final version will be high-resolution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Certificate Details Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
            <div>
              <span className="font-medium">Participant:</span> {data.participant_name || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Email:</span> {data.participant_email || 'Not provided'}
            </div>
            <div>
              <span className="font-medium">Hackathon:</span> {data.hackathon_name || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Type:</span> {data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : 'Not selected'}
            </div>
            {data.position && (
              <div className="col-span-2">
                <span className="font-medium">Position:</span> {data.position}
              </div>
            )}
            <div className="col-span-2">
              <span className="font-medium">Certificate ID:</span> {certificateId}
            </div>
          </div>

          {/* Certificate Preview */}
          <div className="border rounded-lg bg-white min-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating preview...</p>
                </div>
              </div>
            ) : !isFormValid ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Preview Not Available</p>
                  <p className="text-sm">Please fill in all required fields to see the preview</p>
                </div>
              </div>
            ) : htmlContent ? (
              <div className="p-4 overflow-hidden">
                <div 
                  className="certificate-preview" 
                  style={{ 
                    transform: 'scale(0.4)', 
                    transformOrigin: 'top left',
                    width: '250%',
                    height: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">Failed to generate preview</p>
                  <p className="text-sm">Please check your form data and try again</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview Notes */}
          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Preview Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>This is a scaled-down preview. The actual certificate will be high-resolution.</li>
              <li>QR codes will be fully functional in the generated certificate.</li>
              <li>Both PDF and JPG versions will be created automatically.</li>
              <li>The verification URL will be: {getVerificationUrl(certificateId)}</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={!isFormValid || isGenerating}
            className="min-w-32"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate Certificate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}