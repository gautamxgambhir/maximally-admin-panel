import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Palette, Check, Search, Filter, Plus, Upload, Pencil, Settings, Star, Eye, Trash2, Edit } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  CERTIFICATE_TEMPLATE_GALLERY,
  ALL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  type ExtendedCertificateTemplate
} from '@/lib/certificateTemplates'
import { TemplateEditor, type TemplateConfig } from './TemplateEditor'
import { useCustomTemplates, type CustomTemplate } from '@/hooks/useCustomTemplates'
import type { CertificateType } from '@/types/certificate'

interface TemplateGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificateType: CertificateType
  onTemplateSelect: (template: ExtendedCertificateTemplate) => void
  selectedTemplateId?: string
  onCreateCustomTemplate?: () => void
  customTemplates?: ExtendedCertificateTemplate[]
  onEditCustomTemplate?: (template: ExtendedCertificateTemplate) => void
  onDeleteCustomTemplate?: (templateId: string) => void
}

export function TemplateGallery({
  open,
  onOpenChange,
  certificateType,
  onTemplateSelect,
  selectedTemplateId,
  onCreateCustomTemplate,
  customTemplates: propsCustomTemplates = [],
  onEditCustomTemplate,
  onDeleteCustomTemplate
}: TemplateGalleryProps) {
  // Use custom templates hook for saving templates from editor and getting all templates
  const { customTemplates, saveCustomTemplate, deleteCustomTemplate: deleteFromHook } = useCustomTemplates()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<CertificateType>(certificateType)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ExtendedCertificateTemplate | CustomTemplate | null>(null)
  const [templateMode, setTemplateMode] = useState<'builtin' | 'custom'>('builtin')

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates: ExtendedCertificateTemplate[] = []
    
    if (templateMode === 'builtin') {
      templates = CERTIFICATE_TEMPLATE_GALLERY[activeTab] || []
    } else {
      // Show custom templates for the active certificate type
      templates = customTemplates.filter(t => t.type === activeTab)
    }

    if (searchQuery) {
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      templates = templates.filter(template => 
        template.category === selectedCategory
      )
    }

    return templates
  }, [activeTab, searchQuery, selectedCategory, certificateType, templateMode, customTemplates])

  const handleTemplateSelect = (template: ExtendedCertificateTemplate) => {
    onTemplateSelect(template)
    onOpenChange(false)
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setShowTemplateEditor(true)
  }

  const handleEditTemplate = (template: ExtendedCertificateTemplate | CustomTemplate) => {
    setEditingTemplate(template)
    setShowTemplateEditor(true)
  }

  const handleSaveTemplate = async (templateConfig: TemplateConfig) => {
    try {
      // Save the template using the custom templates hook
      await saveCustomTemplate(templateConfig, activeTab)
      setShowTemplateEditor(false)
      setEditingTemplate(null)
      // The template should now appear in custom templates
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteFromHook(templateId)
    // Also call prop callback if provided
    if (onDeleteCustomTemplate) {
      onDeleteCustomTemplate(templateId)
    }
  }

  const getCategoryStats = (category: string) => {
    let templates: ExtendedCertificateTemplate[] = []
    
    if (templateMode === 'builtin') {
      templates = CERTIFICATE_TEMPLATE_GALLERY[activeTab] || []
    } else {
      templates = customTemplates.filter(t => t.type === activeTab)
    }
    
    if (category === 'all') {
      return templates.length
    }
    return templates.filter(t => t.category === category).length
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Certificate Template Gallery
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTemplate}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              {onCreateCustomTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateCustomTemplate}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Template
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Choose a template design for your certificate. Each template can be customized with your content.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Template Mode Selector */}
          <div className="mb-6">
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
              <Button
                variant={templateMode === 'builtin' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTemplateMode('builtin')}
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Built-in Templates
                <Badge variant="secondary" className="text-xs">
                  {Object.values(CERTIFICATE_TEMPLATE_GALLERY).flat().length}
                </Badge>
              </Button>
              <Button
                variant={templateMode === 'custom' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTemplateMode('custom')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Custom Templates
                <Badge variant="secondary" className="text-xs">
                  {customTemplates.length}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Categories ({getCategoryStats('all')})
                </SelectItem>
                {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
                  <SelectItem key={key} value={key}>
                    {category.icon} {category.name} ({getCategoryStats(key)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Certificate Type Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CertificateType)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="winner" className="flex items-center gap-2">
                🏆 Winners
              </TabsTrigger>
              <TabsTrigger value="participant" className="flex items-center gap-2">
                👥 Participants
              </TabsTrigger>
              <TabsTrigger value="judge" className="flex items-center gap-2">
                ⚖️ Judges
              </TabsTrigger>
            </TabsList>

            {(['winner', 'participant', 'judge'] as CertificateType[]).map((type) => (
              <TabsContent key={type} value={type} className="mt-0">
                {/* Category Info */}
                {selectedCategory !== 'all' && TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES] && (
                  <Card className="mb-6 bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl">
                          {TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES].icon}
                        </span>
                        {TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES].name} Templates
                      </CardTitle>
                      <CardDescription>
                        {TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES].description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {/* Templates Grid */}
                {filteredTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`transition-all duration-200 hover:shadow-lg ${
                          selectedTemplateId === template.id 
                            ? 'ring-2 ring-blue-500 shadow-lg' 
                            : 'hover:shadow-md'
                        } ${templateMode === 'custom' ? 'relative group' : ''}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {template.name}
                                {selectedTemplateId === template.id && (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </CardTitle>
                              <CardDescription>{template.title}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {TEMPLATE_CATEGORIES[template.category]?.icon || '📄'} {TEMPLATE_CATEGORIES[template.category]?.name || template.category}
                              </Badge>
                              {templateMode === 'custom' && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditTemplate(template)
                                    }}
                                    title="Edit Template"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (confirm('Are you sure you want to delete this template?')) {
                                        handleDeleteTemplate(template.id)
                                      }
                                    }}
                                    title="Delete Template"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          {/* Template Preview */}
                          <div 
                            className="mb-4 flex justify-center cursor-pointer"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <div 
                              dangerouslySetInnerHTML={{ __html: template.preview }}
                              className="transform scale-90 hover:scale-95 transition-transform duration-200"
                            />
                          </div>
                          
                          {/* Template Description */}
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {template.description}
                          </p>
                          
                          {/* Color Indicators */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Colors:</span>
                            <div className="flex gap-1">
                              <div 
                                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: template.primaryColor }}
                                title={`Primary: ${template.primaryColor}`}
                              />
                              <div 
                                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: template.secondaryColor }}
                                title={`Secondary: ${template.secondaryColor}`}
                              />
                              <div 
                                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: template.backgroundColor }}
                                title={`Background: ${template.backgroundColor}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      {templateMode === 'custom' ? (
                        <>
                          <Settings className="h-12 w-12 opacity-50" />
                          <h3 className="text-lg font-medium">No custom templates yet</h3>
                          <p className="text-sm">
                            {searchQuery || selectedCategory !== 'all'
                              ? 'No custom templates match your criteria.'
                              : 'Create your first custom template to get started.'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleCreateTemplate}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Template
                            </Button>
                            {onCreateCustomTemplate && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={onCreateCustomTemplate}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Template
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <Search className="h-12 w-12 opacity-50" />
                          <h3 className="text-lg font-medium">No templates found</h3>
                          <p className="text-sm">
                            {searchQuery || selectedCategory !== 'all'
                              ? 'Try adjusting your search or filter criteria.'
                              : 'No templates available for this category.'}
                          </p>
                        </>
                      )}
                      {(searchQuery || selectedCategory !== 'all') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSearchQuery('')
                            setSelectedCategory('all')
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Template Editor */}
      <TemplateEditor
        open={showTemplateEditor}
        onOpenChange={setShowTemplateEditor}
        template={editingTemplate ? (
          // Check if it's a custom template with stored templateConfig
          'templateConfig' in editingTemplate && editingTemplate.templateConfig
            ? editingTemplate.templateConfig
            : {
                id: editingTemplate.id,
                name: editingTemplate.name,
                description: editingTemplate.description || '',
                category: editingTemplate.category,
                canvas: {
                  width: 800,
                  height: 600,
                  backgroundColor: editingTemplate.backgroundColor || '#ffffff',
                  showGrid: true,
                  snapToGrid: true,
                  gridSize: 20
                },
                elements: [],
                version: '1.0'
              }
        ) : undefined}
        onSave={handleSaveTemplate}
      />
    </Dialog>
  )
}
