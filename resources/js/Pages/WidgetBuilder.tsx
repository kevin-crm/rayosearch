import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import Button from '@/Components/Button'
import { Site, WidgetConfig, WidgetIcon, WidgetFieldMap, IndexField, SearchResult } from '@/types'

interface Props {
    sites: Site[]
}

const DEFAULT_CONFIG: WidgetConfig = {
    template: 'minimal',
    accent: '#5aa9ff',
    placeholder: 'Search…',
    theme: 'light',
    radius: 'rounded',
    iconLeft: 'search',
    iconRight: 'none',
}

function radiusPx(r: WidgetConfig['radius']) {
    return r === 'sharp' ? '3px' : r === 'rounded' ? '8px' : '22px'
}

function themeColors(theme: 'light' | 'dark') {
    if (theme === 'dark') return {
        bg: '#141414', panel: '#1e1e1e', border: '#2a2a2a',
        text: '#ffffff', muted: '#888888', hover: '#1a1a1a',
    }
    return {
        bg: '#ffffff', panel: '#f3f4f6', border: '#e5e7eb',
        text: '#111113', muted: '#6b7280', hover: '#f9fafb',
    }
}

function getCsrf(): string {
    return decodeURIComponent(
        document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
    )
}

// ── Icon SVGs ─────────────────────────────────────────────────────────────────

function WidgetIconSvg({ icon, color, size = 14 }: { icon: string; color: string; size?: number }) {
    const base: React.CSSProperties = { display: 'block', flexShrink: 0 }
    if (icon === 'search') return (
        <svg style={base} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4"/>
            <path d="M9.7 9.7L13.5 13.5"/>
        </svg>
    )
    if (icon === 'sparkle') return (
        <svg style={base} width={size} height={size} viewBox="0 0 16 16">
            <path d="M8 2L9.2 6.2L13.8 7.5L9.2 8.8L8 13.5L6.8 8.8L2.2 7.5L6.8 6.2Z" fill={color}/>
            <circle cx="12.5" cy="3" r="0.9" fill={color}/>
            <circle cx="3.5" cy="12" r="0.7" fill={color}/>
        </svg>
    )
    if (icon === 'search-ai') return (
        <svg style={base} width={size} height={size} viewBox="0 0 16 16" fill="none" strokeLinecap="round">
            <circle cx="5.5" cy="7" r="3.5" stroke={color} strokeWidth="1.6"/>
            <path d="M8.3 10L11.5 13.2" stroke={color} strokeWidth="1.6"/>
            <path d="M13 1.5L13.7 3.3L15.5 4L13.7 4.7L13 6.5L12.3 4.7L10.5 4L12.3 3.3Z" fill={color}/>
        </svg>
    )
    if (icon === 'arrow') return (
        <svg style={base} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h9M8.5 4.5L12.5 8 8.5 11.5"/>
        </svg>
    )
    return null
}

const ICON_OPTIONS: { value: WidgetIcon; label: string }[] = [
    { value: 'none',      label: 'None' },
    { value: 'search',    label: 'Search' },
    { value: 'sparkle',   label: 'Sparkle' },
    { value: 'search-ai', label: 'Search AI' },
    { value: 'arrow',     label: 'Arrow' },
]

