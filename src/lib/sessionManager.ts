import { supabase } from './supabase'

export class SessionManager {
  private static readonly SESSION_KEY = 'admin_session_active'
  private static readonly LAST_ACTIVITY_KEY = 'admin_last_activity'
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

  // Check if current session is valid
  static isSessionActive(): boolean {
    const sessionActive = sessionStorage.getItem(this.SESSION_KEY)
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY)
    
    if (!sessionActive || !lastActivity) {
      return false
    }
    
    const timeSinceActivity = Date.now() - parseInt(lastActivity)
    return timeSinceActivity < this.SESSION_TIMEOUT
  }

  // Mark session as active (called after successful login)
  static activateSession(): void {
    sessionStorage.setItem(this.SESSION_KEY, 'true')
    localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString())
  }

  // Update last activity timestamp
  static updateActivity(): void {
    if (sessionStorage.getItem(this.SESSION_KEY)) {
      localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString())
    }
  }

  // Clear session (called on logout or timeout)
  static async clearSession(): Promise<void> {
    // Remove session tracking
    sessionStorage.removeItem(this.SESSION_KEY)
    localStorage.removeItem(this.LAST_ACTIVITY_KEY)
    
    // Clear all other storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Sign out from Supabase
    await supabase.auth.signOut()
  }

  // Force logout on page load (ensures no persistent sessions)
  static async forceLogoutOnPageLoad(): Promise<void> {
    // Always clear session on page load/refresh
    await this.clearSession()
    
    // Additional cleanup
    if (window.history?.replaceState) {
      window.history.replaceState(null, '', '/login')
    }
  }

  // Initialize session timeout checking
  static initializeSessionTimeout(onTimeout: () => void): () => void {
    const checkSession = () => {
      if (!this.isSessionActive()) {
        onTimeout()
      }
    }

    // Check session every minute
    const interval = setInterval(checkSession, 60 * 1000)

    // Return cleanup function
    return () => clearInterval(interval)
  }
}