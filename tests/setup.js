// Values the server modules read at import/call time. Nothing here is a real
// secret; the keys are throwaway test material.
process.env.VITE_SUPABASE_URL ||= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'
process.env.ENCRYPTION_KEY ||= 'a'.repeat(64)
process.env.INSTAGRAM_APP_SECRET ||= 'test-app-secret'
process.env.INSTAGRAM_APP_ID ||= '1234567890'
process.env.META_VERIFY_TOKEN ||= 'test-verify-token'
