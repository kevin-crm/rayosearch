import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  title?: string
  description?: string
}

export default function Panel({ children, className = '', title, description }: Props) {
  return (
    <div
      className={`rounded-lg border overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      {(title || description) && (
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {title && <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</h2>}
          {description && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
