import type { HTMLAttributes } from 'react'
import './card.css'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'strong'
}

export default function Card({ className = '', tone = 'default', ...props }: CardProps) {
  return <section className={`ui-card ui-card--${tone} ${className}`.trim()} {...props} />
}
