import releaseJson from './release.json'

/**
 * Release facts flow FROM the app repo: `release.json` is written by
 * `scuttlarr/scripts/release.sh` and must never be hand-edited. Everything the
 * site says about versions, artifacts, and install methods derives from it.
 */
export interface ReleaseArtifact {
  url: string
  sha256: string
}

export interface Release {
  version: string
  date: string
  signed: boolean
  artifacts: { zip: ReleaseArtifact; dmg: ReleaseArtifact } | null
}

export const RELEASE = releaseJson as Release
export const VERSION = `v${RELEASE.version}`
export const GITHUB_URL = 'https://github.com/mitchmalone/scuttlarr'
export const RELEASES_URL = `${GITHUB_URL}/releases`

export const BREW_COMMAND = 'brew install mitchmalone/tap/scuttlarr'

export const SOURCE_INSTALL_COMMANDS = [
  'git clone git@github.com:mitchmalone/scuttlarr.git',
  'cd scuttlarr',
  'pnpm install',
  'pnpm --filter @scuttlarr/desktop tauri build',
  'cp -R apps/desktop/src-tauri/target/release/bundle/macos/scuttlarr.app /Applications/',
  'open /Applications/scuttlarr.app',
]
