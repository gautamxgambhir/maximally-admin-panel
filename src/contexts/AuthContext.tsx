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
    const initializeAuth = async () => {
      await SessionManager.forceLogoutOnPageLoad()
      setLoading(false)
      return
    }
    
    // Always initialize with forced logout
    initializeAuth()

    // Add event listener for browser/tab close to ensure logout
    const handleBeforeUnload = async () => {
      await SessionManager.clearSession()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      
      if (result.data.user && !result.error) {
        // Verify admin role immediately
        const { data: profileData } = await getProfile(result.data.user.id)
        
        if (!profileData || profileData.role !== 'admin') {
          // Not an admin - sign out immediately
          await supabase.auth.signOut()
          return { error: { message: 'Access denied. Admin role required.' } }
        }
        
        // User is admin - activate session and set states
        SessionManager.activateSession()
        setUser(result.data.user)
        setSession(result.data.session)
        setProfile(profileData)
        setIsAdmin(true)
      }
      
      return result
    } catch (error: any) {
      return { error }
    } finally {
      setLoading(false)
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
