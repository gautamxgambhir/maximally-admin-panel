import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Mail, 
  User, 
  MapPin, 
  Globe, 
  Github, 
  Linkedin, 
  Twitter, 
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  UserX
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Profile } from '@/types/profile'
import { removeAdminRole } from '@/lib/profileApi'

interface AdminDetailModalProps {
  admin: Profile | null
  isOpen: boolean
  onClose: () => void
  onAdminUpdated?: () => void
}

export function AdminDetailModal({ admin, isOpen, onClose, onAdminUpdated }: AdminDetailModalProps) {
  if (!admin) return null

  const handleRemoveAdmin = async () => {
    if (!admin) return

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
      onAdminUpdated?.()
      onClose()
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={admin.avatar_url || undefined} />
              <AvatarFallback>{getInitials(admin.full_name)}</AvatarFallback>
            </Avatar>
            Admin Profile Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="flex items-center gap-2">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {admin.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{admin.email}</p>
                  </div>
                </div>
              )}

              {admin.username && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">@{admin.username}</p>
                  </div>
                </div>
              )}

              {admin.full_name && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{admin.full_name}</p>
                  </div>
                </div>
              )}

              {admin.location && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{admin.location}</p>
                  </div>
                </div>
              )}
            </div>

            {admin.bio && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Bio</p>
                <p className="font-medium">{admin.bio}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Skills */}
          {admin.skills && admin.skills.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {admin.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(admin.website_url || admin.github_username || admin.linkedin_username || admin.twitter_username) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {admin.website_url && (
                    <a 
                      href={admin.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600">Website</p>
                        <p className="font-medium text-blue-800">{admin.website_url}</p>
                      </div>
                    </a>
                  )}

                  {admin.github_username && (
                    <a 
                      href={`https://github.com/${admin.github_username}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Github className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">GitHub</p>
                        <p className="font-medium text-gray-800">@{admin.github_username}</p>
                      </div>
                    </a>
                  )}

                  {admin.linkedin_username && (
                    <a 
                      href={`https://linkedin.com/in/${admin.linkedin_username}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Linkedin className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600">LinkedIn</p>
                        <p className="font-medium text-blue-800">@{admin.linkedin_username}</p>
                      </div>
                    </a>
                  )}

                  {admin.twitter_username && (
                    <a 
                      href={`https://twitter.com/${admin.twitter_username}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
                    >
                      <Twitter className="h-4 w-4 text-sky-600" />
                      <div>
                        <p className="text-sm text-sky-600">Twitter</p>
                        <p className="font-medium text-sky-800">@{admin.twitter_username}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Account Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{formatDate(admin.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(admin.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleRemoveAdmin}
                className="flex items-center gap-2"
              >
                <UserX className="h-4 w-4" />
                Remove Admin Role
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}