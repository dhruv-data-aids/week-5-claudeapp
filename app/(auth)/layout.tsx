export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="light"
      style={{ minHeight: '100vh', backgroundColor: 'var(--an-bg-base)' }}
    >
      {children}
    </div>
  )
}
