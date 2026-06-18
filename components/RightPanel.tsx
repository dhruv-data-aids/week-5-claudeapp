'use client'

import { FileText, Send, Loader, Cpu, CheckCircle, XCircle, Download } from 'lucide-react'

interface Props {
  executionStep: number // 0=idle 1=parsing 2=sending 3=waiting 4=processing 5=completed -1=error
  previewUrl: string
  filename: string
  fileType: 'pdf' | 'docx' | ''
  contractText: string
  isLoading: boolean
}

const STEPS = [
  { label: 'Parsing document', icon: FileText },
  { label: 'Sending to AI', icon: Send },
  { label: 'Waiting for response', icon: Loader },
  { label: 'Processing response', icon: Cpu },
  { label: 'Completed', icon: CheckCircle },
]

function StepRow({
  label,
  Icon,
  state,
}: {
  label: string
  Icon: React.ElementType
  state: 'pending' | 'active' | 'done' | 'error'
}) {
  const color =
    state === 'done' ? 'var(--an-success)'
    : state === 'active' ? 'var(--an-accent)'
    : state === 'error' ? 'var(--an-error)'
    : 'var(--an-fg-muted)'

  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon
        size={14}
        strokeWidth={1.5}
        style={{
          color,
          animation: state === 'active' && label.includes('Waiting') ? 'spin 1.5s linear infinite' : undefined,
        }}
      />
      <span className="text-xs" style={{ color }}>
        {label}
      </span>
      {state === 'error' && <XCircle size={12} strokeWidth={1.5} style={{ color: 'var(--an-error)', marginLeft: 'auto' }} />}
    </div>
  )
}

export default function RightPanel({
  executionStep,
  previewUrl,
  filename,
  fileType,
  contractText,
  isLoading,
}: Props) {
  const hasFile = !!filename

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{
        width: '304px',
        backgroundColor: 'var(--an-bg-subtle)',
        borderLeft: '1px solid var(--an-border-base)',
      }}
    >
      {/* Document preview */}
      <div
        className="flex flex-col"
        style={{
          flex: hasFile ? '0 0 60%' : '0 0 0%',
          borderBottom: hasFile ? '1px solid var(--an-border-base)' : 'none',
          overflow: 'hidden',
          transition: 'flex 200ms ease-out',
        }}
      >
        {hasFile && (
          <>
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--an-border-base)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} strokeWidth={1.5} style={{ color: 'var(--an-fg-subtle)', flexShrink: 0 }} />
                <span className="text-xs truncate" style={{ color: 'var(--an-fg-subtle)' }}>
                  {filename}
                </span>
              </div>
              {previewUrl && (
                <a
                  href={previewUrl}
                  download={filename}
                  className="shrink-0 ml-2 transition-colors duration-100"
                  style={{ color: 'var(--an-fg-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--an-fg-base)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--an-fg-muted)')}
                  title="Download"
                >
                  <Download size={14} strokeWidth={1.5} />
                </a>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              {fileType === 'pdf' && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title="Document preview"
                  className="w-full h-full"
                  style={{ border: 'none' }}
                />
              ) : (
                <pre
                  className="h-full overflow-y-auto p-4 text-xs leading-relaxed"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--an-fg-subtle)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {contractText.slice(0, 4000)}
                  {contractText.length > 4000 ? '\n\n… (preview truncated at 4,000 characters)' : ''}
                </pre>
              )}
            </div>
          </>
        )}
      </div>

      {/* Execution steps */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <p
          className="text-xs font-medium mb-3 uppercase tracking-wide"
          style={{ color: 'var(--an-fg-muted)', letterSpacing: '0.05em' }}
        >
          Agent steps
        </p>

        {!isLoading && executionStep === 0 ? (
          <p className="text-xs" style={{ color: 'var(--an-fg-muted)' }}>
            Steps will appear here when you send a message.
          </p>
        ) : (
          STEPS.map((step, idx) => {
            let state: 'pending' | 'active' | 'done' | 'error' = 'pending'
            const stepNum = idx + 1
            if (executionStep === -1) {
              state = stepNum <= 4 ? 'error' : 'pending'
            } else if (stepNum < executionStep) {
              state = 'done'
            } else if (stepNum === executionStep) {
              state = 'active'
            }
            return (
              <StepRow
                key={step.label}
                label={step.label}
                Icon={step.icon}
                state={state}
              />
            )
          })
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  )
}
