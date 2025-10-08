import { supabase } from './supabase'
import type { Profile, UserRole } from '@/types/profile'

export interface ProfileApiResult<T = any> {
  data: T | null
  error: any
}

/**
 * Get user profile by user ID
 */
export async function getProfile(userId: string): Promise<ProfileApiResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Get user profile by email
 */
export async function getProfileByEmail(email: string): Promise<ProfileApiResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<ProfileApiResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Update user role by email
 */
export async function updateUserRoleByEmail(email: string, role: UserRole): Promise<ProfileApiResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Check if user has admin role
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const { data, error } = await getProfile(userId)
  
  if (error || !data) {
    return false
  }

  return data.role === 'admin'
}

/**
 * Toggle user admin status by email
 */
export async function toggleAdminRole(email: string): Promise<ProfileApiResult<{ profile: Profile; isNowAdmin: boolean }>> {
  try {
    // First get the current profile
    const { data: profile, error: getError } = await getProfileByEmail(email)
    
    if (getError) {
      return { data: null, error: getError }
    }

    if (!profile) {
      return { data: null, error: { message: 'Email not found' } }
    }

    // Toggle the role
    const newRole: UserRole = profile.role === 'admin' ? 'user' : 'admin'
    
    // Update the role
    const { data: updatedProfile, error: updateError } = await updateUserRole(profile.id, newRole)
    
    if (updateError) {
      return { data: null, error: updateError }
    }

    return { 
      data: { 
        profile: updatedProfile!, 
        isNowAdmin: newRole === 'admin' 
      }, 
      error: null 
    }
  } catch (error) {
    return { data: null, error }
  }
}