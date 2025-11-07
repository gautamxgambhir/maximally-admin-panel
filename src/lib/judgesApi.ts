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
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching judges:', error)
    throw error
  }

  console.log('Judges data from Supabase:', data)
  
  // Map the Supabase response to the expected interface
  const mapped = (data || []).map((judge: any) => ({
    id: judge.id,
    name: judge.full_name || '',
    role_in_company: judge.role_title || '',
    company: judge.company || '',
    display_order: judge.display_order || 0,
    created_at: judge.created_at || new Date().toISOString(),
    updated_at: judge.updated_at || new Date().toISOString(),
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
    display_order: judge.display_order ?? 0
  }
  
  if (judge.headline) insertData.headline = judge.headline
  if (judge.location) insertData.judge_location = judge.location
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
    display_order: data.display_order || 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
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
          is_published, display_order } = judge
  
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
  if (display_order !== undefined) updateData.display_order = display_order
  
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
    display_order: data.display_order || 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
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
  const { error } = await supabase
    .from('judges')
    .delete()
    .eq('id', id)

  if (error) throw error
}


// Reorder judges
export async function reorderJudges(updates: { id: number; display_order: number }[]): Promise<void> {
  const promises = updates.map(update =>
    supabase
      .from('judges')
      .update({
        display_order: update.display_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.id)
  )

  const results = await Promise.all(promises)
  
  // Check if any updates failed
  const errors = results.filter(result => result.error).map(result => result.error)
  if (errors.length > 0) {
    throw new Error(`Failed to reorder judges: ${errors.map(e => e?.message).join(', ')}`)
  }
}

// Get judges count
export async function getJudgesCount(): Promise<number> {
  const { count, error } = await supabase
    .from('judges')
    .select('id', { count: 'exact' })

  if (error) throw error
  return count || 0
}