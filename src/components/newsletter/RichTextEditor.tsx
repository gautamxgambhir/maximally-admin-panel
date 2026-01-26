import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface RichTextEditorProps {
  value: string;
  onChange: (text: string, html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [content, setContent] = useState(value);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(value);
    if (editorRef.current) {
      // Use the HTML content if available, otherwise use plain text
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText;
      setContent(html);
      onChange(text, html);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold' },
    { icon: Italic, command: 'italic', title: 'Italic' },
    { icon: Underline, command: 'underline', title: 'Underline' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code Block' },
  ];

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted border-b flex-wrap">
        {toolbarButtons.map(({ icon: Icon, command, value, title }) => (
          <Button
            key={command}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand(command, value)}
            title={title}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          title="Insert Link"
          className="h-8 w-8 p-0"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertImage}
          title="Insert Image"
          className="h-8 w-8 p-0"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <select
          onChange={(e) => execCommand('formatBlock', e.target.value)}
          className="h-8 px-2 text-sm border rounded bg-background text-foreground border-border"
          defaultValue=""
        >
          <option value="" className="bg-background text-foreground">Normal</option>
          <option value="h1" className="bg-background text-foreground">Heading 1</option>
          <option value="h2" className="bg-background text-foreground">Heading 2</option>
          <option value="h3" className="bg-background text-foreground">Heading 3</option>
          <option value="p" className="bg-background text-foreground">Paragraph</option>
        </select>

        <select
          onChange={(e) => execCommand('fontSize', e.target.value)}
          className="h-8 px-2 text-sm border rounded bg-background text-foreground border-border ml-2"
          defaultValue="3"
        >
          <option value="1" className="bg-background text-foreground">Small</option>
          <option value="3" className="bg-background text-foreground">Normal</option>
          <option value="5" className="bg-background text-foreground">Large</option>
          <option value="7" className="bg-background text-foreground">Huge</option>
        </select>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={updateContent}
        onBlur={updateContent}
        className="min-h-[300px] p-4 focus:outline-none prose prose-sm max-w-none"
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      />
    </div>
  );
}
