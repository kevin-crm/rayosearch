import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import Panel from '@/Components/Panel'
import Button from '@/Components/Button'
import Badge from '@/Components/Badge'

export default function Indexing() {
  const [syncing, setSyncing] = useState(false)
  const [lastSynced] = useState<string | null>(null)

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 2000)
  }

  return (
    <AppLayout title="Indexing">
      <div className="space-y-5">
        <Panel title="Product Sync" description="Sync your product catalog to the search index">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Status</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {lastSynced ? `Last synced ${lastSynced}` : 'Never synced'}
                </p>
              </div>
              <Badge variant={lastSynced ? 'success' : 'neutral'}>
                {lastSynced ? 'Synced' : 'Not synced'}
              </Badge>
            </div>

            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <>
                    <span className="inline-block animate-spin">↻</span>
                    Syncing…
                  </>
                ) : (
                  <>↻ Sync Products</>
                )}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Index Configuration" description="Configure indexing behavior">
          <div className="space-y-3">
            {[
              { label: 'Auto-sync on product update', enabled: false },
              { label: 'Index product descriptions', enabled: true },
              { label: 'Index product variants', enabled: false },
            ].map(({ label, enabled }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--fg)' }}>{label}</span>
                <button
                  className={`relative w-8 h-4.5 rounded-full border transition-colors ${
                    enabled ? 'bg-[#5aa9ff] border-[#5aa9ff]' : 'border-[var(--border)]'
                  }`}
                  style={{ width: 32, height: 18 }}
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm ${
                      enabled ? 'left-[14px]' : 'left-[2px]'
                    }`}
                    style={{ width: 14, height: 14 }}
                  />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
