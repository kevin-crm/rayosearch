import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import Panel from '@/Components/Panel'
import Button from '@/Components/Button'
import Badge from '@/Components/Badge'
import { Site, IndexStats, IndexField } from '@/types'

interface Props {
  site: Site
}

type IngestTab = 'json' | 'csv' | 'api'

const FIELD_TYPES = [
  'Edm.String', 'Edm.Int32', 'Edm.Int64', 'Edm.Double',
  'Edm.Boolean', 'Edm.DateTimeOffset', 'Collection(Edm.String)',
]

function getCsrf(): string {
  return decodeURIComponent(
    document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(2) + ' MB'
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuote = !inQuote; continue }
    if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  result.push(cur.trim())
  return result
}

/**
 * Parse an Azure ingest error into a friendly suggestion.
 * Returns null if no specific pattern is matched.
 */
function parseFriendlyIngestError(raw: string): string | null {
  const detail = raw.replace(/^the request is invalid\.\s*details:\s*/i, '').trim()

  // int/float where string expected: "Cannot convert the literal '1' to the expected type 'Edm.String'"
  const toStringMatch = detail.match(/cannot convert the literal '(.+?)' to the expected type 'Edm\.String'/i)
  if (toStringMatch) {
    const val = toStringMatch[1]
    return `The value ${val} is being sent as a number but the index expects a string (Edm.String). Wrap it in quotes in your JSON — e.g. "id": "${val}" instead of "id": ${val}. Alternatively, change the field type to Edm.Double or Edm.Int32 in the Index Fields section.`
  }

  // string where number expected
  const toNumMatch = detail.match(/cannot convert the literal '(.+?)' to the expected type '(Edm\.(Double|Int32|Int64))'/i)
  if (toNumMatch) {
    const val = toNumMatch[1]
    const type = toNumMatch[2]
    return `The value "${val}" is being sent as a string but the index expects ${type}. Remove the quotes — e.g. "price": ${val} instead of "price": "${val}". Alternatively, change the field type to Edm.String in Index Fields.`
  }

  // field not in schema
  const fieldMatch = detail.match(/field '(.+?)' does not exist/i)
  if (fieldMatch) {
    return `Field "${fieldMatch[1]}" doesn't exist in your index schema. Add it in the Index Fields section below, or remove it from your document.`
  }

  // property not in schema (different wording Azure uses)
  const propMatch = detail.match(/property '(.+?)' does not exist on type/i)
  if (propMatch) {
    return `Field "${propMatch[1]}" doesn't exist in your index schema. Open Index Fields, add "${propMatch[1]}" with the appropriate type, save, then retry.`
  }

  // searchable set on a numeric field
  const searchableMatch = detail.match(/searchable field '(.+?)' must be of type Edm\.String/i)
  if (searchableMatch) {
    return `Field "${searchableMatch[1]}" is marked as searchable in the index but full-text search only works on Edm.String fields. Open Index Fields, uncheck Searchable for "${searchableMatch[1]}", and save — or change its type to Edm.String if you intended it to be text.`
  }

  return null
}

// ── Field detection helpers ───────────────────────────────────────────────────

interface FieldSuggestion {
  name: string
  type: string
  searchable: boolean
  filterable: boolean
  sortable: boolean
  facetable: boolean
  warning?: string // set for complex/unsupported types
}

function inferFieldType(name: string, val: unknown): FieldSuggestion {
  if (typeof val === 'string') {
    return { name, type: 'Edm.String', searchable: true, filterable: true, sortable: false, facetable: false }
  }
  if (typeof val === 'number') {
    const type = Number.isInteger(val) ? 'Edm.Int32' : 'Edm.Double'
    return { name, type, searchable: false, filterable: true, sortable: true, facetable: true }
  }
  if (typeof val === 'boolean') {
    return { name, type: 'Edm.Boolean', searchable: false, filterable: true, sortable: false, facetable: true }
  }
  if (Array.isArray(val) && val.length > 0 && val.every(v => typeof v === 'string')) {
    return { name, type: 'Collection(Edm.String)', searchable: true, filterable: true, sortable: false, facetable: true }
  }
  if (Array.isArray(val) && val.length > 0 && val.every(v => typeof v === 'number')) {
    return { name, type: 'Collection(Edm.Double)', searchable: false, filterable: true, sortable: false, facetable: true,
      warning: 'Collection(Edm.Double) — add manually if needed.' }
  }
  if (typeof val === 'object' && val !== null) {
    return { name, type: 'Complex', searchable: false, filterable: false, sortable: false, facetable: false,
      warning: 'Nested object — Azure complex types must be defined manually and are not supported by this auto-add.' }
  }
  return { name, type: 'Edm.String', searchable: false, filterable: false, sortable: false, facetable: false }
}

