import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import '../styles/maximally-blog.css'

interface MarkdownPreviewProps {
  content: string
  className?: string
  style?: React.CSSProperties
  showTitle?: boolean
  title?: string
  date?: string
  readTime?: string
}

export function MarkdownPreview({ 
  content, 
  className, 
  style, 
  showTitle = false,
  title,
  date,
  readTime
}: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className={cn("maximally-blog-content", className)} style={style}>
        <p className="text-gray-500 italic font-mono text-sm">Start typing to see preview...</p>
      </div>
    )
  }

  return (
    <article className={cn("max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6", className)} style={style}>
      {showTitle && title && (
        <div className="mb-6 sm:mb-8">
          <h1 className="font-press-start text-lg sm:text-2xl lg:text-4xl text-red-600 mb-4 leading-tight break-words">
            {title}
          </h1>
          {(date || readTime) && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-black/60 font-mono text-xs sm:text-sm">
              {date && (
                <div className="flex items-center gap-1 sm:gap-2">
                  📅 <span className="break-all">{date}</span>
                </div>
              )}
              {readTime && (
                <div className="flex items-center gap-1 sm:gap-2">
                  🕐 <span>{readTime}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="maximally-blog-content prose prose-sm sm:prose-lg max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Enhanced headings with pixel styling
            h1: ({ children }: any) => (
              <h1 className="font-press-start text-xl sm:text-2xl md:text-3xl mb-6 mt-12 first:mt-0 leading-tight text-red-600 relative">
                <span className="absolute -left-4 text-red-600/20 select-none">#</span>
                {children}
              </h1>
            ),
            h2: ({ children }: any) => (
              <h2 className="font-press-start text-lg sm:text-xl md:text-2xl mb-5 mt-10 leading-tight text-red-600 relative group">
                <span className="absolute -left-3 text-red-600/20 select-none group-hover:text-red-600/40 transition-colors">##</span>
                <div className="inline-block pixel-border-bottom pb-2">
                  {children}
                </div>
              </h2>
            ),
            h3: ({ children }: any) => (
              <h3 className="font-press-start text-base sm:text-lg md:text-xl mb-4 mt-8 leading-tight text-red-600 relative group">
                <span className="absolute -left-3 text-red-600/20 select-none group-hover:text-red-600/40 transition-colors">###</span>
                {children}
              </h3>
            ),
            h4: ({ children }: any) => (
              <h4 className="font-press-start text-sm sm:text-base md:text-lg mb-3 mt-6 leading-tight text-blue-600">
                {children}
              </h4>
            ),
            h5: ({ children }: any) => (
              <h5 className="font-press-start text-xs sm:text-sm md:text-base mb-3 mt-6 leading-tight text-black/80">
                {children}
              </h5>
            ),
            // Enhanced paragraphs with first letter styling
            p: ({ children }: any) => (
              <p className="mb-6 font-mono text-base sm:text-lg leading-relaxed text-black/90">
                {children}
              </p>
            ),
            // Enhanced strong and em styling
            strong: ({ children }: any) => (
              <strong className="font-press-start text-red-600 bg-red-600/10 px-1 py-0.5 rounded text-sm">
                {children}
              </strong>
            ),
            em: ({ children }: any) => (
              <em className="font-mono italic text-blue-600 bg-blue-600/5 px-1 rounded">
                {children}
              </em>
            ),
            // Enhanced lists with custom bullets
            ul: ({ children }: any) => (
              <ul className="list-none pl-0 space-y-3 mb-8 font-mono">
                {children}
              </ul>
            ),
            ol: ({ children }: any) => (
              <ol className="list-none pl-0 space-y-3 mb-8 font-mono">
                {children}
              </ol>
            ),
            li: ({ children }: any) => (
              <li className="relative pl-8 before:content-['▸'] before:absolute before:left-0 before:text-red-600 before:font-press-start before:text-sm">
                {children}
              </li>
            ),
            // Enhanced blockquotes
            blockquote: ({ children }: any) => (
              <div className="pixel-border p-6 sm:p-8 bg-gradient-to-r from-blue-600/5 to-blue-600/10 my-8 sm:my-10 relative">
                <div className="absolute top-4 left-4 text-blue-600/20 font-press-start text-2xl select-none">&quot;</div>
                <div className="font-mono text-black/90 leading-relaxed pl-8">
                  {children}
                </div>
                <div className="absolute bottom-4 right-4 text-blue-600/20 font-press-start text-2xl select-none rotate-180">&quot;</div>
              </div>
            ),
            // Enhanced code blocks
            code: ({ children, className }: any) => {
              const isInline = !className;
              const language = className?.replace('language-', '') || 'text';
              
              if (isInline) {
                return (
                  <code className="bg-black/10 text-red-600 px-2 py-1 rounded font-mono text-sm pixel-border-sm">
                    {children}
                  </code>
                );
              }
              return (
                <div className="my-8">
                  <div className="pixel-border bg-black text-white overflow-hidden">
                    <div className="bg-red-600 px-4 py-2 font-press-start text-xs flex items-center justify-between">
                      <span>{language.toUpperCase()}</span>
                      <span className="text-white/60">CODE</span>
                    </div>
                    <pre className="p-6 overflow-x-auto bg-black custom-scrollbar">
                      <code className="font-mono text-sm text-green-400 leading-relaxed">
                        {children}
                      </code>
                    </pre>
                  </div>
                </div>
              );
            },
            pre: ({ children }: any) => children,
            // Enhanced images
            img: ({ src, alt, ...props }: any) => (
              <div className="my-8 sm:my-10">
                <div className="pixel-border overflow-hidden bg-white p-2">
                  <img
                    src={src}
                    alt={alt || ''}
                    className="w-full h-auto rounded-lg max-w-full hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    {...props}
                  />
                  {alt && (
                    <div className="pt-2 px-2 font-mono text-sm text-black/60 italic text-center">
                      {alt}
                    </div>
                  )}
                </div>
              </div>
            ),
            // Enhanced links
            a: ({ children, href, ...props }: any) => {
              const isExternal = href?.startsWith('http');
              return (
                <a
                  href={href}
                  className="text-blue-600 font-medium hover:text-red-600 transition-colors duration-200 relative group pixel-underline"
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  {...props}
                >
                  {children}
                  {isExternal && (
                    <span className="inline-block ml-1 text-xs opacity-60 group-hover:opacity-100 transition-opacity">↗</span>
                  )}
                </a>
              );
            },
            // Enhanced horizontal rules
            hr: () => (
              <div className="my-12 flex items-center justify-center">
                <div className="pixel-border bg-red-600 h-2 w-16"></div>
                <div className="mx-4 font-press-start text-red-600 text-xs">***</div>
                <div className="pixel-border bg-red-600 h-2 w-16"></div>
              </div>
            ),
            // Enhanced tables
            table: ({ children }: any) => (
              <div className="my-8 overflow-x-auto">
                <table className="w-full pixel-border bg-white">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }: any) => (
              <thead className="bg-red-600 text-white">
                {children}
              </thead>
            ),
            tbody: ({ children }: any) => (
              <tbody className="divide-y divide-black/10">
                {children}
              </tbody>
            ),
            tr: ({ children }: any) => (
              <tr className="hover:bg-blue-600/5 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }: any) => (
              <th className="px-4 py-3 text-left font-press-start text-xs">
                {children}
              </th>
            ),
            td: ({ children }: any) => (
              <td className="px-4 py-3 font-mono text-sm">
                {children}
              </td>
            ),
            // Special div handling
            div: ({ children, className }) => {
              if (className === 'highlight-box') {
                return <div className="highlight-box">{children}</div>
              }
              return <div className={className}>{children}</div>
            }
          }}
        >
          {content}
        </ReactMarkdown>
        
        {/* Article completion indicator */}
        <div className="article-complete">
          <div className="article-complete-badge">
            <span>📖 Article Complete</span>
          </div>
          <div className="article-complete-text">
            Thank you for reading! Share your thoughts below.
          </div>
        </div>
        
        {/* Social sharing buttons */}
        <div className="social-sharing">
          <button className="share-button share">
            📱 Share
          </button>
          <button className="share-button copy">
            🔗 Copy Link
          </button>
          <button className="share-button tweet">
            🐦 Tweet
          </button>
        </div>
      </div>
    </article>
  )
}
