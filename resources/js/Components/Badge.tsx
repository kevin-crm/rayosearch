interface Props {
  children: string
  variant?: 'success' | 'warning' | 'error' | 'neutral'
}

export default function Badge({ children, variant = 'neutral' }: Props) {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    neutral: 'bg-[#5aa9ff10] text-[#5aa9ff] border-[#5aa9ff20]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${variants[variant]}`}>
      {children}
    </span>
  )
}
