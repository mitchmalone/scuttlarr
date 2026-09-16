import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

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
            {
              group: [
                'node:*',
                'fs',
                'path',
                'os',
                'child_process',
                'http',
                'https',
                'net',
              ],
              message:
                'packages/core is the pure engine: no Node I/O (invariant 5).',
            },
            {
              group: [
                '@scuttlarr/tui',
                '@scuttlarr/tui/*',
                '@scuttlarr/plugins/*',
              ],
              message: 'packages/core sits under the kit, never on it.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...[
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
        ].map((name) => ({
          name,
          message: `${name} is I/O or time: pass it in (invariant 5).`,
        })),
      ],
    },
  },
  {
    // Tests may fake the clock.
    files: ['packages/core/src/**/*.test.ts'],
    rules: { 'no-restricted-globals': 'off' },
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
  prettier,
)
