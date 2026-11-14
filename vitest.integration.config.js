import { defineConfig } from 'vitest/config'

// Runs against a real Supabase stack (local `supabase start`) plus a local
// stand-in for the Instagram Graph API. Every test is skipped unless the env
// below is present, so CI without a stack stays green.
//
//   JAWABIN_INTEGRATION=1 SUPABASE_URL=... SUPABASE_ANON_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... npm run test:integration
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
})
