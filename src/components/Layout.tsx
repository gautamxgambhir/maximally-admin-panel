import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
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
  Award
} from 'lucide-react'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      name: 'Certificates',
      href: '/certificates',
      icon: Award,
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
    <div className="min-h-screen bg-gray-50">
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

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">
            Maximally Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.email}
          </p>
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
                    : 'text-gray-700 hover:bg-gray-100'
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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
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
