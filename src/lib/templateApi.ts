import { supabase } from './supabase'
import type { TemplateConfig } from '@/components/TemplateEditor'

export interface DatabaseTemplate {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  is_default: boolean
  is_public: boolean
  created_by: string
  template_data: any
  canvas_config: any
  created_at: string
  updated_at: string
}

export interface TemplateElement {
  id: string
  template_id: string
  element_type: 'text' | 'placeholder' | 'image' | 'shape' | 'qr_code'
  content: string | null
  position_x: number
  position_y: number
  width: number
  height: number
  rotation: number
  z_index: number
  style_config: any
  created_at: string
}

/**
 * Save a custom template to the database
 */
export async function saveTemplateToDatabase(templateConfig: TemplateConfig): Promise<DatabaseTemplate> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Save template record
  const { data: template, error: templateError } = await supabase
    .from('certificate_templates')
    .insert({
      name: templateConfig.name,
      description: templateConfig.description || null,
      is_default: false,
      is_public: false,
      created_by: user.id,
      template_data: {
        version: templateConfig.version,
        category: templateConfig.category,
        elements_count: templateConfig.elements.length
      },
      canvas_config: templateConfig.canvas
    })
    .select()
    .single()

  if (templateError) {
    throw new Error(`Failed to save template: ${templateError.message}`)
  }

  // Save template elements
  if (templateConfig.elements.length > 0) {
    const elements = templateConfig.elements.map(element => ({
      template_id: template.id,
      element_type: element.type,
      content: element.content,
      position_x: element.position.x,
      position_y: element.position.y,
      width: element.size.width,
      height: element.size.height,
      rotation: element.rotation,
      z_index: element.zIndex,
      style_config: element.style
    }))

    const { error: elementsError } = await supabase
      .from('template_elements')
      .insert(elements)

    if (elementsError) {
      // Try to clean up the template record if elements failed
      await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', template.id)
      
      throw new Error(`Failed to save template elements: ${elementsError.message}`)
    }
  }

  return template
}

/**
 * Get user's custom templates from database
 */
export async function getUserTemplates(): Promise<DatabaseTemplate[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data: templates, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('created_by', user.id)
    .eq('is_default', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch user templates:', error)
    return []
  }

  return templates || []
}

/**
 * Get template elements for a specific template
 */
export async function getTemplateElements(templateId: string): Promise<TemplateElement[]> {
  const { data: elements, error } = await supabase
    .from('template_elements')
    .select('*')
    .eq('template_id', templateId)
    .order('z_index', { ascending: true })

  if (error) {
    console.error('Failed to fetch template elements:', error)
    return []
  }

  return elements || []
}

/**
 * Convert database template to TemplateConfig format
 */
export async function convertDatabaseTemplateToConfig(dbTemplate: DatabaseTemplate): Promise<TemplateConfig> {
  const elements = await getTemplateElements(dbTemplate.id)
  
  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    description: dbTemplate.description || '',
    category: dbTemplate.template_data?.category || 'custom',
    canvas: {
      width: dbTemplate.canvas_config?.width || 800,
      height: dbTemplate.canvas_config?.height || 600,
      backgroundColor: dbTemplate.canvas_config?.backgroundColor || '#ffffff',
      backgroundImage: dbTemplate.canvas_config?.backgroundImage,
      showGrid: dbTemplate.canvas_config?.showGrid ?? true,
      snapToGrid: dbTemplate.canvas_config?.snapToGrid ?? true,
      gridSize: dbTemplate.canvas_config?.gridSize || 20
    },
    elements: elements.map(el => ({
      id: el.id,
      type: el.element_type,
      content: el.content || '',
      position: { x: el.position_x, y: el.position_y },
      size: { width: el.width, height: el.height },
      rotation: el.rotation,
      zIndex: el.z_index,
      style: el.style_config || {}
    })),
    version: dbTemplate.template_data?.version || '1.0'
  }
}

/**
 * Delete a custom template
 */
export async function deleteTemplateFromDatabase(templateId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Delete template (elements will be deleted automatically due to CASCADE)
  const { error } = await supabase
    .from('certificate_templates')
    .delete()
    .eq('id', templateId)
    .eq('created_by', user.id) // Ensure user can only delete their own templates

  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`)
  }
}

/**
 * Update an existing template
 */
export async function updateTemplateInDatabase(templateConfig: TemplateConfig): Promise<DatabaseTemplate> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  if (!templateConfig.id) {
    throw new Error('Template ID is required for updates')
  }

  // Update template record
  const { data: template, error: templateError } = await supabase
    .from('certificate_templates')
    .update({
      name: templateConfig.name,
      description: templateConfig.description || null,
      template_data: {
        version: templateConfig.version,
        category: templateConfig.category,
        elements_count: templateConfig.elements.length
      },
      canvas_config: templateConfig.canvas,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateConfig.id)
    .eq('created_by', user.id)
    .select()
    .single()

  if (templateError) {
    throw new Error(`Failed to update template: ${templateError.message}`)
  }

  // Delete existing elements
  await supabase
    .from('template_elements')
    .delete()
    .eq('template_id', templateConfig.id)

  // Insert updated elements
  if (templateConfig.elements.length > 0) {
    const elements = templateConfig.elements.map(element => ({
      template_id: template.id,
      element_type: element.type,
      content: element.content,
      position_x: element.position.x,
      position_y: element.position.y,
      width: element.size.width,
      height: element.size.height,
      rotation: element.rotation,
      z_index: element.zIndex,
      style_config: element.style
    }))

    const { error: elementsError } = await supabase
      .from('template_elements')
      .insert(elements)

    if (elementsError) {
      throw new Error(`Failed to update template elements: ${elementsError.message}`)
    }
  }

  return template
}