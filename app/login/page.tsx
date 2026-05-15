'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        window.location.href = from
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Incorrect password')
      }
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 360,
        padding: '40px 32px',
        background: '#1a1d27',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c6ef7 0%, #5b4fcf 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 22,
          }}>
            🔒
          </div>
          <h1 style={{
            fontSize: 20, fontWeight: 700, color: '#f0f0f5',
            margin: '0 0 6px',
          }}>
            PD Tracker
          </h1>
          <p style={{ fontSize: 13, color: '#8a8fa8', margin: 0 }}>
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0f1117',
                border: `1px solid ${error ? '#e05656' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 8,
                fontSize: 14,
                color: '#f0f0f5',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#7c6ef7' }}
              onBlur={e => { e.target.style.borderColor = error ? '#e05656' : 'rgba(255,255,255,0.12)' }}
            />
            {error && (
              <p style={{ fontSize: 12, color: '#e05656', margin: '6px 0 0', textAlign: 'center' }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: loading || !password ? 'rgba(124,110,247,0.4)' : '#7c6ef7',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
