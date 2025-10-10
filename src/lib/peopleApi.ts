import { supabase } from './supabase'

export type PersonCategory = 'advisors' | 'organizing_board' | 'developers' | 'alumni'

export interface Person {
  id: number
  name: string
  role_in_company: string
  company?: string
  description?: string
  category: PersonCategory
  image_url?: string
  linkedin_url?: string
  twitter_url?: string
  github_url?: string
  website_url?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PersonInput {
  name: string
  role_in_company: string
  company?: string
  description?: string
  category: PersonCategory
  image_url?: string
  linkedin_url?: string
  twitter_url?: string
  github_url?: string
  website_url?: string
  display_order?: number
  is_active?: boolean
}

export interface PersonUpdate extends Partial<PersonInput> {
  id: number
}

// Get all people with optional category filter
export async function getPeople(category?: PersonCategory): Promise<Person[]> {
  let query = supabase
    .from('people')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get people by category for public display (only active)
export async function getPeopleByCategory(category: PersonCategory): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

// Get a single person by ID
export async function getPerson(id: number): Promise<Person | null> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

// Create a new person
export async function createPerson(person: PersonInput): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .insert([{
      ...person,
      display_order: person.display_order ?? 0,
      is_active: person.is_active ?? true
    }])
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Update an existing person
export async function updatePerson(person: PersonUpdate): Promise<Person> {
  const { id, ...updateData } = person
  
  const { data, error } = await supabase
    .from('people')
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

// Delete a person
export async function deletePerson(id: number): Promise<void> {
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Toggle person active status
export async function togglePersonStatus(id: number): Promise<Person> {
  // First get the current status
  const person = await getPerson(id)
  if (!person) throw new Error('Person not found')

  // Toggle the status
  const { data, error } = await supabase
    .from('people')
    .update({
      is_active: !person.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Reorder people within a category
export async function reorderPeople(updates: { id: number; display_order: number }[]): Promise<void> {
  const promises = updates.map(update =>
    supabase
      .from('people')
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
    throw new Error(`Failed to reorder people: ${errors.map(e => e?.message).join(', ')}`)
  }
}

// Get categories with counts
export async function getCategoryCounts(): Promise<Record<PersonCategory, number>> {
  const { data, error } = await supabase
    .from('people')
    .select('category, id')

  if (error) throw error

  const counts: Record<PersonCategory, number> = {
    advisors: 0,
    organizing_board: 0,
    developers: 0,
    alumni: 0
  }

  data?.forEach(item => {
    counts[item.category as PersonCategory]++
  })

  return counts
}