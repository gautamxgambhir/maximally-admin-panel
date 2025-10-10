import { supabase } from './supabase'

export interface Judge {
  id: number
  name: string
  role_in_company: string
  company: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface JudgeInput {
  name: string
  role_in_company: string
  company: string
  display_order?: number
}

export interface JudgeUpdate extends Partial<JudgeInput> {
  id: number
}

// Get all judges
export async function getJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}


// Get a single judge by ID
export async function getJudge(id: number): Promise<Judge | null> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

// Create a new judge
export async function createJudge(judge: JudgeInput): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .insert([{
      ...judge,
      display_order: judge.display_order ?? 0
    }])
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Update an existing judge
export async function updateJudge(judge: JudgeUpdate): Promise<Judge> {
  const { id, ...updateData } = judge
  
  const { data, error } = await supabase
    .from('judges')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
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