import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'scuttlarr — an opinionated macOS distro for developers',
  description:
    'Scuttle the ship. Sail the wreck. One command turns a fresh Mac into a fast, quiet, keyboard-first machine: shine scraped off, windows tiled, one launcher, one bar, one theme everywhere.',
  metadataBase: new URL('https://scuttlarr.com'),
  openGraph: {
    title: 'scuttlarr',
    description: 'An opinionated macOS distro for developers.',
    url: 'https://scuttlarr.com',
    siteName: 'scuttlarr',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-[#282a36] text-[#f8f8f2]">
      <body className="antialiased">{children}</body>
    </html>
  )
}
