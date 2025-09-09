import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Eye, EyeOff, HelpCircle, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownToolbar } from './MarkdownToolbar'
import { MarkdownCheatSheet } from './MarkdownCheatSheet'

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
  height?: string
}

export function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Write your blog post content in Markdown...',
  disabled = false,
  error,
  className,
  height = '500px'
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(true)
  const [showCheatSheet, setShowCheatSheet] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length
  const readingTime = Math.ceil(wordCount / 200)

  const handleToolbarAction = useCallback((action: string, text?: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    let newText = value
    let newCursorPos = start

    switch (action) {
      case 'bold':
        if (selectedText) {
          newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end)
          newCursorPos = end + 4
        } else {
          newText = value.substring(0, start) + '**bold text**' + value.substring(end)
          newCursorPos = start + 2
        }
        break
      case 'italic':
        if (selectedText) {
          newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end)
          newCursorPos = end + 2
        } else {
          newText = value.substring(0, start) + '*italic text*' + value.substring(end)
          newCursorPos = start + 1
        }
        break
      case 'heading1':
        newText = value.substring(0, start) + `# ${selectedText || 'Heading 1'}` + value.substring(end)
        newCursorPos = start + 2
        break
      case 'heading2':
        newText = value.substring(0, start) + `## ${selectedText || 'Heading 2'}` + value.substring(end)
        newCursorPos = start + 3
        break
      case 'heading3':
        newText = value.substring(0, start) + `### ${selectedText || 'Heading 3'}` + value.substring(end)
        newCursorPos = start + 4
        break
      case 'link':
        if (selectedText) {
          newText = value.substring(0, start) + `[${selectedText}](url)` + value.substring(end)
          newCursorPos = end + 3
        } else {
          newText = value.substring(0, start) + '[link text](url)' + value.substring(end)
          newCursorPos = start + 1
        }
        break
      case 'image':
        newText = value.substring(0, start) + `![alt text](image-url)` + value.substring(end)
        newCursorPos = start + 2
        break
      case 'code':
        if (selectedText) {
          if (selectedText.includes('\n')) {
            newText = value.substring(0, start) + `\`\`\`\n${selectedText}\n\`\`\`` + value.substring(end)
            newCursorPos = end + 8
          } else {
            newText = value.substring(0, start) + `\`${selectedText}\`` + value.substring(end)
            newCursorPos = end + 2
          }
        } else {
          newText = value.substring(0, start) + '`inline code`' + value.substring(end)
          newCursorPos = start + 1
        }
        break
      case 'bulletList': {
        const bulletItems = selectedText ? selectedText.split('\n').map(line => `- ${line}`).join('\n') : '- List item'
        newText = value.substring(0, start) + bulletItems + value.substring(end)
        newCursorPos = start + 2
        break
      }
      case 'numberedList': {
        const numberedItems = selectedText ? selectedText.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n') : '1. List item'
        newText = value.substring(0, start) + numberedItems + value.substring(end)
        newCursorPos = start + 3
        break
      }
      case 'quote': {
        const quoteText = selectedText || 'Quote text'
        newText = value.substring(0, start) + `> ${quoteText}` + value.substring(end)
        newCursorPos = start + 2
        break
      }
      case 'table': {
        const tableText = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Row 1    | Data     | Data     |
| Row 2    | Data     | Data     |`
        newText = value.substring(0, start) + tableText + value.substring(end)
        newCursorPos = start + tableText.length
        break
      }
      case 'custom':
        if (text) {
          newText = value.substring(0, start) + text + value.substring(end)
          newCursorPos = start + text.length
        }
        break
    }

    onChange(newText)
    
    // Restore cursor position after update
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [value, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      
      if (e.shiftKey) {
        // Remove indentation
        const beforeCursor = value.substring(0, start)
        const afterCursor = value.substring(end)
        const lines = beforeCursor.split('\n')
        const currentLine = lines[lines.length - 1]
        
        if (currentLine.startsWith('  ')) {
          const newBeforeCursor = beforeCursor.substring(0, beforeCursor.lastIndexOf(currentLine)) + currentLine.substring(2)
          onChange(newBeforeCursor + afterCursor)
          setTimeout(() => {
            textarea.setSelectionRange(start - 2, end - 2)
          }, 0)
        }
      } else {
        // Add indentation
        const newValue = value.substring(0, start) + '  ' + value.substring(end)
        onChange(newValue)
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, end + 2)
        }, 0)
      }
    }

    // Handle Ctrl+B for bold, Ctrl+I for italic
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          handleToolbarAction('bold')
          break
        case 'i':
          e.preventDefault()
          handleToolbarAction('italic')
          break
      }
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Label className="text-base font-semibold">Content (Markdown)</Label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{wordCount} words</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>{readingTime} min read</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCheatSheet(!showCheatSheet)}
            className="text-xs sm:text-sm"
          >
            <HelpCircle className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Help</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs sm:text-sm"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Hide Preview</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Show Preview</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {showCheatSheet && (
        <MarkdownCheatSheet onClose={() => setShowCheatSheet(false)} />
      )}

      <Card className="p-0 overflow-hidden">
        <MarkdownToolbar onAction={handleToolbarAction} disabled={disabled} />
        
        <div className={cn(
          "grid gap-0",
          showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        )} style={{ height }}>
          <div className={showPreview ? "border-b lg:border-b-0 lg:border-r" : ""}>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="resize-none border-0 rounded-none focus:ring-0 font-mono text-sm"
              style={{ height: `calc(${height} - 60px)`, minHeight: `calc(${height} - 60px)` }}
            />
          </div>
          
          {showPreview && (
            <div className="overflow-auto bg-gray-50/50">
              <MarkdownPreview 
                content={value} 
                className="p-4 h-full"
                style={{ minHeight: `calc(${height} - 60px)` }}
              />
            </div>
          )}
        </div>
      </Card>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
