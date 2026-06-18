import type { Message } from '@/lib/db'
import FeedbackForm from './FeedbackForm'

interface Props {
  message: Message
  userId: string
  sessionId: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, userId, sessionId }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1" style={{ maxWidth: '75%' }}>
          <div
            className="px-4 py-3 text-sm"
            style={{
              backgroundColor: 'var(--an-accent-subtle)',
              border: '1px solid rgba(217,119,87,0.20)',
              borderRadius: '12px 12px 4px 12px',
              color: 'var(--an-fg-base)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </div>
          <span className="text-xs" style={{ color: 'var(--an-fg-muted)', fontSize: '11px' }}>
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1" style={{ maxWidth: '680px' }}>
      <div className="flex items-start gap-3">
        {/* Coral dot prefix */}
        <span
          className="rounded-full mt-1.5 shrink-0"
          style={{ width: '6px', height: '6px', backgroundColor: 'var(--an-accent)' }}
        />
        <div className="flex-1">
          <p
            className="text-sm"
            style={{ color: 'var(--an-fg-base)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
          >
            {message.content}
          </p>
          <span className="mt-1 block text-xs" style={{ color: 'var(--an-fg-muted)', fontSize: '11px' }}>
            {formatTime(message.created_at)}
          </span>
          <FeedbackForm sessionId={sessionId} userId={userId} />
        </div>
      </div>
    </div>
  )
}
