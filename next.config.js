/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/services': require('path').resolve(__dirname, 'services'),
      '@/packages': require('path').resolve(__dirname, 'packages'),
    }
    return config
  },
}

module.exports = nextConfig
