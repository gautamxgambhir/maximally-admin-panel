/**
 * API Helpers for Admin Panel
 * 
 * This file provides utilities to help developers make the right choice
 * between direct Supabase calls and external API calls.
 */

import { supabase } from './supabase'

/**
 * Get the main website API base URL
 */
export const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL
  if (!url) {
    console.warn('VITE_API_BASE_URL is not set. External API calls will fail.')
  }
  return url || 'http://localhost:5002'
}

/**
 * Get authentication headers for API calls
 */
export const getAuthHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in.')
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  }
}

/**
 * Make an authenticated API call to the main website backend
 * 
 * Use this ONLY when:
 * - The operation requires sending emails
 * - The operation requires complex business logic in the main website
 * - The operation triggers workflows that exist in the main website
 * 
 * For simple CRUD operations, use direct Supabase calls instead.
 * 
 * @example
 * ```typescript
 * const result = await callMainWebsiteApi('/api/admin/organizer-applications/123/approve', {
 *   method: 'POST'
 * })
 * ```
 */
export const callMainWebsiteApi = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = getApiBaseUrl()
  const headers = await getAuthHeaders()
  
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  const response = await fetch(`${baseUrl}${normalizedEndpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(errorData.message || `API call failed: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Decision helper: Should I use Supabase or external API?
 * 
 * Use this comment block as a guide:
 * 
 * ✅ Use Direct Supabase when:
 * - Reading data (SELECT)
 * - Creating records (INSERT)
 * - Updating records (UPDATE)
 * - Deleting records (DELETE)
 * - Simple data operations
 * - No emails need to be sent
 * 
 * ✅ Use External API (callMainWebsiteApi) when:
 * - Approving/rejecting applications (sends email)
 * - Publishing/unpublishing content (sends notifications)
 * - Complex workflows that exist in main website
 * - Operations that trigger multiple side effects
 * 
 * ❌ NEVER:
 * - Call relative paths like fetch('/api/...')
 * - Call endpoints that don't exist
 * - Create your own API server in admin panel
 */

/**
 * Example: Direct Supabase (Preferred for most operations)
 */
export const exampleDirectSupabase = async () => {
  const { supabaseAdmin } = await import('./supabase')
  
  // Reading data
  const { data, error } = await supabaseAdmin
    .from('featured_hackathons')
    .select('*')
    .eq('id', 1)
    .single()
  
  if (error) throw error
  
  // Updating data
  const { error: updateError } = await supabaseAdmin
    .from('featured_hackathons')
    .upsert({ id: 1, slot_1_id: 123 })
  
  if (updateError) throw updateError
}

/**
 * Example: External API (Only when necessary)
 */
export const exampleExternalApi = async () => {
  // Approving an application (sends email, requires main website logic)
  const result = await callMainWebsiteApi('/api/admin/organizer-applications/123/approve', {
    method: 'POST'
  })
  
  return result
}
