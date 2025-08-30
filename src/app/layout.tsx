import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/styles/accessibility.css'
import '@/styles/responsive.css'
import { ReactQueryProvider } from '@/providers/ReactQueryProvider'
import { EnhancedErrorBoundary } from '@/components/ErrorBoundary/EnhancedErrorBoundary'
import { AccessibilityProvider, AccessibilityPanel } from '@/components/Accessibility/AccessibilityProvider'
import { PerformanceMonitor } from '@/components/Performance/PerformanceMonitor'
import { PWAOptimizations } from '@/components/Performance/PWAOptimizations'
import { BundleAnalyzer } from '@/components/Performance/BundleAnalyzer'
import { AdvancedCaching } from '@/components/Performance/AdvancedCaching'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Describe It - Spanish Learning with Images',
  description: 'Learn Spanish through visual descriptions, Q&A, and vocabulary extraction',
  keywords: 'Spanish learning, language learning, visual learning, GPT-4, education, accessibility',
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  authors: [{ name: 'Describe It Team' }],
  creator: 'Describe It',
  publisher: 'Describe It',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Describe It - Spanish Learning with Images',
    description: 'Learn Spanish through visual descriptions, Q&A, and vocabulary extraction',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Describe It - Spanish Learning with Images',
    description: 'Learn Spanish through visual descriptions, Q&A, and vocabulary extraction',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://plus.unsplash.com" />
        <link rel="dns-prefetch" href="https://api.unsplash.com" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <EnhancedErrorBoundary
          onError={(error, errorInfo) => {
            // Log to analytics service
            console.error('Application Error:', error, errorInfo);
          }}
          resetOnPropsChange
        >
          <AccessibilityProvider>
            <ReactQueryProvider>
              {children}
              <AccessibilityPanel />
              <PerformanceMonitor />
              <PWAOptimizations enabled />
              <BundleAnalyzer enabled={process.env.NODE_ENV === 'development'} />
              <AdvancedCaching enabled />
            </ReactQueryProvider>
          </AccessibilityProvider>
        </EnhancedErrorBoundary>
      </body>
    </html>
  )
}