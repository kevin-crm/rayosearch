import { useState, useRef } from 'react'
import { Site, SearchResult } from '@/types'

interface Props {
  sites: Site[]
  defaultSiteId?: string
}

interface SearchResponse {
  query: string
  total: number
  results: SearchResult[]
  error?: string
  code?: string
}

export default function SearchWidget({ sites, defaultSiteId }: Props) {
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId ?? sites[0]?.site_id ?? '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const search = async (q: string, siteId: string) => {
    if (!q.trim() || !siteId) return

    // Cancel in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ site_id: siteId, query: q })
      const res = await fetch(`/api/search?${params}`, {
        signal: controller.signal,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      const data: SearchResponse = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`)
        setResults(null)
        return
      }

      setResults(data.results)
      setTotal(data.total)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError('Request failed. Check your connection.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (q.trim().length >= 2) {
      search(q, selectedSiteId)
    } else {
      setResults(null)
      setError(null)
    }
  }

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSiteId(e.target.value)
    if (query.trim().length >= 2) {
      search(query, e.target.value)
    }
  }

  const inputStyle = { borderColor: 'var(--border)', color: 'var(--fg)', backgroundColor: 'var(--bg)' }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex gap-2">
        {sites.length > 1 && (
          <select
            value={selectedSiteId}
            onChange={handleSiteChange}
            className="px-3 py-2 rounded border text-sm outline-none focus:border-[#5aa9ff] transition-colors shrink-0"
            style={inputStyle}
          >
            {sites.map(s => (
              <option key={s.site_id} value={s.site_id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="relative flex-1">
          <input
            type="search"
            value={query}
            onChange={handleInput}
            placeholder="Search…"
            className="w-full px-3 py-2 rounded border text-sm outline-none focus:border-[#5aa9ff] transition-colors pr-8"
            style={inputStyle}
          />
          {loading && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5aa9ff] text-xs animate-pulse">
              ●
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}
        >
          <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {total} result{total !== 1 ? 's' : ''} for <em className="not-italic font-medium" style={{ color: 'var(--fg)' }}>"{query}"</em>
            </span>
          </div>

          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
              No results found.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {results.map((r, i) => (
                <li key={r.id || i} className="px-4 py-3 hover:bg-[#5aa9ff04] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-[#5aa9ff] transition-colors truncate block"
                          style={{ color: 'var(--fg)' }}
                        >
                          {r.title || r.url}
                        </a>
                      ) : (
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                          {r.title || '(no title)'}
                        </p>
                      )}
                      {r.snippet && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                          {r.snippet}
                        </p>
                      )}
                      {r.url && (
                        <p className="text-[11px] mt-1 truncate" style={{ color: '#5aa9ff' }}>
                          {r.url}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] shrink-0 tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                      {r.score.toFixed(3)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
