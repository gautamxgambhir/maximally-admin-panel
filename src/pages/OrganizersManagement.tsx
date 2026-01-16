import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Search, Users, GripVertical, ExternalLink } from 'lucide-react'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { toast } from 'sonner'
import { getMainWebsiteUrl } from '@/lib/apiHelpers'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Organizer {
  id: string
  user_id: string
  username: string
  full_name: string
  email: string
  tier: 'starter' | 'verified' | 'senior' | 'chief' | 'legacy'
  sort_order: number
  is_published: boolean
  organization_name: string | null
  organization_type: string | null
  bio: string | null
  location: string | null
  website: string | null
  linkedin: string | null
  twitter: string | null
  total_hackathons_hosted: number
  total_participants_reached: number
  created_at: string
}

interface OrganizerFormData {
  tier: 'starter' | 'verified' | 'senior' | 'chief' | 'legacy'
  sort_order: number
  is_published: boolean
  organization_name: string
  bio: string
  location: string
  website: string
  linkedin: string
  twitter: string
}

// Sortable Organizer Card Component
function SortableOrganizerCard({ 
  organizer, 
  onEdit, 
  onDelete 
}: { 
  organizer: Organizer
  onEdit: (organizer: Organizer) => void
  onDelete: (organizer: Organizer) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: organizer.user_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      starter: 'bg-gray-500',
      verified: 'bg-blue-500',
      senior: 'bg-purple-500',
      chief: 'bg-orange-500',
      legacy: 'bg-yellow-500'
    }
    return colors[tier] || 'bg-gray-500'
  }

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`overflow-hidden hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg' : ''}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Drag Handle */}
            <div 
              {...attributes} 
              {...listeners}
              className="flex flex-col items-center justify-center bg-muted rounded px-3 py-2 min-w-[60px] cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-sm font-bold text-muted-foreground">#{organizer.sort_order}</span>
            </div>

            {/* Profile Picture */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white">
                {(organizer.full_name || organizer.username || 'O').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>

            {/* Organizer Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-foreground">{organizer.full_name || organizer.username}</h3>
                {organizer.username && (
                  <Badge variant="outline">@{organizer.username}</Badge>
                )}
                <Badge className={`${getTierColor(organizer.tier)} text-white capitalize`}>{organizer.tier}</Badge>
                {organizer.is_published && (
                  <Badge className="bg-green-600 dark:bg-green-700">Published</Badge>
                )}
              </div>
              
              {organizer.organization_name && (
                <p className="text-sm text-muted-foreground mb-3">{organizer.organization_name}</p>
              )}
              
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2 font-medium text-foreground">{organizer.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <span className="ml-2 font-medium text-foreground">{organizer.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium text-foreground capitalize">{organizer.organization_type?.replace('_', ' ') || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Hackathons Hosted:</span>
                  <span className="ml-2 font-medium text-foreground">{organizer.total_hackathons_hosted || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Participants Reached:</span>
                  <span className="ml-2 font-medium text-foreground">{organizer.total_participants_reached || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <span className="ml-2 font-medium text-foreground text-xs">{organizer.user_id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {organizer.username && (
              <a 
                href={`${getMainWebsiteUrl()}/organizer/${organizer.username}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title="View Profile"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(organizer)}>
              <Edit className="h-4 w-4 mr-1" />Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(organizer)} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-1" />Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export function OrganizersManagement() {
  const [editingOrganizer, setEditingOrganizer] = useState<Organizer | null>(null)
  const [deletingOrganizer, setDeletingOrganizer] = useState<Organizer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState<OrganizerFormData>({
    tier: 'starter',
    sort_order: 0,
    is_published: false,
    organization_name: '',
    bio: '',
    location: '',
    website: '',
    linkedin: '',
    twitter: ''
  })
  const queryClient = useQueryClient()

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch organizers
  const { data: organizers = [], isLoading, refetch } = useQuery({
    queryKey: ['organizers-management'],
    queryFn: async () => {
      // Get all organizer profiles with user data
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, full_name, email, role, created_at')
        .eq('role', 'organizer')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Get organizer profile data
      const userIds = (profiles || []).map((p: any) => p.id)
      const { data: orgProfiles, error: orgError } = await supabaseAdmin
        .from('organizer_profiles')
        .select('*')
        .in('user_id', userIds)

      if (orgError) throw orgError

      const orgProfileMap = new Map((orgProfiles || []).map((p: any) => [p.user_id, p]))

      return (profiles || []).map((p: any) => {
        const orgProfile = orgProfileMap.get(p.id) || {}
        return {
          id: orgProfile.id || p.id,
          user_id: p.id,
          username: p.username,
          full_name: p.full_name,
          email: p.email,
          tier: orgProfile.tier || 'starter',
          sort_order: orgProfile.sort_order || 0,
          is_published: orgProfile.is_published || false,
          organization_name: orgProfile.organization_name,
          organization_type: orgProfile.organization_type,
          bio: orgProfile.bio,
          location: orgProfile.location,
          website: orgProfile.website,
          linkedin: orgProfile.linkedin,
          twitter: orgProfile.twitter,
          total_hackathons_hosted: orgProfile.total_hackathons_hosted || 0,
          total_participants_reached: orgProfile.total_participants_reached || 0,
          created_at: p.created_at
        } as Organizer
      }).sort((a, b) => a.sort_order - b.sort_order)
    }
  })

  // Update organizer mutation
  const updateOrganizerMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<OrganizerFormData> }) => {
      const { error } = await supabaseAdmin
        .from('organizer_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizers-management'] })
      toast.success('Organizer updated successfully!')
      setEditingOrganizer(null)
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`)
    }
  })

  // Delete organizer mutation
  const deleteOrganizerMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Update profile role back to user
      const { error: roleError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId)

      if (roleError) throw roleError

      // Delete organizer hackathons
      await supabaseAdmin
        .from('organizer_hackathons')
        .delete()
        .eq('organizer_id', userId)

      // Delete organizer profile
      const { error: profileError } = await supabaseAdmin
        .from('organizer_profiles')
        .delete()
        .eq('user_id', userId)

      if (profileError) throw profileError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizers-management'] })
      toast.success('Organizer removed successfully!')
      setDeletingOrganizer(null)
    },
    onError: (error: any) => {
      toast.error(`Failed to remove: ${error.message}`)
    }
  })

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activeOrg = organizers.find(o => o.user_id === active.id)
      const overOrg = organizers.find(o => o.user_id === over.id)
      
      if (!activeOrg || !overOrg) return

      const oldPosition = activeOrg.sort_order
      const newPosition = overOrg.sort_order
      
      const updates: { user_id: string; sort_order: number }[] = []
      
      if (newPosition < oldPosition) {
        organizers.forEach(o => {
          if (o.user_id === activeOrg.user_id) {
            updates.push({ user_id: o.user_id, sort_order: newPosition })
          } else if (o.sort_order >= newPosition && o.sort_order < oldPosition) {
            updates.push({ user_id: o.user_id, sort_order: o.sort_order + 1 })
          }
        })
      } else {
        organizers.forEach(o => {
          if (o.user_id === activeOrg.user_id) {
            updates.push({ user_id: o.user_id, sort_order: newPosition })
          } else if (o.sort_order > oldPosition && o.sort_order <= newPosition) {
            updates.push({ user_id: o.user_id, sort_order: o.sort_order - 1 })
          }
        })
      }

      try {
        for (const update of updates) {
          await supabaseAdmin
            .from('organizer_profiles')
            .update({ sort_order: update.sort_order })
            .eq('user_id', update.user_id)
        }
        await refetch()
        toast.success('Order updated!')
      } catch (error) {
        toast.error('Failed to update order')
      }
    }
  }

  const handleEditOrganizer = (organizer: Organizer) => {
    setFormData({
      tier: organizer.tier,
      sort_order: organizer.sort_order,
      is_published: organizer.is_published,
      organization_name: organizer.organization_name || '',
      bio: organizer.bio || '',
      location: organizer.location || '',
      website: organizer.website || '',
      linkedin: organizer.linkedin || '',
      twitter: organizer.twitter || ''
    })
    setEditingOrganizer(organizer)
  }

  const handleSaveEdit = () => {
    if (!editingOrganizer) return
    updateOrganizerMutation.mutate({
      userId: editingOrganizer.user_id,
      updates: formData
    })
  }

  const filteredOrganizers = organizers.filter(org =>
    (org.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.organization_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizers Management</h1>
          <p className="text-muted-foreground">
            Manage organizers with tiers and display order ({organizers.length} total)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organizers
            <Badge variant="secondary" className="ml-2">{organizers.length}</Badge>
          </CardTitle>
          <CardDescription>Drag to reorder, edit tiers and publish status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredOrganizers.map(o => o.user_id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {filteredOrganizers.map((organizer) => (
                    <SortableOrganizerCard
                      key={organizer.user_id}
                      organizer={organizer}
                      onEdit={handleEditOrganizer}
                      onDelete={setDeletingOrganizer}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          
          {!isLoading && filteredOrganizers.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  {searchQuery ? `No organizers found matching "${searchQuery}"` : 'No organizers yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Edit Organizer Dialog */}
      <Dialog open={!!editingOrganizer} onOpenChange={() => setEditingOrganizer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organizer: {editingOrganizer?.full_name || editingOrganizer?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tier</Label>
                <Select value={formData.tier} onValueChange={(value: any) => setFormData({ ...formData, tier: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="chief">Chief</SelectItem>
                    <SelectItem value="legacy">Legacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input 
                  type="number" 
                  value={formData.sort_order} 
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} 
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="is_published"
                checked={formData.is_published} 
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_published">Published (visible on public page)</Label>
            </div>

            <div>
              <Label>Organization Name</Label>
              <Input 
                value={formData.organization_name} 
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })} 
                placeholder="Organization name"
              />
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea 
                value={formData.bio} 
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                placeholder="Short bio"
                rows={3}
              />
            </div>

            <div>
              <Label>Location</Label>
              <Input 
                value={formData.location} 
                onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                placeholder="City, Country"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Website</Label>
                <Input 
                  value={formData.website} 
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input 
                  value={formData.linkedin} 
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} 
                  placeholder="LinkedIn URL"
                />
              </div>
              <div>
                <Label>Twitter</Label>
                <Input 
                  value={formData.twitter} 
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} 
                  placeholder="Twitter URL"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingOrganizer(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateOrganizerMutation.isPending}>
                {updateOrganizerMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingOrganizer} onOpenChange={() => setDeletingOrganizer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Organizer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingOrganizer?.full_name || deletingOrganizer?.username} as an organizer? 
              This will delete their organizer profile and all their hackathons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingOrganizer && deleteOrganizerMutation.mutate(deletingOrganizer.user_id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteOrganizerMutation.isPending}
            >
              {deleteOrganizerMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
