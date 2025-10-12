import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { ExtendedCertificateTemplate } from '@/lib/certificateTemplates'
import type { TemplateConfig } from '@/components/TemplateEditor'
import type { CertificateType } from '@/types/certificate'
import * as customTemplateApi from '@/lib/customTemplateApi'

export interface CustomTemplate extends ExtendedCertificateTemplate {
  isCustom: true
  createdAt: string
  updatedAt: string
  templateConfig?: TemplateConfig
}

export function useCustomTemplates() {
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load custom templates from database
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const templates = await customTemplateApi.loadCustomTemplates()
      setCustomTemplates(templates)
    } catch (error) {
      console.error('Failed to load custom templates:', error)
      toast.error('Failed to load custom templates')
    } finally {
      setIsLoading(false)
    }
  }


  // Save a new custom template
  const saveCustomTemplate = async (templateConfig: TemplateConfig, type: CertificateType) => {
    try {
      // Check if template already exists (update vs create)
      const existingTemplate = customTemplates.find(t => t.id === templateConfig.id)
      
      let savedTemplate: CustomTemplate
      if (existingTemplate) {
        // Update existing template
        savedTemplate = await customTemplateApi.updateCustomTemplate(templateConfig.id!, templateConfig, type)
        toast.success('Template updated successfully!')
      } else {
        // Save new template
        savedTemplate = await customTemplateApi.saveCustomTemplate(templateConfig, type)
        toast.success('Template saved successfully!')
      }
      
      // Reload templates to get the latest data
      await loadTemplates()
      
      return savedTemplate
    } catch (error) {
      console.error('Failed to save custom template:', error)
      toast.error('Failed to save template')
      throw error
    }
  }

  // Delete a custom template
  const deleteCustomTemplate = async (templateId: string) => {
    try {
      await customTemplateApi.deleteCustomTemplate(templateId)
      // Reload templates to reflect the deletion
      await loadTemplates()
      toast.success('Template deleted successfully!')
    } catch (error) {
      console.error('Failed to delete custom template:', error)
      toast.error('Failed to delete template')
    }
  }

  // Get custom template by ID
  const getCustomTemplate = async (templateId: string): Promise<CustomTemplate | null> => {
    try {
      return await customTemplateApi.getCustomTemplate(templateId)
    } catch (error) {
      console.error('Failed to get custom template:', error)
      return null
    }
  }

  // Get custom templates by type
  const getCustomTemplatesByType = (type: CertificateType): CustomTemplate[] => {
    return customTemplates.filter(t => t.type === type)
  }

  // Import template from file
  const importTemplate = async (file: File): Promise<CustomTemplate | null> => {
    try {
      const fileContent = await file.text()
      const templateConfig: TemplateConfig = JSON.parse(fileContent)
      
      // Validate template config
      if (!templateConfig.name || !templateConfig.canvas || !Array.isArray(templateConfig.elements)) {
        throw new Error('Invalid template file format')
      }
      
      // Determine certificate type (default to participant if not specified)
      const type: CertificateType = 'participant' // You might want to add type detection logic
      
      const imported = await saveCustomTemplate(templateConfig, type)
      toast.success('Template imported successfully!')
      return imported
    } catch (error) {
      console.error('Failed to import template:', error)
      toast.error('Failed to import template. Please check the file format.')
      return null
    }
  }

  // Export template to file
  const exportTemplate = async (templateId: string) => {
    try {
      const template = await getCustomTemplate(templateId)
      if (!template || !template.templateConfig) {
        toast.error('Template not found')
        return
      }

      const blob = new Blob([JSON.stringify(template.templateConfig, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Template exported successfully!')
    } catch (error) {
      console.error('Failed to export template:', error)
      toast.error('Failed to export template')
    }
  }

  return {
    customTemplates,
    isLoading,
    saveCustomTemplate,
    deleteCustomTemplate,
    getCustomTemplate,
    getCustomTemplatesByType,
    importTemplate,
    exportTemplate
  }
}