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
      .maybeSingle()

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
      .maybeSingle()

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
      .maybeSingle()

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
      .maybeSingle()

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
 * Get all admin users
 */
export async function getAllAdmins(): Promise<ProfileApiResult<Profile[]>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Search admin users by email, username, or full name
 */
export async function searchAdmins(searchTerm: string): Promise<ProfileApiResult<Profile[]>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .or(`email.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Get paginated list of admin users
 */
export async function getAdminsPaginated(
  page: number = 0,
  limit: number = 10,
  searchTerm?: string
): Promise<ProfileApiResult<{ admins: Profile[]; totalCount: number }>> {
  try {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'admin')

    if (searchTerm && searchTerm.trim()) {
      query = query.or(`email.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      return { data: null, error }
    }

    return {
      data: {
        admins: data || [],
        totalCount: count || 0
      },
      error: null
    }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Delete admin user (set to user role)
 */
export async function removeAdminRole(userId: string): Promise<ProfileApiResult<Profile>> {
  return updateUserRole(userId, 'user')
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
