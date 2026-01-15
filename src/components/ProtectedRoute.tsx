import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAdmin, loading, roleChecking } = useAuth()
  const location = useLocation()

  // Only show loading on initial load, not when switching tabs
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If not authenticated, redirect to login immediately
  // Preserve the full path including query parameters
  if (!user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  // User is authenticated and admin, show content
  return <>{children}</>
}
