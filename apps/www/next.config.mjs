import process from 'node:process'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Next 16 writes its own AGENTS.md/CLAUDE.md into the app dir. This repo's
  // docs system is single-source-per-fact (AGENTS.md at the root), and a
  // generated nested pair silently competes with it.
  agentRules: false,
  // `next dev` refuses its own JS/CSS to any host but localhost; the dev server is
  // opened over the Tailnet, so let this machine's Tailnet name through. Dev only —
  // the static export ignores it.
  allowedDevOrigins: [
    process.env.DOTFILES_HOST_TAILSCALE_NAME,
    process.env.DOTFILES_HOST_HOSTNAME,
  ].filter(Boolean),
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
