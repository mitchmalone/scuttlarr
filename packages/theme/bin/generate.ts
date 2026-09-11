// Bake themes/*/colors.toml into packages/tui/src/themes.generated.ts and, with
// templates/*.tpl, into src/builtin.generated.ts.
//   node bin/generate.ts            write both modules
//   node bin/generate.ts --check    exit 1 if either committed module is stale (pnpm verify:themes)
//   node bin/generate.ts --out DIR  write both into DIR instead (diffing by hand)
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateBuiltinModule, generateModule } from '../src/generate.ts'

const here = fileURLToPath(new URL('.', import.meta.url))
const THEMES_DIR = resolve(here, '../themes')
const TEMPLATES_DIR = resolve(here, '../templates')
const TUI_TARGET = resolve(here, '../../tui/src/themes.generated.ts')
const BUILTIN_TARGET = resolve(here, '../src/builtin.generated.ts')

function fail(message: string): never {
  console.error(`generate: ${message}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const check = args.includes('--check')
const outIndex = args.indexOf('--out')
const outDir =
  outIndex >= 0
    ? resolve(args[outIndex + 1] ?? fail('--out needs a dir'))
    : undefined
const target = (path: string) => (outDir ? join(outDir, basename(path)) : path)

const sources = readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({
    name: d.name,
    text: readFileSync(join(THEMES_DIR, d.name, 'colors.toml'), 'utf8'),
  }))
const templates = Object.fromEntries(
  readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.tpl'))
    .map((f) => [f, readFileSync(join(TEMPLATES_DIR, f), 'utf8')]),
)

let outputs: Array<[path: string, text: string]>
try {
  outputs = [
    [target(TUI_TARGET), generateModule(sources)],
    [target(BUILTIN_TARGET), generateBuiltinModule(sources, templates)],
  ]
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

for (const [path, text] of outputs) {
  if (check) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
    if (current !== text)
      fail(`${path} is stale — run: pnpm --filter @scuttlarr/theme build`)
    console.error(`generate: ${path} up to date`)
  } else {
    writeFileSync(path, text)
    console.error(`generate: wrote ${path}`)
  }
}
console.error(
  `generate: ${sources.length} themes, ${Object.keys(templates).length} templates`,
)
