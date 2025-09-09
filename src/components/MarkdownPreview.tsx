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
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-3 sm:p-4 my-3 sm:my-4 italic text-sm sm:text-base">
                {children}
              </blockquote>
            ),
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
      </div>
    </article>
  )
}
