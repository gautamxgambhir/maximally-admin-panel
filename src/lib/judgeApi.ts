import { supabase } from './supabase'
import { Judge, CreateJudgeData, UpdateJudgeData } from '@/types/hackathon'

export async function getJudgesByHackathon(hackathonId: string): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getJudgeById(id: string): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createJudge(judgeData: CreateJudgeData): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .insert(judgeData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateJudge(judgeData: UpdateJudgeData): Promise<Judge> {
  const { id, ...updateData } = judgeData
  const { data, error } = await supabase
    .from('judges')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteJudge(id: string): Promise<void> {
  const { error } = await supabase
    .from('judges')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function uploadJudgeProfileImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `judge-profiles/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('blog-images') // Reuse the same storage bucket
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('blog-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}
