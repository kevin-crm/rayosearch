import { ReactNode } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { useTheme } from '@/hooks/useTheme'
import { PageProps } from '@/types'

interface Props {
  children: ReactNode
  title?: string
}

const navItems = [
  { href: '/dashboard',      label: 'Dashboard',      icon: GridIcon },
  { href: '/sites',          label: 'Sites',          icon: GlobeIcon },
  { href: '/widget-builder', label: 'Widget Builder', icon: WidgetIcon },
  { href: '/analytics',      label: 'Analytics',      icon: ChartIcon },
  { href: '/settings',       label: 'Settings',       icon: CogIcon },
]

export default function AppLayout({ children, title }: Props) {
  const { theme, toggle } = useTheme()
  const { url } = usePage()
  const { auth } = usePage<PageProps>().props

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 shrink-0 border-r"
        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-6 h-6 rounded bg-[#5aa9ff] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="5.5" cy="5.5" r="3.5" stroke="white" strokeWidth="1.5"/>
              <path d="M8.5 8.5L12 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
            RayoSearch
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = url.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all duration-150"
                style={{
                  color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                  backgroundColor: isActive ? 'var(--nav-active)' : undefined,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--nav-hover)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ background: '#5aa9ff22', color: '#5aa9ff', border: '1px solid #5aa9ff44' }}>
              {auth?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-xs truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
              {auth?.user?.name ?? 'User'}
            </span>
            <button
                type="button"
                onClick={() => router.post('/logout')}
                title="Sign out"
                className="flex items-center justify-center w-6 h-6 rounded transition-colors hover:text-[#f87171]"
                style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3"/>
                  <path d="M11 11l4-3-4-3"/>
                  <path d="M15 8H6"/>
                </svg>
              </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b shrink-0"
          style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}
        >
          <h1 className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex items-center justify-center w-8 h-8 rounded border text-xs transition-colors hover:border-[#5aa9ff44]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '◑'}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// Inline icons
function GridIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1"/>
      <rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  )
}
function GlobeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6.5"/>
      <path d="M8 1.5C8 1.5 5.5 4 5.5 8s2.5 6.5 2.5 6.5"/>
      <path d="M8 1.5C8 1.5 10.5 4 10.5 8s-2.5 6.5-2.5 6.5"/>
      <path d="M1.5 8h13"/>
    </svg>
  )
}

function ChartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 12l3.5-4 3 2.5L12 5l2 2"/>
      <path d="M2 14.5h12"/>
    </svg>
  )
}
function CogIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/>
    </svg>
  )
}
function WidgetIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="1.5" width="13" height="9" rx="1.5"/>
      <path d="M4 14.5h8"/>
      <path d="M8 10.5v4"/>
      <circle cx="5" cy="6" r="1.5"/>
      <path d="M8 6h3.5"/>
    </svg>
  )
}
