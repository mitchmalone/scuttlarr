import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const NODE_IO = [
  'node:*',
  'fs',
  'path',
  'os',
  'child_process',
  'http',
  'https',
  'net',
]
const NODE_IO_MESSAGE = (pkg) => `${pkg} is pure: no Node I/O (invariant 5).`

const PURITY_GLOBALS = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'process',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'performance',
  'crypto',
].map((name) => ({
  name,
  message: `${name} is I/O or time: pass it in (invariant 5).`,
}))

const PURITY_PROPERTIES = [
  {
    object: 'Date',
    property: 'now',
    message: 'Date.now is the clock: pass now in (invariant 5).',
  },
  {
    object: 'Math',
    property: 'random',
    message: 'Math.random is randomness: pass an rng in (invariant 5).',
  },
]

const PURITY_SYNTAX = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'new Date() is the clock: pass now in (invariant 5).',
  },
]

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.gen.ts',
      '**/.next/**',
      '**/out/**',
      'apps/desktop/src-tauri/target/',
      'apps/desktop/src-tauri/gen/',
      '.claude/', // session worktrees live here — never lint them from the main checkout
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Invariant 5, enforced rather than trusted (DECISIONS 2026-09-16): the engine is I/O-free. Nothing in
    // packages/core may reach the OS, the window, the network or a UI framework —
    // every environment fact arrives as a parameter.
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tauri-apps/*', 'react', 'react-dom', 'react/*'],
              message:
                'packages/core is the pure engine: no Tauri, no React (invariant 5).',
            },
            { group: NODE_IO, message: NODE_IO_MESSAGE('packages/core') },
            {
              group: [
                '@scuttlarr/tui',
                '@scuttlarr/tui/*',
                '@scuttlarr/plugins',
                '@scuttlarr/plugins/*',
                '@scuttlarr/theme',
                '@scuttlarr/theme/*',
              ],
              message: 'packages/core sits under the kit, never on it.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...PURITY_GLOBALS],
      'no-restricted-properties': ['error', ...PURITY_PROPERTIES],
      'no-restricted-syntax': ['error', ...PURITY_SYNTAX],
    },
  },
  {
    // packages/theme is the same kind of leaf: palettes, derivation and rendering are pure; the
    // generator that touches disk lives in bin/, outside src/.
    files: ['packages/theme/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tauri-apps/*', 'react', 'react-dom', 'react/*'],
              message:
                'packages/theme is pure: no Tauri, no React (invariant 5).',
            },
            { group: NODE_IO, message: NODE_IO_MESSAGE('packages/theme') },
            {
              group: ['@scuttlarr/*'],
              message:
                'packages/theme is a leaf: it imports no workspace package.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...PURITY_GLOBALS],
      'no-restricted-properties': ['error', ...PURITY_PROPERTIES],
      'no-restricted-syntax': ['error', ...PURITY_SYNTAX],
    },
  },
  {
    // Tests may fake the clock, roll dice and read fixtures from disk.
    files: [
      'packages/core/src/**/*.test.ts',
      'packages/theme/src/**/*.test.ts',
    ],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    files: [
      'apps/desktop/widgets/**/*.ts',
      'apps/desktop/src-tauri/scripts/**/*.ts',
    ],
    rules: {
      // Plugins (widgets, bundled scripts) speak the protocol on stdout.
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: {
      // Operational scripts talk to a human via stdout.
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { globals: { module: 'readonly' } },
  },
  prettier,
)
