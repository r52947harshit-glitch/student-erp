import { createClient } from '@supabase/supabase-js'

// Validate service role key exists (server-side only)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

// Admin client - for server-side operations ONLY (bypasses RLS)
// ⚠️ NEVER import this file in client components or browser code
// ✅ ONLY use in API routes (/app/api/*) and server components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
