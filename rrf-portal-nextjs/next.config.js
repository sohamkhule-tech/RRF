/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ✅ DOCKER HOT RELOAD CONFIGURATION
  // Enables file watching in Docker containers via polling
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,           // Check for changes every 1 second
        aggregateTimeout: 300, // Wait 300ms before rebuilding
        ignored: /node_modules/,
      }
    }
    return config
  },
}

module.exports = nextConfig
