import { supabase } from './supabase'
import { Hackathon, CreateHackathonData, UpdateHackathonData, HackathonV2, CreateHackathonV2Data, UpdateHackathonV2Data } from '@/types/hackathon'

export async function getHackathons(): Promise<Hackathon[]> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getHackathonById(id: string): Promise<Hackathon> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  
  if (error) throw error
  if (!data) throw new Error('Hackathon not found')
  return data
}

export async function getHackathonByIdV2(id: string): Promise<HackathonV2> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Hackathon not found')
  return data as unknown as HackathonV2
}

export async function createHackathon(hackathonData: CreateHackathonData): Promise<Hackathon> {
  const { data, error } = await supabase
    .from('hackathons')
    .insert(hackathonData)
    .select()

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('No row returned from hackathon insert')
  return row as Hackathon
}

export async function updateHackathon(hackathonData: UpdateHackathonData): Promise<Hackathon> {
  const { id, ...updateData } = hackathonData
  const { data, error } = await supabase
    .from('hackathons')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('No row returned from hackathon update')
  return row as Hackathon
}

export async function deleteHackathon(id: string): Promise<void> {
  const { error } = await supabase
    .from('hackathons')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export async function uploadHackathonCoverImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `hackathon-covers/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('blog-images') // Reuse the same storage bucket
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('blog-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('hackathons')
    .select('id')
    .eq('slug', slug)
  
  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  
  return (data && data.length > 0) || false
}

// V2 API functions for new schema
export async function createHackathonV2(hackathonData: CreateHackathonV2Data): Promise<HackathonV2> {
  const { data, error } = await supabase
    .from('hackathons')
    .insert(hackathonData)
    .select()

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('No row returned from hackathon v2 insert')
  return row as HackathonV2
}

export async function updateHackathonV2(hackathonData: UpdateHackathonV2Data): Promise<HackathonV2> {
  const { id, ...updateData } = hackathonData
  const { data, error } = await supabase
    .from('hackathons')
    .update(updateData)
    .eq('id', id)
    .select()
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    // This commonly happens when RLS/policies prevent the update from returning rows
    throw new Error('No row returned from hackathon v2 update — this may be due to RLS/policies preventing the authenticated role from seeing the updated row')
  }
  return row as HackathonV2
}

// Function to get the next sort order (for new hackathons to be added at top)
export async function getNextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('sort_order')
    .order('sort_order', { ascending: true })
    .limit(1)

  if (error) throw error
  
  // If no hackathons exist or the first one doesn't have sort_order, start at 0
  if (!data || data.length === 0 || data[0].sort_order === null) {
    return 0
  }
  
  // Return one less than the current minimum to add at top
  return data[0].sort_order - 1
}

// Function to update sort orders for multiple hackathons (for drag and drop)
export async function updateHackathonSortOrders(updates: { id: number; sort_order: number }[]): Promise<void> {
  const { error } = await supabase.rpc('update_hackathon_sort_orders', {
    updates: updates
  })
  
  if (error) {
    // Fallback to individual updates if RPC function doesn't exist
    console.warn('RPC function not available, falling back to individual updates')
    for (const update of updates) {
      await supabase
        .from('hackathons')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }
  }
}
