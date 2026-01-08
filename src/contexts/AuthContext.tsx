import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/profileApi'
import { SessionManager } from '@/lib/sessionManager'
import type { Profile } from '@/types/profile'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  roleChecking: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [roleChecking, setRoleChecking] = useState(false)


  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        // Try to restore existing session from storage
        const { data: { session: existingSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          if (mounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
            setIsAdmin(false)
            setLoading(false)
          }
          return
        }
        
        if (existingSession?.user) {
          // Session exists, verify admin role
          setRoleChecking(true)
          try {
            const { data: profileData, error: profileError } = await getProfile(existingSession.user.id)
            
            if (profileError || !profileData || profileData.role !== 'admin') {
              // Not an admin, sign out
              await supabase.auth.signOut()
              if (mounted) {
                setUser(null)
                setSession(null)
                setProfile(null)
                setIsAdmin(false)
              }
            } else {
              // Valid admin session
              if (mounted) {
                setUser(existingSession.user)
                setSession(existingSession)
                setProfile(profileData)
                setIsAdmin(true)
                SessionManager.activateSession()
              }
            }
          } catch (err) {
            console.error('Error verifying profile:', err)
            await supabase.auth.signOut()
            if (mounted) {
              setUser(null)
              setSession(null)
              setProfile(null)
              setIsAdmin(false)
            }
          } finally {
            if (mounted) {
              setRoleChecking(false)
            }
          }
        } else {
          // No existing session
          if (mounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
            setIsAdmin(false)
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setSession(null)
          setProfile(null)
          setIsAdmin(false)
          setLoading(false)
          setRoleChecking(false)
        }
      }
    }
    
    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      
      if (!mounted) return
      
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        
        setUser(session.user)
        setSession(session)
        SessionManager.activateSession()
        
        // Only check admin role on initial sign in, not on token refresh
        if (event === 'SIGNED_IN' && !profile) {
          setRoleChecking(true)
          try {
            const { data: profileData, error: profileError } = await getProfile(session.user.id)
            
            if (profileError || !profileData || profileData.role !== 'admin') {
              
              await supabase.auth.signOut()
              setUser(null)
              setSession(null)
              setProfile(null)
              setIsAdmin(false)
            } else {
              
              setProfile(profileData)
              setIsAdmin(true)
            }
          } catch (error) {
            
            await supabase.auth.signOut()
          } finally {
            setRoleChecking(false)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        
        setUser(null)
        setSession(null)
        setProfile(null)
        setIsAdmin(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // Check if there's an existing session first
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      
      // If there's an existing session, sign out first to avoid conflicts
      if (existingSession) {
        await supabase.auth.signOut()
        // Small delay to ensure signout completes
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (error) {
        setLoading(false)
        return { error }
      }
      
      if (!data.user || !data.session) {
        setLoading(false)
        return { error: { message: 'No user data returned' } }
      }
      
      // Verify admin role
      const { data: profileData, error: profileError } = await getProfile(data.user.id)
      
      if (profileError) {
        await supabase.auth.signOut()
        setLoading(false)
        return { error: { message: 'Failed to fetch profile' } }
      }
      
      if (!profileData || profileData.role !== 'admin') {
        await supabase.auth.signOut()
        setLoading(false)
        return { error: { message: 'Access denied. Admin role required.' } }
      }
      
      // User is admin - set states (session is already persisted by Supabase)
      SessionManager.activateSession()
      setUser(data.user)
      setSession(data.session)
      setProfile(profileData)
      setIsAdmin(true)
      setLoading(false)
      
      return { error: null }
    } catch (error: any) {
      setLoading(false)
      return { error: { message: error.message || 'Unexpected error' } }
    }
  }

  const signOut = async () => {
    await SessionManager.clearSession()
    
    // Reset all states
    setProfile(null)
    setIsAdmin(false)
    setUser(null)
    setSession(null)
  }

  const value = {
    user,
    session,
    profile,
    isAdmin,
    loading,
    roleChecking,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
