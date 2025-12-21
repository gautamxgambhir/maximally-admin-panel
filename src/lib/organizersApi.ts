import { supabase } from './supabase'

export interface Organizer {
  id: number
  user_id: string
  name: string
  display_name: string
  organization_name: string
  organization_type: string
  bio: string
  location: string
  website: string
  logo_url: string
  linkedin: string
  twitter: string
  instagram: string
  github: string
  headline: string
  short_bio: string
  profile_photo: string
  tier: 'starter' | 'verified' | 'senior' | 'chief' | 'legacy'
  is_published: boolean
  sort_order: number
  total_hackathons_hosted: number
  total_participants_reached: number
  total_prize_money_distributed: string
  verified_organizer: boolean
  years_of_experience: number
  created_at: string
  updated_at: string
}

export interface OrganizerInput {
  display_name?: string
  organization_name?: string
  organization_type?: string
  bio?: string
  location?: string
  website?: string
  logo_url?: string
  linkedin?: string
  twitter?: string
  instagram?: string
  github?: string
  headline?: string
  short_bio?: string
  profile_photo?: string
  tier?: 'starter' | 'verified' | 'senior' | 'chief' | 'legacy'
  is_published?: boolean
  sort_order?: number
  total_hackathons_hosted?: number
  total_participants_reached?: number
  years_of_experience?: number
}

export interface OrganizerUpdate extends Partial<OrganizerInput> {
  id: number
}

// Get all organizers with profile info
export async function getOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from('organizer_profiles')
    .select(`
      *,
      profiles:user_id (
        email,
        username,
        full_name
      )
    `)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching organizers:', error)
    throw error
  }

  return (data || []).map((org: any) => ({
    id: org.id,
    user_id: org.user_id,
    name: org.profiles?.full_name || org.display_name || 'Unknown',
    display_name: org.display_name || '',
    organization_name: org.organization_name || '',
    organization_type: org.organization_type || 'individual',
    bio: org.bio || '',
    location: org.location || '',
    website: org.website || '',
    logo_url: org.logo_url || '',
    linkedin: org.linkedin || '',
    twitter: org.twitter || '',
    instagram: org.instagram || '',
    github: org.github || '',
    headline: org.headline || '',
    short_bio: org.short_bio || '',
    profile_photo: org.profile_photo || '',
    tier: org.tier || 'starter',
    is_published: org.is_published || false,
    sort_order: org.sort_order ?? 0,
    total_hackathons_hosted: org.total_hackathons_hosted || 0,
    total_participants_reached: org.total_participants_reached || 0,
    total_prize_money_distributed: org.total_prize_money_distributed || '0',
    verified_organizer: org.verified_organizer || false,
    years_of_experience: org.years_of_experience || 0,
    created_at: org.created_at,
    updated_at: org.updated_at
  }))
}

// Get organizers count
export async function getOrganizersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('organizer_profiles')
    .select('id', { count: 'exact' })

  if (error) throw error
  return count || 0
}

// Update an organizer
export async function updateOrganizer(organizer: OrganizerUpdate): Promise<Organizer> {
  const { id, ...updateData } = organizer

  const { data, error } = await supabase
    .from('organizer_profiles')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return {
    id: data.id,
    user_id: data.user_id,
    name: data.display_name || '',
    display_name: data.display_name || '',
    organization_name: data.organization_name || '',
    organization_type: data.organization_type || 'individual',
    bio: data.bio || '',
    location: data.location || '',
    website: data.website || '',
    logo_url: data.logo_url || '',
    linkedin: data.linkedin || '',
    twitter: data.twitter || '',
    instagram: data.instagram || '',
    github: data.github || '',
    headline: data.headline || '',
    short_bio: data.short_bio || '',
    profile_photo: data.profile_photo || '',
    tier: data.tier || 'starter',
    is_published: data.is_published || false,
    sort_order: data.sort_order ?? 0,
    total_hackathons_hosted: data.total_hackathons_hosted || 0,
    total_participants_reached: data.total_participants_reached || 0,
    total_prize_money_distributed: data.total_prize_money_distributed || '0',
    verified_organizer: data.verified_organizer || false,
    years_of_experience: data.years_of_experience || 0,
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}

// Delete an organizer
export async function deleteOrganizer(id: number): Promise<void> {
  const { error } = await supabase.rpc('delete_organizer_with_profile_update', {
    organizer_profile_id: id
  })

  if (error) {
    console.error('Error deleting organizer:', error)
    throw new Error(error.message || 'Failed to delete organizer')
  }
}

// Update sort orders
export async function updateOrganizerSortOrders(updates: { id: number; sort_order: number }[]): Promise<void> {
  const { error } = await supabase.rpc('update_organizer_sort_orders', {
    updates: updates
  })

  if (error) {
    console.error('Error updating organizer sort orders:', error)
    // Fallback: update individually
    for (const update of updates) {
      await supabase
        .from('organizer_profiles')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }
  }
}

// Update organizer with automatic reordering
export async function updateOrganizerWithReorder(organizer: OrganizerUpdate): Promise<Organizer> {
  if (organizer.sort_order !== undefined) {
    const allOrganizers = await getOrganizers()
    const currentOrganizer = allOrganizers.find(o => o.id === organizer.id)
    
    if (currentOrganizer && currentOrganizer.sort_order !== organizer.sort_order) {
      const oldPosition = currentOrganizer.sort_order
      const newPosition = organizer.sort_order
      
      const updates: { id: number; sort_order: number }[] = []
      
      if (newPosition < oldPosition) {
        allOrganizers.forEach(o => {
          if (o.id === organizer.id) {
            updates.push({ id: o.id, sort_order: newPosition })
          } else if (o.sort_order >= newPosition && o.sort_order < oldPosition) {
            updates.push({ id: o.id, sort_order: o.sort_order + 1 })
          }
        })
      } else {
        allOrganizers.forEach(o => {
          if (o.id === organizer.id) {
            updates.push({ id: o.id, sort_order: newPosition })
          } else if (o.sort_order > oldPosition && o.sort_order <= newPosition) {
            updates.push({ id: o.id, sort_order: o.sort_order - 1 })
          }
        })
      }
      
      await updateOrganizerSortOrders(updates)
    }
  }
  
  return updateOrganizer(organizer)
}
