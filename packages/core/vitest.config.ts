import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.generated.ts'],
      reporter: ['text-summary'],
      // Floors at the measured numbers, rounded down (2026-10-19). Raise, never lower.
      thresholds: { lines: 95, branches: 88, functions: 91, statements: 94 },
    },
  },
})
