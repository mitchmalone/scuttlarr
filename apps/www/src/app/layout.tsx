import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'

import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans',
})

const TITLE = 'scuttlarr — the terminal developer’s desktop for macOS'
const DESCRIPTION =
  'An opinionated macOS desktop for terminal developers: a menubar replacement, a launcher that dresses up as a shell prompt, one theme rendered into everything, keyboard-first — tiling and a de-shined Mac a toggle away. The Omarchy shape, without Linux. Free and open source.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL('https://scuttlarr.com'),
  openGraph: {
    title: TITLE,
    description:
      'An opinionated macOS desktop for terminal developers — bar, launcher, one theme everywhere, keyboard-first. The Omarchy shape, without Linux. Free and open source.',
    images: ['/og.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.variable} ${ibmPlexSans.variable} font-mono`}
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
