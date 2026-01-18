import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  LogOut,
  Menu,
  Trophy,
  Users,
  UserCheck,
  // Scale, // REMOVED - Judge account system deprecated
  Award,
  Mail,
  Bell,
  Moon,
  Sun,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  Flag,
  Shield,
  Rocket,
  Activity,
  ClipboardList,
  ScrollText,
  Database,
  HeartPulse,
  AlertTriangle,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SystemHealthAlertBanner } from '@/components/SystemHealthAlertBanner'
import { usePendingQueueCount } from '@/hooks/useQueue'
import { useSystemHealthSummary } from '@/hooks/useSystemHealth'
import { useAdminRole } from '@/hooks/useAdminRoles'
import type { AdminPermission } from '@/types/adminRole'

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

  // Queue count for badge - Requirement 6.4
  const { data: pendingQueueCount } = usePendingQueueCount()
  
  // System health for alert indicators - Requirements 8.3, 12.2
  const { data: systemHealthData } = useSystemHealthSummary()

  // Get current user's admin role and permissions
  const { data: adminRole } = useAdminRole(user?.id)
  
  // Helper to check if user has a specific permission
  const hasPermission = (permission: AdminPermission): boolean => {
    if (!adminRole) return false
    // Super admins have all permissions
    if (adminRole.role === 'super_admin') return true
    return adminRole.permissions?.[permission] === true
  }

  // Check if user is at least a viewer (can see read-only content)
  const isViewer = adminRole?.role === 'viewer'
  const isModerator = adminRole?.role === 'moderator' || adminRole?.role === 'admin' || adminRole?.role === 'super_admin'
  const isAdmin = adminRole?.role === 'admin' || adminRole?.role === 'super_admin'
  const isSuperAdmin = adminRole?.role === 'super_admin'

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

  const navigationCategories = useMemo(() => [
    {
      id: 'overview',
      name: 'Overview',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          showAlert: systemHealthData && systemHealthData.status !== 'healthy',
          // Everyone can see dashboard
        },
        {
          name: 'Activity Feed',
          href: '/activity',
          icon: Activity,
          // Everyone can see activity feed
        },
      ]
    },
    {
      id: 'moderation',
      name: 'Moderation',
      show: hasPermission('can_moderate_users') || hasPermission('can_manage_queue'),
      items: [
        {
          name: 'Moderation Queue',
          href: '/queue',
          icon: ClipboardList,
          badge: pendingQueueCount && pendingQueueCount > 0 ? pendingQueueCount : undefined,
          requiredPermission: 'can_manage_queue' as AdminPermission,
        },
        {
          name: 'User Reports',
          href: '/user-reports',
          icon: Flag,
          requiredPermission: 'can_moderate_users' as AdminPermission,
        },
        {
          name: 'User Moderation',
          href: '/user-moderation',
          icon: Shield,
          requiredPermission: 'can_moderate_users' as AdminPermission,
        },
        {
          name: 'Project Gallery',
          href: '/project-gallery',
          icon: Rocket,
          requiredPermission: 'can_moderate_users' as AdminPermission,
        },
      ]
    },
    {
      id: 'content',
      name: 'Content',
      show: hasPermission('can_edit_hackathons'),
      items: [
        {
          name: 'Blogs',
          href: '/blogs',
          icon: FileText,
          requiredPermission: 'can_edit_hackathons' as AdminPermission,
        },
        {
          name: 'Create Blog',
          href: '/blogs/create',
          icon: Plus,
          requiredPermission: 'can_edit_hackathons' as AdminPermission,
        },
        {
          name: 'Documentation',
          href: '/docs',
          icon: FileText,
          requiredPermission: 'can_edit_hackathons' as AdminPermission,
        },
      ]
    },
    {
      id: 'events',
      name: 'Events',
      show: hasPermission('can_approve_hackathons') || hasPermission('can_edit_hackathons'),
      items: [
        {
          name: 'Hackathons',
          href: '/hackathons',
          icon: Trophy,
          requiredPermission: 'can_approve_hackathons' as AdminPermission,
        },
        {
          name: 'Create Hackathon',
          href: '/hackathons/create',
          icon: Plus,
          requiredPermission: 'can_edit_hackathons' as AdminPermission,
        },
        {
          name: 'Certificates',
          href: '/certificates',
          icon: Award,
          requiredPermission: 'can_edit_hackathons' as AdminPermission,
        },
      ]
    },
    {
      id: 'people',
      name: 'Organizers',
      show: hasPermission('can_revoke_organizers') || hasPermission('can_send_announcements'),
      items: [
        {
          name: 'Organizers',
          href: '/organizer-oversight',
          icon: Users,
          requiredPermission: 'can_revoke_organizers' as AdminPermission,
        },
        {
          name: 'Organizer Applications',
          href: '/organizer-applications',
          icon: UserCheck,
          requiredPermission: 'can_revoke_organizers' as AdminPermission,
        },
        {
          name: 'Organizer Requests',
          href: '/organizer-requests',
          icon: UserCheck,
          requiredPermission: 'can_revoke_organizers' as AdminPermission,
        },
        {
          name: 'Organizer Inbox',
          href: '/organizer-inbox',
          icon: Mail,
          requiredPermission: 'can_send_announcements' as AdminPermission,
        },
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & Logs',
      show: hasPermission('can_view_audit_logs') || hasPermission('can_access_analytics'),
      items: [
        {
          name: 'Audit Logs',
          href: '/audit',
          icon: ScrollText,
          requiredPermission: 'can_view_audit_logs' as AdminPermission,
        },
      ]
    },
    {
      id: 'system',
      name: 'System',
      show: hasPermission('can_export_data') || isSuperAdmin,
      items: [
        {
          name: 'Data Management',
          href: '/data-management',
          icon: Database,
          requiredPermission: 'can_export_data' as AdminPermission,
        },
        {
          name: 'System Health',
          href: '/system-health',
          icon: HeartPulse,
          showAlert: systemHealthData && systemHealthData.status !== 'healthy',
          // Super admin only
          show: isSuperAdmin,
        },
      ]
    },
    {
      id: 'communication',
      name: 'Communication',
      show: hasPermission('can_send_announcements'),
      items: [
        {
          name: 'Email Generator',
          href: '/email-generator',
          icon: Mail,
          requiredPermission: 'can_send_announcements' as AdminPermission,
        },
      ]
    },
    {
      id: 'settings',
      name: 'Settings',
      show: hasPermission('can_manage_admins'),
      items: [
        {
          name: 'Admin Management',
          href: '/admin-management',
          icon: Users,
          requiredPermission: 'can_manage_admins' as AdminPermission,
        },
      ]
    },
  ], [systemHealthData, pendingQueueCount, adminRole, isSuperAdmin])

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
          {navigationCategories
            .filter(category => category.show !== false)
            .map((category) => {
              // Filter items based on permissions
              const visibleItems = category.items.filter(item => {
                // Check item-level show property
                if ('show' in item && item.show === false) return false
                // Check required permission
                if ('requiredPermission' in item && item.requiredPermission) {
                  return hasPermission(item.requiredPermission as AdminPermission)
                }
                return true
              })
              
              // Don't render category if no visible items
              if (visibleItems.length === 0) return null
              
              return (
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
                      {visibleItems.map((item) => {
                        const Icon = item.icon
                        const itemBadge = 'badge' in item ? item.badge : undefined
                        const itemShowAlert = 'showAlert' in item ? item.showAlert : false
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors relative',
                              isActiveRoute(item.href)
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                              isCollapsed && 'justify-center'
                            )}
                            title={isCollapsed ? item.name : undefined}
                          >
                            <div className="relative">
                              <Icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                              {/* Alert indicator dot for collapsed state */}
                              {isCollapsed && itemShowAlert && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                              )}
                              {/* Badge for collapsed state */}
                              {isCollapsed && itemBadge && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                                  {itemBadge > 9 ? '9+' : itemBadge}
                                </span>
                              )}
                            </div>
                            {!isCollapsed && (
                              <>
                                <span className="truncate flex-1">{item.name}</span>
                                {/* Queue count badge - Requirement 6.4 */}
                                {itemBadge && (
                                  <Badge 
                                    className={cn(
                                      'ml-2 h-5 px-1.5 text-xs',
                                      isActiveRoute(item.href)
                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                    )}
                                  >
                                    {itemBadge > 99 ? '99+' : itemBadge}
                                  </Badge>
                                )}
                                {/* Alert indicator - Requirements 8.3, 12.2 */}
                                {itemShowAlert && (
                                  <AlertTriangle className={cn(
                                    'h-4 w-4 ml-2 animate-pulse',
                                    isActiveRoute(item.href)
                                      ? 'text-primary-foreground'
                                      : 'text-yellow-500'
                                  )} />
                                )}
                              </>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
          {/* System Health Alert Banner - displays when errors spike or performance degrades */}
          {/* Requirements: 12.2, 12.4 */}
          <SystemHealthAlertBanner className="mb-6" dismissible={true} />
          {children}
        </main>
      </div>
    </div>
  )
}
