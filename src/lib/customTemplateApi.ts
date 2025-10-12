import { supabase } from './supabase'
import type { TemplateConfig } from '@/components/TemplateEditor'
import type { CertificateType } from '@/types/certificate'
import type { CustomTemplate } from '@/hooks/useCustomTemplates'

// Database types matching the schema
interface DatabaseTemplate {
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

interface DatabaseTemplateElement {
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
 * Convert TemplateConfig to database format
 */
function templateConfigToDatabase(config: TemplateConfig, userId: string) {
  const templateData = {
    name: config.name,
    description: config.description,
    category: config.category,
    version: config.version
  }

  const canvasConfig = {
    width: config.canvas.width,
    height: config.canvas.height,
    backgroundColor: config.canvas.backgroundColor,
    backgroundImage: config.canvas.backgroundImage,
    showGrid: config.canvas.showGrid,
    snapToGrid: config.canvas.snapToGrid,
    gridSize: config.canvas.gridSize
  }

  return {
    name: config.name,
    description: config.description || null,
    thumbnail_url: null, // We'll generate this later
    is_default: false,
    is_public: false,
    created_by: userId,
    template_data: templateData,
    canvas_config: canvasConfig
  }
}

/**
 * Convert template elements to database format
 */
function elementsToDatabase(elements: any[], templateId: string) {
  return elements.map(element => ({
    template_id: templateId,
    element_type: element.type,
    content: element.content || null,
    position_x: element.position.x,
    position_y: element.position.y,
    width: element.size.width,
    height: element.size.height,
    rotation: element.rotation,
    z_index: element.zIndex,
    style_config: element.style
  }))
}

/**
 * Convert database format back to TemplateConfig
 */
function databaseToTemplateConfig(
  dbTemplate: DatabaseTemplate, 
  dbElements: DatabaseTemplateElement[]
): TemplateConfig {
  const elements = dbElements.map(el => ({
    id: el.id,
    type: el.element_type,
    content: el.content || '',
    position: { x: el.position_x, y: el.position_y },
    size: { width: el.width, height: el.height },
    rotation: el.rotation,
    zIndex: el.z_index,
    style: el.style_config
  }))

  return {
    id: dbTemplate.id,
    name: dbTemplate.template_data.name || dbTemplate.name,
    description: dbTemplate.template_data.description || dbTemplate.description || '',
    category: dbTemplate.template_data.category || 'custom',
    canvas: {
      width: dbTemplate.canvas_config.width,
      height: dbTemplate.canvas_config.height,
      backgroundColor: dbTemplate.canvas_config.backgroundColor,
      backgroundImage: dbTemplate.canvas_config.backgroundImage,
      showGrid: dbTemplate.canvas_config.showGrid,
      snapToGrid: dbTemplate.canvas_config.snapToGrid,
      gridSize: dbTemplate.canvas_config.gridSize
    },
    elements,
    version: dbTemplate.template_data.version || '1.0'
  }
}

/**
 * Convert database template to CustomTemplate format
 */
function databaseToCustomTemplate(
  dbTemplate: DatabaseTemplate, 
  dbElements: DatabaseTemplateElement[],
  type: CertificateType
): CustomTemplate {
  const templateConfig = databaseToTemplateConfig(dbTemplate, dbElements)
  
  // Extract colors for the template
  const extractPrimaryColor = (config: TemplateConfig): string => {
    const colors = config.elements
      .map(el => el.style.color)
      .filter(color => color && color !== 'transparent' && color !== '#000000')
    
    if (colors.length > 0) {
      return colors[0] || '#3B82F6'
    }
    
    const bg = config.canvas.backgroundColor
    if (bg === '#ffffff' || bg === 'white') {
      return '#3B82F6'
    }
    return bg
  }

  const extractSecondaryColor = (config: TemplateConfig): string => {
    const colors = config.elements
      .map(el => el.style.backgroundColor)
      .filter(color => color && color !== 'transparent' && color !== '#ffffff')
    
    if (colors.length > 0) {
      return colors[0] || '#1E40AF'
    }
    
    return '#1E40AF'
  }

  // Generate preview HTML
  const generatePreviewHtml = (config: TemplateConfig): string => {
    const { canvas, elements } = config
    const elementsCount = elements.length
    const hasText = elements.some(el => el.type === 'text')
    const hasPlaceholders = elements.some(el => el.type === 'placeholder')
    const hasShapes = elements.some(el => el.type === 'shape')
    
    return `
      <div style="
        width: 200px;
        height: 130px;
        background: ${canvas.backgroundColor};
        border: 2px solid #3B82F6;
        border-radius: 8px;
        padding: 12px;
        font-family: Arial, sans-serif;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      ">
        <div style="
          font-size: 12px;
          font-weight: bold;
          color: #3B82F6;
          margin-bottom: 4px;
        ">${config.name}</div>
        
        <div style="
          font-size: 8px;
          color: #666;
          margin-bottom: 6px;
        ">Custom Template</div>
        
        <div style="
          font-size: 7px;
          color: #888;
          line-height: 1.2;
        ">${elementsCount} elements</div>
        
        <div style="
          font-size: 6px;
          color: #aaa;
          margin-top: 4px;
        ">
          ${hasText ? '📝 ' : ''}${hasPlaceholders ? '🏷️ ' : ''}${hasShapes ? '⬜ ' : ''}
        </div>
        
        <div style="
          position: absolute;
          top: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          background: #3B82F6;
          opacity: 0.1;
          border-radius: 50%;
        "></div>
      </div>
    `
  }

  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    category: templateConfig.category.toLowerCase() as any,
    type: type,
    title: dbTemplate.description || dbTemplate.name,
    subtitle: 'Custom Template',
    description: dbTemplate.description || 'User-created custom template',
    backgroundColor: templateConfig.canvas.backgroundColor,
    primaryColor: extractPrimaryColor(templateConfig),
    secondaryColor: extractSecondaryColor(templateConfig),
    preview: generatePreviewHtml(templateConfig),
    isCustom: true as const,
    createdAt: dbTemplate.created_at,
    updatedAt: dbTemplate.updated_at,
    templateConfig: templateConfig
  }
}

/**
 * Save custom template to database
 */
export async function saveCustomTemplate(
  templateConfig: TemplateConfig, 
  type: CertificateType
): Promise<CustomTemplate> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const templateData = templateConfigToDatabase(templateConfig, user.id)

