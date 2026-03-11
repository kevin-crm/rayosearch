import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import Panel from '@/Components/Panel'
import Button from '@/Components/Button'
import Badge from '@/Components/Badge'
import { ApiKey } from '@/types'

interface Props {
  apiKeys: ApiKey[]
}

export default function ApiKeys({ apiKeys = [] }: Props) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showNewKeyName, setShowNewKeyName] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const copyKey = (key: ApiKey) => {
    navigator.clipboard.writeText(key.key)
    setCopiedId(key.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const maskKey = (key: string) =>
    key.slice(0, 8) + '••••••••••••••••' + key.slice(-4)

  return (
    <AppLayout title="API Keys">
      <div className="space-y-5">
        <Panel title="API Keys" description="Manage authentication keys for the Rayosearch API">
          <div className="space-y-4">
            {/* Generate */}
            {!showNewKeyName ? (
              <Button size="sm" onClick={() => setShowNewKeyName(true)}>
                + Generate Key
              </Button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production)"
                  className="flex-1 px-3 py-1.5 rounded border text-sm bg-transparent outline-none focus:border-[#5aa9ff] transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                  autoFocus
                />
                <Button size="sm">Create</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowNewKeyName(false)}>
                  Cancel
                </Button>
              </div>
            )}

            {/* Keys list */}
            {apiKeys.length === 0 ? (
              <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm text-center py-8" style={{ color: 'var(--fg-muted)' }}>
                  No API keys yet. Generate your first key above.
                </p>
              </div>
            ) : (
              <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
                {apiKeys.map(key => (
                  <div
                    key={key.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{key.name}</p>
                      <code className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                        {maskKey(key.key)}
                      </code>
                    </div>
                    <Badge variant={key.last_used_at ? 'success' : 'neutral'}>
                      {key.last_used_at ? 'Active' : 'Unused'}
                    </Badge>
                    <div className="flex gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => copyKey(key)}>
                        {copiedId === key.id ? '✓' : 'Copy'}
                      </Button>
                      <Button variant="danger" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Usage" description="API access documentation">
          <div
            className="rounded border px-4 py-3 font-mono text-xs overflow-x-auto space-y-1"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
          >
            <p style={{ color: 'var(--fg-muted)' }}># Search request example</p>
            <p>
              <span style={{ color: '#5aa9ff' }}>curl</span>{' '}
              <span style={{ color: 'var(--fg)' }}>-H</span>{' '}
              <span style={{ color: '#a3e635' }}>"Authorization: Bearer YOUR_API_KEY"</span>{' '}
              <span style={{ color: 'var(--fg)' }}>\</span>
            </p>
            <p style={{ paddingLeft: 12 }}>
              <span style={{ color: '#a3e635' }}>"https://api.rayosearch.com/v1/search?q=red+shoes"</span>
            </p>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
