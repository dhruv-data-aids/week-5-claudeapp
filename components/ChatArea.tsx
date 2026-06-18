'use client'

import { useState, useRef } from 'react'
import { ArrowUp } from 'lucide-react'
import type { Message } from '@/lib/db'
import MessageList from './MessageList'
import FileUpload from './FileUpload'

interface Props {
  messages: Message[]
  isLoading: boolean
  userId: string
  sessionId: string | null
  filename: string
  onSend: (text: string) => void
  onFileLoaded: (text: string, filename: string, previewUrl: string, fileType: 'pdf' | 'docx') => void
  onFileDismiss: () => void
}

export default function ChatArea({
  messages,
  isLoading,
  userId,
  sessionId,
  filename,
  onSend,
  onFileLoaded,
  onFileDismiss,
}: Props) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading || !sessionId) return
    onSend(text)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const canSend = input.trim().length > 0 && !isLoading && !!sessionId

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--an-bg-base)' }}>
      {/* Message list */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        userId={userId}
        sessionId={sessionId ?? ''}
      />

      {/* Composer */}
      <div className="shrink-0 px-4 pb-6">
        <div
          className="mx-auto"
          style={{ maxWidth: '680px' }}
        >
          <div
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: 'var(--an-bg-surface)',
              border: '1px solid var(--an-border-base)',
            }}
          >
            {/* File chip */}
            {filename && (
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--an-bg-elevated)',
                    color: 'var(--an-fg-subtle)',
                  }}
                >
                  <span className="truncate max-w-[200px]">{filename}</span>
                  <button
                    onClick={onFileDismiss}
                    className="transition-colors duration-100"
                    style={{ color: 'var(--an-fg-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--an-fg-base)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--an-fg-muted)')}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-3">
              {/* File upload */}
              <FileUpload
                onFileLoaded={onFileLoaded}
                filename={filename}
                onDismiss={onFileDismiss}
              />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={sessionId ? 'Ask a question about the document…' : 'Select or create a chat to start…'}
                disabled={!sessionId || isLoading}
                rows={1}
                className="flex-1 bg-transparent text-sm outline-none resize-none"
                style={{
                  color: 'var(--an-fg-base)',
                  minHeight: '24px',
                  maxHeight: '200px',
                  lineHeight: 1.6,
                }}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="shrink-0 flex items-center justify-center rounded-full transition-colors duration-150"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: canSend ? 'var(--an-accent)' : 'var(--an-bg-elevated)',
                  color: canSend ? 'white' : 'var(--an-fg-muted)',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                }}
              >
                <ArrowUp size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center" style={{ fontSize: '11px', color: 'var(--an-fg-muted)' }}>
            Cmd+Enter to send · AI analysis only — not professional advice
          </p>
        </div>
      </div>
    </div>
  )
}
