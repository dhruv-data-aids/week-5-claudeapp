'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@/lib/db'
import KPICard from '@/components/KPICard'
import Sidebar from '@/components/Sidebar'

interface KPIs {
  totalSessions: number
  sessionsThisWeek: number
  totalMessages: number
  messagesThisWeek: number
  activeSessions: number | null
  pinnedSessions: number
  avgRating: number | null
  failedSessions: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  processing: 'Processing',
  completed: 'Completed',
  error: 'Error',
}

const STATUS_COLOR: Record<string, string> = {
  idle: 'var(--an-fg-muted)',
  processing: 'var(--an-warning)',
  completed: 'var(--an-success)',
  error: 'var(--an-error)',
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [kpiError, setKpiError] = useState(false)

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    const email = localStorage.getItem('userEmail') ?? ''
    if (!uid) { router.replace('/login'); return }
    setUserId(uid)
    setUserEmail(email)

    Promise.all([
      fetch(`/api/dashboard/kpis?userId=${uid}`).then((r) => r.json()),
      fetch(`/api/sessions?userId=${uid}`).then((r) => r.json()),
    ]).then(([k, s]) => {
      if (k.error) setKpiError(true)
      else setKpis(k)
      if (Array.isArray(s)) setSessions(s)
    })
  }, [router])

  function handleLogout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    router.replace('/login')
  }

  async function handleNewChat() {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const session = await res.json()
    router.push(`/chat?session=${session.id}`)
  }

  async function handleRename(id: string, title: string) {
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
  }

  async function handlePin(id: string, pinned: boolean) {
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, pinned } : s)))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  const recent = sessions.slice(0, 5)

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--an-bg-base)' }}>
      <Sidebar
        sessions={sessions}
        activeSessionId={null}
        onNewChat={handleNewChat}
        onSelectSession={(id) => router.push(`/chat?session=${id}`)}
        onRenameSession={handleRename}
        onPinSession={handlePin}
        onDeleteSession={handleDelete}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              style={{
                fontFamily: 'Lora, Georgia, serif',
                fontSize: '24px',
                fontWeight: 500,
                color: 'var(--an-fg-base)',
              }}
            >
              Dashboard
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--an-fg-subtle)' }}>
              Your document analysis overview
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium text-white transition-colors duration-150"
            style={{ backgroundColor: 'var(--an-accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-accent)')}
          >
            New chat
          </button>
        </div>

        {/* KPI Grid */}
        {kpiError ? (
          <p className="text-sm mb-8" style={{ color: 'var(--an-fg-muted)' }}>
            Could not load metrics. Refresh to retry.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-10" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <KPICard label="Total sessions" value={kpis?.totalSessions ?? null} sub="all time" />
            <KPICard label="Sessions this week" value={kpis?.sessionsThisWeek ?? null} sub="last 7 days" />
            <KPICard label="Total AI queries" value={kpis?.totalMessages ?? null} sub="all time" />
            <KPICard label="AI queries this week" value={kpis?.messagesThisWeek ?? null} sub="last 7 days" />
            <KPICard label="Active sessions" value={kpis?.activeSessions ?? null} sub="last 7 days" />
            <KPICard label="Pinned chats" value={kpis?.pinnedSessions ?? null} />
            <KPICard label="AI accuracy" value={kpis?.avgRating ? `${kpis.avgRating} / 5` : null} sub="avg feedback rating" />
            <KPICard label="Failed jobs" value={kpis?.failedSessions ?? null} />
            <KPICard label="Documents uploaded" value={kpis?.totalSessions ?? null} sub="1 per session" />
            <KPICard label="Reports generated" value={0} sub="v1.1 feature" />
            <KPICard label="Avg processing time" value={null} sub="coming in v1.1" />
            <KPICard label="Storage used" value={null} sub="files not persisted" />
          </div>
        )}

        {/* Recent sessions */}
        <div>
          <h2 className="mb-4 text-sm font-medium" style={{ color: 'var(--an-fg-subtle)' }}>
            Recent chats
          </h2>
          {recent.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{ border: '1px dashed var(--an-border-base)' }}
            >
              <p className="text-sm mb-3" style={{ color: 'var(--an-fg-muted)' }}>
                No sessions yet
              </p>
              <button
                onClick={handleNewChat}
                className="text-sm transition-opacity hover:opacity-80"
                style={{ color: 'var(--an-accent)' }}
              >
                Start a new chat
              </button>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {recent.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'var(--an-bg-surface)',
                    border: '1px solid var(--an-border-base)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--an-fg-base)' }}>
                      {s.title}
                    </p>
                    <span
                      className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--an-bg-elevated)',
                        color: STATUS_COLOR[s.status] ?? 'var(--an-fg-muted)',
                        fontSize: '11px',
                      }}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--an-fg-muted)' }}>
                    {formatDate(s.updated_at)}
                  </p>
                  <Link
                    href={`/chat?session=${s.id}`}
                    className="text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: 'var(--an-accent)' }}
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
