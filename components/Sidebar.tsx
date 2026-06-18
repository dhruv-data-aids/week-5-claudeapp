'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, LogOut, MoreHorizontal, Pin } from 'lucide-react'
import type { Session } from '@/lib/db'
import SessionContextMenu from './SessionContextMenu'

type FilterTab = 'all' | 'pinned' | 'recent' | 'processing' | 'completed' | 'error'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'recent', label: 'Recent' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'error', label: 'Error' },
]

const STATUS_COLORS: Record<string, string> = {
  idle: 'var(--an-fg-muted)',
  processing: 'var(--an-warning)',
  completed: 'var(--an-success)',
  error: 'var(--an-error)',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface Props {
  sessions: Session[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
  onPinSession: (id: string, pinned: boolean) => void
  onDeleteSession: (id: string) => void
  userEmail: string
  onLogout: () => void
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onPinSession,
  onDeleteSession,
  userEmail,
  onLogout,
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null)
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  const filtered = sessions.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'all') return true
    if (filter === 'pinned') return s.pinned
    if (filter === 'recent') {
      return new Date(s.updated_at) > new Date(Date.now() - 7 * 86400000)
    }
    return s.status === filter
  })

  function openMenu(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuSessionId(sessionId)
    setMenuRect(rect)
  }

  function startRename(session: Session) {
    setRenamingId(session.id)
    setRenameValue(session.title)
    setTimeout(() => renameRef.current?.focus(), 50)
  }

  function commitRename(sessionId: string) {
    const trimmed = renameValue.trim()
    if (trimmed) onRenameSession(sessionId, trimmed)
    setRenamingId(null)
  }

  const initials = userEmail.slice(0, 2).toUpperCase()

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{
        width: '256px',
        backgroundColor: 'var(--an-bg-subtle)',
        borderRight: '1px solid var(--an-border-base)',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--an-border-base)' }}>
        <span
          style={{
            fontFamily: 'Lora, Georgia, serif',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--an-fg-base)',
          }}
        >
          Contract AI
        </span>
      </div>

      {/* New chat */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 w-full h-9 px-4 rounded-md text-sm font-medium text-white transition-colors duration-150"
          style={{ backgroundColor: 'var(--an-accent)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-accent)')}
        >
          <Plus size={14} strokeWidth={1.5} />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-md"
          style={{
            backgroundColor: 'var(--an-bg-surface)',
            border: '1px solid var(--an-border-base)',
          }}
        >
          <Search size={14} strokeWidth={1.5} style={{ color: 'var(--an-fg-muted)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--an-fg-base)' }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-3 pb-2 flex gap-1 flex-wrap shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
            style={{
              backgroundColor: filter === tab.key ? 'var(--an-accent-subtle)' : 'transparent',
              color: filter === tab.key ? 'var(--an-accent)' : 'var(--an-fg-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2">
        {filtered.length === 0 ? (
          <p className="text-center text-xs px-3 py-6" style={{ color: 'var(--an-fg-muted)' }}>
            {search || filter !== 'all'
              ? 'No sessions match your search.'
              : 'No chats yet — start one above.'}
          </p>
        ) : (
          filtered.map((session) => {
            const isActive = session.id === activeSessionId
            const isRenaming = renamingId === session.id

            return (
              <div
                key={session.id}
                className="group relative flex items-center gap-2 h-9 px-3 rounded-md cursor-pointer transition-colors duration-100 mb-0.5"
                style={{
                  backgroundColor: isActive ? 'var(--an-bg-elevated)' : 'transparent',
                  color: isActive ? 'var(--an-fg-base)' : 'var(--an-fg-subtle)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--an-bg-surface)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }}
                onClick={() => !isRenaming && onSelectSession(session.id)}
              >
                {/* Status dot */}
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: STATUS_COLORS[session.status] ?? 'var(--an-fg-muted)',
                  }}
                />

                {/* Title / rename input */}
                {isRenaming ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(session.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onBlur={() => commitRename(session.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-xs outline-none"
                    style={{
                      color: 'var(--an-fg-base)',
                      borderBottom: '1px solid var(--an-border-strong)',
                    }}
                  />
                ) : (
                  <span className="flex-1 text-xs truncate">{session.title}</span>
                )}

                {/* Pin dot */}
                {session.pinned && !isRenaming && (
                  <Pin size={10} strokeWidth={1.5} style={{ color: 'var(--an-accent)', flexShrink: 0 }} />
                )}

                {/* Date */}
                {!isRenaming && (
                  <span className="text-xs shrink-0" style={{ color: 'var(--an-fg-muted)', fontSize: '11px' }}>
                    {formatDate(session.updated_at)}
                  </span>
                )}

                {/* Context menu trigger */}
                {!isRenaming && (
                  <button
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded transition-opacity duration-100"
                    style={{ color: 'var(--an-fg-muted)' }}
                    onClick={(e) => openMenu(e, session.id)}
                  >
                    <MoreHorizontal size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* User footer */}
      <div
        className="px-4 py-3 flex items-center gap-2 shrink-0"
        style={{ borderTop: '1px solid var(--an-border-base)' }}
      >
        <div
          className="flex items-center justify-center rounded-full shrink-0 text-xs font-medium"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: 'var(--an-accent-subtle)',
            color: 'var(--an-accent)',
          }}
        >
          {initials}
        </div>
        <span className="flex-1 text-xs truncate" style={{ color: 'var(--an-fg-subtle)' }}>
          {userEmail}
        </span>
        <button
          onClick={onLogout}
          className="shrink-0 p-1 rounded transition-colors duration-100"
          style={{ color: 'var(--an-fg-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--an-fg-base)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--an-fg-muted)')}
          title="Sign out"
        >
          <LogOut size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Context menu */}
      {menuSessionId && menuRect && (
        <SessionContextMenu
          sessionId={menuSessionId}
          isPinned={sessions.find((s) => s.id === menuSessionId)?.pinned ?? false}
          onPin={() => {
            const s = sessions.find((x) => x.id === menuSessionId)
            if (s) onPinSession(s.id, !s.pinned)
          }}
          onRename={() => {
            const s = sessions.find((x) => x.id === menuSessionId)
            if (s) startRename(s)
          }}
          onDelete={() => setDeleteConfirmId(menuSessionId)}
          onClose={() => { setMenuSessionId(null); setMenuRect(null) }}
          anchorRect={menuRect}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 w-80 an-fade-in"
            style={{
              backgroundColor: 'var(--an-bg-elevated)',
              border: '1px solid var(--an-border-base)',
            }}
          >
            <p className="text-sm mb-1" style={{ color: 'var(--an-fg-base)', fontWeight: 500 }}>
              Delete this chat?
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--an-fg-subtle)' }}>
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="h-8 px-3 rounded-md text-xs transition-colors duration-150"
                style={{
                  border: '1px solid var(--an-border-base)',
                  color: 'var(--an-fg-base)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-bg-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSession(deleteConfirmId)
                  setDeleteConfirmId(null)
                }}
                className="h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150"
                style={{
                  backgroundColor: 'rgba(192,91,91,0.15)',
                  color: 'var(--an-error)',
                  border: '1px solid rgba(192,91,91,0.2)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
