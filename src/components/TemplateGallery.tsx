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
import { Palette, Check, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  CERTIFICATE_TEMPLATE_GALLERY,
  ALL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  type ExtendedCertificateTemplate
} from '@/lib/certificateTemplates'
import type { CertificateType } from '@/types/certificate'

interface TemplateGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificateType: CertificateType
  onTemplateSelect: (template: ExtendedCertificateTemplate) => void
  selectedTemplateId?: string
}

export function TemplateGallery({
  open,
  onOpenChange,
  certificateType,
  onTemplateSelect,
  selectedTemplateId
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<CertificateType>(certificateType)

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates = activeTab === certificateType 
      ? CERTIFICATE_TEMPLATE_GALLERY[activeTab]
      : []

    if (searchQuery) {
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      templates = templates.filter(template => 
        template.category === selectedCategory
      )
    }

    return templates
  }, [activeTab, searchQuery, selectedCategory, certificateType])

  const handleTemplateSelect = (template: ExtendedCertificateTemplate) => {
    onTemplateSelect(template)
    onOpenChange(false)
  }

  const getCategoryStats = (category: string) => {
    if (category === 'all') {
      return CERTIFICATE_TEMPLATE_GALLERY[activeTab].length
    }
    return CERTIFICATE_TEMPLATE_GALLERY[activeTab].filter(t => t.category === category).length
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Certificate Template Gallery
          </DialogTitle>
          <DialogDescription>
            Choose a template design for your certificate. Each template can be customized with your content.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
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
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                          selectedTemplateId === template.id 
                            ? 'ring-2 ring-blue-500 shadow-lg' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {template.name}
                                {selectedTemplateId === template.id && (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </CardTitle>
                              <CardDescription>{template.title}</CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {TEMPLATE_CATEGORIES[template.category].icon} {TEMPLATE_CATEGORIES[template.category].name}
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          {/* Template Preview */}
                          <div className="mb-4 flex justify-center">
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
                      <Search className="h-12 w-12 opacity-50" />
                      <h3 className="text-lg font-medium">No templates found</h3>
                      <p className="text-sm">
                        {searchQuery || selectedCategory !== 'all'
                          ? 'Try adjusting your search or filter criteria.'
                          : 'No templates available for this category.'}
                      </p>
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
    </Dialog>
  )
}