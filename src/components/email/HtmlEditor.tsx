import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Code } from 'lucide-react'

interface HtmlEditorProps {
  value: string
  onChange: (value: string) => void
  placeholders?: string[]
}

export function HtmlEditor({ value, onChange, placeholders = [] }: HtmlEditorProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const [searchTerm, setSearchTerm] = useState('')

  const insertHtmlSnippet = (snippet: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const before = text.substring(0, start)
      const after = text.substring(end)
      const newText = before + '\n' + snippet + '\n' + after
      onChange(newText)
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + snippet.length + 2, start + snippet.length + 2)
      }, 0)
    } else {
      onChange(value + '\n' + snippet)
    }
  }

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const before = text.substring(0, start)
      const after = text.substring(end)
      const newText = before + `{{${placeholder}}}` + after
      onChange(newText)
      
      setTimeout(() => {
        textarea.focus()
        const newPos = start + placeholder.length + 4
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    } else {
      onChange(value + `{{${placeholder}}}`)
    }
  }

  const htmlSnippets = [
    {
      name: 'Pixel Box',
      description: 'Red bordered container',
      code: '<div class="pixel-box">\n  <h2>Title Here</h2>\n  <p>Your content goes here</p>\n</div>'
    },
    {
      name: 'Detail Row',
      description: 'Label-value pair',
      code: '<div class="detail-row">\n  <span class="detail-label">Label:</span> Value\n</div>'
    },
    {
      name: 'Button',
      description: 'Red CTA button',
      code: '<a href="{{link}}" class="button">Click Here</a>'
    },
    {
      name: 'Step',
      description: 'Numbered step item',
      code: '<div class="step">\n  <span class="step-number">1</span>\n  Step description here\n</div>'
    },
    {
      name: 'Winner Row',
      description: 'Winner announcement',
      code: '<div class="winner">\n  <span class="winner-place">1st</span>\n  <strong>Winner Name</strong>\n</div>'
    },
    {
      name: 'Checklist Item',
      description: 'Item with checkmark',
      code: '<div class="checklist">Checklist item text</div>'
    },
    {
      name: 'Highlight',
      description: 'Highlighted feature',
      code: '<div class="highlight">Feature or benefit text</div>'
    }
  ]

  const filteredSnippets = searchTerm
    ? htmlSnippets.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : htmlSnippets

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'preview')}>
        <TabsList>
          <TabsTrigger value="code" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            HTML Code
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-4">
          {/* Quick Insert Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Quick Insert HTML Components:</p>
              <Input
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 h-8"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {filteredSnippets.map((snippet) => (
                <Button
                  key={snippet.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertHtmlSnippet(snippet.code)}
                  className="flex flex-col h-auto py-2 items-start"
                  title={snippet.description}
                >
                  <span className="font-medium">{snippet.name}</span>
                  <span className="text-xs text-muted-foreground">{snippet.description}</span>
                </Button>
              ))}
            </div>
            {placeholders.length > 0 && (
              <>
                <p className="text-sm font-medium mt-4">Insert Placeholders:</p>
                <p className="text-xs text-muted-foreground">Click to insert at cursor position</p>
                <div className="flex flex-wrap gap-2">
                  {placeholders.map((placeholder) => (
                    <Button
                      key={placeholder}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => insertPlaceholder(placeholder)}
                      className="font-mono"
                    >
                      {`{{${placeholder}}}`}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* HTML Editor */}
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter HTML code here..."
            rows={20}
            className="font-mono text-sm"
          />

          {/* Style Guide */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-medium">Maximally Style Classes</summary>
            <div className="mt-4 space-y-2 text-sm">
              <p><code className="bg-secondary px-2 py-1 rounded">.pixel-box</code> - Red bordered box with dark background</p>
              <p><code className="bg-secondary px-2 py-1 rounded">.detail-row</code> - Row with label and value</p>
              <p><code className="bg-secondary px-2 py-1 rounded">.detail-label</code> - Red label text</p>
              <p><code className="bg-secondary px-2 py-1 rounded">.button</code> - Red button with black text</p>
              <p><code className="bg-secondary px-2 py-1 rounded">.step</code> - Numbered step item</p>
              <p><code className="bg-secondary px-2 py-1 rounded">.step-number</code> - Red numbered badge</p>
              <p><code className="bg-secondary px-2 py-1 rounded">.winner</code> - Winner announcement row</p>
              <p><code className="bg-secondary px-2 py-1 rounded">.checklist</code> - Checklist item with checkmark</p>
            </div>
          </details>
        </TabsContent>

        <TabsContent value="preview">
          <div className="border rounded-lg p-4 bg-black min-h-[400px]">
            <iframe
              srcDoc={value}
              className="w-full h-[600px] border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
