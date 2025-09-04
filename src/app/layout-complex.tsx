import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Temporarily disabled for deployment
// import '@/styles/accessibility.css'
// import '@/styles/responsive.css'
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// Temporarily disabled for quick deployment
// import { EnhancedErrorBoundary } from '@/components/ErrorBoundary/EnhancedErrorBoundary'
// import { AccessibilityProvider, AccessibilityPanel } from '@/components/Accessibility/AccessibilityProvider'
// import { PerformanceMonitor } from '@/components/Performance/PerformanceMonitor'
// import { PWAOptimizations } from '@/components/Performance/PWAOptimizations'
// import { BundleAnalyzer } from '@/components/Performance/BundleAnalyzer'
// import { AdvancedCaching } from '@/components/Performance/AdvancedCaching'

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://describe-it.vercel.app"
      : "http://localhost:3007",
  ),
  title: "Describe It - Spanish Learning with Images",
  description:
    "Learn Spanish through visual descriptions, Q&A, and vocabulary extraction",
  keywords:
    "Spanish learning, language learning, visual learning, GPT-4, education, accessibility",
  robots: "index, follow",
  authors: [{ name: "Describe It Team" }],
  creator: "Describe It",
  publisher: "Describe It",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Describe It - Spanish Learning with Images",
    description:
      "Learn Spanish through visual descriptions, Q&A, and vocabulary extraction",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Describe It - Spanish Learning with Images",
    description:
      "Learn Spanish through visual descriptions, Q&A, and vocabulary extraction",
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#111827" },
    ],
  };
}

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://plus.unsplash.com" />
        <link rel="dns-prefetch" href="https://api.unsplash.com" />
        <meta name="theme-color" content="#3b82f6" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent hydration flash by setting theme early
              (function() {
                try {
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var stored = localStorage.getItem('theme');
                  var theme = stored || (prefersDark ? 'dark' : 'light');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                  // Hide content until hydration is complete
                  document.documentElement.style.visibility = 'visible';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} font-sans antialiased min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
      >
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <ErrorBoundary>
          <div id="root">
            <ReactQueryProvider>
              <main id="main-content" className="min-h-screen">
                {children}
              </main>
            </ReactQueryProvider>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
