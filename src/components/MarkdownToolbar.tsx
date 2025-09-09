import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3,
  Link, 
  Image, 
  Code,
  List,
  ListOrdered,
  Quote,
  Table,
  Minus,
  LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarButton {
  action: string
  icon: LucideIcon
  tooltip: string
  shortcut?: string
}

interface ToolbarSeparator {
  type: 'separator'
}

type ToolbarItem = ToolbarButton | ToolbarSeparator

interface MarkdownToolbarProps {
  onAction: (action: string, text?: string) => void
  disabled?: boolean
  className?: string
}

export function MarkdownToolbar({ onAction, disabled, className }: MarkdownToolbarProps) {
  const toolbarButtons: ToolbarItem[] = [
    {
      action: 'bold',
      icon: Bold,
      tooltip: 'Bold (Ctrl+B)',
      shortcut: 'Ctrl+B'
    },
    {
      action: 'italic',
      icon: Italic,
      tooltip: 'Italic (Ctrl+I)',
      shortcut: 'Ctrl+I'
    },
    { type: 'separator' },
    {
      action: 'heading1',
      icon: Heading1,
      tooltip: 'Heading 1',
    },
    {
      action: 'heading2',
      icon: Heading2,
      tooltip: 'Heading 2',
    },
    {
      action: 'heading3',
      icon: Heading3,
      tooltip: 'Heading 3',
    },
    { type: 'separator' },
    {
      action: 'link',
      icon: Link,
      tooltip: 'Insert Link',
    },
    {
      action: 'image',
      icon: Image,
      tooltip: 'Insert Image',
    },
    {
      action: 'code',
      icon: Code,
      tooltip: 'Code Block',
    },
    { type: 'separator' },
    {
      action: 'bulletList',
      icon: List,
      tooltip: 'Bullet List',
    },
    {
      action: 'numberedList',
      icon: ListOrdered,
      tooltip: 'Numbered List',
    },
    {
      action: 'quote',
      icon: Quote,
      tooltip: 'Quote',
    },
    { type: 'separator' },
    {
      action: 'table',
      icon: Table,
      tooltip: 'Insert Table',
    },
  ]

  return (
    <div className={cn("border-b bg-gray-50/50 px-2 sm:px-3 py-1.5 sm:py-2 overflow-x-auto", className)}>
      <div className="flex items-center gap-0.5 sm:gap-1 min-w-max">
        {toolbarButtons.map((item, index) => {
          if ('type' in item && item.type === 'separator') {
            return (
              <div 
                key={index} 
                className="w-px h-6 bg-gray-300 mx-1" 
              />
            )
          }

          const button = item as ToolbarButton
          const IconComponent = button.icon
          
          return (
            <Button
              key={button.action}
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onAction(button.action)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-200 shrink-0"
              title={button.tooltip}
            >
              <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          )
        })}
        
        <div className="w-px h-5 sm:h-6 bg-gray-300 mx-0.5 sm:mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onAction('custom', '---\n')}
          className="h-7 sm:h-8 px-1.5 sm:px-2 hover:bg-gray-200 shrink-0"
          title="Horizontal Rule"
        >
          <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onAction('custom', '\n```javascript\n// Your code here\n```\n')}
          className="h-7 sm:h-8 px-1.5 sm:px-2 hover:bg-gray-200 text-xs font-mono shrink-0"
          title="Code Block (JavaScript)"
        >
          JS
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onAction('custom', '\n```typescript\n// Your code here\n```\n')}
          className="h-7 sm:h-8 px-1.5 sm:px-2 hover:bg-gray-200 text-xs font-mono shrink-0"
          title="Code Block (TypeScript)"
        >
          TS
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onAction('custom', '\n```python\n# Your code here\n```\n')}
          className="h-7 sm:h-8 px-1.5 sm:px-2 hover:bg-gray-200 text-xs font-mono shrink-0"
          title="Code Block (Python)"
        >
          PY
        </Button>
      </div>
    </div>
  )
}
