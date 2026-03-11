import { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: Props) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded transition-all duration-150 disabled:opacity-50 cursor-pointer border'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  }
  const variants = {
    primary: 'bg-[#5aa9ff] border-[#5aa9ff] text-white hover:bg-[#4a99ef] hover:border-[#4a99ef]',
    secondary: 'bg-transparent border-[var(--border)] text-[var(--fg)] hover:border-[#5aa9ff44] hover:text-[#5aa9ff]',
    danger: 'bg-transparent border-[var(--border)] text-red-400 hover:border-red-400/40',
    ghost: 'bg-transparent border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[#5aa9ff08]',
  }

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
