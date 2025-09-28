/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: [
      'localhost',
      'your-supabase-project.supabase.co', // Replace with your Supabase project URL
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  experimental: {
    // Ensure Vercel handles TypeScript path mapping correctly
    esmExternals: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Export path mapping to exclude problematic pages
  trailingSlash: false,
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution for lib directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };
    return config;
  },
}

module.exports = nextConfig