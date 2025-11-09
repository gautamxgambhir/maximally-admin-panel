import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile, isUserAdmin } from '@/lib/profileApi'
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
    let timeoutId: NodeJS.Timeout
    
    const initializeAuth = async () => {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (mounted) {
          
          setLoading(false)
          setRoleChecking(false)
        }
      }, 5000) // 5 second timeout
      
      try {
        
        
        // Always start fresh - no persistent sessions
        
        
        // Clear Supabase session
        await supabase.auth.signOut()
        
        // Clear storage
        sessionStorage.clear()
        localStorage.clear()
        
        if (mounted) {
          setUser(null)
          setSession(null)
          setProfile(null)
          setIsAdmin(false)
          setLoading(false)
          setRoleChecking(false)
        }
      } catch (error) {
        
        if (mounted) {
          setUser(null)
          setSession(null)
          setProfile(null)
          setIsAdmin(false)
          setLoading(false)
          setRoleChecking(false)
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }
    
    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      
      if (!mounted) return
      
      if (event === 'SIGNED_IN' && session) {
        
        setUser(session.user)
        setSession(session)
        SessionManager.activateSession()
        
        // Check admin role after sign in
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
      } else if (event === 'SIGNED_OUT') {
        
        setUser(null)
        setSession(null)
        setProfile(null)
        setIsAdmin(false)
        sessionStorage.clear()
        localStorage.clear()
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      
      setLoading(true)
      
      const result = await supabase.auth.signInWithPassword({ email, password })
      
      if (result.error) {
        
        return { error: result.error }
      }
      
      if (!result.data.user) {
        
        return { error: { message: 'No user data returned' } }
      }
      
      
      
      // Verify admin role immediately
      const { data: profileData, error: profileError } = await getProfile(result.data.user.id)
      
      if (profileError) {
        
        await supabase.auth.signOut()
        return { error: { message: 'Failed to fetch profile' } }
      }
      
      if (!profileData || profileData.role !== 'admin') {
        
        await supabase.auth.signOut()
        return { error: { message: 'Access denied. Admin role required.' } }
      }
      
      
      
      // User is admin - activate session and set states
      SessionManager.activateSession()
      setUser(result.data.user)
      setSession(result.data.session)
      setProfile(profileData)
      setIsAdmin(true)
      setLoading(false)
      
      
      
      return { error: null }
    } catch (error: any) {
      
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
