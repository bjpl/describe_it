import type { Metadata } from 'next';
import './globals.css';
import './motion-fix.css';
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
        {/* Debug banner to verify JS is executing - REMOVE AFTER DEBUGGING */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log('[DEBUG] Inline script executing at:', new Date().toISOString());

                // Create debug banner
                var banner = document.createElement('div');
                banner.id = 'js-debug-banner';
                banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fef3c7;color:#92400e;padding:8px;text-align:center;z-index:99999;font-size:14px;';
                banner.innerHTML = 'JS Running: <span id="js-status">YES</span> | React: <span id="react-status">PENDING...</span> | Clicks: <span id="click-count">0</span>';
                document.body.insertBefore(banner, document.body.firstChild);

                // Track clicks
                var clickCount = 0;
                document.addEventListener('click', function(e) {
                  clickCount++;
                  var el = document.getElementById('click-count');
                  if (el) el.textContent = clickCount + ' (target: ' + e.target.tagName + ')';
                  console.log('[DEBUG] Click detected:', e.target.tagName, e.target.className);
                }, true);

                // Check for React hydration
                var checkReact = setInterval(function() {
                  var reactRoot = document.querySelector('[data-reactroot]') || document.querySelector('#__next');
                  var hasReactFiber = false;
                  try {
                    var mainEl = document.querySelector('main');
                    if (mainEl) {
                      for (var key in mainEl) {
                        if (key.startsWith('__reactFiber') || key.startsWith('__reactProps')) {
                          hasReactFiber = true;
                          break;
                        }
                      }
                    }
                  } catch(e) {}

                  var statusEl = document.getElementById('react-status');
                  if (statusEl) {
                    if (hasReactFiber) {
                      statusEl.textContent = 'HYDRATED';
                      statusEl.style.color = '#059669';
                      clearInterval(checkReact);
                    }
                  }
                }, 500);

                // Timeout after 10 seconds
                setTimeout(function() {
                  clearInterval(checkReact);
                  var statusEl = document.getElementById('react-status');
                  if (statusEl && statusEl.textContent === 'PENDING...') {
                    statusEl.textContent = 'FAILED!';
                    statusEl.style.color = '#dc2626';
                  }
                }, 10000);

                // Global error handler
                window.addEventListener('error', function(e) {
                  console.error('[DEBUG] JS Error:', e.message, e.filename, e.lineno);
                  var banner = document.getElementById('js-debug-banner');
                  if (banner) {
                    banner.style.background = '#fee2e2';
                    banner.innerHTML += '<br>ERROR: ' + e.message;
                  }
                });

                window.addEventListener('unhandledrejection', function(e) {
                  console.error('[DEBUG] Unhandled rejection:', e.reason);
                  var banner = document.getElementById('js-debug-banner');
                  if (banner) {
                    banner.style.background = '#fee2e2';
                    banner.innerHTML += '<br>REJECTION: ' + (e.reason ? e.reason.message || e.reason : 'Unknown');
                  }
                });
              })();
            `,
          }}
        />
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
