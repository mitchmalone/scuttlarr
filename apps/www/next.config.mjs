/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Next 16 writes its own AGENTS.md/CLAUDE.md into the app dir. This repo's
  // docs system is single-source-per-fact (AGENTS.md at the root), and a
  // generated nested pair silently competes with it.
  agentRules: false,
  transpilePackages: [
    '@scuttlarr/core',
    '@scuttlarr/tui',
    '@scuttlarr/plugins',
  ],
  typedRoutes: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
