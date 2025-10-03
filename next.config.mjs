/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Image optimization
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
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Output configuration for Vercel
  output: 'standalone',

  // TypeScript - strict validation enabled
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint - strict validation enabled
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;