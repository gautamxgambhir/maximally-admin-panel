import { supabase } from './supabase'

export interface Judge {
  id: number
  name: string
  role_in_company: string
  company: string
  display_order: number
  created_at: string
  updated_at: string
  username?: string
  headline?: string
  location?: string
  tier?: 'starter' | 'verified' | 'senior' | 'chief' | 'legacy'
  total_events_judged?: number
  total_teams_evaluated?: number
  total_mentorship_hours?: number
  is_published?: boolean
}

export interface JudgeInput {
  name: string
  role_in_company: string
  company: string
  display_order?: number
  username?: string
  headline?: string
  location?: string
  tier?: 'starter' | 'verified' | 'senior' | 'chief' | 'legacy'
  total_events_judged?: number
  total_teams_evaluated?: number
  total_mentorship_hours?: number
  is_published?: boolean
}

export interface JudgeUpdate extends Partial<JudgeInput> {
  id: number
}

// Get all judges - fetch directly from Supabase
export async function getJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching judges:', error)
    throw error
  }

  console.log('Judges data from Supabase:', data)
  
  // Map the Supabase response to the expected interface
  const mapped = (data || []).map((judge: any, index: number) => ({
    id: judge.id,
    name: judge.full_name || '',
    role_in_company: judge.role_title || '',
    company: judge.company || '',
    display_order: index + 1, // Generate display order based on position
    created_at: judge.created_at || new Date().toISOString(),
    updated_at: judge.created_at || new Date().toISOString(), // Use created_at since updated_at doesn't exist
    username: judge.username,
    headline: judge.headline,
    location: judge.judge_location,
    tier: judge.tier,
    total_events_judged: judge.total_events_judged || 0,
    total_teams_evaluated: judge.total_teams_evaluated || 0,
    total_mentorship_hours: judge.total_mentorship_hours || 0,
    is_published: judge.is_published
  }))
  
  console.log('Mapped judges data:', mapped)
  return mapped
}


// Get a single judge by ID
export async function getJudge(id: number): Promise<Judge | null> {
  const { data, error } = await supabase
    .from('judges')
    .select('id, full_name, role_title, company, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  
  return {
    id: data.id,
    name: data.full_name || '',
    role_in_company: data.role_title || '',
    company: data.company || '',
    display_order: 0,
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}

// Create a new judge
export async function createJudge(judge: JudgeInput): Promise<Judge> {
  const insertData: any = {
    full_name: judge.name,
    role_title: judge.role_in_company,
    company: judge.company,
    username: judge.username || judge.name.toLowerCase().replace(/\s+/g, '_'),
    tier: judge.tier || 'starter',
    is_published: judge.is_published ?? true,
    // Required fields with defaults
    headline: judge.headline || 'Judge',
    short_bio: 'Judge bio',
    judge_location: judge.location || 'Unknown',
    primary_expertise: ['General'],
    linkedin: 'https://linkedin.com',
    mentorship_statement: 'Available for mentorship',
    email: `${judge.username || judge.name.toLowerCase().replace(/\s+/g, '_')}@example.com`,
    agreed_to_nda: true
  }
  
  if (judge.total_events_judged !== undefined) insertData.total_events_judged = judge.total_events_judged
  if (judge.total_teams_evaluated !== undefined) insertData.total_teams_evaluated = judge.total_teams_evaluated
  if (judge.total_mentorship_hours !== undefined) insertData.total_mentorship_hours = judge.total_mentorship_hours

  const { data, error } = await supabase
    .from('judges')
    .insert([insertData])
    .select('*')
    .single()

  if (error) throw error
  
  return {
    id: data.id,
    name: data.full_name,
    role_in_company: data.role_title,
    company: data.company,
    display_order: 0,
    created_at: data.created_at,
    updated_at: data.created_at,
    username: data.username,
    headline: data.headline,
    location: data.judge_location,
    tier: data.tier,
    total_events_judged: data.total_events_judged,
    total_teams_evaluated: data.total_teams_evaluated,
    total_mentorship_hours: data.total_mentorship_hours,
    is_published: data.is_published
  }
}

// Update an existing judge
export async function updateJudge(judge: JudgeUpdate): Promise<Judge> {
  const { id, name, role_in_company, company, username, headline, location, tier, 
          total_events_judged, total_teams_evaluated, total_mentorship_hours, 
          is_published } = judge
  
  const updateData: any = {}
  if (name !== undefined) updateData.full_name = name
  if (role_in_company !== undefined) updateData.role_title = role_in_company
  if (company !== undefined) updateData.company = company
  if (username !== undefined) updateData.username = username
  if (headline !== undefined) updateData.headline = headline
  if (location !== undefined) updateData.judge_location = location
  if (tier !== undefined) updateData.tier = tier
  if (total_events_judged !== undefined) updateData.total_events_judged = total_events_judged
  if (total_teams_evaluated !== undefined) updateData.total_teams_evaluated = total_teams_evaluated
  if (total_mentorship_hours !== undefined) updateData.total_mentorship_hours = total_mentorship_hours
  if (is_published !== undefined) updateData.is_published = is_published
  // Note: display_order doesn't exist in the judges table
  
  const { data, error } = await supabase
    .from('judges')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  
  return {
    id: data.id,
    name: data.full_name,
    role_in_company: data.role_title,
    company: data.company,
    display_order: 0,
    created_at: data.created_at,
    updated_at: data.created_at,
    username: data.username,
    headline: data.headline,
    location: data.judge_location,
    tier: data.tier,
    total_events_judged: data.total_events_judged,
    total_teams_evaluated: data.total_teams_evaluated,
    total_mentorship_hours: data.total_mentorship_hours,
    is_published: data.is_published
  }
}

// Delete a judge
export async function deleteJudge(id: number): Promise<void> {
  console.log('🗑️ Attempting to delete judge with ID:', id)
  console.log('🔑 Using Supabase key:', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key')
  
  // First check if judge exists
  const { data: existingJudge, error: checkError } = await supabase
    .from('judges')
    .select('id, full_name')
    .eq('id', id)
    .single()
  
  if (checkError) {
    console.error('❌ Error checking judge:', checkError)
    throw new Error(`Judge not found: ${checkError.message}`)
  }
  
  console.log('📋 Found judge to delete:', existingJudge)
  
  // Now delete
  const { data, error } = await supabase
    .from('judges')
    .delete()
    .eq('id', id)
    .select()

  if (error) {
    console.error('❌ Delete error:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to delete judge: ${error.message}`)
  }
  
  console.log('✅ Judge deleted successfully:', data)
}


// Reorder judges - Note: display_order column doesn't exist in judges table
// This function is kept for compatibility but doesn't actually update anything
export async function reorderJudges(updates: { id: number; display_order: number }[]): Promise<void> {
  // Since display_order doesn't exist in the judges table, this is a no-op
  // The order is managed in the UI state only
  console.log('Reorder requested but display_order column does not exist in judges table')
  return Promise.resolve()
}

// Get judges count
export async function getJudgesCount(): Promise<number> {
  const { count, error } = await supabase
    .from('judges')
    .select('id', { count: 'exact' })

  if (error) throw error
  return count || 0
}