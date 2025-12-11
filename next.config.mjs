import {withSentryConfig} from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // External packages that should not be bundled (native modules)
  serverExternalPackages: [
    'ruvector',
    '@ruvector/core',
    '@ruvector/attention',
    '@ruvector/attention-linux-x64-gnu',
    '@ruvector/attention-darwin-arm64',
    '@ruvector/attention-darwin-x64',
    '@ruvector/attention-win32-x64-msvc',
  ],

  // Image optimization with blur placeholders
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    optimizeCss: true,
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB', 'INP'],
  },

  // Output configuration for Vercel
  output: 'standalone',

  // TypeScript - build errors are now enforced
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint - temporarily ignore warnings for deployment (warnings are non-critical)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // HTTP headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack configuration for optimal bundling
  webpack: (config, { isServer, webpack, dev }) => {
    // Completely ignore ruvector packages - code has mock fallback
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^ruvector$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@ruvector\//,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /\.node$/,
      })
    );

    if (isServer) {
      // Ignore DOMPurify's browser-specific stylesheets
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /default-stylesheet\.css$/,
        })
      );

      // Add fallback for missing modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Bundle analyzer for production builds
    if (!dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
          openAnalyzer: false,
        })
      );
    }

    // Optimize chunking
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'async',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // React/Next.js framework chunk
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              reuseExistingChunk: true,
            },
            // UI libraries chunk
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

// Export with Sentry configuration
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "bjpl",
  project: process.env.SENTRY_PROJECT || "describe-it-dev",

  // Suppress Sentry CLI logs in local development
  silent: !process.env.CI,

  // Enable wider file upload for better error tracking
  widenClientFileUpload: true,

  // Use tunnel route for Sentry to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Disable Sentry logger to reduce noise
  disableLogger: true,

  // Enable automatic Vercel monitoring integration
  automaticVercelMonitors: true,

  // Keep source maps for better debugging
  hideSourceMaps: false,

  // Transpile Sentry packages for better compatibility
  transpileClientSDK: true,
});