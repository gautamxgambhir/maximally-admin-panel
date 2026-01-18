import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3,
  Link2, 
  Image, 
  Code, 
  List, 
  ListOrdered, 
  Quote, 
  Table,
  HelpCircle,
  FileText,
  Clock,
  Maximize2,
  Minimize2,
  ChevronRight
} from 'lucide-react';
import { useDocPage, useUpdateDocPage } from '../hooks/useDocs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../lib/utils';

interface DocPageEditorProps {
  pageId: string;
  onClose: () => void;
  onSave: () => void;
}

export const DocPageEditor: React.FC<DocPageEditorProps> = ({
  pageId,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    is_published: true,
    meta_title: '',
    meta_description: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSeoSettings, setShowSeoSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: page, isLoading } = useDocPage(pageId);
  const updatePage = useUpdateDocPage();

  useEffect(() => {
    if (page) {
      const newFormData = {
        title: page.title,
        description: page.description || '',
        content: page.content,
        is_published: page.is_published,
        meta_title: page.meta_title || '',
        meta_description: page.meta_description || '',
      };
      setFormData(newFormData);
      setHasUnsavedChanges(false);
    }
  }, [page]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      await updatePage.mutateAsync({
        id: pageId,
        updates: formData,
      });
      setHasUnsavedChanges(false);
      onSave();
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  // Markdown toolbar actions
  const insertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    const replacement = selectedText || placeholder;
    
    const newContent = 
      formData.content.substring(0, start) + 
      before + replacement + after + 
      formData.content.substring(end);
    
    handleInputChange('content', newContent);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [formData.content, handleInputChange]);

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**', 'bold text'), tooltip: 'Bold (Ctrl+B)' },
    { icon: Italic, action: () => insertMarkdown('*', '*', 'italic text'), tooltip: 'Italic (Ctrl+I)' },
    { icon: Heading1, action: () => insertMarkdown('# ', '', 'Heading 1'), tooltip: 'Heading 1' },
    { icon: Heading2, action: () => insertMarkdown('## ', '', 'Heading 2'), tooltip: 'Heading 2' },
    { icon: Heading3, action: () => insertMarkdown('### ', '', 'Heading 3'), tooltip: 'Heading 3' },
    { icon: Link2, action: () => insertMarkdown('[', '](url)', 'link text'), tooltip: 'Link' },
    { icon: Image, action: () => insertMarkdown('![', '](image-url)', 'alt text'), tooltip: 'Image' },
    { icon: Code, action: () => insertMarkdown('`', '`', 'code'), tooltip: 'Inline Code' },
    { icon: List, action: () => insertMarkdown('- ', '', 'List item'), tooltip: 'Bullet List' },
    { icon: ListOrdered, action: () => insertMarkdown('1. ', '', 'List item'), tooltip: 'Numbered List' },
    { icon: Quote, action: () => insertMarkdown('> ', '', 'Quote'), tooltip: 'Quote' },
    { icon: Table, action: () => insertMarkdown('| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |', '', ''), tooltip: 'Table' },
  ];

  const wordCount = formData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading page...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Page not found</div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col bg-background", isFullscreen && "fixed inset-0 z-50")} onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <h1 className="text-lg font-semibold">{page.title}</h1>
                <p className="text-sm text-muted-foreground">
                  in {page.section?.display_name}
                  {hasUnsavedChanges && (
                    <span className="text-orange-600 dark:text-orange-400 font-medium ml-2">
                      • Unsaved changes
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={formData.is_published ? 'default' : 'secondary'}>
            {formData.is_published ? 'Published' : 'Draft'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePage.isPending || !hasUnsavedChanges}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {updatePage.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Page Settings */}
      {!isFullscreen && (
        <div className="p-4 border-b bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Page Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter page title"
                disabled={updatePage.isPending}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description"
                disabled={updatePage.isPending}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => handleInputChange('is_published', checked)}
                  disabled={updatePage.isPending}
                />
                <Label htmlFor="is_published" className="text-sm">
                  {formData.is_published ? 'Published' : 'Draft'}
                </Label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/20">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((button, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={button.action}
              disabled={updatePage.isPending}
              className="h-8 w-8 p-0"
              title={button.tooltip}
            >
              <button.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{wordCount} words</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>{readingTime} min read</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        <div className={cn("flex flex-col", showPreview ? "w-1/2 border-r" : "w-full")}>
          <div className="flex-1 p-4">
            <Textarea
              ref={textareaRef}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Write your documentation content in Markdown...

# Getting Started

Welcome to the documentation! Here are some tips:

## Formatting
- Use **bold** and *italic* text
- Create [links](https://example.com)
- Add `inline code` or code blocks:

```javascript
console.log('Hello, world!');
```

## Lists
1. Numbered lists
2. Are great for steps

- Bullet points
- Work well for features

> Use blockquotes for important notes

| Tables | Are | Supported |
|--------|-----|-----------|
| Col 1  | Col 2 | Col 3   |"
              disabled={updatePage.isPending}
              className="w-full h-full resize-none border-0 focus-visible:ring-0 font-mono text-sm leading-relaxed doc-editor-scrollbar"
              style={{ minHeight: 'calc(100vh - 250px)' }}
            />
          </div>
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div className="w-1/2 flex flex-col">
            <div className="p-3 border-b bg-muted/30">
              <h3 className="text-sm font-medium text-muted-foreground">Live Preview</h3>
            </div>
            <div className="flex-1 overflow-auto bg-black text-white doc-preview-scrollbar">
              <div className="max-w-4xl mx-auto p-8">
                {/* Breadcrumb - matches website */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
                  <span className="hover:text-orange-500 transition-colors">Docs</span>
                  <ChevronRight className="h-4 w-4" />
                  <span className="capitalize text-gray-400">
                    {page.section?.display_name || 'Section'}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-white">{formData.title || 'Page Title'}</span>
                </nav>

                {/* Content - matches website exactly */}
                <article className="prose prose-invert prose-orange max-w-none">
                  
                  {/* Rendered Content - matches website exactly */}
                  <div className="prose prose-invert prose-orange max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !className;
                          return !isInline && match ? (
                            <SyntaxHighlighter
                              style={oneDark as any}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-gray-800 px-1 py-0.5 rounded text-orange-400" {...props}>
                              {children}
                            </code>
                          );
                        },
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold text-white mb-6 font-press-start-2p">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold text-white mb-4 mt-8 font-press-start-2p">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-bold text-white mb-3 mt-6">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-gray-300 mb-4 leading-relaxed font-jetbrains">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="text-gray-300 mb-4 space-y-2 font-jetbrains">
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li className="flex items-start font-jetbrains">
                            <span className="text-orange-500 mr-2">•</span>
                            <span>{children}</span>
                          </li>
                        ),
                        a: ({ href, children }) => (
                          <a 
                            href={href} 
                            className="text-orange-400 hover:text-orange-300 underline"
                            target={href?.startsWith('http') ? '_blank' : undefined}
                            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-orange-500 pl-4 italic text-gray-400 my-4">
                            {children}
                          </blockquote>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-white">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-gray-300">
                            {children}
                          </em>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border border-gray-700">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-700 px-4 py-2 bg-gray-800 font-semibold text-left text-white">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-700 px-4 py-2 text-gray-300">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {formData.content || '*Start typing to see the preview...*'}
                    </ReactMarkdown>
                  </div>
                </article>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEO Settings - Below editor/preview with animation */}
      {!isFullscreen && (
        <div className="border-t bg-muted/30">
          <button
            onClick={() => setShowSeoSettings(!showSeoSettings)}
            className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="font-medium">SEO Settings</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {showSeoSettings ? 'Click to collapse' : 'Click to expand'}
            </div>
          </button>
          
          <div 
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              showSeoSettings ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_title" className="text-sm font-medium">Meta Title</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => handleInputChange('meta_title', e.target.value)}
                    placeholder="SEO title (defaults to page title)"
                    maxLength={60}
                    disabled={updatePage.isPending}
                    className="h-8"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.meta_title.length}/60 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_description" className="text-sm font-medium">Meta Description</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => handleInputChange('meta_description', e.target.value)}
                    placeholder="SEO description for search engines"
                    rows={2}
                    maxLength={160}
                    disabled={updatePage.isPending}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.meta_description.length}/160 characters
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};