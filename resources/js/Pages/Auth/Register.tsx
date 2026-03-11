import { useState } from 'react'
import { usePage, router } from '@inertiajs/react'
import { useTheme } from '@/hooks/useTheme'

interface PageProps {
    errors: { name?: string; email?: string; password?: string }
    [key: string]: unknown
}

export default function Register() {
    const { errors } = usePage<PageProps>().props
    const { theme } = useTheme()

    const [name,     setName]     = useState('')
    const [email,    setEmail]    = useState('')
    const [password, setPassword] = useState('')
    const [confirm,  setConfirm]  = useState('')
    const [loading,  setLoading]  = useState(false)

    const isDark = theme === 'dark'
    const bg     = isDark ? '#0d0d0d' : '#f3f4f6'
    const panel  = isDark ? '#141414' : '#ffffff'
    const border = isDark ? '#2a2a2a' : '#e5e7eb'
    const fg     = isDark ? '#ffffff' : '#111113'
    const muted  = isDark ? '#888888' : '#6b7280'
    const accent = '#5aa9ff'

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        router.post('/register', { name, email, password, password_confirmation: confirm }, {
            onFinish: () => setLoading(false),
        })
    }

    const inputStyle = (hasError?: boolean): React.CSSProperties => ({
        width: '100%', padding: '10px 12px',
        background: isDark ? '#1a1a1a' : '#f9fafb',
        border: `1px solid ${hasError ? '#f87171' : border}`,
        borderRadius: '8px', color: fg, fontSize: '14px', outline: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transition: 'border-color .15s', boxSizing: 'border-box',
    })

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: bg, fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '0 16px' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '10px', background: accent,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                    }}>
                        <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
                            <circle cx="5.5" cy="5.5" r="3.5" stroke="white" strokeWidth="1.5"/>
                            <path d="M8.5 8.5L12 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: fg, letterSpacing: '-0.3px' }}>
                        Rayosearch
                    </div>
                    <div style={{ fontSize: '13px', color: muted, marginTop: '4px' }}>
                        Create your account
                    </div>
                </div>

                {/* Card */}
                <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: '12px', padding: '28px' }}>
                    <form onSubmit={handleSubmit}>

                        {/* Name */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: muted, marginBottom: '6px' }}>
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your name"
                                required
                                autoFocus
                                style={inputStyle(!!errors?.name)}
                                onFocus={e => { e.currentTarget.style.borderColor = accent }}
                                onBlur={e => { e.currentTarget.style.borderColor = errors?.name ? '#f87171' : border }}
                            />
                            {errors?.name && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: muted, marginBottom: '6px' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                style={inputStyle(!!errors?.email)}
                                onFocus={e => { e.currentTarget.style.borderColor = accent }}
                                onBlur={e => { e.currentTarget.style.borderColor = errors?.email ? '#f87171' : border }}
                            />
                            {errors?.email && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: muted, marginBottom: '6px' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                required
                                style={inputStyle(!!errors?.password)}
                                onFocus={e => { e.currentTarget.style.borderColor = accent }}
                                onBlur={e => { e.currentTarget.style.borderColor = errors?.password ? '#f87171' : border }}
                            />
                            {errors?.password && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>{errors.password}</p>}
                        </div>

                        {/* Confirm */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: muted, marginBottom: '6px' }}>
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={inputStyle()}
                                onFocus={e => { e.currentTarget.style.borderColor = accent }}
                                onBlur={e => { e.currentTarget.style.borderColor = border }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '10px',
                                background: loading ? accent + '99' : accent,
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontSize: '14px', fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'opacity .15s', fontFamily: 'inherit',
                            }}
                        >
                            {loading ? 'Creating account…' : 'Create account'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: muted }}>
                    Already have an account?{' '}
                    <a href="/login" style={{ color: accent, fontWeight: 500, textDecoration: 'none' }}>
                        Sign in
                    </a>
                </p>
            </div>
        </div>
    )
}