  // Start a transaction by saving the template first
  const { data: template, error: templateError } = await supabase
    .from('certificate_templates')
    .insert(templateData)
    .select()
    .single()

  if (templateError) {
    throw new Error(`Failed to save template: ${templateError.message}`)
  }

  // Save template elements
  const elementsData = elementsToDatabase(templateConfig.elements, template.id)
  
  if (elementsData.length > 0) {
    const { error: elementsError } = await supabase
      .from('template_elements')
      .insert(elementsData)

    if (elementsError) {
      // Clean up template if elements failed
      await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', template.id)
      
      throw new Error(`Failed to save template elements: ${elementsError.message}`)
    }
  }

  // Convert back to CustomTemplate format
  return databaseToCustomTemplate(template, [], type)
}

/**
 * Load custom templates from database
 */
export async function loadCustomTemplates(): Promise<CustomTemplate[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  // Load templates created by the current user
  const { data: templates, error: templatesError } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('created_by', user.id)
    .eq('is_default', false)
    .order('created_at', { ascending: false })

  if (templatesError) {
    console.error('Failed to load custom templates:', templatesError)
    return []
  }

  if (!templates || templates.length === 0) {
    return []
  }

  // Load elements for all templates
  const templateIds = templates.map(t => t.id)
  const { data: elements, error: elementsError } = await supabase
    .from('template_elements')
    .select('*')
    .in('template_id', templateIds)
    .order('z_index', { ascending: true })

  if (elementsError) {
    console.error('Failed to load template elements:', elementsError)
    return []
  }

  // Group elements by template_id
  const elementsMap = new Map<string, DatabaseTemplateElement[]>()
  elements?.forEach(element => {
    const existing = elementsMap.get(element.template_id) || []
    existing.push(element)
    elementsMap.set(element.template_id, existing)
  })

  // Convert to CustomTemplate format
  return templates.map(template => 
    databaseToCustomTemplate(template, elementsMap.get(template.id) || [], 'participant')
  )
}

/**
 * Update custom template in database
 */
export async function updateCustomTemplate(
  templateId: string,
  templateConfig: TemplateConfig,
  type: CertificateType
): Promise<CustomTemplate> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const templateData = templateConfigToDatabase(templateConfig, user.id)
  
  // Update the template
  const { data: template, error: templateError } = await supabase
    .from('certificate_templates')
    .update({
      ...templateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .eq('created_by', user.id) // Ensure user can only update their own templates
    .select()
    .single()

  if (templateError) {
    throw new Error(`Failed to update template: ${templateError.message}`)
  }

  // Delete existing elements
  const { error: deleteError } = await supabase
    .from('template_elements')
    .delete()
    .eq('template_id', templateId)

  if (deleteError) {
    throw new Error(`Failed to delete old template elements: ${deleteError.message}`)
  }

  // Insert new elements
  const elementsData = elementsToDatabase(templateConfig.elements, templateId)
  
  if (elementsData.length > 0) {
    const { error: elementsError } = await supabase
      .from('template_elements')
      .insert(elementsData)

    if (elementsError) {
      throw new Error(`Failed to save template elements: ${elementsError.message}`)
    }
  }

  return databaseToCustomTemplate(template, [], type)
}

/**
 * Delete custom template from database
 */
export async function deleteCustomTemplate(templateId: string): Promise<void> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Delete elements first (due to foreign key constraint)
  const { error: elementsError } = await supabase
    .from('template_elements')
    .delete()
    .eq('template_id', templateId)

  if (elementsError) {
    throw new Error(`Failed to delete template elements: ${elementsError.message}`)
  }

  // Delete the template
  const { error: templateError } = await supabase
    .from('certificate_templates')
    .delete()
    .eq('id', templateId)
    .eq('created_by', user.id) // Ensure user can only delete their own templates

  if (templateError) {
    throw new Error(`Failed to delete template: ${templateError.message}`)
  }
}

/**
 * Get custom template by ID
 */
export async function getCustomTemplate(templateId: string): Promise<CustomTemplate | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Load the template
  const { data: template, error: templateError } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('id', templateId)
    .eq('created_by', user.id)
    .single()

  if (templateError || !template) {
    return null
  }

  // Load template elements
  const { data: elements, error: elementsError } = await supabase
    .from('template_elements')
    .select('*')
    .eq('template_id', templateId)
    .order('z_index', { ascending: true })

  if (elementsError) {
    console.error('Failed to load template elements:', elementsError)
    return null
  }

  return databaseToCustomTemplate(template, elements || [], 'participant')
}