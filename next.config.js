/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 14
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Enable static export for Electron
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  // Disable server-side features for static export
  ...(process.env.NODE_ENV === 'production' && {
    distDir: 'out'
  })
}

module.exports = nextConfig 