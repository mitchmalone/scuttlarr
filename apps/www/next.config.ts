import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static-first: fully prerendered. Removing this is a recorded deviation.
  output: 'export',
}

export default nextConfig
