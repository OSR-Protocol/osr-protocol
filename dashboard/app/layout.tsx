import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OSR OPS — Agent Command Center',
  description: 'Internal operations dashboard for OSR Protocol agent monitoring',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-osr-black">{children}</body>
    </html>
  )
}
