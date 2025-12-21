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
        
        // Always clear everything on page load (no persistent sessions)
        // Use a more aggressive clear
        try {
          await supabase.auth.signOut({ scope: 'local' })
        } catch (e) {
          // Ignore signout errors on first load
        }
        
        // Clear all storage
        try {
          sessionStorage.clear()
          localStorage.clear()
        } catch (e) {
          // Ignore storage clear errors
        }
        
        // Small delay to ensure everything is cleared
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (mounted) {
          setUser(null)
          setSession(null)
          setProfile(null)
          setIsAdmin(false)
          setLoading(false)
          setRoleChecking(false)
        }
      } catch (error) {
        // Ignore initialization errors
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
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // Clear any existing session first to prevent conflicts
      // Use Promise.race to timeout the signOut if it hangs
      const signOutPromise = supabase.auth.signOut({ scope: 'local' })
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000))
      
      try {
        await Promise.race([signOutPromise, timeoutPromise])
      } catch (e) {
        // Ignore signout errors
      }
      
      // Clear storage
      sessionStorage.clear()
      localStorage.clear()
      
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Add timeout to sign in request (increased to 30 seconds)
      const signInPromise = supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      const signInTimeout = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timed out after 30 seconds. Please check your connection and try again.')), 30000)
      )
      
      let result
      try {
        result = await Promise.race([signInPromise, signInTimeout])
      } catch (timeoutError: any) {
        setLoading(false)
        return { error: { message: timeoutError.message } }
      }
      
      const { data, error } = result
      
      if (error) {
        setLoading(false)
        return { error }
      }
      
      if (!data.user) {
        setLoading(false)
        return { error: { message: 'No user data returned' } }
      }
      
      // Verify admin role immediately
      const { data: profileData, error: profileError } = await getProfile(data.user.id)
      
      if (profileError) {
        await supabase.auth.signOut({ scope: 'local' })
        setLoading(false)
        return { error: { message: 'Failed to fetch profile' } }
      }
      
      if (!profileData || profileData.role !== 'admin') {
        await supabase.auth.signOut({ scope: 'local' })
        setLoading(false)
        return { error: { message: 'Access denied. Admin role required.' } }
      }
      
      // User is admin - activate session and set states
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
