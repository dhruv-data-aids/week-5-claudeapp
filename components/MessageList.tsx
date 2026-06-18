'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/db'
import MessageBubble from './MessageBubble'

interface Props {
  messages: Message[]
  isLoading: boolean
  userId: string
  sessionId: string
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <span
        className="rounded-full mt-1.5 shrink-0"
        style={{ width: '6px', height: '6px', backgroundColor: 'var(--an-accent)' }}
      />
      <div className="flex gap-1 pt-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: 'var(--an-fg-muted)',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}

export default function MessageList({ messages, isLoading, userId, sessionId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm mb-1" style={{ color: 'var(--an-fg-subtle)' }}>
            Upload a document and ask your first question
          </p>
          <p className="text-xs" style={{ color: 'var(--an-fg-muted)' }}>
            Attach a PDF or DOCX using the paperclip icon below
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-6 px-4">
      <div className="flex flex-col gap-6 mx-auto" style={{ maxWidth: '680px' }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            userId={userId}
            sessionId={sessionId}
          />
        ))}
        {isLoading && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
