import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ReactQueryProvider } from '@/providers/ReactQueryProvider'
import { ErrorBoundary } from '@/providers/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Describe It - Spanish Learning with Images',
  description: 'Learn Spanish through visual descriptions, Q&A, and vocabulary extraction',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <ErrorBoundary>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}