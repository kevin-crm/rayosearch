import { Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'

interface SiteRow {
    id: number
    name: string
    url: string
    site_id: string
    azure_index_name: string
    has_widget: boolean
    created_at: string
}

interface Stats {
    siteCount: number
    configuredCount: number
    apiKeyCount: number
}

interface Props {
    stats: Stats
    sites: SiteRow[]
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="rounded-lg border px-4 py-3.5" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}>
            <p className="text-[11px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
                {label}
            </p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
            {sub && <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>{sub}</p>}
        </div>
    )
}

function CheckStep({ done, children }: { done: boolean; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-3 text-sm">
            <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{
                    background: done ? '#22c55e22' : 'transparent',
                    border: `1.5px solid ${done ? '#22c55e' : 'var(--border)'}`,
                }}
            >
                {done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5l2.5 2.5L8 3"/>
                    </svg>
                )}
            </span>
            <span style={{ color: done ? 'var(--fg-muted)' : 'var(--fg)', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>
                {children}
            </span>
        </li>
    )
}

export default function Dashboard({ stats, sites }: Props) {
    const hasSites      = stats.siteCount > 0
    const hasWidget     = stats.configuredCount > 0
    const hasApiKey     = stats.apiKeyCount > 0
    const allDone       = hasSites && hasWidget && hasApiKey

    return (
        <AppLayout title="Dashboard">
            <div className="space-y-5">

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard
                        label="Total Sites"
                        value={stats.siteCount}
                        sub={stats.siteCount === 0 ? 'No sites yet' : `${stats.siteCount} connected`}
                    />
                    <StatCard
                        label="Widgets Configured"
                        value={stats.configuredCount}
                        sub={stats.siteCount > 0 ? `${stats.siteCount - stats.configuredCount} unconfigured` : undefined}
                    />
                    <StatCard
                        label="API Keys"
                        value={stats.apiKeyCount}
                        sub={stats.apiKeyCount === 0 ? 'None generated yet' : undefined}
                    />
                </div>

                <div className="grid grid-cols-3 gap-5">

                    {/* Sites list */}
                    <div className="col-span-2 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Sites</span>
                            <Link href="/sites" className="text-[11px] font-medium transition-colors hover:text-[#5aa9ff]" style={{ color: 'var(--fg-muted)' }}>
                                Manage →
                            </Link>
                        </div>

                        {sites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3" style={{ color: 'var(--fg-muted)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5">
                                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                                    <path d="M8 21h8M12 17v4"/>
                                </svg>
                                <p className="text-sm">No sites yet.</p>
                                <Link href="/sites" className="text-xs font-medium text-[#5aa9ff] hover:underline">
                                    Add your first site →
                                </Link>
                            </div>
                        ) : (
                            <div>
                                {sites.map((s, i) => (
                                    <div
                                        key={s.id}
                                        className="flex items-center gap-4 px-4 py-3"
                                        style={{ borderBottom: i < sites.length - 1 ? '1px solid var(--border)' : 'none' }}
                                    >
                                        {/* Widget indicator dot */}
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            title={s.has_widget ? 'Widget configured' : 'No widget configured'}
                                            style={{ background: s.has_widget ? '#22c55e' : 'var(--border)' }}
                                        />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{s.name}</span>
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                                                    {s.azure_index_name}
                                                </span>
                                            </div>
                                            <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--fg-muted)' }}>{s.url}</div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                href={`/sites/${s.site_id}/customize`}
                                                className="text-[11px] px-2.5 py-1 rounded border transition-colors hover:border-[#5aa9ff] hover:text-[#5aa9ff]"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                            >
                                                Widget
                                            </Link>
                                            <Link
                                                href={`/sites/${s.site_id}`}
                                                className="text-[11px] px-2.5 py-1 rounded border transition-colors hover:border-[#5aa9ff] hover:text-[#5aa9ff]"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                            >
                                                View
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">

                        {/* Getting started */}
                        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel)' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                                    {allDone ? 'Setup Complete' : 'Getting Started'}
                                </span>
                            </div>
                            <ol className="p-4 space-y-3">
                                <CheckStep done={hasSites}>
                                    <Link href="/sites" className="hover:text-[#5aa9ff] transition-colors">
                                        Add a site
                                    </Link>
                                </CheckStep>
                                <CheckStep done={hasWidget}>
                                    <Link href="/widget-builder" className="hover:text-[#5aa9ff] transition-colors">
                                        Configure a widget
                                    </Link>
                                </CheckStep>
                                <CheckStep done={hasApiKey}>
                                    <Link href="/api-keys" className="hover:text-[#5aa9ff] transition-colors">
                                        Generate an API key
                                    </Link>
                                </CheckStep>
                            </ol>
                        </div>

                        {/* Quick links */}
                        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel)' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Quick Links</span>
                            </div>
                            <div className="p-2">
                                {[
                                    { href: '/sites',          label: 'Sites',          icon: 'M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z' },
                                    { href: '/widget-builder', label: 'Widget Builder', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
                                    { href: '/indexing',       label: 'Indexing',       icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                                    { href: '/api-keys',       label: 'API Keys',       icon: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4' },
                                ].map(({ href, label, icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors hover:text-[#5aa9ff]"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d={icon}/>
                                        </svg>
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
