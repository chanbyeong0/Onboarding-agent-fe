import type { ReactNode } from 'react'

function parseInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>)
    last = match.index + match[0].length
  }

  if (last < text.length) {
    parts.push(text.slice(last))
  }

  return parts
}

interface MarkdownTextProps {
  children: string
}

export default function MarkdownText({ children }: MarkdownTextProps) {
  const lines = children.split('\n')
  const nodes: ReactNode[] = []
  let listItems: ReactNode[] = []
  let key = 0

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(<ul key={key++}>{listItems}</ul>)
      listItems = []
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      const content = parseInline(headingMatch[2])
      if (level === 1) nodes.push(<h2 key={key++}>{content}</h2>)
      else if (level === 2) nodes.push(<h3 key={key++}>{content}</h3>)
      else nodes.push(<h4 key={key++}>{content}</h4>)
      continue
    }

    const listMatch = line.match(/^[-*]\s+(.+)/)
    if (listMatch) {
      listItems.push(<li key={key++}>{parseInline(listMatch[1])}</li>)
      continue
    }

    flushList()

    if (line.trim() === '') {
      nodes.push(<br key={key++} />)
    } else {
      nodes.push(<p key={key++}>{parseInline(line)}</p>)
    }
  }

  flushList()

  return <div className="markdown-text">{nodes}</div>
}
