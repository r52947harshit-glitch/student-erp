import { createClient } from '@supabase/supabase-js'

// Public client - for client-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hiivbgekplordkqyhkwf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaXZiZ2VrcGxvcmRrcXloa3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjQxOTgsImV4cCI6MjA5MTI0MDE5OH0.2rhsui6qw0Ppi4fwQ8MgC6QsUqsfdsX0kiMQPwIHSPM"
)

// Admin client - for server-side operations only (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hiivbgekplordkqyhkwf.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)
