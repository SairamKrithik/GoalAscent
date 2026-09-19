import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider'
import { Toaster } from '@/components/ui/toaster'
import NextTopLoader from 'nextjs-toploader'

export const metadata: Metadata = {
  title: 'GoalAscent — Contest & Skill Mastery Engine',
  description:
    'Mission-driven competitive programming tracker with adaptive struggle timers, spaced repetition, and post-contest error analysis.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex h-full flex-col">
          <ReactQueryProvider>
            <NextTopLoader color="#FFF" height={3} showSpinner={false} />
            {children}
            <Toaster />
          </ReactQueryProvider>
        </body>
    </html>
  )
}

