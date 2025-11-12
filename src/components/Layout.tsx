import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  LogOut,
  Menu,
  Trophy,
  Users,
  UserCheck,
  Scale,
  Award,
  Mail,
  Moon,
  Sun,
  RefreshCw
} from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    setIsRefreshing(true)
    
    // Invalidate queries without waiting (fire and forget)
    queryClient.invalidateQueries({ refetchType: 'active' }).catch((error) => {
      console.error('Refresh error:', error)
    })
    
    // Show success message and reset state
    toast.success('Refreshing data...')
    
    // Always reset the button state after a short delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 800)
  }

  const handleSignOut = async () => {
    const confirmSignOut = window.confirm('Are you sure you want to sign out? You will need to log in again to access the admin panel.')
    
    if (confirmSignOut) {
      await signOut()
      navigate('/login')
    }
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Blogs',
      href: '/blogs',
      icon: FileText,
    },
    {
      name: 'Create Blog',
      href: '/blogs/create',
      icon: Plus,
    },
    {
      name: 'Hackathons',
      href: '/hackathons',
      icon: Trophy,
    },
    {
      name: 'Create Hackathon',
      href: '/hackathons/create',
      icon: Plus,
    },
    {
      name: 'People',
      href: '/people',
      icon: UserCheck,
    },
    {
      name: 'Judges',
      href: '/judges',
      icon: Scale,
    },
    {
      name: 'Judge Applications',
      href: '/judge-applications',
      icon: UserCheck,
    },
    {
      name: 'Judge Inbox',
      href: '/judge-inbox',
      icon: Mail,
    },
    {
      name: 'Judge Events Verification',
      href: '/judge-events-verification',
      icon: UserCheck,
    },
    {
      name: 'Certificates',
      href: '/certificates',
      icon: Award,
    },
    {
      name: 'Email Generator',
      href: '/email-generator',
      icon: Mail,
    },
    {
      name: 'Admin Management',
      href: '/admin-management',
      icon: Users,
    },
  ]

  const isActiveRoute = (href: string) => {
    return location.pathname === href
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Action buttons - Mobile */}
      <div className="lg:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Maximally Admin
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.email}
              </p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <nav className="px-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActiveRoute(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
