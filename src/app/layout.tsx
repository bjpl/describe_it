import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Describe It - Spanish Learning with Images",
  description:
    "Learn Spanish through visual descriptions, Q&A, and vocabulary extraction",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3b82f6",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Describe It - Spanish Learning with Images",
    description: "Learn Spanish through visual descriptions, Q&A, and vocabulary extraction",
    type: "website",
    locale: "en_US",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for faster connections */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://plus.unsplash.com" />
        
        {/* Resource hints */}
        <link rel="prefetch" href="/api/translate" />
        <link rel="prefetch" href="/api/phrases/extract" />
        
        {/* Performance optimizations */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}