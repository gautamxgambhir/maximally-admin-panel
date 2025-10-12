import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  Type, 
  Square, 
  Image as ImageIcon, 
  QrCode,
  Plus,
  Trash2,
  Copy,
  Move,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Palette,
  Save,
  Eye,
  Undo,
  Redo,
  Grid,
  Layers,
  Settings,
  Download,
  Upload,
  MousePointer
} from 'lucide-react'
import { toast } from 'sonner'

// Types for template elements
export interface TemplateElement {
  id: string
  type: 'text' | 'placeholder' | 'image' | 'shape' | 'qr_code'
  content: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  zIndex: number
  style: {
    fontSize?: number
    fontFamily?: string
    fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
    fontStyle?: 'normal' | 'italic'
    textDecoration?: 'none' | 'underline' | 'line-through'
    textAlign?: 'left' | 'center' | 'right' | 'justify'
    color?: string
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
    opacity?: number
    padding?: number
  }
}

export interface CanvasConfig {
  width: number
  height: number
  backgroundColor: string
  backgroundImage?: string
  showGrid: boolean
  snapToGrid: boolean
  gridSize: number
}

export interface TemplateConfig {
  id?: string
  name: string
  description: string
  category: string
  canvas: CanvasConfig
  elements: TemplateElement[]
  version: string
}

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
  'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Palatino',
  'Garamond', 'Bookman', 'Avant Garde', 'Courier New'
]

const PLACEHOLDER_TYPES = [
  { value: 'participant_name', label: 'Participant Name' },
  { value: 'hackathon_name', label: 'Hackathon Name' },
  { value: 'position', label: 'Position/Achievement' },
  { value: 'date', label: 'Date' },
  { value: 'signature', label: 'Signature' },
  { value: 'organizer', label: 'Organizer' }
]

interface TemplateEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: TemplateConfig
  onSave: (template: TemplateConfig) => void
  onPreview?: (template: TemplateConfig) => void
}

