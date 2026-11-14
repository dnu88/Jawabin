import { defineConfig } from 'vitest/config'

// Unit tests only. End-to-end specs live in tests/e2e and run under Playwright.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    environment: 'node',
    reporters: 'default',
  },
})
