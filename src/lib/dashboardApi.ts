import { supabase } from './supabase'

export interface DashboardRow {
  id: number
  featured_hackathon_name: string | null
  featured_hackathon_id: number | null
  featured_core_id_1: number | null
  featured_core_id_2: number | null
  featured_core_id_3: number | null
  // REMOVED - Judge account system deprecated (Platform Simplification)
  // featured_judge_id_1: number | null
  // featured_judge_id_2: number | null
  // featured_judge_id_3: number | null
}

export async function getDashboard(): Promise<DashboardRow | null> {
  const { data, error } = await supabase
    .from('dashboard')
    .select(`
      id, 
      featured_hackathon_name, 
      featured_hackathon_id,
      featured_core_id_1,
      featured_core_id_2,
      featured_core_id_3
    `)
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function setFeaturedHackathon(params: { id: number | null, name: string | null }): Promise<DashboardRow> {
  const payload = { id: 1, featured_hackathon_name: params.name, featured_hackathon_id: params.id }
  const { data, error } = await supabase
    .from('dashboard')
    .upsert(payload, { onConflict: 'id' })
    .select(`
      id, 
      featured_hackathon_name, 
      featured_hackathon_id,
      featured_core_id_1,
      featured_core_id_2,
      featured_core_id_3
    `)
    .single()

  if (error) throw error
  return data as DashboardRow
}

// Update featured core team
export async function setFeaturedCore(params: {
  coreId1: number | null
  coreId2: number | null
  coreId3: number | null
}): Promise<DashboardRow> {
  const payload = {
    id: 1,
    featured_core_id_1: params.coreId1,
    featured_core_id_2: params.coreId2,
    featured_core_id_3: params.coreId3
  }
  const { data, error } = await supabase
    .from('dashboard')
    .upsert(payload, { onConflict: 'id' })
    .select(`
      id, 
      featured_hackathon_name, 
      featured_hackathon_id,
      featured_core_id_1,
      featured_core_id_2,
      featured_core_id_3
    `)
    .single()

  if (error) throw error
  return data as DashboardRow
}

// REMOVED - Judge account system deprecated (Platform Simplification)
// setFeaturedJudges function has been removed as part of platform simplification.
// Judges are now managed per-hackathon without accounts.
