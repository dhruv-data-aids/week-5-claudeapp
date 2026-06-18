interface Props {
  label: string
  value: number | string | null
  sub?: string
}

export default function KPICard({ label, value, sub }: Props) {
  const display = value === null || value === undefined ? '--' : String(value)

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--an-bg-surface)',
        border: '1px solid var(--an-border-base)',
      }}
    >
      <p
        className="mb-2 uppercase tracking-wide"
        style={{ fontSize: '11px', fontWeight: 500, color: 'var(--an-fg-subtle)', letterSpacing: '0.05em' }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'Lora, Georgia, serif',
          fontSize: '28px',
          fontWeight: 500,
          color: 'var(--an-fg-base)',
          lineHeight: 1.2,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : display}
      </p>
      {sub && (
        <p className="mt-1" style={{ fontSize: '12px', color: 'var(--an-fg-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
