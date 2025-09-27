import { supabase } from './supabase'
import { Hackathon, CreateHackathonData, UpdateHackathonData, HackathonV2, CreateHackathonV2Data, UpdateHackathonV2Data } from '@/types/hackathon'

export async function getHackathons(): Promise<Hackathon[]> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getHackathonById(id: string): Promise<Hackathon> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function getHackathonByIdV2(id: string): Promise<HackathonV2> {
  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as HackathonV2
}

export async function createHackathon(hackathonData: CreateHackathonData): Promise<Hackathon> {
  const { data, error } = await supabase
    .from('hackathons')
    .insert(hackathonData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateHackathon(hackathonData: UpdateHackathonData): Promise<Hackathon> {
  const { id, ...updateData } = hackathonData
  const { data, error } = await supabase
    .from('hackathons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
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
    .single()
  
  if (error) throw error
  return data
}

export async function updateHackathonV2(hackathonData: UpdateHackathonV2Data): Promise<HackathonV2> {
  const { id, ...updateData } = hackathonData
  const { data, error } = await supabase
    .from('hackathons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
