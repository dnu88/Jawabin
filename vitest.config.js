import { defineConfig } from 'vitest/config'

// Unit tests only. End-to-end specs live in tests/e2e and run under Playwright.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    environment: 'node',
    reporters: 'default',
    // Two suites stub fetch and talk to fake timers; under a loaded machine the
    // default 5s ceiling occasionally trips and looks like a real failure.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
})
