'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Session, Message } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import ChatArea from '@/components/ChatArea'
import RightPanel from '@/components/RightPanel'

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [contractText, setContractText] = useState('')
  const [filename, setFilename] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileType, setFileType] = useState<'pdf' | 'docx' | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [executionStep, setExecutionStep] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  // Auth guard + initial load
  useEffect(() => {
    const uid = localStorage.getItem('userId')
    const email = localStorage.getItem('userEmail') ?? ''
    if (!uid) { router.replace('/login'); return }
    setUserId(uid)
    setUserEmail(email)

    fetch(`/api/sessions?userId=${uid}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data)
      })

    const sessionParam = searchParams.get('session')
    if (sessionParam) {
      setActiveSessionId(sessionParam)
      loadMessages(sessionParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMessages(sessionId: string) {
    setMessages([])
    try {
      const res = await fetch(`/api/messages?sessionId=${sessionId}`)
      const data = await res.json()
      if (Array.isArray(data)) setMessages(data)
    } catch {
      // silently handle — user can retry by reselecting the session
    }
  }

  async function handleNewChat() {
    const uid = localStorage.getItem('userId')
    if (!uid) return
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid }),
    })
    const session = await res.json()
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setMessages([])
    clearFile()
    router.replace(`/chat?session=${session.id}`)
  }

  function handleSelectSession(id: string) {
    if (id === activeSessionId) return
    abortRef.current?.abort()
    setActiveSessionId(id)
    setMessages([])
    clearFile()
    loadMessages(id)
    router.replace(`/chat?session=${id}`)
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setContractText('')
    setFilename('')
    setPreviewUrl('')
    setFileType('')
  }

  function handleFileLoaded(
    text: string,
    name: string,
    url: string,
    type: 'pdf' | 'docx'
  ) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setContractText(text)
    setFilename(name)
    setPreviewUrl(url)
    setFileType(type)
  }

  async function handleSend(userMessage: string) {
    if (!activeSessionId || isLoading) return

    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      session_id: activeSessionId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setIsLoading(true)
    setExecutionStep(1)

    // Step through execution states
    const stepTimer1 = setTimeout(() => setExecutionStep(2), 800)
    const stepTimer2 = setTimeout(() => setExecutionStep(3), 1600)
    const stepTimer3 = setTimeout(() => setExecutionStep(4), 3000)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractText,
          userMessage,
          sessionId: activeSessionId,
        }),
        signal: abort.signal,
      })

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      clearTimeout(stepTimer3)

      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
        setExecutionStep(-1)
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            session_id: activeSessionId,
            role: 'assistant',
            content: data.error ?? 'Something went wrong. Please try again.',
            created_at: new Date().toISOString(),
          },
        ])
        return
      }

      setExecutionStep(5)

      // Reload messages from DB (replaces optimistic)
      const msgsRes = await fetch(`/api/messages?sessionId=${activeSessionId}`)
      const msgs = await msgsRes.json()
      if (Array.isArray(msgs)) setMessages(msgs)

      // Auto-title from first user message
      const currentSession = sessions.find((s) => s.id === activeSessionId)
      if (currentSession && currentSession.title === 'New session') {
        const autoTitle = userMessage.length > 55
          ? userMessage.slice(0, 55) + '…'
          : userMessage
        setSessions((prev) =>
          prev.map((s) => s.id === activeSessionId ? { ...s, title: autoTitle } : s)
        )
        fetch(`/api/sessions/${activeSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: autoTitle }),
        })
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      clearTimeout(stepTimer3)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setExecutionStep(-1)
    } finally {
      setIsLoading(false)
    }
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
    if (id === activeSessionId) {
      setActiveSessionId(null)
      setMessages([])
      clearFile()
      router.replace('/chat')
    }
  }

  function handleLogout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    router.replace('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--an-bg-base)' }}>
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onRenameSession={handleRename}
        onPinSession={handlePin}
        onDeleteSession={handleDelete}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <ChatArea
        messages={messages}
        isLoading={isLoading}
        userId={userId}
        sessionId={activeSessionId}
        filename={filename}
        onSend={handleSend}
        onFileLoaded={handleFileLoaded}
        onFileDismiss={clearFile}
      />

      <RightPanel
        executionStep={executionStep}
        previewUrl={previewUrl}
        filename={filename}
        fileType={fileType}
        contractText={contractText}
        isLoading={isLoading}
      />
    </div>
  )
}
