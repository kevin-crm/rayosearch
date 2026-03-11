import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import Button from '@/Components/Button'
import { useTheme } from '@/hooks/useTheme'
import { PageProps } from '@/types'

function getCsrf(): string {
    return decodeURIComponent(
        document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
    )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                {description && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{description}</p>}
            </div>
            <div className="px-5 py-4">
                {children}
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-muted)' }}>{label}</label>
            {children}
        </div>
    )
}

export default function Settings() {
    const { auth } = usePage<PageProps>().props
    const { theme, toggle } = useTheme()

    const [name,    setName]    = useState(auth?.user?.name  ?? '')
    const [email,   setEmail]   = useState(auth?.user?.email ?? '')
    const [saving,  setSaving]  = useState(false)
    const [saveMsg, setSaveMsg] = useState<string | null>(null)

    const [curPw,  setCurPw]  = useState('')
    const [newPw,  setNewPw]  = useState('')
    const [confPw, setConfPw] = useState('')
    const [pwSaving,  setPwSaving]  = useState(false)
    const [pwMsg,     setPwMsg]     = useState<string | null>(null)

    const saveProfile = async () => {
        setSaving(true)
        setSaveMsg(null)
        try {
            const res = await fetch('/settings/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({ name, email }),
            })
            const data = await res.json()
            setSaveMsg(res.ok ? 'Saved!' : (data.message ?? 'Save failed.'))
            if (res.ok) setTimeout(() => setSaveMsg(null), 2500)
        } catch {
            setSaveMsg('Request failed.')
        } finally {
            setSaving(false)
        }
    }

    const savePassword = async () => {
        if (newPw !== confPw) { setPwMsg('Passwords do not match.'); return }
        if (newPw.length < 8) { setPwMsg('Password must be at least 8 characters.'); return }
        setPwSaving(true)
        setPwMsg(null)
        try {
            const res = await fetch('/settings/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({ current_password: curPw, password: newPw, password_confirmation: confPw }),
            })
            const data = await res.json()
            if (res.ok) {
                setPwMsg('Password updated!')
                setCurPw(''); setNewPw(''); setConfPw('')
                setTimeout(() => setPwMsg(null), 2500)
            } else {
                setPwMsg(data.message ?? 'Update failed.')
            }
        } catch {
            setPwMsg('Request failed.')
        } finally {
            setPwSaving(false)
        }
    }

    const inputClass = 'w-full px-3 py-2 rounded border text-sm bg-transparent outline-none focus:border-[#5aa9ff] transition-colors'
    const inputStyle = { borderColor: 'var(--border)', color: 'var(--fg)' }

    return (
        <AppLayout title="Settings">
            <div className="max-w-2xl space-y-5">

                {/* Profile */}
                <Section title="Profile" description="Update your display name and email address.">
                    <div className="space-y-4">
                        <Field label="Name">
                            <input
                                type="text"
                                value={name}
                                onChange={e => { setName(e.target.value); setSaveMsg(null) }}
                                className={inputClass}
                                style={inputStyle}
                            />
                        </Field>
                        <Field label="Email">
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setSaveMsg(null) }}
                                className={inputClass}
                                style={inputStyle}
                            />
                        </Field>
                        <div className="flex items-center gap-3 pt-1">
                            <Button size="sm" onClick={saveProfile} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Profile'}
                            </Button>
                            {saveMsg && (
                                <span className="text-xs" style={{ color: saveMsg === 'Saved!' ? '#34d399' : '#f87171' }}>
                                    {saveMsg}
                                </span>
                            )}
                        </div>
                    </div>
                </Section>

                {/* Password */}
                <Section title="Password" description="Choose a strong password of at least 8 characters.">
                    <div className="space-y-4">
                        <Field label="Current Password">
                            <input type="password" value={curPw} onChange={e => { setCurPw(e.target.value); setPwMsg(null) }} className={inputClass} style={inputStyle} />
                        </Field>
                        <Field label="New Password">
                            <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwMsg(null) }} className={inputClass} style={inputStyle} />
                        </Field>
                        <Field label="Confirm New Password">
                            <input type="password" value={confPw} onChange={e => { setConfPw(e.target.value); setPwMsg(null) }} className={inputClass} style={inputStyle} />
                        </Field>
                        <div className="flex items-center gap-3 pt-1">
                            <Button size="sm" onClick={savePassword} disabled={pwSaving}>
                                {pwSaving ? 'Updating…' : 'Update Password'}
                            </Button>
                            {pwMsg && (
                                <span className="text-xs" style={{ color: pwMsg === 'Password updated!' ? '#34d399' : '#f87171' }}>
                                    {pwMsg}
                                </span>
                            )}
                        </div>
                    </div>
                </Section>

                {/* Appearance */}
                <Section title="Appearance" description="Choose how Rayosearch looks for you.">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                Saved locally in your browser.
                            </p>
                        </div>
                        <button
                            onClick={toggle}
                            className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium transition-colors hover:border-[#5aa9ff] hover:text-[#5aa9ff]"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                        >
                            {theme === 'dark' ? '☀ Switch to Light' : '◑ Switch to Dark'}
                        </button>
                    </div>
                </Section>

                {/* API Keys quick link */}
                <Section title="API Keys" description="Manage keys used to authenticate requests to the search API.">
                    <div className="flex items-center justify-between">
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Create and revoke API keys from the dedicated page.
                        </p>
                        <a
                            href="/api-keys"
                            className="text-xs font-medium px-3 py-1.5 rounded border transition-colors hover:border-[#5aa9ff] hover:text-[#5aa9ff]"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                        >
                            Manage Keys →
                        </a>
                    </div>
                </Section>

            </div>
        </AppLayout>
    )
}
