const INSTALL = 'curl -fsSL https://scuttlarr.com/install | sh'

const GETS = [
  [
    'De-shined macOS',
    'Reduced transparency and motion, Stage Manager and Apple tiling off, no desktop icons, Dock parked, Siri gone, no press-and-hold accents, no autocorrect anywhere.',
  ],
  [
    'Tiling, launcher, bar',
    'launcharr is the launcher, the menu bar, and owns AeroSpace tiling. Zero granted permissions.',
  ],
  [
    'One theme, everywhere',
    'One palette rendered into the terminal, prompt, launcher, bar, borders, wallpaper and the macOS accent. scuttlarr theme set dracula changes all of them.',
  ],
  [
    'Caps Lock → Hyper',
    'Esc on tap, a fifth modifier on hold. A whole clean layer of shortcuts nobody else binds.',
  ],
  [
    'Default apps, declared',
    'Which app opens .md, .json, .mp4, http:// — one file, applied on install.',
  ],
  [
    'A lifecycle',
    'scuttlarr update pulls the base and runs migrations. doctor tells you what drifted. Your overlay survives all of it.',
  ],
] as const

const PRINCIPLES = [
  [
    'Opinionated is the feature.',
    'One choice per surface. Alternatives are an overlay, not a config flag.',
  ],
  ['Raw over shiny.', 'If macOS added it to look nice, it’s off by default.'],
  [
    'Zero permissions where possible.',
    'No Accessibility, no Full Disk Access for the base install.',
  ],
  [
    'Hackable.',
    'Shell scripts and plain config files in directories. Read them, fork them, overlay them.',
  ],
  [
    'Updatable.',
    'A distro you can’t update is a snapshot. Migrations are first-class.',
  ],
] as const

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 font-mono">
      <header className="mb-16">
        <p className="mb-3 text-sm text-[#6272a4]">~ $ scuttlarr</p>
        <h1 className="text-5xl font-bold tracking-tight">
          scuttlarr <span aria-hidden>🏴‍☠️</span>
        </h1>
        <p className="mt-4 text-2xl text-[#bd93f9]">
          Scuttle the ship. Sail the wreck.
        </p>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#f8f8f2]/85">
          An opinionated macOS distro for developers. One command turns a fresh
          Mac into a fast, quiet, keyboard-first machine — the Liquid Glass
          scraped off, the Dock parked, windows tiled, one launcher, one menu
          bar, one theme across everything — and a lifecycle to keep it that
          way.
        </p>
        <pre className="mt-8 overflow-x-auto rounded border border-[#44475a] bg-[#21222c] px-5 py-4 text-sm">
          <code>
            <span className="text-[#50fa7b]">$</span> {INSTALL}
          </code>
        </pre>
        <p className="mt-3 text-sm text-[#6272a4]">
          Pre-alpha. The install URL lands with the first release —{' '}
          <a
            className="text-[#8be9fd] underline-offset-4 hover:underline"
            href="https://github.com/mitchmalone/scuttlarr"
          >
            watch the repo
          </a>
          .
        </p>
      </header>

      <section className="mb-16">
        <h2 className="mb-6 text-sm uppercase tracking-widest text-[#ff79c6]">
          What you get
        </h2>
        <dl className="grid gap-6 sm:grid-cols-2">
          {GETS.map(([title, body]) => (
            <div key={title}>
              <dt className="font-bold text-[#f1fa8c]">{title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-[#f8f8f2]/75">
                {body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-sm uppercase tracking-widest text-[#ff79c6]">
          Not a dotfiles manager
        </h2>
        <p className="leading-relaxed text-[#f8f8f2]/85">
          Dotfiles are the residue of a person; nobody installs someone else’s.
          scuttlarr is a base with a lifecycle. The base is read-only and never
          edited on your machine. Everything of yours lives in{' '}
          <code className="text-[#8be9fd]">~/.config/scuttlarr/</code> — extra
          apps, defaults you flip back, shell fragments, private themes. When
          the base changes an opinion, a migration ships with it. You don’t
          write dotfiles; you override a distro.
        </p>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-sm uppercase tracking-widest text-[#ff79c6]">
          Principles
        </h2>
        <ol className="space-y-3">
          {PRINCIPLES.map(([lead, rest], i) => (
            <li key={lead} className="leading-relaxed">
              <span className="text-[#6272a4]">{i + 1}. </span>
              <strong className="text-[#f8f8f2]">{lead}</strong>{' '}
              <span className="text-[#f8f8f2]/75">{rest}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-[#44475a] pt-6 text-sm text-[#6272a4]">
        Sibling of{' '}
        <a
          className="text-[#8be9fd] hover:underline"
          href="https://launcharr.com"
        >
          launcharr
        </a>
        . The shape is Omarchy’s; the themes follow Dracula’s model. MIT.{' '}
        <a
          className="text-[#8be9fd] hover:underline"
          href="https://github.com/mitchmalone/scuttlarr"
        >
          github.com/mitchmalone/scuttlarr
        </a>
      </footer>
    </main>
  )
}
