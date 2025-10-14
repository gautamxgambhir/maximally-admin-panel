import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Eye, 
  UserX, 
  RefreshCw,
  Users,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import type { Profile } from '@/types/profile'
import { getAllAdmins, removeAdminRole } from '@/lib/profileApi'
import { AdminDetailModal } from './AdminDetailModal'

export function AdminList() {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter admins based on search term
  const filteredAdmins = useMemo(() => {
    if (!searchTerm.trim()) return admins

    const term = searchTerm.toLowerCase()
    return admins.filter(admin => 
      admin.email?.toLowerCase().includes(term) ||
      admin.username?.toLowerCase().includes(term) ||
      admin.full_name?.toLowerCase().includes(term)
    )
  }, [admins, searchTerm])

  const fetchAdmins = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await getAllAdmins()
      
      if (error) {
        setError('Failed to fetch admin list')
        toast.error('Failed to fetch admin list')
        return
      }

      setAdmins(data || [])
    } catch (error) {
      setError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAdmin = async (admin: Profile) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove admin privileges from ${admin.email || admin.username}? They will become a regular user.`
    )

    if (!confirmed) return

    try {
      const { error } = await removeAdminRole(admin.id)
      
      if (error) {
        toast.error('Failed to remove admin role')
        return
      }

      toast.success('Admin role removed successfully')
      // Remove admin from the list
      setAdmins(prev => prev.filter(a => a.id !== admin.id))
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleViewDetails = (admin: Profile) => {
    setSelectedAdmin(admin)
    setIsDetailModalOpen(true)
  }

  const handleAdminUpdated = () => {
    fetchAdmins()
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return 'Unknown'
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Admins
          </CardTitle>
          <CardDescription>
            Manage current administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading admins...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Admins
          </CardTitle>
          <CardDescription>
            Manage current administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="font-medium text-red-900">{error}</p>
              <p className="text-sm text-red-700 mt-1">Please try again later</p>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAdmins}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Admins ({filteredAdmins.length})
              </CardTitle>
              <CardDescription>
                Manage current administrators
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAdmins}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admins by email, username, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredAdmins.length === 0 && (
            <div className="text-center py-8">
              {searchTerm ? (
                <div className="space-y-2">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No admins found matching "{searchTerm}"</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No administrators found</p>
                </div>
              )}
            </div>
          )}

          {/* Admin List */}
          {filteredAdmins.length > 0 && (
            <div className="space-y-4">
              {filteredAdmins.map((admin, index) => (
                <div key={admin.id}>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={admin.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(admin.full_name)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {admin.full_name || admin.username || 'Unknown User'}
                          </h3>
                          <Badge variant="default" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {admin.role}
                          </Badge>
                          {admin.is_verified && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {admin.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {admin.email}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Member since {formatDate(admin.created_at)}
                          </div>
                        </div>

                        {admin.bio && (
                          <p className="text-sm text-muted-foreground max-w-md truncate">
                            {admin.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(admin)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Details
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAdmin(admin)}
                        className="flex items-center gap-1"
                      >
                        <UserX className="h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  
                  {index < filteredAdmins.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {admins.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium text-blue-900">Admin Summary:</p>
                  <ul className="text-blue-800 space-y-1">
                    <li>• Total administrators: {admins.length}</li>
                    <li>• Verified admins: {admins.filter(a => a.is_verified).length}</li>
                    <li>• Use the "Details" button to view full profile information</li>
                    <li>• Use the "Remove" button to revoke admin privileges</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Detail Modal */}
      <AdminDetailModal
        admin={selectedAdmin}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedAdmin(null)
        }}
        onAdminUpdated={handleAdminUpdated}
      />
    </>
  )
}