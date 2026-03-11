import { useState, useEffect, useCallback } from 'react'
import { useForm, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import Panel from '@/Components/Panel'
import Button from '@/Components/Button'
import Badge from '@/Components/Badge'
import { Site } from '@/types'

interface Props {
  sites: Site[]
}

interface SiteStats {
  status: 'loading' | 'ready' | 'no-index' | 'error'
  documentCount?: number
  storageSize?: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(2) + ' MB'
}

function formatDocs(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

export default function SitesIndex({ sites = [] }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [siteStats, setSiteStats] = useState<Record<string, SiteStats>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyScript = useCallback((siteId: string) => {
    const script = `<script src="${window.location.origin}/widget.js" data-site="${siteId}" data-api="${window.location.origin}"></script>`
    navigator.clipboard.writeText(script)
    setCopiedId(siteId)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const { data, setData, post, processing, errors: _errors, reset } = useForm({
    name: '',
    url: '',
    azure_index_name: '',
    azure_endpoint: '',
    azure_api_key: '',
  })
  const errors = _errors as Record<string, string>

  // Fetch stats for all sites in parallel on mount
  useEffect(() => {
    if (!sites.length) return
    const init: Record<string, SiteStats> = {}
    sites.forEach(s => { init[s.site_id] = { status: 'loading' } })
    setSiteStats(init)

    sites.forEach(async (site) => {
      try {
        const res = await fetch(`/sites/${site.site_id}/stats`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
        const data = await res.json()
        if (res.status === 404 || data.code === 'INDEX_NOT_FOUND') {
          setSiteStats(prev => ({ ...prev, [site.site_id]: { status: 'no-index' } }))
        } else if (!res.ok || data.error) {
          setSiteStats(prev => ({ ...prev, [site.site_id]: { status: 'error' } }))
        } else {
          setSiteStats(prev => ({
            ...prev,
            [site.site_id]: {
              status: 'ready',
              documentCount: data.documentCount ?? 0,
              storageSize: data.storageSize ?? 0,
            },
          }))
        }
      } catch {
        setSiteStats(prev => ({ ...prev, [site.site_id]: { status: 'error' } }))
      }
    })
  }, [sites])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/sites', {
      onSuccess: () => {
        reset()
        setShowCreate(false)
      },
    })
  }

  const inputClass =
    'w-full px-3 py-2 rounded border text-sm bg-transparent outline-none focus:border-[#5aa9ff] transition-colors'
  const inputStyle = { borderColor: 'var(--border)', color: 'var(--fg)' }

  return (
    <AppLayout title="Sites">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Your Sites</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              Manage sites and Azure AI Search connections
            </p>
          </div>
          {!showCreate && (
            <Button onClick={() => setShowCreate(true)} size="sm">
              <span>+</span> New Site
            </Button>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <Panel title="Connect New Site">
            <form onSubmit={submit} className="space-y-4">

              {/* Azure connection error (cross-field) */}
              {errors.azure_connection && (
                <div className="px-3 py-2.5 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400">
                  <span className="font-semibold">Connection failed: </span>{errors.azure_connection}
                </div>
              )}

              {/* Row: Site Name + Site URL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    placeholder="My Store"
                    className={inputClass}
                    style={inputStyle}
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                    Site URL
                  </label>
                  <input
                    type="url"
                    value={data.url}
                    onChange={e => setData('url', e.target.value)}
                    placeholder="https://mystore.com"
                    className={inputClass}
                    style={inputStyle}
                  />
                  {errors.url && <p className="text-xs text-red-400 mt-1">{errors.url}</p>}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
                  Azure AI Search
                </p>

                {/* Azure Endpoint */}
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={data.azure_endpoint}
                    onChange={e => setData('azure_endpoint', e.target.value)}
                    placeholder="https://your-service.search.windows.net"
                    className={inputClass}
                    style={inputStyle}
                  />
                  {errors.azure_endpoint && <p className="text-xs text-red-400 mt-1">{errors.azure_endpoint}</p>}
                </div>

                {/* Row: Index Name + API Key */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                      Index Name
                    </label>
                    <input
                      type="text"
                      value={data.azure_index_name}
                      onChange={e => setData('azure_index_name', e.target.value)}
                      placeholder="products"
                      className={inputClass}
                      style={inputStyle}
                    />
                    {errors.azure_index_name && <p className="text-xs text-red-400 mt-1">{errors.azure_index_name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={data.azure_api_key}
                      onChange={e => setData('azure_api_key', e.target.value)}
                      placeholder="••••••••••••••••"
                      className={inputClass}
                      style={inputStyle}
                    />
                    {errors.azure_api_key && <p className="text-xs text-red-400 mt-1">{errors.azure_api_key}</p>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm" disabled={processing}>
                  {processing ? 'Validating & Saving…' : 'Validate & Create Site'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { reset(); setShowCreate(false) }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                {processing && (
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    Testing Azure connection…
                  </span>
                )}
              </div>
            </form>
          </Panel>
        )}

        {/* Sites table */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}
        >
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
              {sites.length} {sites.length === 1 ? 'site' : 'sites'}
            </span>
          </div>

          {sites.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No sites yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                Create your first site to get started.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Name', 'URL', 'Index', 'Index Status', 'Documents', 'Storage', 'Added', '', ''].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.map(site => {
                  const stats = siteStats[site.site_id]
                  return (
                    <tr key={site.id} className="border-b last:border-0 hover:bg-[#5aa9ff04]" style={{ borderColor: 'var(--border)' }}>
                      {/* Name */}
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/sites/${site.site_id}`}
                          className="hover:text-[#5aa9ff] transition-colors"
                          style={{ color: 'var(--fg)' }}
                        >
                          {site.name}
                        </Link>
                      </td>

                      {/* URL */}
                      <td className="px-5 py-3 text-xs max-w-[160px] truncate" style={{ color: 'var(--fg-muted)' }}>
                        {site.url}
                      </td>

                      {/* Index name */}
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {site.azure_index_name}
                      </td>

                      {/* Index status */}
                      <td className="px-5 py-3">
                        {!stats || stats.status === 'loading' ? (
                          <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>—</span>
                        ) : stats.status === 'ready' ? (
                          <Badge variant="success">Ready</Badge>
                        ) : stats.status === 'no-index' ? (
                          <Badge variant="warning">No Index</Badge>
                        ) : (
                          <Badge variant="error">Error</Badge>
                        )}
                      </td>

                      {/* Documents */}
                      <td className="px-5 py-3 text-xs tabular-nums" style={{ color: 'var(--fg)' }}>
                        {stats?.status === 'ready'
                          ? formatDocs(stats.documentCount ?? 0)
                          : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                      </td>

                      {/* Storage */}
                      <td className="px-5 py-3 text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                        {stats?.status === 'ready'
                          ? formatBytes(stats.storageSize ?? 0)
                          : <span>—</span>}
                      </td>

                      {/* Added date */}
                      <td className="px-5 py-3 text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                        {new Date(site.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/sites/${site.site_id}`}>
                            <Button variant="secondary" size="sm">
                              Manage →
                            </Button>
                          </Link>
                          <Link href={`/sites/${site.site_id}/customize`}>
                            <Button variant="ghost" size="sm">
                              Customize
                            </Button>
                          </Link>
                        </div>
                      </td>

                      {/* Copy script */}
                      <td className="px-5 py-3">
                        <button
                          onClick={() => copyScript(site.site_id)}
                          title="Copy embed script"
                          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded border transition-colors"
                          style={{
                            borderColor: copiedId === site.site_id ? '#34d399' : 'var(--border)',
                            color: copiedId === site.site_id ? '#34d399' : 'var(--fg-muted)',
                            backgroundColor: 'transparent',
                          }}
                        >
                          {copiedId === site.site_id ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="7" height="7" rx="1"/><path d="M8 4V2.5A.5.5 0 007.5 2h-5A.5.5 0 002 2.5v5a.5.5 0 00.5.5H4"/></svg>
                              Copy Script
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
