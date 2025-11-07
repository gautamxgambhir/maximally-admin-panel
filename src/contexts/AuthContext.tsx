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
      try {
        // Check for existing session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // We have a valid session, check if it's still active
          if (SessionManager.isSessionActive()) {
            // Session is active, load user data
            setUser(session.user);
            setSession(session);
            
            // Get profile and check admin role
            const { data: profileData } = await getProfile(session.user.id);
            if (profileData) {
              setProfile(profileData);
              const adminStatus = await isUserAdmin(session.user.id);
              setIsAdmin(adminStatus);
            }
          } else {
            // Session expired, clear it
            await SessionManager.clearSession();
          }
        } else {
          // No session, clear everything
          await SessionManager.clearSession();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        await SessionManager.clearSession();
      } finally {
        setLoading(false);
      }
    }
    
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setSession(session);
        SessionManager.activateSession();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsAdmin(false);
        await SessionManager.clearSession();
      }
    });

    return () => {
      subscription.unsubscribe();
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
