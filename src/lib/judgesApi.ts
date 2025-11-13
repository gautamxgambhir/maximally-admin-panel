import { supabase } from './supabase'

export interface Judge {
  id: number
  name: string
  role_in_company: string
  company: string
  display_order: number
  sort_order: number
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
  sort_order?: number
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
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching judges:', error)
    throw error
  }

  // Map the Supabase response to the expected interface
  const mapped = (data || []).map((judge: any, index: number) => ({
    id: judge.id,
    name: judge.full_name || '',
    role_in_company: judge.role_title || '',
    company: judge.company || '',
    display_order: index + 1, // Generate display order based on position
    sort_order: judge.sort_order ?? 0,
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

  return mapped
}


// Get a single judge by ID
export async function getJudge(id: number): Promise<Judge | null> {
  const { data, error } = await supabase
    .from('judges')
    .select('id, full_name, role_title, company, sort_order, created_at, updated_at')
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
    sort_order: data.sort_order ?? 0,
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
    sort_order: data.sort_order ?? 0,
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
    sort_order: data.sort_order ?? 0,
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

// Delete a judge using database function (handles profile role update)
export async function deleteJudge(id: number): Promise<void> {
  // Use the database function for atomic deletion with profile update
  const { data, error } = await supabase.rpc('delete_judge_with_profile_update', {
    judge_id_param: id
  })

  if (error) {
    console.error('Error deleting judge:', error)
    throw new Error(error.message || 'Failed to delete judge')
  }

  console.log('Judge deleted successfully:', data)
}


// Reorder judges - Update sort_order in database
export async function updateJudgeSortOrders(updates: { id: number; sort_order: number }[]): Promise<void> {
  const { error } = await supabase.rpc('update_judge_sort_orders', {
    updates: updates
  })

  if (error) {
    console.error('Error updating judge sort orders:', error)
    // Fallback: update individually if RPC fails
    for (const update of updates) {
      await supabase
        .from('judges')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }
  }
}

// Update judge with automatic reordering
export async function updateJudgeWithReorder(judge: JudgeUpdate): Promise<Judge> {
  // If sort_order is being changed, we need to reorder other judges
  if (judge.sort_order !== undefined) {
    // Get all judges to calculate new positions
    const allJudges = await getJudges()
    const currentJudge = allJudges.find(j => j.id === judge.id)
    
    if (currentJudge && currentJudge.sort_order !== judge.sort_order) {
      const oldPosition = currentJudge.sort_order
      const newPosition = judge.sort_order
      
      // Calculate which judges need to be shifted
      const updates: { id: number; sort_order: number }[] = []
      
      if (newPosition < oldPosition) {
        // Moving up: shift judges down between newPosition and oldPosition
        allJudges.forEach(j => {
          if (j.id === judge.id) {
            updates.push({ id: j.id, sort_order: newPosition })
          } else if (j.sort_order >= newPosition && j.sort_order < oldPosition) {
            updates.push({ id: j.id, sort_order: j.sort_order + 1 })
          }
        })
      } else {
        // Moving down: shift judges up between oldPosition and newPosition
        allJudges.forEach(j => {
          if (j.id === judge.id) {
            updates.push({ id: j.id, sort_order: newPosition })
          } else if (j.sort_order > oldPosition && j.sort_order <= newPosition) {
            updates.push({ id: j.id, sort_order: j.sort_order - 1 })
          }
        })
      }
      
      // Apply all updates
      await updateJudgeSortOrders(updates)
    }
  }
  
  // Now update the judge with all other fields
  return updateJudge(judge)
}

// Get judges count
export async function getJudgesCount(): Promise<number> {
  const { count, error } = await supabase
    .from('judges')
    .select('id', { count: 'exact' })

  if (error) throw error
  return count || 0
}