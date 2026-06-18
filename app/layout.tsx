import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Contract AI',
  description: 'AI-powered legal contract analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
