import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'

interface VolumePoint { date: string; count: number }
interface QueryRow    { query: string; count: number; has_results: boolean }
interface ClickRow    { title: string; url: string; count: number }
interface SiteOption  { name: string; site_id: string }

interface Props {
    sites:        SiteOption[]
    activeSiteId: string | null
    days:         number
    stats: {
        totalSearches:   number
        totalClicks:     number
        zeroResultCount: number
        ctr:             number
    }
    volume:      VolumePoint[]
    topQueries:  QueryRow[]
    zeroQueries: QueryRow[]
    topClicked:  ClickRow[]
}

// ── Tiny SVG bar chart ────────────────────────────────────────────────────────

function BarChart({ data, accent }: { data: VolumePoint[]; accent: string }) {
    const W = 800, H = 80, PAD = 2
    const max = Math.max(...data.map(d => d.count), 1)
    const barW = (W - PAD * (data.length - 1)) / data.length
    const labelEvery = data.length <= 14 ? 1 : data.length <= 30 ? 3 : 7

    return (
        <div style={{ width: '100%' }}>
            <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', display: 'block' }}>
                {data.map((d, i) => {
                    const barH = Math.max(d.count > 0 ? 3 : 0, Math.round((d.count / max) * H))
                    const x = i * (barW + PAD)
                    return (
                        <g key={d.date}>
                            <rect x={x} y={H - barH} width={barW} height={barH} rx="2" fill={accent + 'cc'} />
                            {i % labelEvery === 0 && (
                                <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">
                                    {d.date.slice(5)}
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
        <div className="rounded-lg border px-4 py-3.5" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}>
            <p className="text-[11px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="text-2xl font-semibold" style={{ color: color ?? 'var(--fg)' }}>{value}</p>
            {sub && <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>{sub}</p>}
        </div>
    )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>{title}</span>
            </div>
            {children}
        </div>
    )
}

function Empty({ text = 'No data yet.' }: { text?: string }) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--fg-muted)' }}>{text}</p>
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Analytics({ sites, activeSiteId, days, stats, volume, topQueries, zeroQueries, topClicked }: Props) {
    const accent = '#5aa9ff'

    const filter = (params: Record<string, string | number>) => {
        const base: Record<string, string | number> = { days }
        if (activeSiteId) base.site = activeSiteId
        router.get('/analytics', { ...base, ...params }, { preserveState: true })
    }

    return (
        <AppLayout title="Analytics">
            <div className="space-y-5">

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={activeSiteId ?? ''}
                        onChange={e => filter({ site: e.target.value, days })}
                        className="px-3 py-1.5 rounded border text-xs outline-none bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                    >
                        <option value="">All Sites</option>
                        {sites.map(s => <option key={s.site_id} value={s.site_id}>{s.name}</option>)}
                    </select>

                    <div className="flex rounded overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                        {[7, 14, 30, 90].map(d => (
                            <button
                                key={d}
                                onClick={() => filter({ days: d })}
                                className="px-3 py-1.5 text-xs font-medium transition-colors"
                                style={{
                                    background: days === d ? 'var(--border)' : 'transparent',
                                    color: days === d ? 'var(--fg)' : 'var(--fg-muted)',
                                    border: 'none', cursor: 'pointer',
                                }}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>

                    {activeSiteId && (
                        <button
                            onClick={() => router.get('/analytics', { days }, { preserveState: true })}
                            className="text-[11px] transition-colors hover:text-[#5aa9ff]"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            ✕ All sites
                        </button>
                    )}
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-3">
                    <StatCard label="Total Searches" value={stats.totalSearches.toLocaleString()} />
                    <StatCard label="Total Clicks"   value={stats.totalClicks.toLocaleString()} />
                    <StatCard
                        label="Click-through Rate"
                        value={`${stats.ctr}%`}
                        color={stats.ctr >= 10 ? '#22c55e' : undefined}
                    />
                    <StatCard
                        label="Zero-result Queries"
                        value={stats.zeroResultCount.toLocaleString()}
                        sub={stats.totalSearches > 0 ? `${Math.round(stats.zeroResultCount / stats.totalSearches * 100)}% of searches` : undefined}
                        color={stats.zeroResultCount > 0 ? '#f87171' : undefined}
                    />
                </div>

                {/* Volume chart */}
                <Section title={`Search Volume — Last ${days} Days`}>
                    <div className="px-4 pt-4 pb-2" style={{ color: 'var(--fg-muted)' }}>
                        {stats.totalSearches === 0
                            ? <Empty text="No searches recorded yet in this period." />
                            : <BarChart data={volume} accent={accent} />
                        }
                    </div>
                </Section>

                <div className="grid grid-cols-2 gap-5">

                    {/* Top queries */}
                    <Section title="Top Search Queries">
                        {topQueries.length === 0 ? <Empty /> : (
                            <div>
                                {topQueries.map((q, i) => (
                                    <div
                                        key={q.query}
                                        className="flex items-center gap-3 px-4 py-2.5"
                                        style={{ borderBottom: i < topQueries.length - 1 ? '1px solid var(--border)' : 'none' }}
                                    >
                                        <span className="text-[11px] w-5 text-right shrink-0 tabular-nums" style={{ color: 'var(--fg-muted)' }}>{i + 1}</span>
                                        <span className="flex-1 text-sm truncate" style={{ color: 'var(--fg)' }}>{q.query}</span>
                                        {!q.has_results && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: '#f8717122', color: '#f87171', border: '1px solid #f8717133' }}>
                                                0 results
                                            </span>
                                        )}
                                        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: accent }}>{q.count.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Top clicked */}
                    <Section title="Top Clicked Results">
                        {topClicked.length === 0 ? <Empty text="No clicks tracked yet." /> : (
                            <div>
                                {topClicked.map((r, i) => (
                                    <div
                                        key={r.url || r.title}
                                        className="flex items-center gap-3 px-4 py-2.5"
                                        style={{ borderBottom: i < topClicked.length - 1 ? '1px solid var(--border)' : 'none' }}
                                    >
                                        <span className="text-[11px] w-5 text-right shrink-0 tabular-nums" style={{ color: 'var(--fg-muted)' }}>{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm truncate" style={{ color: 'var(--fg)' }}>{r.title || '(no title)'}</div>
                                            {r.url && (
                                                <div className="text-[11px] truncate" style={{ color: accent }}>
                                                    {r.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: accent }}>{r.count.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                {/* Zero-result queries */}
                {zeroQueries.length > 0 && (
                    <Section title="Zero-Result Queries — What Visitors Can't Find">
                        <div className="grid grid-cols-2">
                            {zeroQueries.map((q, i) => (
                                <div
                                    key={q.query}
                                    className="flex items-center gap-3 px-4 py-2.5"
                                    style={{
                                        borderBottom: i < zeroQueries.length - 2 || (zeroQueries.length % 2 !== 0 && i === zeroQueries.length - 1) ? '1px solid var(--border)' : 'none',
                                        borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
                                    }}
                                >
                                    <span className="flex-1 text-sm truncate" style={{ color: 'var(--fg)' }}>{q.query}</span>
                                    <span className="text-xs font-semibold tabular-nums" style={{ color: '#f87171' }}>{q.count.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

            </div>
        </AppLayout>
    )
}
