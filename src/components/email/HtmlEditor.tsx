import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Code } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { EditorView } from '@codemirror/view'

interface HtmlEditorProps {
  value: string
  onChange: (value: string) => void
  placeholders?: string[]
}

export function HtmlEditor({ value, onChange, placeholders = [] }: HtmlEditorProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const editorRef = useRef<any>(null)

  const insertPlaceholder = (placeholder: string) => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view
      const { from, to } = view.state.selection.main
      const text = `{{${placeholder}}}`
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length }
      })
      view.focus()
    } else {
      onChange(value + `{{${placeholder}}}`)
    }
  }

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
          {placeholders.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Insert Placeholders:</p>
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
            </div>
          )}

          {/* HTML Editor */}
          <div className="border rounded-lg overflow-hidden">
            <CodeMirror
              ref={editorRef}
              value={value}
              height="500px"
              extensions={[
                html(),
                EditorView.lineWrapping
              ]}
              onChange={(val) => onChange(val)}
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                searchKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
              }}
            />
          </div>

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
