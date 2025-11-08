import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vbjqqspfosgelxhhqlks.supabase.co'

// Use service role key for admin operations (bypasses RLS)
// Note: This should only be used in admin panel, never in public-facing apps
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianFxc3Bmb3NnZWx4aGhxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0Mjk2ODYsImV4cCI6MjA3MzAwNTY4Nn0.fpbf1kNT-qI54aaHS0-To3jrRKU91lgwINzHEC_wUis'

// Use service role key if available (for admin operations), otherwise fall back to anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey

console.log('🔧 Supabase Configuration:')
console.log('  URL:', supabaseUrl)
console.log('  Using Service Role Key:', !!supabaseServiceKey)
console.log('  Key preview:', supabaseKey.substring(0, 20) + '...')

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create client with service role key to bypass RLS for admin operations
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Log which key is being used
if (supabaseServiceKey) {
  console.log('✅ Admin panel using SERVICE ROLE KEY - RLS bypassed')
} else {
  console.warn('⚠️ Admin panel using ANON KEY - RLS policies will apply')
}
