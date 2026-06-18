'use client'

import { useState } from 'react'
import { Star, CheckCircle } from 'lucide-react'

interface Props {
  sessionId: string
  userId: string
}

export default function FeedbackForm({ sessionId, userId }: Props) {
  const [hover, setHover] = useState(0)
  const [selected, setSelected] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId, rating: selected, comment: comment || undefined }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Could not save feedback. Try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Could not save feedback. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 mt-2" style={{ color: 'var(--an-fg-muted)' }}>
        <CheckCircle size={14} strokeWidth={1.5} style={{ color: 'var(--an-success)' }} />
        <span className="text-xs">Thanks for your feedback</span>
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Stars */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= (hover || selected)
          return (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setSelected(n)}
              className="transition-colors duration-100"
              style={{
                color: filled
                  ? hover ? 'var(--an-warning)' : 'var(--an-accent)'
                  : 'var(--an-fg-muted)',
              }}
            >
              <Star
                size={16}
                strokeWidth={1.5}
                fill={filled ? 'currentColor' : 'none'}
              />
            </button>
          )
        })}
      </div>

      {/* Comment + submit */}
      {selected > 0 && (
        <div className="flex flex-col gap-2 an-fade-in">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="Optional comment…"
            rows={2}
            className="rounded-md px-3 py-2 text-xs outline-none resize-none transition-colors duration-150"
            style={{
              backgroundColor: 'var(--an-bg-surface)',
              border: '1px solid var(--an-border-base)',
              color: 'var(--an-fg-base)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--an-border-strong)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--an-border-base)')}
          />
          {error && <p className="text-xs" style={{ color: 'var(--an-error)' }}>{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="self-start h-8 px-3 rounded-md text-xs font-medium text-white transition-colors duration-150"
            style={{
              backgroundColor: submitting ? 'var(--an-accent-hover)' : 'var(--an-accent)',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving…' : 'Submit feedback'}
          </button>
        </div>
      )}
    </div>
  )
}
