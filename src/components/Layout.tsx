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
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      // Invalidate queries with a slight delay to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 100))
      await queryClient.invalidateQueries({ refetchType: 'active' })
      toast.success('Data refreshed successfully')
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSignOut = async () => {
    const confirmSignOut = window.confirm('Are you sure you want to sign out? You will need to log in again to access the admin panel.')
    
    if (confirmSignOut) {
      await signOut()
      navigate('/login')
    }
  }

  const navigationCategories = [
    {
      id: 'overview',
      name: 'Overview',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
      ]
    },
    {
      id: 'content',
      name: 'Content',
      items: [
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
      ]
    },
    {
      id: 'events',
      name: 'Events',
      items: [
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
          name: 'Certificates',
          href: '/certificates',
          icon: Award,
        },
      ]
    },
    {
      id: 'people',
      name: 'People & Judges',
      items: [
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
      ]
    },
    {
      id: 'communication',
      name: 'Communication',
      items: [
        {
          name: 'Email Generator',
          href: '/email-generator',
          icon: Mail,
        },
      ]
    },
    {
      id: 'settings',
      name: 'Settings',
      items: [
        {
          name: 'Admin Management',
          href: '/admin-management',
          icon: Users,
        },
      ]
    },
  ]

  const isActiveRoute = (href: string) => {
    return location.pathname === href
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
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
      <div className={cn(
        'fixed inset-y-0 left-0 z-40 bg-card border-r border-border shadow-lg transform transition-all duration-200 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!isCollapsed ? (
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">
                  Maximally Admin
                </h1>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user?.email}
                </p>
              </div>
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
            )}
            
            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex ml-2"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              )}
            </Button>

            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Action buttons */}
          {!isCollapsed && (
            <div className="flex items-center gap-2 mt-3">
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
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-scroll p-2 nav-scrollbar max-h-[calc(100vh-200px)]">
          {navigationCategories.map((category) => (
            <div key={category.id} className="mb-2">
              {/* Category Header */}
              {!isCollapsed && category.id !== 'overview' && (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{category.name}</span>
                  {expandedCategories.includes(category.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}

              {/* Category Items */}
              {(isCollapsed || category.id === 'overview' || expandedCategories.includes(category.id)) && (
                <div className="space-y-1">
                  {category.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                          isActiveRoute(item.href)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                          isCollapsed && 'justify-center'
                        )}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <Icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className={cn('w-full', isCollapsed && 'px-0')}
            size={isCollapsed ? 'icon' : 'default'}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className={cn('h-4 w-4', !isCollapsed && 'mr-2')} />
            {!isCollapsed && 'Sign Out'}
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
      <div className={cn(
        'transition-all duration-200',
        isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}>
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
