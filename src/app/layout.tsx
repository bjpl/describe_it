import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import OfflineIndicator from '@/components/OfflineIndicator';
import Script from 'next/script';
import PerformanceBudget from '@/components/Performance/PerformanceBudget';
import { SentryErrorBoundary } from '@/components/ErrorBoundary/SentryErrorBoundary';
import { logger } from '@/lib/logger';

// Use system font stack instead of Google Fonts for offline/network-restricted environments
const fontClassName = 'font-sans';

export const metadata: Metadata = {
  title: 'Describe It - Spanish Learning with Images',
  description: 'Learn Spanish through visual descriptions, Q&A, and vocabulary extraction',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Describe It - Spanish Learning with Images',
    description: 'Learn Spanish through visual descriptions, Q&A, and vocabulary extraction',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        {/* Preconnect to external domains */}
        <link rel='preconnect' href='https://images.unsplash.com' />
        <link rel='preconnect' href='https://api.openai.com' />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />

        {/* DNS prefetch for faster connections */}
        <link rel='dns-prefetch' href='https://images.unsplash.com' />
        <link rel='dns-prefetch' href='https://plus.unsplash.com' />

        {/* Resource hints */}
        <link rel='prefetch' href='/api/translate' />
        <link rel='prefetch' href='/api/phrases/extract' />

        {/* Performance optimizations */}
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta name='format-detection' content='telephone=no' />
      </head>
      <body className={`${fontClassName} min-h-screen bg-gray-50`}>
        <SentryErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
          <Providers>
            {children}
            <OfflineIndicator />
            <PerformanceBudget />
          </Providers>
        </SentryErrorBoundary>
        <Script id='register-sw' strategy='afterInteractive'>
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    if (window.logger) {
                      window.logger.info('Service worker registered', { registration });
                    }
                  })
                  .catch((error) => {
                    if (window.logger) {
                      window.logger.error('Service worker registration failed', error);
                    }
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
