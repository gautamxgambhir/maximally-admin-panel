import { supabase } from './supabase'

export interface DashboardRow {
  id: number
  featured_hackathon_name: string | null
  featured_hackathon_id: number | null
}

export async function getDashboard(): Promise<DashboardRow | null> {
  const { data, error } = await supabase
    .from('dashboard')
    .select('id, featured_hackathon_name, featured_hackathon_id')
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
    .select('id, featured_hackathon_name, featured_hackathon_id')
    .single()

  if (error) throw error
  return data as DashboardRow
}


