import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vbjqqspfosgelxhhqlks.supabase.co'

// Use service role key for admin operations (bypasses RLS)
// Note: This should only be used in admin panel, never in public-facing apps
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianFxc3Bmb3NnZWx4aGhxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0Mjk2ODYsImV4cCI6MjA3MzAwNTY4Nn0.fpbf1kNT-qI54aaHS0-To3jrRKU91lgwINzHEC_wUis'

// Always use anon key for authentication
// Service role key bypasses auth and should only be used for server-side admin operations
const supabaseKey = supabaseAnonKey

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create client with proper auth configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'maximally-admin-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'maximally-admin-panel'
    }
  }
})

console.log('✅ Supabase client initialized with URL:', supabaseUrl)

// Using anon key for proper authentication flow
