import type { InputHTMLAttributes } from 'react'
import './input.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ className = '', label, id, ...props }: InputProps) {
  const inputId = id ?? props.name

  return (
    <label className="ui-input-wrap" htmlFor={inputId}>
      {label ? <span>{label}</span> : null}
      <input id={inputId} className={`ui-input ${className}`.trim()} {...props} />
    </label>
  )
}
