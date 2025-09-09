import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface MarkdownCheatSheetProps {
  onClose: () => void
}

export function MarkdownCheatSheet({ onClose }: MarkdownCheatSheetProps) {
  const cheatSheetItems = [
    {
      category: 'Headers',
      items: [
        { syntax: '# H1', description: 'Main heading' },
        { syntax: '## H2', description: 'Section heading' },
        { syntax: '### H3', description: 'Subsection heading' },
      ]
    },
    {
      category: 'Text Formatting',
      items: [
        { syntax: '**bold text**', description: 'Bold text' },
        { syntax: '*italic text*', description: 'Italic text' },
        { syntax: '***bold and italic***', description: 'Bold and italic' },
        { syntax: '`inline code`', description: 'Inline code' },
      ]
    },
    {
      category: 'Lists',
      items: [
        { syntax: '- Item 1\n- Item 2', description: 'Bullet list' },
        { syntax: '1. Item 1\n2. Item 2', description: 'Numbered list' },
      ]
    },
    {
      category: 'Links & Images',
      items: [
        { syntax: '[Link text](URL)', description: 'Create link' },
        { syntax: '![Alt text](image-URL)', description: 'Insert image' },
      ]
    },
    {
      category: 'Code & Quotes',
      items: [
        { syntax: '```\ncode block\n```', description: 'Code block' },
        { syntax: '```javascript\ncode\n```', description: 'Code with language' },
        { syntax: '> Quote text', description: 'Blockquote' },
      ]
    },
    {
      category: 'Other',
      items: [
        { syntax: '---', description: 'Horizontal rule' },
        { syntax: '| Col1 | Col2 |\n|------|------|\n| Data | Data |', description: 'Table' },
      ]
    }
  ]

  return (
    <Card className="fixed inset-4 z-50 overflow-auto bg-white shadow-2xl border-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Markdown Cheat Sheet</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600">
          Quick reference for Markdown syntax. Click outside or press the X to close.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cheatSheetItems.map((section) => (
            <div key={section.category} className="space-y-3">
              <h3 className="font-semibold text-gray-900 border-b pb-1">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <code className="block bg-gray-100 p-2 rounded text-xs font-mono whitespace-pre-wrap">
                      {item.syntax}
                    </code>
                    <p className="text-xs text-gray-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>Bold:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+B</code>
            </div>
            <div className="flex justify-between">
              <span>Italic:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+I</code>
            </div>
            <div className="flex justify-between">
              <span>Indent:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">Tab</code>
            </div>
            <div className="flex justify-between">
              <span>Outdent:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">Shift+Tab</code>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