export function TemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
  onPreview
}: TemplateEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [currentTemplate, setCurrentTemplate] = useState<TemplateConfig>(() => 
    template || {
      name: 'New Template',
      description: '',
      category: 'Custom',
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        showGrid: true,
        snapToGrid: true,
        gridSize: 20
      },
      elements: [],
      version: '1.0'
    }
  )
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [draggedElement, setDraggedElement] = useState<{ id: string; offset: { x: number; y: number } } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [history, setHistory] = useState<TemplateConfig[]>([currentTemplate])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('elements')

  // Update template when prop changes
  useEffect(() => {
    if (template) {
      setCurrentTemplate(template)
      setHistory([template])
      setHistoryIndex(0)
    }
  }, [template])

  // History management
  const addToHistory = useCallback((newTemplate: TemplateConfig) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ ...newTemplate })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      setCurrentTemplate(history[prevIndex])
      setHistoryIndex(prevIndex)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      setCurrentTemplate(history[nextIndex])
      setHistoryIndex(nextIndex)
    }
  }, [history, historyIndex])

  // Element management
  const addElement = (type: TemplateElement['type']) => {
    const newElement: TemplateElement = {
      id: `${type}_${Date.now()}`,
      type,
      content: type === 'placeholder' ? 'participant_name' : 
               type === 'text' ? 'Sample Text' :
               type === 'qr_code' ? 'verification_url' : '',
      position: { 
        x: 50 + (currentTemplate.elements.length * 20), 
        y: 50 + (currentTemplate.elements.length * 20) 
      },
      size: { 
        width: type === 'text' || type === 'placeholder' ? 200 : 100, 
        height: type === 'text' || type === 'placeholder' ? 40 : 100 
      },
      rotation: 0,
      zIndex: currentTemplate.elements.length,
      style: {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'left',
        backgroundColor: type === 'shape' ? '#f0f0f0' : 'transparent',
        borderColor: '#cccccc',
        borderWidth: 0,
        borderRadius: 0,
        opacity: 100,
        padding: 0
      }
    }

    const updated = {
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElement]
    }
    setCurrentTemplate(updated)
    addToHistory(updated)
    setSelectedElement(newElement.id)
  }

  const updateElement = (elementId: string, updates: Partial<TemplateElement>) => {
    const updated = {
      ...currentTemplate,
      elements: currentTemplate.elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    }
    setCurrentTemplate(updated)
  }

  const deleteElement = (elementId: string) => {
    const updated = {
      ...currentTemplate,
      elements: currentTemplate.elements.filter(el => el.id !== elementId)
    }
    setCurrentTemplate(updated)
    addToHistory(updated)
    if (selectedElement === elementId) {
      setSelectedElement(null)
    }
  }

  const duplicateElement = (elementId: string) => {
    const element = currentTemplate.elements.find(el => el.id === elementId)
    if (!element) return

    const newElement = {
      ...element,
      id: `${element.type}_${Date.now()}`,
      position: { 
        x: element.position.x + 20, 
        y: element.position.y + 20 
      },
      zIndex: currentTemplate.elements.length
    }

    const updated = {
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElement]
    }
    setCurrentTemplate(updated)
    addToHistory(updated)
    setSelectedElement(newElement.id)
  }

  // Canvas event handlers
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedElement(null)
    }
  }

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    const element = currentTemplate.elements.find(el => el.id === elementId)
    if (!element) return

    setSelectedElement(elementId)
    setIsDragging(true)
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const offsetX = e.clientX - rect.left - element.position.x
    const offsetY = e.clientY - rect.top - element.position.y
    
    setDraggedElement({ id: elementId, offset: { x: offsetX, y: offsetY } })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedElement) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const newX = e.clientX - rect.left - draggedElement.offset.x
    const newY = e.clientY - rect.top - draggedElement.offset.y

    let finalX = newX
    let finalY = newY

    // Snap to grid if enabled
    if (currentTemplate.canvas.snapToGrid) {
      const gridSize = currentTemplate.canvas.gridSize
      finalX = Math.round(finalX / gridSize) * gridSize
      finalY = Math.round(finalY / gridSize) * gridSize
    }

    // Keep within bounds
    finalX = Math.max(0, Math.min(finalX, currentTemplate.canvas.width - 50))
    finalY = Math.max(0, Math.min(finalY, currentTemplate.canvas.height - 50))

    updateElement(draggedElement.id, {
      position: { x: finalX, y: finalY }
    })
  }, [isDragging, draggedElement, currentTemplate.canvas, updateElement])

  const handleMouseUp = useCallback(() => {
    if (isDragging && draggedElement) {
      addToHistory(currentTemplate)
    }
    setIsDragging(false)
    setDraggedElement(null)
  }, [isDragging, draggedElement, currentTemplate, addToHistory])

  // Mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Render grid
  const renderGrid = () => {
    if (!currentTemplate.canvas.showGrid) return null

    const gridSize = currentTemplate.canvas.gridSize
    const lines = []
    
    // Vertical lines
    for (let x = 0; x <= currentTemplate.canvas.width; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={currentTemplate.canvas.height}
          stroke="#e0e0e0"
          strokeWidth="1"
        />
      )
    }
    
    // Horizontal lines
    for (let y = 0; y <= currentTemplate.canvas.height; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={currentTemplate.canvas.width}
          y2={y}
          stroke="#e0e0e0"
          strokeWidth="1"
        />
      )
    }

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        width={currentTemplate.canvas.width}
        height={currentTemplate.canvas.height}
      >
        {lines}
      </svg>
    )
  }

  // Render element
  const renderElement = (element: TemplateElement) => {
    const isSelected = selectedElement === element.id
    const style: React.CSSProperties = {
      position: 'absolute',
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      transform: `rotate(${element.rotation}deg)`,
      zIndex: element.zIndex,
      cursor: isDragging ? 'grabbing' : 'grab',
      opacity: (element.style.opacity || 100) / 100,
      ...element.style
    }

    const baseClasses = `select-none ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            className={baseClasses}
            style={style}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <div
              className="w-full h-full flex items-center"
              style={{
                fontSize: element.style.fontSize || 16,
                fontFamily: element.style.fontFamily || 'Arial',
                fontWeight: element.style.fontWeight || 'normal',
                fontStyle: element.style.fontStyle || 'normal',
                textDecoration: element.style.textDecoration || 'none',
                textAlign: element.style.textAlign || 'left',
                color: element.style.color || '#000000',
                backgroundColor: element.style.backgroundColor || 'transparent',
                border: element.style.borderWidth ? 
                  `${element.style.borderWidth}px solid ${element.style.borderColor || '#cccccc'}` : 'none',
                borderRadius: element.style.borderRadius || 0,
                padding: element.style.padding || 0,
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {element.content}
            </div>
          </div>
        )
      
      case 'placeholder':
        const placeholderLabel = PLACEHOLDER_TYPES.find(p => p.value === element.content)?.label || element.content
        return (
          <div
            key={element.id}
            className={`${baseClasses} border-2 border-dashed border-blue-400 bg-blue-50`}
            style={style}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                fontSize: element.style.fontSize || 16,
                fontFamily: element.style.fontFamily || 'Arial',
                fontWeight: element.style.fontWeight || 'normal',
                color: '#3b82f6'
              }}
            >
              {`{${placeholderLabel}}`}
            </div>
          </div>
        )
      
      case 'shape':
        return (
          <div
            key={element.id}
            className={baseClasses}
            style={style}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundColor: element.style.backgroundColor || '#f0f0f0',
                border: element.style.borderWidth ? 
                  `${element.style.borderWidth}px solid ${element.style.borderColor || '#cccccc'}` : 'none',
                borderRadius: element.style.borderRadius || 0
              }}
            />
          </div>
        )
      
      case 'qr_code':
        return (
          <div
            key={element.id}
            className={`${baseClasses} border border-gray-300 bg-white flex items-center justify-center`}
            style={style}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <QrCode className="h-8 w-8 text-gray-400" />
            <span className="ml-2 text-xs text-gray-500">QR Code</span>
          </div>
        )
      
      case 'image':
        return (
          <div
            key={element.id}
            className={`${baseClasses} overflow-hidden`}
            style={style}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            {element.content ? (
              <img 
                src={element.content} 
                alt="Template image"
                className="w-full h-full object-cover"
                style={{
                  borderRadius: element.style.borderRadius || 0,
                  border: element.style.borderWidth ? 
                    `${element.style.borderWidth}px solid ${element.style.borderColor || '#cccccc'}` : 'none',
                }}
              />
            ) : (
              <div className="w-full h-full border border-gray-300 bg-gray-100 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <span className="ml-2 text-xs text-gray-500">Image</span>
              </div>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  const selectedEl = currentTemplate.elements.find(el => el.id === selectedElement)

  const handleSave = () => {
    if (!currentTemplate.name.trim()) {
      toast.error('Please enter a template name')
      return
    }

    onSave(currentTemplate)
    toast.success('Template saved successfully!')
  }

  const handlePreview = () => {
    // Generate preview HTML from current template
    const previewHtml = generatePreviewHtml(currentTemplate)
    
    // Open preview in a new window
    const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Template Preview - ${currentTemplate.name}</title>
          <style>
            body { margin: 0; padding: 20px; background: #f0f0f0; font-family: Arial, sans-serif; }
            .preview-container { display: flex; justify-content: center; }
            .certificate { position: relative; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <div class="preview-container">
            <div class="certificate">
              ${previewHtml}
            </div>
          </div>
        </body>
        </html>
      `)
      previewWindow.document.close()
    }
    
    if (onPreview) {
      onPreview(currentTemplate)
    }
  }

  const generatePreviewHtml = (template: TemplateConfig) => {
    const { canvas, elements } = template
    
    // Sample data for preview
    const sampleData = {
      participant_name: 'John Doe',
      hackathon_name: 'AI Innovation Challenge 2024',
      position: '1st Place',
      date: new Date().toLocaleDateString(),
      signature: 'Organizer',
      organizer: 'Maximally',
      verification_url: 'https://maximally.in/certificates/verify/CERT-ABC123'
    }
    
    const elementsHtml = elements
      .sort((a, b) => a.zIndex - b.zIndex)
      .map(element => {
        const style = `
          position: absolute;
          left: ${element.position.x}px;
          top: ${element.position.y}px;
          width: ${element.size.width}px;
          height: ${element.size.height}px;
          transform: rotate(${element.rotation}deg);
          z-index: ${element.zIndex};
          opacity: ${(element.style.opacity || 100) / 100};
          font-size: ${element.style.fontSize || 16}px;
          font-family: ${element.style.fontFamily || 'Arial'};
          font-weight: ${element.style.fontWeight || 'normal'};
          font-style: ${element.style.fontStyle || 'normal'};
          text-decoration: ${element.style.textDecoration || 'none'};
          text-align: ${element.style.textAlign || 'left'};
          color: ${element.style.color || '#000000'};
          background-color: ${element.style.backgroundColor || 'transparent'};
          border: ${element.style.borderWidth ? `${element.style.borderWidth}px solid ${element.style.borderColor || '#cccccc'}` : 'none'};
          border-radius: ${element.style.borderRadius || 0}px;
          padding: ${element.style.padding || 0}px;
          display: flex;
          align-items: center;
          justify-content: ${element.style.textAlign === 'center' ? 'center' : element.style.textAlign === 'right' ? 'flex-end' : 'flex-start'};
        `
        
        let content = element.content
        if (element.type === 'placeholder') {
          content = sampleData[element.content as keyof typeof sampleData] || `{${element.content}}`
        } else if (element.type === 'qr_code') {
          content = '[QR Code: Verification URL]'
        }
        
        return `<div style="${style}">${content}</div>`
      })
      .join('')
    
    return `
      <div style="
        position: relative;
        width: ${canvas.width}px;
        height: ${canvas.height}px;
        background-color: ${canvas.backgroundColor};
        ${canvas.backgroundImage ? `background-image: url(${canvas.backgroundImage});` : ''}
        background-size: cover;
        background-position: center;
      ">
        ${elementsHtml}
      </div>
    `
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Template Editor - {currentTemplate.name}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Design your custom certificate template with drag-and-drop elements
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1" style={{ height: 'calc(95vh - 120px)' }}>
          {/* Left Sidebar */}
          <div className="w-80 border-r bg-gray-50 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="elements">Elements</TabsTrigger>
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="canvas">Canvas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="elements" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Add Elements</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => addElement('text')}
                      className="flex flex-col h-16 text-xs"
                    >
                      <Type className="h-5 w-5 mb-1" />
                      Text
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addElement('placeholder')}
                      className="flex flex-col h-16 text-xs"
                    >
                      <MousePointer className="h-5 w-5 mb-1" />
                      Placeholder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addElement('shape')}
                      className="flex flex-col h-16 text-xs"
                    >
                      <Square className="h-5 w-5 mb-1" />
                      Shape
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addElement('qr_code')}
                      className="flex flex-col h-16 text-xs"
                    >
                      <QrCode className="h-5 w-5 mb-1" />
                      QR Code
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addElement('image')}
                      className="flex flex-col h-16 text-xs"
                    >
                      <ImageIcon className="h-5 w-5 mb-1" />
                      Image
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Layers</h3>
                  <div className="space-y-1">
                    {currentTemplate.elements
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((element) => (
                        <div
                          key={element.id}
                          className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer ${
                            selectedElement === element.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => setSelectedElement(element.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            <span>{element.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {element.zIndex}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                duplicateElement(element.id)
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteElement(element.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {currentTemplate.elements.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No elements yet. Add some elements to get started.
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </TabsContent>

              <TabsContent value="properties" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-4 space-y-4">
                {selectedEl ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">Element Properties</h3>
                    
                    {/* Content */}
                    <div className="space-y-2">
                      <Label>Content</Label>
                      {selectedEl.type === 'placeholder' ? (
                        <Select
                          value={selectedEl.content}
                          onValueChange={(value) => updateElement(selectedEl.id, { content: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLACEHOLDER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : selectedEl.type === 'text' ? (
                        <Textarea
                          value={selectedEl.content}
                          onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                          rows={3}
                        />
                      ) : selectedEl.type === 'image' ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={selectedEl.content}
                              onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                              placeholder="Enter image URL or upload file"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.createElement('input')
                                input.type = 'file'
                                input.accept = 'image/*'
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0]
                                  if (file) {
                                    const reader = new FileReader()
                                    reader.onload = (e) => {
                                      const result = e.target?.result as string
                                      updateElement(selectedEl.id, { content: result })
                                    }
                                    reader.readAsDataURL(file)
                                  }
                                }
                                input.click()
                              }}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          </div>
                          {selectedEl.content && (
                            <div className="text-xs text-gray-500">
                              Image preview: {selectedEl.content.length > 50 ? selectedEl.content.substring(0, 50) + '...' : selectedEl.content}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Position & Size */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">X Position</Label>
                        <Input
                          type="number"
                          value={selectedEl.position.x}
                          onChange={(e) => updateElement(selectedEl.id, {
                            position: { ...selectedEl.position, x: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y Position</Label>
                        <Input
                          type="number"
                          value={selectedEl.position.y}
                          onChange={(e) => updateElement(selectedEl.id, {
                            position: { ...selectedEl.position, y: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input
                          type="number"
                          value={selectedEl.size.width}
                          onChange={(e) => updateElement(selectedEl.id, {
                            size: { ...selectedEl.size, width: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input
                          type="number"
                          value={selectedEl.size.height}
                          onChange={(e) => updateElement(selectedEl.id, {
                            size: { ...selectedEl.size, height: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                    </div>

                    {/* Rotation */}
                    <div className="space-y-2">
                      <Label>Rotation</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[selectedEl.rotation]}
                          onValueChange={([value]) => updateElement(selectedEl.id, {
                            rotation: value
                          })}
                          min={-180}
                          max={180}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm w-12">{selectedEl.rotation}°</span>
                      </div>
                    </div>

                    {/* Typography (for text elements) */}
                    {(selectedEl.type === 'text' || selectedEl.type === 'placeholder') && (
                      <>
                        <div className="space-y-2">
                          <Label>Font Family</Label>
                          <Select
                            value={selectedEl.style.fontFamily || 'Arial'}
                            onValueChange={(value) => updateElement(selectedEl.id, {
                              style: { ...selectedEl.style, fontFamily: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONT_FAMILIES.map((font) => (
                                <SelectItem key={font} value={font}>
                                  {font}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Font Size</Label>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[selectedEl.style.fontSize || 16]}
                              onValueChange={([value]) => updateElement(selectedEl.id, {
                                style: { ...selectedEl.style, fontSize: value }
                              })}
                              min={8}
                              max={72}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-sm w-8">{selectedEl.style.fontSize || 16}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Text Style</Label>
                          <div className="flex gap-1">
                            <Button
                              variant={selectedEl.style.fontWeight === 'bold' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(selectedEl.id, {
                                style: { 
                                  ...selectedEl.style, 
                                  fontWeight: selectedEl.style.fontWeight === 'bold' ? 'normal' : 'bold'
                                }
                              })}
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={selectedEl.style.fontStyle === 'italic' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(selectedEl.id, {
                                style: { 
                                  ...selectedEl.style, 
                                  fontStyle: selectedEl.style.fontStyle === 'italic' ? 'normal' : 'italic'
                                }
                              })}
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={selectedEl.style.textDecoration === 'underline' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateElement(selectedEl.id, {
                                style: { 
                                  ...selectedEl.style, 
                                  textDecoration: selectedEl.style.textDecoration === 'underline' ? 'none' : 'underline'
                                }
                              })}
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Text Alignment</Label>
                          <div className="flex gap-1">
                            {[
                              { value: 'left', icon: AlignLeft },
                              { value: 'center', icon: AlignCenter },
                              { value: 'right', icon: AlignRight }
                            ].map(({ value, icon: Icon }) => (
                              <Button
                                key={value}
                                variant={selectedEl.style.textAlign === value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateElement(selectedEl.id, {
                                  style: { ...selectedEl.style, textAlign: value as any }
                                })}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Colors */}
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedEl.style.color || '#000000'}
                          onChange={(e) => updateElement(selectedEl.id, {
                            style: { ...selectedEl.style, color: e.target.value }
                          })}
                          className="w-16 h-8 p-1 rounded"
                        />
                        <Input
                          type="text"
                          value={selectedEl.style.color || '#000000'}
                          onChange={(e) => updateElement(selectedEl.id, {
                            style: { ...selectedEl.style, color: e.target.value }
                          })}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedEl.style.backgroundColor || '#ffffff'}
                          onChange={(e) => updateElement(selectedEl.id, {
                            style: { ...selectedEl.style, backgroundColor: e.target.value }
                          })}
                          className="w-16 h-8 p-1 rounded"
                        />
                        <Input
                          type="text"
                          value={selectedEl.style.backgroundColor || '#ffffff'}
                          onChange={(e) => updateElement(selectedEl.id, {
                            style: { ...selectedEl.style, backgroundColor: e.target.value }
                          })}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* Border */}
                    <div className="space-y-2">
                      <Label>Border</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={selectedEl.style.borderWidth || 0}
                            onChange={(e) => updateElement(selectedEl.id, {
                              style: { ...selectedEl.style, borderWidth: parseInt(e.target.value) || 0 }
                            })}
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Radius</Label>
                          <Input
                            type="number"
                            value={selectedEl.style.borderRadius || 0}
                            onChange={(e) => updateElement(selectedEl.id, {
                              style: { ...selectedEl.style, borderRadius: parseInt(e.target.value) || 0 }
                            })}
                            min="0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Border Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selectedEl.style.borderColor || '#cccccc'}
                            onChange={(e) => updateElement(selectedEl.id, {
                              style: { ...selectedEl.style, borderColor: e.target.value }
                            })}
                            className="w-16 h-8 p-1 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Opacity & Z-Index */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Opacity</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[selectedEl.style.opacity || 100]}
                            onValueChange={([value]) => updateElement(selectedEl.id, {
                              style: { ...selectedEl.style, opacity: value }
                            })}
                            min={0}
                            max={100}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-sm w-8">{selectedEl.style.opacity || 100}%</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Layer</Label>
                        <Input
                          type="number"
                          value={selectedEl.zIndex}
                          onChange={(e) => updateElement(selectedEl.id, {
                            zIndex: parseInt(e.target.value) || 0
                          })}
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateElement(selectedEl.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteElement(selectedEl.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Select an element to edit its properties
                  </div>
                )}
                </div>
              </TabsContent>

              <TabsContent value="canvas" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-4 space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={currentTemplate.name}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        name: e.target.value
                      })}
                      placeholder="Enter template name"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={currentTemplate.description}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        description: e.target.value
                      })}
                      placeholder="Enter template description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select
                      value={currentTemplate.category}
                      onValueChange={(value) => setCurrentTemplate({
                        ...currentTemplate,
                        category: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                        <SelectItem value="awards">Awards</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="elegant">Elegant</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Canvas Width</Label>
                      <Input
                        type="number"
                        value={currentTemplate.canvas.width}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          canvas: {
                            ...currentTemplate.canvas,
                            width: parseInt(e.target.value) || 800
                          }
                        })}
                        min="100"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Canvas Height</Label>
                      <Input
                        type="number"
                        value={currentTemplate.canvas.height}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          canvas: {
                            ...currentTemplate.canvas,
                            height: parseInt(e.target.value) || 600
                          }
                        })}
                        min="100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={currentTemplate.canvas.backgroundColor}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          canvas: {
                            ...currentTemplate.canvas,
                            backgroundColor: e.target.value
                          }
                        })}
                        className="w-16 h-8 p-1 rounded"
                      />
                      <Input
                        type="text"
                        value={currentTemplate.canvas.backgroundColor}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          canvas: {
                            ...currentTemplate.canvas,
                            backgroundColor: e.target.value
                          }
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Background Image</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={currentTemplate.canvas.backgroundImage || ''}
                          onChange={(e) => setCurrentTemplate({
                            ...currentTemplate,
                            canvas: {
                              ...currentTemplate.canvas,
                              backgroundImage: e.target.value || undefined
                            }
                          })}
                          placeholder="Enter image URL or upload file"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onload = (e) => {
                                  const result = e.target?.result as string
                                  setCurrentTemplate({
                                    ...currentTemplate,
                                    canvas: {
                                      ...currentTemplate.canvas,
                                      backgroundImage: result
                                    }
                                  })
                                }
                                reader.readAsDataURL(file)
                              }
                            }
                            input.click()
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                      {currentTemplate.canvas.backgroundImage && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentTemplate({
                              ...currentTemplate,
                              canvas: {
                                ...currentTemplate.canvas,
                                backgroundImage: undefined
                              }
                            })}
                          >
                            Remove Background
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showGrid"
                        checked={currentTemplate.canvas.showGrid}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          canvas: {
                            ...currentTemplate.canvas,
                            showGrid: e.target.checked
                          }
                        })}
                      />
                      <Label htmlFor="showGrid">Show Grid</Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="snapToGrid"
                        checked={currentTemplate.canvas.snapToGrid}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          canvas: {
                            ...currentTemplate.canvas,
                            snapToGrid: e.target.checked
                          }
                        })}
                      />
                      <Label htmlFor="snapToGrid">Snap to Grid</Label>
                    </div>

                    <div>
                      <Label className="text-xs">Grid Size</Label>
                      <Input
                        type="number"
                        value={currentTemplate.canvas.gridSize}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          canvas: {
                            ...currentTemplate.canvas,
                            gridSize: parseInt(e.target.value) || 20
                          }
                        })}
                        min="5"
                        max="50"
                      />
                    </div>
                  </div>
                </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4" style={{ maxHeight: 'calc(95vh - 120px)' }}>
            <div className="flex items-center justify-center min-h-full">
              <div
                ref={canvasRef}
                className="relative border-2 border-gray-300 shadow-lg cursor-crosshair"
                style={{
                  width: currentTemplate.canvas.width,
                  height: currentTemplate.canvas.height,
                  backgroundColor: currentTemplate.canvas.backgroundColor,
                  backgroundImage: currentTemplate.canvas.backgroundImage ? `url(${currentTemplate.canvas.backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
                onClick={handleCanvasClick}
              >
                {renderGrid()}
                {currentTemplate.elements.map(renderElement)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}