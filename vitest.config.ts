import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#': new URL('./src', import.meta.url).pathname,
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Coverage floors per doc 09 §5 / Q36 (measured via `npm run test:coverage`).
    // Per-glob thresholds: domain ≥ 90, server ≥ 80. A glob that matches nothing yet
    // (e.g. src/server before slice 1) is skipped, not failed.
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/server/**'],
      reporter: ['text', 'html'],
      thresholds: [
        { include: ['src/domain/**'], lines: 90, functions: 90, branches: 90, statements: 90 },
        { include: ['src/server/**'], lines: 80, functions: 80, branches: 80, statements: 80 },
      ],
    },
  },
})
