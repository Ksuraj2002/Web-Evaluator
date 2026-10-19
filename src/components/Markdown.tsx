import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

export default function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(source || '', { async: false }) as string
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
  }, [source])

  return (
    <div
      className={`prose-md ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
