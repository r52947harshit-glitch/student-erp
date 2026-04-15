import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient("https://hiivbgekplordkqyhkwf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaXZiZ2VrcGxvcmRrcXloa3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjQxOTgsImV4cCI6MjA5MTI0MDE5OH0.2rhsui6qw0Ppi4fwQ8MgC6QsUqsfdsX0kiMQPwIHSPM"
)