function IconPicker({ label, value, onChange, accent }: { label: string; value: WidgetIcon; onChange: (v: WidgetIcon) => void; accent: string }) {
    return (
        <div>
            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{label}</span>
            <div className="flex gap-1.5 mt-1.5">
                {ICON_OPTIONS.map(opt => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            title={opt.label}
                            onClick={() => onChange(opt.value)}
                            className="flex items-center justify-center transition-all"
                            style={{
                                width: 32, height: 32,
                                borderRadius: '6px',
                                border: `2px solid ${active ? accent : 'var(--border)'}`,
                                background: active ? accent + '15' : 'var(--bg)',
                                color: active ? accent : 'var(--fg-muted)',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            {opt.value === 'none'
                                ? <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1 }}>—</span>
                                : <WidgetIconSvg icon={opt.value} color={active ? accent : 'var(--fg-muted)'} size={13} />
                            }
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Normalize raw Azure docs ─────────────────────────────────────────────────

function firstVal(doc: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = doc[k]
        if (v != null && v !== '') return String(v)
    }
    return ''
}

function normalizeResult(doc: Record<string, unknown>, fieldMap?: WidgetFieldMap): SearchResult {
    const pick = (key: keyof WidgetFieldMap, fallbacks: string[]): string => {
        const mapped = fieldMap?.[key]
        if (mapped && doc[mapped] != null && doc[mapped] !== '') return String(doc[mapped])
        return firstVal(doc, fallbacks)
    }
    return {
        id:      firstVal(doc, ['id', 'Id', 'ID', 'key']),
        title:   pick('title',   ['title', 'Title', 'name', 'Name', 'productName', 'product_name']),
        snippet: pick('snippet', ['description', 'Description', 'content', 'Content', 'body', 'Body', 'summary', 'Summary', 'excerpt']).slice(0, 300),
        url:     pick('url',     ['url', 'Url', 'URL', 'link', 'Link', 'pageUrl', 'page_url']),
        image:   pick('image',   ['image', 'imageUrl', 'image_url', 'thumbnail', 'thumbnailUrl', 'thumbnail_url', 'photo', 'photoUrl', 'img', 'picture']),
        price:   pick('price',   ['price', 'Price', 'salePrice', 'sale_price', 'listPrice', 'list_price', 'cost', 'amount']),
        score:   typeof doc['@search.score'] === 'number' ? doc['@search.score'] : 0,
    }
}

// ── Field Mapping ─────────────────────────────────────────────────────────────

const FIELD_MAP_KEYS: { key: keyof WidgetFieldMap; label: string }[] = [
    { key: 'title',   label: 'Title' },
    { key: 'snippet', label: 'Snippet / Description' },
    { key: 'url',     label: 'URL / Link' },
    { key: 'image',   label: 'Image URL' },
    { key: 'price',   label: 'Price' },
]

function FieldMapping({
    fieldMap, onChange, indexFields,
}: {
    fieldMap: WidgetFieldMap
    onChange: (fm: WidgetFieldMap) => void
    indexFields: IndexField[]
}) {
    const set = (key: keyof WidgetFieldMap, val: string) => {
        onChange({ ...fieldMap, [key]: val || undefined })
    }
    return (
        <div className="space-y-2">
            {FIELD_MAP_KEYS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                    <span className="text-[11px] w-28 shrink-0" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                    <select
                        value={fieldMap[key] ?? ''}
                        onChange={e => set(key, e.target.value)}
                        className="flex-1 px-2 py-1 rounded border text-[11px] outline-none focus:border-[#5aa9ff] transition-colors bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                    >
                        <option value="">— auto detect —</option>
                        {indexFields.map(f => (
                            <option key={f.name} value={f.name}>{f.name}</option>
                        ))}
                    </select>
                </div>
            ))}
        </div>
    )
}

// ── Image placeholder ────────────────────────────────────────────────────────

function ImageThumb({ src, accent, size = 56, radius = '6px' }: { src: string; accent: string; size?: number; radius?: string }) {
    const [err, setErr] = useState(false)
    if (src && !err) {
        return (
            <img
                src={src}
                alt=""
                onError={() => setErr(true)}
                style={{ width: size, height: size, objectFit: 'cover', borderRadius: radius, flexShrink: 0, display: 'block' }}
            />
        )
    }
    return (
        <div style={{
            width: size, height: size, borderRadius: radius, flexShrink: 0,
            background: accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 16 16" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7">
                <rect x="1" y="1" width="14" height="14" rx="2"/>
                <circle cx="5.5" cy="5.5" r="1.5"/>
                <path d="M1 11l4-4 3 3 2-2 5 5"/>
            </svg>
        </div>
    )
}

// ── Live Preview ─────────────────────────────────────────────────────────────

function WidgetPreview({ config, siteId }: { config: WidgetConfig; siteId: string }) {
    const fieldMap = config.fieldMap ?? {}
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[] | null>(null)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const effectiveTheme = config.theme === 'auto' ? 'dark' : config.theme
    const c = themeColors(effectiveTheme)
    const radius = radiusPx(config.radius)

    const search = useCallback(async (q: string) => {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        setLoading(true)
        try {
            const res = await fetch(
                `/sites/${encodeURIComponent(siteId)}/search-test?query=${encodeURIComponent(q)}`,
                { signal: ctrl.signal, headers: { 'X-Requested-With': 'XMLHttpRequest' } }
            )
            const data = await res.json()
            const raw: Record<string, unknown>[] = data.results ?? []
            setResults(raw.map(doc => normalizeResult(doc, fieldMap)))
            setTotal(data.total ?? 0)
        } catch { /* aborted */ }
        finally { setLoading(false) }
    }, [siteId])

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value
        setQuery(q)
        if (timerRef.current) clearTimeout(timerRef.current)
        if (q.trim().length >= 2) {
            timerRef.current = setTimeout(() => search(q), 300)
        } else {
            setResults(null)
        }
    }

    const hasLeft  = (config.iconLeft  ?? 'none') !== 'none'
    const hasRight = (config.iconRight ?? 'none') !== 'none'

    const inputStyle: React.CSSProperties = {
        width: '100%',
        paddingTop: '10px', paddingBottom: '10px',
        paddingLeft:  hasLeft  ? '36px' : '14px',
        paddingRight: (hasRight || loading) ? '36px' : '14px',
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius,
        color: c.text, fontSize: '14px', outline: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transition: 'border-color .15s', boxSizing: 'border-box',
    }

    const iconStyle = (side: 'left' | 'right'): React.CSSProperties => ({
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [side]: '11px', pointerEvents: 'none', display: 'flex', alignItems: 'center',
    })

    return (
        <div style={{ background: c.bg, padding: '20px', borderRadius: '10px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Input */}
            <div style={{ position: 'relative' }}>
                {hasLeft && (
                    <div style={iconStyle('left')}>
                        <WidgetIconSvg icon={config.iconLeft} color={c.muted} size={14} />
                    </div>
                )}
                <input
                    value={query}
                    onChange={handleInput}
                    placeholder={config.placeholder}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = config.accent }}
                    onBlur={e => { e.currentTarget.style.borderColor = c.border }}
                />
                {loading && (
                    <div style={{
                        position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
                        width: '14px', height: '14px', border: `2px solid ${c.border}`,
                        borderTopColor: config.accent, borderRadius: '50%',
                        animation: 'aisg-spin .6s linear infinite',
                    }} />
                )}
                {hasRight && !loading && (
                    <div style={iconStyle('right')}>
                        <WidgetIconSvg icon={config.iconRight} color={c.muted} size={14} />
                    </div>
                )}
            </div>

            {/* No results */}
            {results !== null && results.length === 0 && (
                <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '13px', color: c.muted, padding: '20px 0' }}>
                    No results found.
                </div>
            )}

            {/* Results */}
            {results !== null && results.length > 0 && (
                <div style={{ marginTop: '10px', background: config.bgColor || c.panel, border: `1px solid ${c.border}`, borderRadius: radius, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', borderBottom: `1px solid ${c.border}`, fontSize: '11px', color: c.muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                            {total} result{total !== 1 ? 's' : ''} for{' '}
                            <span style={{ color: c.text, fontWeight: 600 }}>&ldquo;{query}&rdquo;</span>
                        </span>
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: '#22c55e22', color: '#22c55e', borderRadius: '10px', fontWeight: 600, letterSpacing: '0.02em' }}>
                            LIVE
                        </span>
                    </div>

                    {/* Minimal */}
                    {config.template === 'minimal' && results.map((r, i) => (
                        <div key={r.id || i} style={{ padding: '10px 14px', borderBottom: i < results.length - 1 ? `1px solid ${c.border}` : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <ImageThumb src={r.image} accent={config.accent} size={40} radius={radiusPx(config.radius)} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.title || r.url || '(no title)'}
                                </div>
                                {r.snippet && (
                                    <div style={{ fontSize: '12px', color: c.muted, marginTop: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                        {r.snippet}
                                    </div>
                                )}
                                {r.url && <div style={{ fontSize: '11px', color: config.accent, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</div>}
                            </div>
                        </div>
                    ))}

                    {/* Card — horizontal with accent stripe + thumbnail */}
                    {config.template === 'card' && (
                        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {results.map((r, i) => (
                                <div key={r.id || i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${config.accent}`, borderRadius: radius }}>
                                    <ImageThumb src={r.image} accent={config.accent} size={56} radius={radiusPx(config.radius)} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.title || r.url || '(no title)'}
                                        </div>
                                        {r.snippet && (
                                            <div style={{ fontSize: '12px', color: c.muted, marginTop: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                                {r.snippet}
                                            </div>
                                        )}
                                        {r.url && <div style={{ fontSize: '11px', color: config.accent, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Block — image-first grid cards */}
                    {config.template === 'block' && (
                        <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${config.cardMinWidth ?? 180}px, 1fr))`, gap: '10px' }}>
                            {results.map((r, i) => (
                                <div key={r.id || i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius, overflow: 'hidden' }}>
                                    {r.image ? (
                                        <img
                                            src={r.image}
                                            alt={r.title}
                                            style={{ width: '100%', height: `${config.cardImageHeight ?? 120}px`, objectFit: 'cover', display: 'block', background: c.panel }}
                                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: `${config.cardImageHeight ?? 120}px`, background: config.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke={config.accent} strokeWidth="1.5" opacity="0.6">
                                                <rect x="1" y="1" width="14" height="14" rx="2"/>
                                                <circle cx="5.5" cy="5.5" r="1.5"/>
                                                <path d="M1 11l4-4 3 3 2-2 5 5"/>
                                            </svg>
                                        </div>
                                    )}
                                    <div style={{ padding: '10px 12px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: c.text, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, lineHeight: '1.4' }}>
                                            {r.title || r.url || '(no title)'}
                                        </div>
                                        {r.snippet && (
                                            <div style={{ fontSize: '11px', color: c.muted, marginTop: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                                {r.snippet}
                                            </div>
                                        )}
                                        {r.url && <div style={{ fontSize: '10px', color: config.accent, marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Product — grid of product cards with price */}
                    {config.template === 'product' && (
                        <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${config.cardMinWidth ?? 160}px, 1fr))`, gap: '10px' }}>
                            {results.map((r, i) => (
                                <a key={r.id || i} href={r.url || undefined} target="_blank" rel="noopener noreferrer" style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius, overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{ width: '100%', height: `${config.cardImageHeight ?? 160}px`, overflow: 'hidden', flexShrink: 0 }}>
                                        {r.image ? (
                                            <img
                                                src={r.image}
                                                alt={r.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: config.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke={config.accent} strokeWidth="1.5" opacity="0.6">
                                                    <rect x="1" y="1" width="14" height="14" rx="2"/>
                                                    <circle cx="5.5" cy="5.5" r="1.5"/>
                                                    <path d="M1 11l4-4 3 3 2-2 5 5"/>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: c.text, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, lineHeight: '1.4' }}>
                                            {r.title || '(no title)'}
                                        </div>
                                        {r.snippet && (
                                            <div style={{ fontSize: '11px', color: c.muted, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                                {r.snippet}
                                            </div>
                                        )}
                                        <div style={{ marginTop: 'auto', paddingTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            {r.price ? (
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: config.accent }}>{r.price}</span>
                                            ) : <span />}
                                            {r.url && (
                                                <span style={{ fontSize: '10px', color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                                                    {r.url.replace(/^https?:\/\//, '').split('/')[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                    {config.resultsPageUrl && (
                        <a
                            href={`${config.resultsPageUrl}?q=${encodeURIComponent(query)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block', textAlign: 'center',
                                padding: '9px 14px', fontSize: '12px',
                                color: config.accent, textDecoration: 'none',
                                borderTop: `1px solid ${c.border}`, fontWeight: 500,
                            }}
                        >
                            View all {total} results →
                        </a>
                    )}
                </div>
            )}

            {results === null && !loading && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: c.muted, textAlign: 'center' }}>
                    Type 2+ characters to search live
                </div>
            )}
        </div>
    )
}

// ── Results Page Preview ──────────────────────────────────────────────────────

function ResultsPagePreview({
    config, siteId, indexFields,
}: { config: WidgetConfig; siteId: string; indexFields: IndexField[] }) {
    const fieldMap = config.fieldMap ?? {}
    const filterFields = config.filterFields ?? []
    const layout = config.resultsLayout ?? 'list'
    const perPage = config.resultsPerPage ?? 12
    const cardMinWidth = config.resultsCardMinWidth ?? 140
    const cardImageHeight = config.resultsCardImageHeight ?? 140

    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[] | null>(null)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [facetData, setFacetData] = useState<Record<string, { value: string; count: number }[]>>({})
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
    const [collapsedFacets, setCollapsedFacets] = useState<Set<string>>(new Set())

    const toggleFacet = (name: string) =>
        setCollapsedFacets(prev => {
            const next = new Set(prev)
            next.has(name) ? next.delete(name) : next.add(name)
            return next
        })
    const abortRef = useRef<AbortController | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const effectiveTheme = config.theme === 'auto' ? 'dark' : config.theme
    const c = themeColors(effectiveTheme)
    const radius = radiusPx(config.radius)
    const facetDisplayFields = indexFields.filter(f => filterFields.includes(f.name))

    const buildFilter = (filters: Record<string, string[]>): string => {
        const parts: string[] = []
        for (const [field, vals] of Object.entries(filters)) {
            if (!vals.length) continue
            const clauses = vals.map(v => `${field} eq '${v.replace(/'/g, "''")}'`)
            parts.push(clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`)
        }
        return parts.join(' and ')
    }

    const doSearch = useCallback(async (q: string, filters: Record<string, string[]>) => {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        setLoading(true)
        try {
            const params = new URLSearchParams({ query: q })
            filterFields.forEach(f => params.append('facets[]', f))
            const filterStr = buildFilter(filters)
            if (filterStr) params.set('filter', filterStr)
            const res = await fetch(
                `/sites/${encodeURIComponent(siteId)}/search-test?${params}`,
                { signal: ctrl.signal, headers: { 'X-Requested-With': 'XMLHttpRequest' } }
            )
            const data = await res.json()
            setResults((data.results ?? []).map((doc: Record<string, unknown>) => normalizeResult(doc, fieldMap)))
            setTotal(data.total ?? 0)
            const newFacets: Record<string, { value: string; count: number }[]> = {}
            for (const [field, vals] of Object.entries(data.facets ?? {})) {
                newFacets[field] = vals as { value: string; count: number }[]
            }
            setFacetData(newFacets)
        } catch { /* aborted */ }
        finally { setLoading(false) }
    }, [siteId, filterFields, fieldMap]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleInput = (val: string) => {
        setQuery(val)
        if (timerRef.current) clearTimeout(timerRef.current)
        if (val.trim().length >= 2) {
            timerRef.current = setTimeout(() => doSearch(val, activeFilters), 300)
        } else {
            setResults(null)
            setFacetData({})
            setActiveFilters({})
        }
    }

    const toggleFilter = (field: string, value: string) => {
        setActiveFilters(prev => {
            const curr = prev[field] ?? []
            const next_vals = curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value]
            const next = { ...prev, [field]: next_vals }
            if (query.trim().length >= 2) doSearch(query, next)
            return next
        })
    }

    const clearFilters = () => {
        setActiveFilters({})
        if (query.trim().length >= 2) doSearch(query, {})
    }

    const hasActiveFilters = Object.values(activeFilters).some(v => v.length > 0)
    const hasLeft = (config.iconLeft ?? 'none') !== 'none'
    const hasRight = (config.iconRight ?? 'none') !== 'none'

    return (
        <div style={{ background: c.bg, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', color: c.text, overflow: 'hidden' }}>
            {/* Search bar */}
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, background: c.panel, flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                    {hasLeft && (
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                            <WidgetIconSvg icon={config.iconLeft} color={c.muted} size={13} />
                        </span>
                    )}
                    <input
                        value={query}
                        onChange={e => handleInput(e.target.value)}
                        placeholder={config.placeholder}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            paddingTop: '8px', paddingBottom: '8px',
                            paddingLeft: hasLeft ? '34px' : '12px',
                            paddingRight: (hasRight || loading) ? '34px' : '12px',
                            background: c.bg, border: `1px solid ${c.border}`,
                            borderRadius: radius, color: c.text, fontSize: '13px', outline: 'none',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = config.accent}
                        onBlur={e => e.currentTarget.style.borderColor = c.border}
                    />
                    {loading && (
                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', border: `2px solid ${c.border}`, borderTopColor: config.accent, borderRadius: '50%', animation: 'aisg-spin .6s linear infinite' }} />
                    )}
                    {hasRight && !loading && (
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                            <WidgetIconSvg icon={config.iconRight} color={c.muted} size={13} />
                        </span>
                    )}
                </div>
            </div>

            {/* Body: sidebar + results */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Filter sidebar */}
                {facetDisplayFields.length > 0 && (
                    <div style={{ width: '176px', flexShrink: 0, borderRight: `1px solid ${c.border}`, overflowY: 'auto', padding: '14px 12px', background: config.filtersSidebarBg || c.panel }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.muted }}>Filters</span>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} style={{ fontSize: '10px', color: config.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>
                            )}
                        </div>
                        {facetDisplayFields.map(field => {
                            const vals = facetData[field.name] ?? []
                            const active = activeFilters[field.name] ?? []
                            const collapsed = collapsedFacets.has(field.name)
                            return (
                                <div key={field.name} style={{ marginBottom: '12px' }}>
                                    {/* Collapsible header */}
                                    <button
                                        onClick={() => toggleFacet(field.name)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px 0', marginBottom: collapsed ? 0 : '4px' }}
                                    >
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: c.text, textTransform: 'capitalize' }}>{field.name}</span>
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={c.muted} strokeWidth="1.5" strokeLinecap="round" style={{ transition: 'transform .15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                                            <path d="M2 3.5l3 3 3-3"/>
                                        </svg>
                                    </button>
                                    {!collapsed && (
                                        <>
                                            {vals.length === 0 && (
                                                <div style={{ fontSize: '11px', color: c.muted, fontStyle: 'italic' }}>
                                                    {results === null ? 'Search to load' : 'No values'}
                                                </div>
                                            )}
                                            {vals.map(({ value, count }) => (
                                                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={active.includes(value)}
                                                        onChange={() => toggleFilter(field.name, value)}
                                                        style={{ accentColor: config.accent, cursor: 'pointer', margin: 0, width: '12px', height: '12px' }}
                                                    />
                                                    <span style={{ flex: 1, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                                                    <span style={{ fontSize: '10px', color: c.muted, flexShrink: 0 }}>({count})</span>
                                                </label>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Results */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                    {results === null && !loading && (
                        <div style={{ textAlign: 'center', color: c.muted, fontSize: '12px', paddingTop: '40px' }}>
                            Type to search
                        </div>
                    )}
                    {results !== null && results.length === 0 && (
                        <div style={{ textAlign: 'center', color: c.muted, fontSize: '12px', paddingTop: '20px' }}>No results found.</div>
                    )}
                    {results !== null && results.length > 0 && (
                        <>
                            <div style={{ fontSize: '11px', color: c.muted, marginBottom: '12px' }}>
                                {total} result{total !== 1 ? 's' : ''} for <strong style={{ color: c.text }}>"{query}"</strong>
                                {hasActiveFilters && (
                                    <span> · <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: config.accent, cursor: 'pointer', fontSize: '11px', padding: 0 }}>Clear filters</button></span>
                                )}
                            </div>
                            {/* Grid */}
                            {layout === 'grid' && (
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}px, 1fr))`, gap: '10px' }}>
                                    {results.slice(0, perPage).map((r, i) => (
                                        <a key={r.id || i} href={r.url || undefined} target="_blank" rel="noopener noreferrer"
                                            style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius, overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}>
                                            <ImageThumb src={r.image} accent={config.accent} size={cardImageHeight} radius="0" />
                                            <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || '(no title)'}</div>
                                                {r.snippet && <div style={{ fontSize: '11px', color: c.muted, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{r.snippet}</div>}
                                                <div style={{ marginTop: 'auto', paddingTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                    {r.price && <span style={{ fontSize: '12px', fontWeight: 700, color: config.accent }}>{r.price}</span>}
                                                    {r.url && <span style={{ fontSize: '10px', color: config.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>{r.url.replace(/^https?:\/\//, '').split('/')[0]}</span>}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                            {/* List */}
                            {layout === 'list' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {results.slice(0, perPage).map((r, i) => (
                                        <a key={r.id || i} href={r.url || undefined} target="_blank" rel="noopener noreferrer"
                                            style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius, textDecoration: 'none', color: 'inherit' }}>
                                            <ImageThumb src={r.image} accent={config.accent} size={48} radius={radius} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || '(no title)'}</div>
                                                {r.snippet && <div style={{ fontSize: '11px', color: c.muted, marginTop: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{r.snippet}</div>}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                                                    {r.price && <span style={{ fontSize: '12px', fontWeight: 700, color: config.accent }}>{r.price}</span>}
                                                    {r.url && <span style={{ fontSize: '10px', color: config.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>{r.url.replace(/^https?:\/\//, '')}</span>}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Template Thumbnail ────────────────────────────────────────────────────────

function TemplateThumbnail({ type, accent, active }: { type: WidgetConfig['template']; accent: string; active: boolean }) {
    const border = active ? accent : 'var(--border)'
    const fill = active ? accent + '33' : 'var(--border)'
    const imgFill = active ? accent + '22' : 'var(--panel)'

    return (
        <div style={{ border: `2px solid ${border}`, borderRadius: '8px', padding: '8px', background: 'var(--bg)', cursor: 'pointer', transition: 'border-color .15s', width: '100%' }}>
            <div style={{ height: '8px', background: 'var(--border)', borderRadius: '3px', marginBottom: '6px' }} />

            {type === 'minimal' && [0, 1, 2].map(i => (
                <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: i < 2 ? '4px' : 0 }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: imgFill, flexShrink: 0 }} />
                    <div style={{ flex: 1, height: '6px', background: fill, borderRadius: '2px' }} />
                </div>
            ))}

            {type === 'card' && [0, 1].map(i => (
                <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: i < 1 ? '4px' : 0, borderLeft: `2px solid ${active ? accent : 'var(--border)'}`, paddingLeft: '4px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '2px', background: imgFill, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ height: '5px', background: fill, borderRadius: '2px', marginBottom: '3px' }} />
                        <div style={{ height: '4px', background: fill, borderRadius: '2px', opacity: 0.5 }} />
                    </div>
                </div>
            ))}

            {type === 'block' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {[0, 1].map(i => (
                        <div key={i} style={{ borderRadius: '3px', overflow: 'hidden', border: `1px solid ${active ? accent + '44' : 'var(--border)'}` }}>
                            <div style={{ height: '22px', background: imgFill }} />
                            <div style={{ padding: '3px 4px' }}>
                                <div style={{ height: '4px', background: fill, borderRadius: '2px', marginBottom: '2px' }} />
                                <div style={{ height: '3px', background: fill, borderRadius: '2px', opacity: 0.5 }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {type === 'product' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {[0, 1].map(i => (
                        <div key={i} style={{ borderRadius: '3px', overflow: 'hidden', border: `1px solid ${active ? accent + '44' : 'var(--border)'}` }}>
                            <div style={{ height: '20px', background: imgFill }} />
                            <div style={{ padding: '3px 4px' }}>
                                <div style={{ height: '4px', background: fill, borderRadius: '2px', marginBottom: '3px' }} />
                                <div style={{ height: '5px', background: active ? accent + '88' : fill, borderRadius: '2px', width: '55%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Toggle Group ──────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
    options, value, onChange,
}: {
    options: { value: T; label: string }[]
    value: T
    onChange: (v: T) => void
}) {
    return (
        <div className="flex rounded overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {options.map(o => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    className="flex-1 py-1.5 text-xs font-medium transition-colors"
                    style={{
                        background: value === o.value ? 'var(--border)' : 'transparent',
                        color: value === o.value ? 'var(--fg)' : 'var(--fg-muted)',
                        border: 'none', cursor: 'pointer',
                    }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WidgetBuilder({ sites }: Props) {
    const [activeSiteId, setActiveSiteId] = useState<string | null>(sites[0]?.site_id ?? null)
    const activeSite = sites.find(s => s.site_id === activeSiteId) ?? null

    const [configs, setConfigs] = useState<Record<string, WidgetConfig>>(() => {
        const map: Record<string, WidgetConfig> = {}
        for (const s of sites) {
            map[s.site_id] = s.widget_config ?? { ...DEFAULT_CONFIG }
        }
        return map
    })

    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [embedOpen, setEmbedOpen] = useState(false)
    const [placement, setPlacement] = useState<'inline' | 'target'>('inline')
    const [targetSelector, setTargetSelector] = useState('')
    const [indexFields, setIndexFields] = useState<IndexField[]>([])
    const [activeTab, setActiveTab] = useState<'searchbar' | 'resultspage'>('searchbar')

    const config = activeSiteId ? (configs[activeSiteId] ?? DEFAULT_CONFIG) : DEFAULT_CONFIG

    useEffect(() => {
        if (!activeSiteId) return
        setIndexFields([])
        fetch(`/sites/${activeSiteId}/index-fields`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.fields) setIndexFields(data.fields) })
            .catch(() => {})
    }, [activeSiteId])

    const set = <K extends keyof WidgetConfig>(key: K, val: WidgetConfig[K]) => {
        if (!activeSiteId) return
        setConfigs(prev => ({ ...prev, [activeSiteId]: { ...prev[activeSiteId], [key]: val } }))
        setSaveMsg(null)
    }

    const save = async () => {
        if (!activeSite) return
        setSaving(true)
        setSaveMsg(null)
        try {
            const res = await fetch(`/sites/${activeSite.site_id}/widget-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({ widget_config: config }),
            })
            const data = await res.json()
            if (!res.ok || data.error) {
                setSaveMsg('Save failed: ' + (data.error ?? res.status))
            } else {
                setSaveMsg('Saved!')
                setTimeout(() => setSaveMsg(null), 2500)
            }
        } catch {
            setSaveMsg('Request failed.')
        } finally {
            setSaving(false)
        }
    }

    const resolvedTarget = placement === 'target' ? targetSelector.trim() : ''

    const fm = config.fieldMap ?? {}
    const sharedAttrs = activeSite ? [
        `  src="${window.location.origin}/widget.js"`,
        `  data-site="${activeSite.site_id}"`,
        `  data-api="${window.location.origin}"`,
        `  data-template="${config.template}"`,
        `  data-accent="${config.accent}"`,
        `  data-theme="${config.theme}"`,
        `  data-radius="${config.radius}"`,
        ...(fm.title   ? [`  data-field-title="${fm.title}"`]   : []),
        ...(fm.snippet ? [`  data-field-snippet="${fm.snippet}"`] : []),
        ...(fm.url     ? [`  data-field-url="${fm.url}"`]     : []),
        ...(fm.image   ? [`  data-field-image="${fm.image}"`]   : []),
        ...(fm.price   ? [`  data-field-price="${fm.price}"`]   : []),
    ] : []

    const embedScript = activeSite ? [
        `<script`,
        ...sharedAttrs,
        `  data-placeholder="${config.placeholder}"`,
        ...(config.iconLeft  && config.iconLeft  !== 'none' ? [`  data-icon-left="${config.iconLeft}"`]  : []),
        ...(config.iconRight && config.iconRight !== 'none' ? [`  data-icon-right="${config.iconRight}"`] : []),
        ...(config.bgColor ? [`  data-bg-color="${config.bgColor}"`] : []),
        ...(config.resultsPageUrl ? [`  data-results-page="${config.resultsPageUrl}"`] : []),
        ...((config.template === 'block' || config.template === 'product') && config.cardMinWidth ? [`  data-card-min-width="${config.cardMinWidth}"`] : []),
        ...((config.template === 'block' || config.template === 'product') && config.cardImageHeight ? [`  data-card-image-height="${config.cardImageHeight}"`] : []),
        ...(resolvedTarget ? [`  data-target="${resolvedTarget}"`] : []),
        `></script>`,
    ].join('\n') : ''

    const resultsPageScript = activeSite ? [
        `<script`,
        ...sharedAttrs,
        `  data-mode="results-page"`,
        ...(config.filterFields?.length ? [`  data-filter-fields="${config.filterFields.join(',')}"`] : []),
        ...(config.resultsPerPage ? [`  data-results-per-page="${config.resultsPerPage}"`] : []),
        ...(config.resultsLayout ? [`  data-results-layout="${config.resultsLayout}"`] : []),
        ...(config.resultsCardMinWidth ? [`  data-results-card-min-width="${config.resultsCardMinWidth}"`] : []),
        ...(config.resultsCardImageHeight ? [`  data-results-card-image-height="${config.resultsCardImageHeight}"`] : []),
        ...(config.filtersSidebarBg ? [`  data-filters-sidebar-bg="${config.filtersSidebarBg}"`] : []),
        `></script>`,
    ].join('\n') : ''

    const activeScript = activeTab === 'resultspage' ? resultsPageScript : embedScript

    const copyScript = () => {
        navigator.clipboard.writeText(activeScript)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const labelClass = 'block text-xs font-medium mb-2'
    const labelStyle = { color: 'var(--fg-muted)' }

    if (sites.length === 0) {
        return (
            <AppLayout title="Widget Builder">
                <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: 'var(--fg-muted)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <path d="M17.5 14v6M14 17.5h6"/>
                    </svg>
                    <p className="text-sm">No sites yet. Create a site to start building a widget.</p>
                    <Link href="/sites" className="text-xs font-medium text-[#5aa9ff] hover:underline">
                        Go to Sites →
                    </Link>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout title="Widget Builder">
            <div className="flex flex-col gap-5 h-full">

                {/* Site tabs */}
                <div className="flex items-center gap-1 overflow-x-auto shrink-0">
                    {sites.map(s => (
                        <button
                            key={s.site_id}
                            onClick={() => { setActiveSiteId(s.site_id); setSaveMsg(null) }}
                            className="px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0"
                            style={{
                                background: activeSiteId === s.site_id ? 'var(--nav-active)' : 'transparent',
                                color: activeSiteId === s.site_id ? 'var(--fg)' : 'var(--fg-muted)',
                                border: `1px solid ${activeSiteId === s.site_id ? 'var(--border)' : 'transparent'}`,
                                cursor: 'pointer',
                            }}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>

                {/* Page tabs */}
                <div className="flex items-center gap-0 shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
                    {(['searchbar', 'resultspage'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px"
                            style={{
                                borderColor: activeTab === tab ? config.accent : 'transparent',
                                color: activeTab === tab ? 'var(--fg)' : 'var(--fg-muted)',
                                background: 'none', cursor: 'pointer',
                            }}
                        >
                            {tab === 'searchbar' ? 'Search Bar' : 'Results Page'}
                        </button>
                    ))}
                </div>

                {/* Two-column layout */}
                <div className="flex gap-5 flex-1 min-h-0">

                    {/* ── Left: Controls ── */}
                    <div
                        className="w-72 shrink-0 rounded-lg border overflow-hidden flex flex-col"
                        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}
                    >
                        <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                                Settings
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">

                            {/* ── Results Page Settings ── */}
                            {activeTab === 'resultspage' && (
                                <div className="space-y-5">

                                    {/* Results Page URL */}
                                    <div>
                                        <label className={labelClass} style={labelStyle}>Results Page URL</label>
                                        <p className="text-[11px] mb-2" style={{ color: 'var(--fg-muted)' }}>
                                            Where on your site the results page is hosted (e.g. <code className="font-mono">/search</code>). The search bar will link "View all" here.
                                        </p>
                                        <input
                                            type="text"
                                            value={config.resultsPageUrl ?? ''}
                                            onChange={e => set('resultsPageUrl', e.target.value || undefined)}
                                            placeholder="/search"
                                            maxLength={500}
                                            className="w-full px-2.5 py-1.5 rounded border text-xs outline-none focus:border-[#5aa9ff] transition-colors bg-transparent font-mono"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                        />
                                    </div>

                                    {/* Filter Fields */}
                                    <div>
                                        <label className={labelClass} style={labelStyle}>Filter Sidebar Fields</label>
                                        <p className="text-[11px] mb-2" style={{ color: 'var(--fg-muted)' }}>
                                            Pick filterable index fields to show as sidebar filters.
                                        </p>
                                        {indexFields.filter(f => f.filterable || f.facetable).length === 0 ? (
                                            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                                No filterable fields in the index.
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {indexFields.filter(f => f.filterable || f.facetable).map(field => {
                                                    const active = (config.filterFields ?? []).includes(field.name)
                                                    return (
                                                        <label key={field.name} className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={active}
                                                                onChange={() => {
                                                                    const current = config.filterFields ?? []
                                                                    const next = active
                                                                        ? current.filter(f => f !== field.name)
                                                                        : [...current, field.name]
                                                                    set('filterFields', next.length > 0 ? next : undefined)
                                                                }}
                                                                style={{ accentColor: config.accent, cursor: 'pointer' }}
                                                            />
                                                            <span className="text-xs" style={{ color: 'var(--fg)' }}>{field.name}</span>
                                                            {field.facetable && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: config.accent + '22', color: config.accent }}>facetable</span>
                                                            )}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Filters Sidebar Background */}
                                    <div>
                                        <label className={labelClass} style={labelStyle}>Filters Sidebar Background</label>
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="color"
                                                value={config.filtersSidebarBg || '#f3f4f6'}
                                                onChange={e => set('filtersSidebarBg', e.target.value)}
                                                className="w-9 h-9 rounded border cursor-pointer p-0.5"
                                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                                            />
                                            <input
                                                type="text"
                                                value={config.filtersSidebarBg || ''}
                                                onChange={e => set('filtersSidebarBg', e.target.value || undefined)}
                                                placeholder="Default"
                                                maxLength={20}
                                                className="flex-1 px-2.5 py-1.5 rounded border text-xs font-mono outline-none focus:border-[#5aa9ff] transition-colors bg-transparent"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                            />
                                            {config.filtersSidebarBg && (
                                                <button
                                                    onClick={() => set('filtersSidebarBg', undefined)}
                                                    className="text-[11px] px-2 py-1 rounded border transition-colors"
                                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                                    title="Reset"
                                                >✕</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Results Per Page */}
                                    <div>
                                        <label className={labelClass} style={labelStyle}>Results Per Page</label>
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="range"
                                                min={4} max={48} step={4}
                                                value={config.resultsPerPage ?? 12}
                                                onChange={e => set('resultsPerPage', Number(e.target.value))}
                                                className="flex-1"
                                                style={{ accentColor: config.accent }}
                                            />
                                            <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--fg)' }}>
                                                {config.resultsPerPage ?? 12}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Layout */}
                                    <div>
                                        <label className={labelClass} style={labelStyle}>Results Layout</label>
                                        <ToggleGroup
                                            options={[
                                                { value: 'list', label: 'List' },
                                                { value: 'grid', label: 'Grid' },
                                            ]}
                                            value={config.resultsLayout ?? 'list'}
                                            onChange={v => set('resultsLayout', v)}
                                        />
                                    </div>

                                    {/* Card Size */}
                                    {(config.resultsLayout ?? 'list') === 'grid' && (
                                        <div>
                                            <label className={labelClass} style={labelStyle}>Card Size</label>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Min width</span>
                                                        <span className="text-[11px] font-mono" style={{ color: 'var(--fg)' }}>{config.resultsCardMinWidth ?? 140}px</span>
                                                    </div>
                                                    <input type="range" min={80} max={400} step={10}
                                                        value={config.resultsCardMinWidth ?? 140}
                                                        onChange={e => set('resultsCardMinWidth', Number(e.target.value))}
                                                        className="w-full" style={{ accentColor: config.accent }}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Image height</span>
                                                        <span className="text-[11px] font-mono" style={{ color: 'var(--fg)' }}>{config.resultsCardImageHeight ?? 140}px</span>
                                                    </div>
                                                    <input type="range" min={60} max={400} step={10}
                                                        value={config.resultsCardImageHeight ?? 140}
                                                        onChange={e => set('resultsCardImageHeight', Number(e.target.value))}
                                                        className="w-full" style={{ accentColor: config.accent }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* ── Search Bar Settings ── */}
                            {activeTab === 'searchbar' && <div className="space-y-5">

                            {/* Template — 2×2 grid */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Template</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['minimal', 'card', 'block', 'product'] as const).map(t => (
                                        <button key={t} onClick={() => set('template', t)} className="text-left">
                                            <TemplateThumbnail type={t} accent={config.accent} active={config.template === t} />
                                            <p className="text-[10px] text-center mt-1.5 font-medium capitalize" style={{ color: config.template === t ? 'var(--fg)' : 'var(--fg-muted)' }}>
                                                {t}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Accent */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Accent Color</label>
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="color"
                                        value={config.accent}
                                        onChange={e => set('accent', e.target.value)}
                                        className="w-9 h-9 rounded border cursor-pointer p-0.5"
                                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                                    />
                                    <input
                                        type="text"
                                        value={config.accent}
                                        onChange={e => set('accent', e.target.value)}
                                        maxLength={7}
                                        className="flex-1 px-2.5 py-1.5 rounded border text-xs font-mono outline-none focus:border-[#5aa9ff] transition-colors bg-transparent"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                    />
                                </div>
                            </div>

                            {/* Theme */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Widget Theme</label>
                                <ToggleGroup
                                    options={[
                                        { value: 'light', label: 'Light' },
                                        { value: 'dark', label: 'Dark' },
                                        { value: 'auto', label: 'Auto' },
                                    ]}
                                    value={config.theme}
                                    onChange={v => set('theme', v)}
                                />
                                {config.theme === 'auto' && (
                                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                                        Follows the visitor's system preference.
                                    </p>
                                )}
                            </div>

                            {/* Shape */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Shape</label>
                                <ToggleGroup
                                    options={[
                                        { value: 'sharp', label: 'Sharp' },
                                        { value: 'rounded', label: 'Rounded' },
                                        { value: 'pill', label: 'Pill' },
                                    ]}
                                    value={config.radius}
                                    onChange={v => set('radius', v)}
                                />
                            </div>

                            {/* Icons */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Icons</label>
                                <div className="space-y-3">
                                    <IconPicker
                                        label="Left"
                                        value={config.iconLeft ?? 'none'}
                                        onChange={v => set('iconLeft', v)}
                                        accent={config.accent}
                                    />
                                    <IconPicker
                                        label="Right"
                                        value={config.iconRight ?? 'none'}
                                        onChange={v => set('iconRight', v)}
                                        accent={config.accent}
                                    />
                                </div>
                            </div>

                            {/* Placeholder */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Placeholder Text</label>
                                <input
                                    type="text"
                                    value={config.placeholder}
                                    onChange={e => set('placeholder', e.target.value)}
                                    maxLength={80}
                                    className="w-full px-2.5 py-1.5 rounded border text-xs outline-none focus:border-[#5aa9ff] transition-colors bg-transparent"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                />
                            </div>

                            {/* Results Background Color */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Results Background</label>
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="color"
                                        value={config.bgColor || '#f3f4f6'}
                                        onChange={e => set('bgColor', e.target.value)}
                                        className="w-9 h-9 rounded border cursor-pointer p-0.5"
                                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                                    />
                                    <input
                                        type="text"
                                        value={config.bgColor || ''}
                                        onChange={e => set('bgColor', e.target.value || undefined)}
                                        placeholder="Default"
                                        maxLength={20}
                                        className="flex-1 px-2.5 py-1.5 rounded border text-xs font-mono outline-none focus:border-[#5aa9ff] transition-colors bg-transparent"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                    />
                                    {config.bgColor && (
                                        <button
                                            onClick={() => set('bgColor', undefined)}
                                            className="text-[11px] px-2 py-1 rounded border transition-colors"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                            title="Reset to default"
                                        >✕</button>
                                    )}
                                </div>
                            </div>

                            {/* Card Size — block / product templates only */}
                            {(config.template === 'block' || config.template === 'product') && (
                                <div>
                                    <label className={labelClass} style={labelStyle}>Card Size</label>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Min width</span>
                                                <span className="text-[11px] font-mono" style={{ color: 'var(--fg)' }}>{config.cardMinWidth ?? (config.template === 'block' ? 180 : 160)}px</span>
                                            </div>
                                            <input type="range" min={80} max={400} step={10}
                                                value={config.cardMinWidth ?? (config.template === 'block' ? 180 : 160)}
                                                onChange={e => set('cardMinWidth', Number(e.target.value))}
                                                className="w-full" style={{ accentColor: config.accent }}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Image height</span>
                                                <span className="text-[11px] font-mono" style={{ color: 'var(--fg)' }}>{config.cardImageHeight ?? (config.template === 'product' ? 160 : 120)}px</span>
                                            </div>
                                            <input type="range" min={60} max={400} step={10}
                                                value={config.cardImageHeight ?? (config.template === 'product' ? 160 : 120)}
                                                onChange={e => set('cardImageHeight', Number(e.target.value))}
                                                className="w-full" style={{ accentColor: config.accent }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Field Mapping */}
                            <div>
                                <label className={labelClass} style={labelStyle}>Field Mapping</label>
                                <p className="text-[11px] mb-2" style={{ color: 'var(--fg-muted)' }}>
                                    Map your index field names to display fields. Leave blank for auto-detection.
                                </p>
                                <FieldMapping
                                    fieldMap={config.fieldMap ?? {}}
                                    onChange={fm => set('fieldMap', fm)}
                                    indexFields={indexFields}
                                />
                            </div>

                            </div>}

                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={save} disabled={saving || !activeSite} className="flex-1">
                                    {saving ? 'Saving…' : 'Save'}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={copyScript} disabled={!activeSite}>
                                    {copied ? '✓ Copied' : 'Copy Script'}
                                </Button>
                            </div>
                            {saveMsg && (
                                <p className="text-[11px]" style={{ color: saveMsg === 'Saved!' ? '#34d399' : '#f87171' }}>
                                    {saveMsg}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Right: Preview ── */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                                Live Preview
                            </span>
                            {activeSite && (
                                <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                    Searching <span className="font-medium" style={{ color: 'var(--fg)' }}>{activeSite.azure_index_name}</span>
                                </span>
                            )}
                        </div>

                        {/* Browser chrome */}
                        <div className="flex-1 rounded-lg border overflow-hidden flex flex-col" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel)' }}>
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
                                </div>
                                <div
                                    className="flex-1 mx-2 px-3 py-1 rounded text-[11px] truncate"
                                    style={{ backgroundColor: 'var(--panel)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                                >
                                    {activeSite?.url || 'https://yoursite.com'}
                                </div>
                            </div>

                            {/* Full-width mock page */}
                            {activeTab === 'searchbar' ? (
                                <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: config.theme === 'light' ? '#f9fafb' : config.theme === 'dark' ? '#0a0a0a' : 'var(--bg)' }}>
                                    <div className="flex items-center gap-4 mb-6 pb-4 border-b" style={{ borderColor: config.theme === 'light' ? '#e5e7eb' : '#1f1f1f' }}>
                                        <div className="w-16 h-4 rounded" style={{ backgroundColor: config.theme === 'light' ? '#e5e7eb' : '#222' }} />
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-10 h-3 rounded" style={{ backgroundColor: config.theme === 'light' ? '#f3f4f6' : '#1a1a1a' }} />
                                        ))}
                                    </div>
                                    {activeSite && <WidgetPreview key={activeSite.site_id} config={config} siteId={activeSite.site_id} />}
                                </div>
                            ) : (
                                <div className="flex-1 overflow-hidden">
                                    {activeSite && <ResultsPagePreview key={activeSite.site_id} config={config} siteId={activeSite.site_id} indexFields={indexFields} />}
                                    {!activeSite && (
                                        <div className="flex items-center justify-center h-full" style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>
                                            Select a site to preview
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Embed panel */}
                        {activeSite && (
                            <div className="rounded-lg border overflow-hidden shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel)' }}>
                                {/* Header — toggles body */}
                                <div
                                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
                                    style={{ borderBottom: embedOpen ? '1px solid var(--border)' : 'none' }}
                                    onClick={() => setEmbedOpen(o => !o)}
                                >
                                    <div className="flex items-center gap-2">
                                        <svg
                                            width="12" height="12" viewBox="0 0 12 12" fill="none"
                                            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                            style={{ color: 'var(--fg-muted)', transition: 'transform .15s', transform: embedOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                        >
                                            <path d="M4 2l4 4-4 4"/>
                                        </svg>
                                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>Embed</span>
                                    </div>
                                    {embedOpen && (
                                        <button
                                            onClick={e => { e.stopPropagation(); copyScript() }}
                                            className="text-[11px] font-medium transition-colors hover:text-[#5aa9ff]"
                                            style={{ color: copied ? '#34d399' : 'var(--fg-muted)' }}
                                        >
                                            {copied ? '✓ Copied' : 'Copy'}
                                        </button>
                                    )}
                                </div>

                                {embedOpen && (<>
                                    {/* Placement selector — only for search bar */}
                                    {activeTab === 'searchbar' && (
                                        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                                            <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Placement</p>
                                            <div className="space-y-2">
                                                <label className="flex items-start gap-2.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="wb-placement"
                                                        checked={placement === 'inline'}
                                                        onChange={() => setPlacement('inline')}
                                                        className="mt-0.5 accent-[#5aa9ff] cursor-pointer"
                                                    />
                                                    <div>
                                                        <p className="text-[11px] font-medium" style={{ color: 'var(--fg)' }}>Inline</p>
                                                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                                            Widget renders right where the <code style={{ fontFamily: 'monospace' }}>&lt;script&gt;</code> tag is placed in your HTML.
                                                        </p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-2.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="wb-placement"
                                                        checked={placement === 'target'}
                                                        onChange={() => setPlacement('target')}
                                                        className="mt-0.5 accent-[#5aa9ff] cursor-pointer"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-medium" style={{ color: 'var(--fg)' }}>Target element</p>
                                                        <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                                                            Renders into a specific element — script can go anywhere on the page.
                                                        </p>
                                                        {placement === 'target' && (
                                                            <input
                                                                type="text"
                                                                value={targetSelector}
                                                                onChange={e => setTargetSelector(e.target.value)}
                                                                placeholder="#search-container"
                                                                className="w-full px-2 py-1 rounded border text-[11px] font-mono outline-none focus:border-[#5aa9ff] transition-colors bg-transparent"
                                                                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                                            />
                                                        )}
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'resultspage' && (
                                        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                                            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                                Place this script on the page where your results page lives (e.g. <code className="font-mono">/search</code>). It reads the <code className="font-mono">?q=</code> URL parameter automatically.
                                            </p>
                                        </div>
                                    )}

                                    {/* Script code */}
                                    <pre className="px-4 py-3 text-[11px] overflow-x-auto leading-relaxed" style={{ color: 'var(--fg-muted)', fontFamily: 'monospace' }}>
                                        {activeScript}
                                    </pre>
                                </>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`@keyframes aisg-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
        </AppLayout>
    )
}
