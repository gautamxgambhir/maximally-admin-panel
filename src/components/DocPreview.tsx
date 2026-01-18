import React from 'react';
import { ArrowLeft, Edit, ExternalLink, Calendar } from 'lucide-react';
import { useDocPage } from '../hooks/useDocs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DocPreviewProps {
  pageId: string;
  onClose: () => void;
  onEdit: () => void;
}

export const DocPreview: React.FC<DocPreviewProps> = ({
  pageId,
  onClose,
  onEdit,
}) => {
  const { data: page, isLoading } = useDocPage(pageId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-white">Loading page...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-red-400">Page not found</div>
      </div>
    );
  }

  const publicUrl = `https://maximally.in/docs/${page.section?.name}/${page.slug}`;

  return (
    <div className="h-[calc(100vh-1px)] flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-black border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:text-gray-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-white">{page.title}</h1>
            <p className="text-sm text-gray-400">
              in {page.section?.display_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={page.is_published ? 'default' : 'secondary'}>
            {page.is_published ? 'Published' : 'Draft'}
          </Badge>
          <Button variant="outline" size="sm" asChild className="text-white border-gray-700 hover:bg-gray-800">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public
            </a>
          </Button>
          <Button onClick={onEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Content Area - Single scrollable container */}
      <div className="flex-1 overflow-auto bg-black doc-preview-scrollbar">
        <div className="max-w-4xl mx-auto p-8">
          {/* Page Meta */}
          <div className="mb-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold mb-3 text-white">Page Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-white">Section:</span> 
                <span className="text-gray-300 ml-1">{page.section?.display_name}</span>
              </div>
              <div>
                <span className="font-medium text-white">Slug:</span> 
                <span className="text-gray-300 ml-1">{page.slug}</span>
              </div>
              <div>
                <span className="font-medium text-white">Status:</span>
                <Badge variant={page.is_published ? 'default' : 'secondary'} className="ml-1">
                  {page.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div>
                <span className="font-medium text-white">Order:</span> 
                <span className="text-gray-300 ml-1">{page.order_index}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-white">Updated:</span>
                <span className="text-gray-300 ml-1">
                  {new Date(page.updated_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-white">Public URL:</span>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 underline ml-1 break-all"
                >
                  {publicUrl}
                </a>
              </div>
            </div>

            {page.description && (
              <div className="mt-3">
                <span className="font-medium text-white">Description:</span>
                <p className="text-gray-300 mt-1 font-jetbrains">{page.description}</p>
              </div>
            )}

            {/* SEO Information */}
            {(page.meta_title || page.meta_description) && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h3 className="font-medium mb-2 text-white">SEO Settings</h3>
                {page.meta_title && (
                  <div className="mb-2">
                    <span className="font-medium text-sm text-white">Meta Title:</span>
                    <p className="text-sm text-gray-300 font-jetbrains">{page.meta_title}</p>
                  </div>
                )}
                {page.meta_description && (
                  <div>
                    <span className="font-medium text-sm text-white">Meta Description:</span>
                    <p className="text-sm text-gray-300 font-jetbrains">{page.meta_description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rendered Content - matches website exactly */}
          <article className="prose prose-invert prose-orange max-w-none">
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
                {page.content}
              </ReactMarkdown>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};
