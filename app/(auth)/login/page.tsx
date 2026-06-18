'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('userId')) router.replace('/dashboard')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userEmail', data.email)
      router.replace('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-xl p-8 border"
        style={{
          backgroundColor: 'var(--an-bg-subtle)',
          borderColor: 'var(--an-border-base)',
        }}
      >
        <h1
          className="mb-6 text-center"
          style={{
            fontFamily: 'Lora, Georgia, serif',
            fontSize: '28px',
            fontWeight: 500,
            color: 'var(--an-fg-base)',
          }}
        >
          Welcome back
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 rounded-md px-3 text-sm outline-none transition-colors duration-150"
            style={{
              backgroundColor: 'var(--an-bg-surface)',
              border: '1px solid var(--an-border-base)',
              color: 'var(--an-fg-base)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--an-border-strong)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--an-border-base)')}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-9 rounded-md px-3 text-sm outline-none transition-colors duration-150"
            style={{
              backgroundColor: 'var(--an-bg-surface)',
              border: '1px solid var(--an-border-base)',
              color: 'var(--an-fg-base)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--an-border-strong)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--an-border-base)')}
            autoComplete="current-password"
          />

          {error && (
            <p className="text-xs" style={{ color: 'var(--an-error)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-9 rounded-md text-sm font-medium text-white transition-colors duration-150"
            style={{
              backgroundColor: loading ? 'var(--an-accent-hover)' : 'var(--an-accent)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs" style={{ color: 'var(--an-fg-subtle)' }}>
          No account?{' '}
          <Link
            href="/signup"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--an-accent)' }}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
