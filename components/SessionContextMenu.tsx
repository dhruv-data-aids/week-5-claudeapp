'use client'

import { useEffect, useRef } from 'react'
import { Pin, PinOff, Pencil, Trash2 } from 'lucide-react'

interface Props {
  sessionId: string
  isPinned: boolean
  onPin: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
  anchorRect: DOMRect
}

export default function SessionContextMenu({
  isPinned,
  onPin,
  onRename,
  onDelete,
  onClose,
  anchorRect,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const top = anchorRect.bottom + 4
  const left = anchorRect.left

  const item =
    'flex items-center gap-2 w-full px-3 py-2 text-left text-xs rounded-md transition-colors duration-100 cursor-pointer'

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-lg py-1 w-40 an-fade-in"
      style={{
        top,
        left,
        backgroundColor: 'var(--an-bg-elevated)',
        border: '1px solid var(--an-border-base)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      <button
        className={item}
        style={{ color: 'var(--an-fg-base)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-bg-surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => { onPin(); onClose() }}
      >
        {isPinned ? <PinOff size={14} strokeWidth={1.5} /> : <Pin size={14} strokeWidth={1.5} />}
        {isPinned ? 'Unpin' : 'Pin'}
      </button>
      <button
        className={item}
        style={{ color: 'var(--an-fg-base)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-bg-surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => { onRename(); onClose() }}
      >
        <Pencil size={14} strokeWidth={1.5} />
        Rename
      </button>
      <button
        className={item}
        style={{ color: 'var(--an-error)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(192,91,91,0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => { onDelete(); onClose() }}
      >
        <Trash2 size={14} strokeWidth={1.5} />
        Delete
      </button>
    </div>
  )
}