function detectMissingFields(jsonText: string, existingFields: IndexField[]): FieldSuggestion[] {
  try {
    const parsed = JSON.parse(jsonText)
    const docs: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed]
    const known = new Set(existingFields.map(f => f.name))
    const seen = new Map<string, FieldSuggestion>()
    for (const doc of docs) {
      for (const [key, val] of Object.entries(doc)) {
        if (!known.has(key) && !seen.has(key)) {
          seen.set(key, inferFieldType(key, val))
        }
      }
    }
    return Array.from(seen.values())
  } catch {
    return []
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({ label, value, muted, children }: {
  label: string; value?: string; muted?: boolean; children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </p>
      {children ?? (
        <p className={`text-sm ${muted ? '' : 'font-medium'}`} style={{ color: muted ? 'var(--fg-muted)' : 'var(--fg)' }}>
          {value}
        </p>
      )}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>
      {label}
    </p>
  )
}

function IngestStatus({ status, message, rawError }: {
  status: string; message: string; rawError?: string
}) {
  if (status === 'idle') return null
  const styles: Record<string, string> = {
    loading: 'border-[#5aa9ff33] bg-[#5aa9ff0d] text-[#5aa9ff]',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    error:   'border-red-500/30 bg-red-500/10 text-red-400',
  }
  return (
    <div className={`mt-3 rounded border text-xs ${styles[status] ?? ''}`}>
      {/* Raw Azure error — always shown first when present */}
      {rawError && status === 'error' && (
        <div className="px-3 py-2.5 border-b font-mono opacity-70" style={{ borderColor: 'inherit' }}>
          {rawError}
        </div>
      )}
      {/* Friendly message / suggestion */}
      <div className="px-3 py-2.5">{message}</div>
    </div>
  )
}

function Checkbox({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      disabled={disabled}
      className="w-3.5 h-3.5 cursor-pointer accent-[#5aa9ff] disabled:opacity-30 disabled:cursor-not-allowed"
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SiteShow({ site }: Props) {
  // Stats
  const [stats, setStats]                 = useState<IndexStats | null>(null)
  const [statsLoading, setStatsLoading]   = useState(true)
  const [statsError, setStatsError]       = useState<string | null>(null)
  const [indexNotFound, setIndexNotFound] = useState(false)
  const [creating, setCreating]           = useState(false)
  const [createError, setCreateError]     = useState<string | null>(null)

  // Index fields
  const [fields, setFields]                   = useState<IndexField[]>([])
  const [fieldsLoading, setFieldsLoading]     = useState(false)
  const [fieldsError, setFieldsError]         = useState<string | null>(null)
  const [fieldsDirty, setFieldsDirty]         = useState(false)
  const [fieldsUpdating, setFieldsUpdating]   = useState(false)
  const [fieldsMsg, setFieldsMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [fieldsOpen, setFieldsOpen]           = useState(false)
  const [showAddField, setShowAddField]       = useState(false)
  const [newField, setNewField]               = useState<Omit<IndexField, 'key'>>({
    name: '', type: 'Edm.String', searchable: true, filterable: false, sortable: false, facetable: false,
  })

  // Ingest
  const [tab, setTab]                       = useState<IngestTab>('json')
  const [jsonText, setJsonText]             = useState('')
  const [csvDocs, setCsvDocs]               = useState<Record<string, string>[] | null>(null)
  const [csvFileName, setCsvFileName]       = useState('')
  const [ingestStatus, setIngestStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [ingestMsg, setIngestMsg]           = useState('')
  const [ingestRawError, setIngestRawError] = useState('')
  const fileInputRef                        = useRef<HTMLInputElement>(null)
  const csvInputRef                         = useRef<HTMLInputElement>(null)

  // Search test
  const [searchQuery, setSearchQuery]       = useState('')
  const [searchResults, setSearchResults]   = useState<Record<string, unknown>[] | null>(null)
  const [searchLoading, setSearchLoading]   = useState(false)
  const [searchError, setSearchError]       = useState<string | null>(null)

  // Embed copy
  const [copied, setCopied] = useState(false)

  // Detected missing fields (derived from jsonText vs current index fields)
  const detectedMissing = useMemo(() => detectMissingFields(jsonText, fields), [jsonText, fields])

  const addDetectedField = async (s: FieldSuggestion) => {
    if (fields.some(f => f.name === s.name)) return
    const { warning: _w, ...field } = s
    const updatedFields = [...fields, { ...field, key: false }]
    setFields(updatedFields)
    if (!fieldsOpen) setFieldsOpen(true)
    await saveFieldsData(updatedFields)
  }

  const addAllDetected = async () => {
    const compatible = detectedMissing.filter(s => !s.warning?.startsWith('Nested'))
    const newFields = compatible.filter(s => !fields.some(f => f.name === s.name))
    if (!newFields.length) return
    const updatedFields = [
      ...fields,
      ...newFields.map(({ warning: _w, ...f }) => ({ ...f, key: false })),
    ]
    setFields(updatedFields)
    if (!fieldsOpen) setFieldsOpen(true)
    await saveFieldsData(updatedFields)
  }

  // ── Fetch stats ──
  const fetchStats = () => {
    setStatsLoading(true)
    setStatsError(null)
    setIndexNotFound(false)
    setStats(null)
    fetch(`/sites/${site.site_id}/stats`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(r => r.json().then(data => ({ status: r.status, data })))
      .then(({ data }) => {
        if (data.code === 'INDEX_NOT_FOUND') { setIndexNotFound(true); return }
        if (data.error) { setStatsError(data.error); return }
        setStats(data)
      })
      .catch(() => setStatsError('Could not reach Azure to fetch stats.'))
      .finally(() => setStatsLoading(false))
  }

  // ── Fetch index fields ──
  const fetchFields = () => {
    setFieldsLoading(true)
    setFieldsError(null)
    fetch(`/sites/${site.site_id}/index-fields`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          // Silently skip if index just doesn't exist yet (stats panel handles that)
          if (!data.error.toLowerCase().includes('not found')) setFieldsError(data.error)
          return
        }
        setFields(data.fields ?? [])
      })
      .catch(() => setFieldsError('Could not load index fields.'))
      .finally(() => setFieldsLoading(false))
  }

  useEffect(() => { fetchStats(); fetchFields() }, [site.site_id])

  // ── Create index ──
  const handleCreateIndex = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch(`/sites/${site.site_id}/create-index`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': getCsrf() },
      })
      const data = await res.json()
      if (!res.ok || data.error) { setCreateError(data.error ?? `Error ${res.status}`); return }
      fetchStats()
      fetchFields()
    } catch { setCreateError('Request failed — check your connection.') }
    finally { setCreating(false) }
  }

  // ── Field editing ──
  const updateField = (idx: number, patch: Partial<IndexField>) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
    setFieldsDirty(true)
    setFieldsMsg(null)
  }

  const addField = () => {
    if (!newField.name.trim()) return
    setFields(prev => [...prev, { ...newField, key: false, name: newField.name.trim() }])
    setNewField({ name: '', type: 'Edm.String', searchable: true, filterable: false, sortable: false, facetable: false })
    setShowAddField(false)
    setFieldsDirty(true)
    setFieldsMsg(null)
  }

  const saveFieldsData = async (fieldsToSave: IndexField[]): Promise<boolean> => {
    setFieldsUpdating(true)
    setFieldsMsg(null)
    try {
      const res = await fetch(`/sites/${site.site_id}/index-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': getCsrf(),
        },
        body: JSON.stringify({ fields: fieldsToSave }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setFieldsMsg({ type: 'error', text: data.error ?? `Error ${res.status}` })
        return false
      }
      setFieldsDirty(false)
      setFieldsMsg({ type: 'success', text: 'Index schema updated.' })
      return true
    } catch {
      setFieldsMsg({ type: 'error', text: 'Request failed — check your connection.' })
      return false
    }
    finally { setFieldsUpdating(false) }
  }

  const saveFields = () => saveFieldsData(fields)

  // ── JSON file picker ──
  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setJsonText((ev.target?.result as string) ?? '')
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── CSV file picker ──
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCSV((ev.target?.result as string) ?? '')
      if (!rows.length) {
        setCsvDocs(null); setIngestStatus('error'); setIngestMsg('CSV appears empty or could not be parsed.'); setIngestRawError('')
      } else {
        setCsvDocs(rows); setIngestStatus('idle')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Ingest ──
  const handleIngest = async (documents: object[]) => {
    setIngestStatus('loading')
    setIngestMsg(`Uploading ${documents.length} document${documents.length !== 1 ? 's' : ''}…`)
    setIngestRawError('')
    try {
      const res = await fetch(`/sites/${site.site_id}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': getCsrf(),
        },
        body: JSON.stringify({ documents }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        const raw = data.error ?? `Server error ${res.status}.`
        const friendly = parseFriendlyIngestError(raw)
        setIngestStatus('error')
        setIngestRawError(raw)
        setIngestMsg(friendly ?? 'Upload failed. See the error above for details.')
        return
      }
      const errs = data.errors?.length ? ` (${data.errors.length} partial error${data.errors.length > 1 ? 's' : ''})` : ''
      setIngestStatus('success')
      setIngestMsg(`${data.count} document${data.count !== 1 ? 's' : ''} indexed successfully.${errs}`)
      setIngestRawError('')
    } catch {
      setIngestStatus('error')
      setIngestMsg('Request failed — check your connection.')
      setIngestRawError('')
    }
  }

  const submitJson = () => {
    let docs: object[]
    try {
      const parsed = JSON.parse(jsonText)
      docs = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      setIngestStatus('error'); setIngestMsg('Invalid JSON — make sure it is an array of objects.'); setIngestRawError(''); return
    }
    if (!docs.length) { setIngestStatus('error'); setIngestMsg('The JSON array is empty.'); setIngestRawError(''); return }
    handleIngest(docs)
  }

  const submitCsv = () => { if (csvDocs?.length) handleIngest(csvDocs) }

  // ── Search test ──
  const runSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearchLoading(true); setSearchError(null); setSearchResults(null)
    try {
      const res = await fetch(`/sites/${site.site_id}/search-test?${new URLSearchParams({ query: q })}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      const data = await res.json()
      if (!res.ok || data.error) { setSearchError(data.error ?? `Error ${res.status}`); return }
      setSearchResults(data.results ?? [])
    } catch { setSearchError('Request failed — check your connection.') }
    finally { setSearchLoading(false) }
  }

  // ── Embed ──
  const embedScript = `<script src="https://cdn.rayosearch.com/widget.js" data-site="${site.site_id}" data-api="${typeof window !== 'undefined' ? window.location.origin : ''}"></script>`
  const copyEmbed = () => {
    navigator.clipboard.writeText(embedScript); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Shared styles ──
  const inputClass  = 'w-full px-3 py-2 rounded border text-sm bg-transparent outline-none focus:border-[#5aa9ff] transition-colors'
  const inputStyle  = { borderColor: 'var(--border)', color: 'var(--fg)' }
  const tabBase     = 'px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer'
  const tabActive   = 'bg-[#5aa9ff14] text-[#5aa9ff]'
  const tabInactive = 'text-[var(--fg-muted)] hover:text-[var(--fg)]'

  return (
    <AppLayout title={site.name}>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/sites" className="text-xs inline-flex items-center gap-1 mb-2 transition-colors hover:text-[#5aa9ff]" style={{ color: 'var(--fg-muted)' }}>
              ← Sites
            </Link>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{site.name}</h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{site.url}</p>
          </div>
          <Link href={`/sites/${site.site_id}/customize`}>
            <Button variant="secondary" size="sm">Customize Widget →</Button>
          </Link>
        </div>

        {/* ── 1. Index Overview ── */}
        <Panel title="Index Overview">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <SectionDivider label="Site" />
              <StatCell label="Site Name" value={site.name} />
              <StatCell label="Site URL" value={site.url} muted />
              <StatCell label="Site ID">
                <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg)', color: '#5aa9ff' }}>
                  {site.site_id}
                </code>
              </StatCell>
            </div>

            <div className="space-y-4">
              <SectionDivider label="Azure AI Search" />
              <StatCell label="Index Name" value={site.azure_index_name} />
              <StatCell label="Endpoint" value={site.azure_endpoint} muted />

              <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <SectionDivider label="Index Stats" />
                {statsLoading && <p className="text-xs animate-pulse" style={{ color: 'var(--fg-muted)' }}>Fetching stats…</p>}

                {!statsLoading && indexNotFound && (
                  <div className="rounded-lg border border-dashed px-4 py-5 space-y-3" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Index not found</p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                        The index <code className="text-[#5aa9ff]">{site.azure_index_name}</code> doesn't exist yet. You can create it with a default schema.
                      </p>
                    </div>
                    <details>
                      <summary className="text-xs cursor-pointer select-none" style={{ color: '#5aa9ff' }}>View default schema</summary>
                      <pre className="mt-2 px-3 py-2.5 rounded border text-[11px] overflow-x-auto leading-relaxed"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
{`id          Edm.String   key · filterable
name        Edm.String   searchable · filterable · sortable
title       Edm.String   searchable · filterable · sortable
description Edm.String   searchable
category    Edm.String   searchable · filterable · facetable
url         Edm.String   (stored, not searchable)
price       Edm.Double   filterable · sortable · facetable`}
                      </pre>
                    </details>
                    {createError && <div className="px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400">{createError}</div>}
                    <Button size="sm" onClick={handleCreateIndex} disabled={creating}>
                      {creating ? 'Creating Index…' : `Create "${site.azure_index_name}"`}
                    </Button>
                  </div>
                )}

                {!statsLoading && statsError && (
                  <div className="px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400">{statsError}</div>
                )}

                {stats && (
                  <div className="grid grid-cols-2 gap-4">
                    <StatCell label="Documents" value={stats.documentCount.toLocaleString()} />
                    <StatCell label="Storage Size" value={formatBytes(stats.storageSize)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>

        {/* ── 2. Index Fields ── */}
        {!indexNotFound && (
          <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}>
            {/* Collapsible header */}
            <button
              onClick={() => setFieldsOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#5aa9ff04]"
            >
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Index Fields</h2>
                {!fieldsOpen && fields.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {fields.length} field{fields.length !== 1 ? 's' : ''}
                    {fieldsDirty ? ' · unsaved changes' : ''}
                  </p>
                )}
                {!fieldsOpen && fields.length === 0 && !fieldsLoading && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>View and edit the fields in your Azure AI Search index</p>
                )}
              </div>
              <span className="text-xs transition-transform" style={{ color: 'var(--fg-muted)', transform: fieldsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▾
              </span>
            </button>

            {fieldsOpen && (
              <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="pt-4">
            {fieldsLoading && <p className="text-xs animate-pulse" style={{ color: 'var(--fg-muted)' }}>Loading fields…</p>}
            {fieldsError && <div className="px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400">{fieldsError}</div>}

            {!fieldsLoading && fields.length > 0 && (
              <div className="space-y-4">
                <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                        {['Field', 'Type', 'Searchable', 'Filterable', 'Sortable', 'Facetable', ''].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-medium" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((f, i) => (
                        <tr key={f.name} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-3 py-2.5">
                            <span className="font-medium" style={{ color: 'var(--fg)' }}>{f.name}</span>
                            {f.key && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg)', color: '#5aa9ff' }}>key</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span style={{ color: 'var(--fg-muted)' }}>{f.type}</span>
                            {f.key && (
                              <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--fg-muted)', opacity: 0.6 }}>
                                Azure requires key fields to be Edm.String. Pass IDs as strings in your data — e.g. "id": "1" not "id": 1.
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Checkbox checked={f.searchable} disabled={f.key} onChange={v => updateField(i, { searchable: v })} />
                          </td>
                          <td className="px-3 py-2.5">
                            <Checkbox checked={f.filterable} disabled={f.key} onChange={v => updateField(i, { filterable: v })} />
                          </td>
                          <td className="px-3 py-2.5">
                            <Checkbox checked={f.sortable} disabled={f.key} onChange={v => updateField(i, { sortable: v })} />
                          </td>
                          <td className="px-3 py-2.5">
                            <Checkbox checked={f.facetable} disabled={f.key} onChange={v => updateField(i, { facetable: v })} />
                          </td>
                          <td className="px-3 py-2.5">
                            {!f.key && (
                              <span
                                title="Azure AI Search doesn't support removing fields from an existing index. To remove a field, you would need to delete and recreate the index (which clears all indexed data)."
                                className="text-[11px] cursor-not-allowed opacity-30 select-none"
                                style={{ color: 'var(--fg-muted)' }}
                              >
                                Remove
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Add field inline row */}
                      {showAddField && (
                        <tr style={{ backgroundColor: 'var(--bg)' }}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={newField.name}
                              onChange={e => setNewField(p => ({ ...p, name: e.target.value }))}
                              placeholder="field_name"
                              className="w-full px-2 py-1 rounded border text-xs bg-transparent outline-none focus:border-[#5aa9ff]"
                              style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                              autoFocus
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={newField.type}
                              onChange={e => setNewField(p => ({ ...p, type: e.target.value }))}
                              className="w-full px-2 py-1 rounded border text-xs bg-transparent outline-none focus:border-[#5aa9ff]"
                              style={{ borderColor: 'var(--border)', color: 'var(--fg)', backgroundColor: 'var(--panel)' }}
                            >
                              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2"><Checkbox checked={newField.searchable} onChange={v => setNewField(p => ({ ...p, searchable: v }))} /></td>
                          <td className="px-3 py-2"><Checkbox checked={newField.filterable} onChange={v => setNewField(p => ({ ...p, filterable: v }))} /></td>
                          <td className="px-3 py-2"><Checkbox checked={newField.sortable} onChange={v => setNewField(p => ({ ...p, sortable: v }))} /></td>
                          <td className="px-3 py-2"><Checkbox checked={newField.facetable} onChange={v => setNewField(p => ({ ...p, facetable: v }))} /></td>
                          <td className="px-3 py-2 flex items-center gap-1.5">
                            <button onClick={addField} className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">Add</button>
                            <button onClick={() => setShowAddField(false)} className="text-[11px] transition-colors cursor-pointer hover:text-[var(--fg)]" style={{ color: 'var(--fg-muted)' }}>Cancel</button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-3">
                  {!showAddField && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAddField(true)}>
                      + Add Field
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={saveFields}
                    disabled={!fieldsDirty || fieldsUpdating}
                  >
                    {fieldsUpdating ? 'Saving…' : 'Save Changes'}
                  </Button>
                  {fieldsMsg && (
                    <span className={`text-xs ${fieldsMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fieldsMsg.text}
                    </span>
                  )}
                </div>
              </div>
            )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. Add Data ── */}
        <Panel title="Add Data to Your Index">
          <div className="flex gap-1 mb-5 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            {(['json', 'csv', 'api'] as IngestTab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setIngestStatus('idle') }}
                className={`${tabBase} ${tab === t ? tabActive : tabInactive}`}>
                {t === 'json' ? 'Upload JSON' : t === 'csv' ? 'Upload CSV' : 'API Instructions'}
              </button>
            ))}
          </div>

          {tab === 'json' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Upload an array of JSON objects. Each object becomes one searchable document.</p>

              <details className="group">
                <summary className="text-xs cursor-pointer select-none" style={{ color: '#5aa9ff' }}>View example format</summary>
                <pre className="mt-2 px-4 py-3 rounded border text-[11px] overflow-x-auto"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>{`[
  {
    "id": "1",
    "name": "Modern Dashboard UI Kit",
    "description": "Admin dashboard template",
    "category": "UI Kits",
    "price": 49
  }
]`}</pre>
              </details>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>JSON array</label>
                  <div className="flex items-center gap-3">
                    {jsonText.trim() && (
                      <button className="text-xs cursor-pointer transition-colors hover:text-[#5aa9ff]" style={{ color: 'var(--fg-muted)' }}
                        onClick={() => { try { setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2)) } catch { } }}>
                        Pretty
                      </button>
                    )}
                    <button className="text-xs cursor-pointer transition-colors hover:text-[#5aa9ff]" style={{ color: 'var(--fg-muted)' }}
                      onClick={() => fileInputRef.current?.click()}>
                      Load from file
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJsonFile} />
                </div>
                <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={8}
                  placeholder={'[\n  { "id": "1", "name": "...", "description": "..." }\n]'}
                  className={`${inputClass} font-mono text-[12px] resize-y`} style={inputStyle} spellCheck={false} />
              </div>

              {/* Missing fields detection */}
              {detectedMissing.length > 0 && (
                <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                    <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                      {detectedMissing.length} field{detectedMissing.length !== 1 ? 's' : ''} not in your index
                    </span>
                    <button
                      onClick={addAllDetected}
                      className="text-[11px] font-medium transition-colors hover:text-[#5aa9ff]"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Add all compatible
                    </button>
                  </div>
                  <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {detectedMissing.map(s => {
                      const alreadyAdded = fields.some(f => f.name === s.name)
                      const isComplex = s.warning?.startsWith('Nested')
                      return (
                        <li key={s.name} className="px-3 py-2 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: 'var(--fg)' }}>{s.name}</span>
                              <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg)', color: isComplex ? '#f87171' : '#5aa9ff' }}>
                                {s.type}
                              </code>
                            </div>
                            {s.warning && (
                              <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--fg-muted)', opacity: 0.7 }}>
                                {s.warning}
                              </p>
                            )}
                          </div>
                          {alreadyAdded ? (
                            <span className="text-[11px] shrink-0 text-emerald-400">Added ✓</span>
                          ) : isComplex ? (
                            <span className="text-[11px] shrink-0 opacity-30 cursor-not-allowed" style={{ color: 'var(--fg-muted)' }}>Add</span>
                          ) : (
                            <button
                              onClick={() => addDetectedField(s)}
                              className="text-[11px] shrink-0 font-medium transition-colors hover:text-[#5aa9ff] cursor-pointer"
                              style={{ color: 'var(--fg-muted)' }}
                            >
                              Add
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {(fieldsDirty || fieldsUpdating || fieldsMsg) && (
                    <div className="px-3 py-2.5 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                      <p className="text-[11px]" style={{ color: fieldsMsg?.type === 'error' ? '#f87171' : 'var(--fg-muted)' }}>
                        {fieldsUpdating
                          ? 'Saving schema to Azure…'
                          : fieldsMsg?.type === 'success'
                            ? '✓ Schema saved — you can now upload.'
                            : fieldsMsg?.type === 'error'
                              ? fieldsMsg.text
                              : 'Fields added — saving to Azure…'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={submitJson} disabled={!jsonText.trim() || ingestStatus === 'loading'}>
                  {ingestStatus === 'loading' ? 'Uploading…' : 'Upload & Index'}
                </Button>
                {jsonText && (
                  <Button variant="ghost" size="sm" onClick={() => { setJsonText(''); setIngestStatus('idle'); setIngestRawError('') }}>Clear</Button>
                )}
              </div>

              <IngestStatus status={ingestStatus} message={ingestMsg} rawError={ingestRawError} />
            </div>
          )}

          {tab === 'csv' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Upload a CSV file. The first row must be the header. Each subsequent row becomes one document.</p>

              <div className="border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors hover:border-[#5aa9ff44]"
                style={{ borderColor: 'var(--border)' }} onClick={() => csvInputRef.current?.click()}>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
                {csvDocs ? (
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{csvFileName}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                      {csvDocs.length} row{csvDocs.length !== 1 ? 's' : ''} · {Object.keys(csvDocs[0]).join(', ')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Click to select a CSV file</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>or drag and drop</p>
                  </div>
                )}
              </div>

              {csvDocs && csvDocs.length > 0 && (
                <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-widest border-b" style={{ color: 'var(--fg-muted)', borderColor: 'var(--border)' }}>
                    Preview (first 3 rows)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                          {Object.keys(csvDocs[0]).map(k => <th key={k} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--fg-muted)' }}>{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {csvDocs.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                            {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 max-w-[160px] truncate" style={{ color: 'var(--fg)' }}>{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={submitCsv} disabled={!csvDocs?.length || ingestStatus === 'loading'}>
                  {ingestStatus === 'loading' ? 'Uploading…' : `Upload ${csvDocs?.length ?? 0} Rows`}
                </Button>
                {csvDocs && (
                  <Button variant="ghost" size="sm" onClick={() => { setCsvDocs(null); setCsvFileName(''); setIngestStatus('idle'); setIngestRawError('') }}>Clear</Button>
                )}
              </div>

              <IngestStatus status={ingestStatus} message={ingestMsg} rawError={ingestRawError} />
            </div>
          )}

          {tab === 'api' && (
            <div className="space-y-4">
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Push documents programmatically using the ingest endpoint below.</p>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Endpoint</p>
                <code className="block px-3 py-2 rounded border text-xs" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: '#5aa9ff' }}>
                  POST {typeof window !== 'undefined' ? window.location.origin : ''}/sites/{site.site_id}/ingest
                </code>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Request body</p>
                <pre className="px-4 py-3 rounded border text-[11px] overflow-x-auto"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>{`{
  "documents": [
    { "id": "1", "name": "Product Name", "description": "...", "category": "...", "price": 49 }
  ]
}`}</pre>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>curl example</p>
                <pre className="px-4 py-3 rounded border text-[11px] overflow-x-auto"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>{`curl -X POST \\
  ${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com'}/sites/${site.site_id}/ingest \\
  -H "Content-Type: application/json" \\
  -d '{"documents": [{"id": "1", "name": "..."}]}'`}</pre>
              </div>
            </div>
          )}
        </Panel>

        {/* ── 4. Search Test ── */}
        <Panel title="Search Test" description="Verify that indexing is working correctly">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder="Search your index…" className={`${inputClass} flex-1`} style={inputStyle} />
              <Button size="sm" onClick={runSearch} disabled={!searchQuery.trim() || searchLoading}>
                {searchLoading ? 'Searching…' : 'Search'}
              </Button>
            </div>
            {searchError && <div className="px-3 py-2.5 rounded border border-red-500/30 bg-red-500/10 text-xs text-red-400">{searchError}</div>}
            {searchResults !== null && (
              <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {searchResults.length === 0 ? 'No results found.' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                {searchResults.length > 0 && (
                  <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {searchResults.map((doc, i) => (
                      <li key={String(doc.id ?? i)} className="px-4 py-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          {(['id', 'name', 'title', 'description', 'category', 'price'] as const).map(f =>
                            doc[f] !== undefined ? (
                              <div key={f} className="flex gap-2 text-xs">
                                <span className="shrink-0 font-medium w-20 text-right" style={{ color: 'var(--fg-muted)' }}>{f}</span>
                                <span className="truncate" style={{ color: 'var(--fg)' }}>{String(doc[f])}</span>
                              </div>
                            ) : null
                          )}
                          {Object.entries(doc).filter(([k]) => !['id','name','title','description','category','price'].includes(k)).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-xs">
                              <span className="shrink-0 font-medium w-20 text-right" style={{ color: 'var(--fg-muted)' }}>{k}</span>
                              <span className="truncate" style={{ color: 'var(--fg)' }}>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* ── 5. Embed Script ── */}
        <Panel title="Embed Script" description={`Add this to your site's <head> tag`}>
          <div className="rounded border px-4 py-3 font-mono text-xs overflow-x-auto"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
            <span style={{ color: '#5aa9ff' }}>&lt;script</span>{' '}
            <span>src=</span><span style={{ color: '#a3e635' }}>"https://cdn.rayosearch.com/widget.js"</span>{' '}
            <span>data-site=</span><span style={{ color: '#a3e635' }}>"{site.site_id}"</span>{' '}
            <span>data-api=</span><span style={{ color: '#a3e635' }}>"{typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com'}"</span>
            <span style={{ color: '#5aa9ff' }}>&gt;&lt;/script&gt;</span>
          </div>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={copyEmbed}>
              {copied ? '✓ Copied' : 'Copy Script'}
            </Button>
          </div>
        </Panel>

      </div>
    </AppLayout>
  )
}
