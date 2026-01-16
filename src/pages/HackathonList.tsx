import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useHackathons, useDeleteHackathon } from '@/hooks/useHackathons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Calendar, MapPin, Trophy, GripVertical, Users, Eye, CheckCircle, XCircle, Clock, ExternalLink, Building2, MoreHorizontal, Ban, Star, Info, EyeOff } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Hackathon } from '@/types/hackathon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { getApiBaseUrl } from '@/lib/apiHelpers'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateHackathonSortOrders } from '@/lib/hackathonApi'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { toast } from 'sonner'

// Organizer hackathon interface
interface OrganizerHackathon {
  id: number
  organizer_id: string
  organizer_email: string
  hackathon_name: string
  slug: string
  tagline?: string
  description?: string
  start_date: string
  end_date: string
  format: string
  venue?: string
  status: string
  hackathon_status?: string
  publish_requested_at?: string
  created_at: string
  views_count: number
  registrations_count: number
  rejection_reason?: string
}

// Sortable Row Component
function SortableHackathonRow({ hackathon, onDelete }: { hackathon: Hackathon; onDelete: (hackathon: Hackathon) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: hackathon.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-green-100 text-green-800'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800'
      case 'past':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString()
    const end = new Date(endDate).toLocaleDateString()
    return `${start} → ${end}`
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-gray-50' : ''}>
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div className="min-w-0">
          <div className="font-medium truncate">{hackathon.name}</div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            /{hackathon.slug}
          </div>
          <div className="sm:hidden text-xs text-muted-foreground mt-1">
            <Badge 
              className={`text-xs mr-2 ${getStatusColor(hackathon.status)}`}
              variant="secondary"
            >
              {hackathon.status}
            </Badge>
            {formatDateRange(hackathon.start_date, hackathon.end_date)}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge 
          className={`text-xs ${getStatusColor(hackathon.status)}`}
          variant="secondary"
        >
          {hackathon.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDateRange(hackathon.start_date, hackathon.end_date)}
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm">
        {hackathon.location ? (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {hackathon.location}
          </div>
        ) : (
          <span className="text-muted-foreground">No location</span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm">
        {new Date(hackathon.updated_at).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <Link to={`/hackathons/edit/${hackathon.id}`} title="Edit">
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Hackathon</AlertDialogTitle>
                <AlertDialogDescription className="break-words">
                  Are you sure you want to delete "{hackathon.name}"? This will also delete all associated judges. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(hackathon)}
                  className="bg-red-500 hover:bg-red-600 w-full sm:w-auto"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function HackathonList() {
  const { data: hackathons = [], isLoading, error, refetch } = useHackathons()
  const deleteHackathon = useDeleteHackathon()
  const [sortedHackathons, setSortedHackathons] = useState<Hackathon[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'maximally' | 'organizer'>('maximally')
  
  // Organizer hackathons state
  const [organizerHackathons, setOrganizerHackathons] = useState<OrganizerHackathon[]>([])
  const [organizerLoading, setOrganizerLoading] = useState(true)
  const [organizerFilter, setOrganizerFilter] = useState<'all' | 'pending' | 'live' | 'ended'>('all')
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedOrgHackathon, setSelectedOrgHackathon] = useState<OrganizerHackathon | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showUnpublishModal, setShowUnpublishModal] = useState(false)
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [unpublishReason, setUnpublishReason] = useState('')
  
  const API_BASE_URL = getApiBaseUrl()

  // Update sorted hackathons when data changes
  React.useEffect(() => {
    setSortedHackathons([...hackathons])
  }, [hackathons])
  
  // Fetch organizer hackathons
  useEffect(() => {
    fetchOrganizerHackathons()
  }, [])
  
  const fetchOrganizerHackathons = async () => {
    try {
      setOrganizerLoading(true)
      const { data, error } = await supabaseAdmin
        .from('organizer_hackathons')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setOrganizerHackathons(data || [])
    } catch (error: any) {
      console.error('Error fetching organizer hackathons:', error)
      toast.error('Failed to fetch organizer hackathons')
    } finally {
      setOrganizerLoading(false)
    }
  }
  
  // Filter organizer hackathons
  const filteredOrganizerHackathons = organizerHackathons.filter(h => {
    if (organizerFilter === 'all') return true
    if (organizerFilter === 'pending') return h.status === 'pending_review'
    if (organizerFilter === 'live') return h.status === 'published' && h.hackathon_status !== 'ended'
    if (organizerFilter === 'ended') return h.status === 'ended' || h.hackathon_status === 'ended'
    return true
  })
  
  // Organizer hackathon counts
  const pendingCount = organizerHackathons.filter(h => h.status === 'pending_review').length
  const liveCount = organizerHackathons.filter(h => h.status === 'published' && h.hackathon_status !== 'ended').length
  const endedCount = organizerHackathons.filter(h => h.status === 'ended' || h.hackathon_status === 'ended').length
  
  // Approve organizer hackathon
  const handleApproveOrgHackathon = async () => {
    if (!selectedOrgHackathon) return
    setActionLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const response = await fetch(`${API_BASE_URL}/api/admin/hackathons/${selectedOrgHackathon.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to approve')
      }
      
      toast.success('Hackathon approved successfully!')
      setShowApproveModal(false)
      setSelectedOrgHackathon(null)
      fetchOrganizerHackathons()
    } catch (error: any) {
      console.error('Error approving:', error)
      toast.error(error.message || 'Failed to approve hackathon')
    } finally {
      setActionLoading(false)
    }
  }
  
  // Reject organizer hackathon
  const handleRejectOrgHackathon = async () => {
    if (!selectedOrgHackathon || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setActionLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const response = await fetch(`${API_BASE_URL}/api/admin/hackathons/${selectedOrgHackathon.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to reject')
      }
      
      toast.success('Hackathon rejected and organizer notified')
      setShowRejectModal(false)
      setRejectionReason('')
      setSelectedOrgHackathon(null)
      fetchOrganizerHackathons()
    } catch (error: any) {
      console.error('Error rejecting:', error)
      toast.error(error.message || 'Failed to reject hackathon')
    } finally {
      setActionLoading(false)
    }
  }
  
  // Unpublish organizer hackathon
  const handleUnpublishOrgHackathon = async () => {
    if (!selectedOrgHackathon) return
    setActionLoading(true)
    try {
      const { error } = await supabaseAdmin
        .from('organizer_hackathons')
        .update({ 
          status: 'draft',
          rejection_reason: unpublishReason || 'Unpublished by admin'
        })
        .eq('id', selectedOrgHackathon.id)
      
      if (error) throw error
      
      toast.success('Hackathon unpublished successfully')
      setShowUnpublishModal(false)
      setUnpublishReason('')
      setSelectedOrgHackathon(null)
      fetchOrganizerHackathons()
    } catch (error: any) {
      console.error('Error unpublishing:', error)
      toast.error(error.message || 'Failed to unpublish hackathon')
    } finally {
      setActionLoading(false)
    }
  }
  
  // Delete organizer hackathon
  const handleDeleteOrgHackathon = async () => {
    if (!selectedOrgHackathon) return
    setActionLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const response = await fetch(`${API_BASE_URL}/api/admin/hackathons/${selectedOrgHackathon.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete')
      }
      
      toast.success('Hackathon deleted successfully')
      setShowDeleteOrgModal(false)
      setSelectedOrgHackathon(null)
      fetchOrganizerHackathons()
    } catch (error: any) {
      console.error('Error deleting:', error)
      toast.error(error.message || 'Failed to delete hackathon')
    } finally {
      setActionLoading(false)
    }
  }
  
  // Toggle featured status
  const handleToggleFeatured = async (hackathon: OrganizerHackathon) => {
    try {
      const { data: currentData } = await supabaseAdmin
        .from('organizer_hackathons')
        .select('featured_badge')
        .eq('id', hackathon.id)
        .single()
      
      const newFeatured = !currentData?.featured_badge
      
      const { error } = await supabaseAdmin
        .from('organizer_hackathons')
        .update({ featured_badge: newFeatured })
        .eq('id', hackathon.id)
      
      if (error) throw error
      
      toast.success(newFeatured ? 'Hackathon featured!' : 'Hackathon unfeatured')
      fetchOrganizerHackathons()
    } catch (error: any) {
      console.error('Error toggling featured:', error)
      toast.error('Failed to update featured status')
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDeleteHackathon = async (hackathon: Hackathon) => {
    try {
      await deleteHackathon.mutateAsync(hackathon.id)
    } catch (error) {
      console.error('Error deleting hackathon:', error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedHackathons.findIndex((item) => item.id === active.id)
      const newIndex = sortedHackathons.findIndex((item) => item.id === over.id)

      const newOrder = arrayMove(sortedHackathons, oldIndex, newIndex)
      setSortedHackathons(newOrder)

      // Update sort orders in the database
      setIsSaving(true)
      try {
        const updates = newOrder.map((hackathon, index) => ({
          id: parseInt(hackathon.id),
          sort_order: index
        }))
        
        await updateHackathonSortOrders(updates)
        await refetch() // Refresh the data
      } catch (error) {
        console.error('Error updating sort order:', error)
        // Revert the local state on error
        setSortedHackathons([...hackathons])
      } finally {
        setIsSaving(false)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-green-100 text-green-800'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800'
      case 'past':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString()
    const end = new Date(endDate).toLocaleDateString()
    return `${start} → ${end}`
  }

  if (isLoading && organizerLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading hackathons: {error.message}</p>
      </div>
    )
  }
  
  const getOrgStatusBadge = (hackathon: OrganizerHackathon) => {
    if (hackathon.status === 'pending_review') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>
    }
    if (hackathon.status === 'published' && hackathon.hackathon_status !== 'ended') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Live</Badge>
    }
    if (hackathon.status === 'ended' || hackathon.hackathon_status === 'ended') {
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">Ended</Badge>
    }
    return <Badge variant="outline">{hackathon.status}</Badge>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
            Hackathons
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage Maximally and organizer-hosted hackathons
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/hackathons/create" className="text-sm sm:text-base">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            Create Hackathon
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'maximally' | 'organizer')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="maximally" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Maximally Hackathons ({hackathons.length})
          </TabsTrigger>
          <TabsTrigger value="organizer" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizer Hackathons ({organizerHackathons.length})
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-yellow-500 text-white">{pendingCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Maximally Hackathons Tab */}
        <TabsContent value="maximally">
          <Card>
            <CardHeader>
              <CardTitle>Maximally Hackathons ({hackathons.length})</CardTitle>
              <CardDescription>
                Official Maximally-hosted hackathons. Drag and drop to reorder how they appear on the events page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hackathons.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <Trophy className="w-full h-full" />
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No hackathons</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first hackathon.
                  </p>
                  <div className="mt-6">
                    <Button asChild>
                      <Link to="/hackathons/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Hackathon
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {isSaving && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700">Saving new order...</p>
                    </div>
                  )}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead className="min-w-[200px]">Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Status</TableHead>
                          <TableHead className="hidden md:table-cell">Dates</TableHead>
                          <TableHead className="hidden lg:table-cell">Location</TableHead>
                          <TableHead className="hidden md:table-cell">Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext
                          items={sortedHackathons.map(h => h.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {sortedHackathons.map((hackathon) => (
                            <SortableHackathonRow
                              key={hackathon.id}
                              hackathon={hackathon}
                              onDelete={handleDeleteHackathon}
                            />
                          ))}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Organizer Hackathons Tab */}
        <TabsContent value="organizer">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Organizer Hackathons ({organizerHackathons.length})</CardTitle>
                  <CardDescription>
                    Hackathons created by external organizers. Review and moderate submissions.
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={organizerFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrganizerFilter('all')}
                  >
                    All ({organizerHackathons.length})
                  </Button>
                  <Button
                    variant={organizerFilter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrganizerFilter('pending')}
                    className={pendingCount > 0 ? 'border-yellow-500' : ''}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pending ({pendingCount})
                  </Button>
                  <Button
                    variant={organizerFilter === 'live' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrganizerFilter('live')}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Live ({liveCount})
                  </Button>
                  <Button
                    variant={organizerFilter === 'ended' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrganizerFilter('ended')}
                  >
                    Ended ({endedCount})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {organizerLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading organizer hackathons...</p>
                </div>
              ) : filteredOrganizerHackathons.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <Building2 className="w-full h-full" />
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No hackathons found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {organizerFilter === 'pending' 
                      ? 'No pending hackathons to review.'
                      : organizerFilter === 'live'
                      ? 'No live organizer hackathons.'
                      : organizerFilter === 'ended'
                      ? 'No ended hackathons.'
                      : 'No organizer hackathons yet.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Organizer</TableHead>
                        <TableHead className="hidden md:table-cell">Dates</TableHead>
                        <TableHead className="hidden lg:table-cell">Stats</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrganizerHackathons.map((hackathon) => (
                        <TableRow key={hackathon.id}>
                          <TableCell className="font-medium">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{hackathon.hackathon_name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                /{hackathon.slug}
                              </div>
                              {hackathon.tagline && (
                                <div className="text-xs text-muted-foreground truncate mt-1">
                                  {hackathon.tagline}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getOrgStatusBadge(hackathon)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-sm truncate max-w-[150px]">
                              {hackathon.organizer_email}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(hackathon.start_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {hackathon.views_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {hackathon.registrations_count}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {/* Quick actions for pending */}
                              {hackathon.status === 'pending_review' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => {
                                      setSelectedOrgHackathon(hackathon)
                                      setShowApproveModal(true)
                                    }}
                                    title="Approve"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedOrgHackathon(hackathon)
                                      setShowRejectModal(true)
                                    }}
                                    title="Reject"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              
                              {/* More actions dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 px-2">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {/* View Details */}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrgHackathon(hackathon)
                                      setShowDetailsModal(true)
                                    }}
                                  >
                                    <Info className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  
                                  {/* View Live (for published) */}
                                  {hackathon.status === 'published' && (
                                    <DropdownMenuItem
                                      onClick={() => window.open(`${API_BASE_URL}/hackathon/${hackathon.slug}`, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Live
                                    </DropdownMenuItem>
                                  )}
                                  
                                  <DropdownMenuSeparator />
                                  
                                  {/* Feature/Unfeature */}
                                  <DropdownMenuItem
                                    onClick={() => handleToggleFeatured(hackathon)}
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    Toggle Featured
                                  </DropdownMenuItem>
                                  
                                  {/* Unpublish (for published hackathons) */}
                                  {hackathon.status === 'published' && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrgHackathon(hackathon)
                                        setShowUnpublishModal(true)
                                      }}
                                      className="text-orange-600"
                                    >
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Unpublish
                                    </DropdownMenuItem>
                                  )}
                                  
                                  <DropdownMenuSeparator />
                                  
                                  {/* Delete */}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrgHackathon(hackathon)
                                      setShowDeleteOrgModal(true)
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Hackathon
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Approve Modal */}
      {showApproveModal && selectedOrgHackathon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">Approve Hackathon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to approve "{selectedOrgHackathon.hackathon_name}"? 
              This will publish the hackathon and notify the organizer.
            </p>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-4">
              <p className="text-sm text-blue-800 font-semibold">ℹ️ One-Time Approval</p>
              <p className="text-sm text-blue-700 mt-1">
                Once approved, the organizer can edit their hackathon freely without needing re-approval.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-md mb-4">
              <p className="text-sm font-semibold mb-2">Details:</p>
              <p className="text-sm"><strong>Name:</strong> {selectedOrgHackathon.hackathon_name}</p>
              <p className="text-sm"><strong>Organizer:</strong> {selectedOrgHackathon.organizer_email}</p>
              <p className="text-sm"><strong>Format:</strong> {selectedOrgHackathon.format}</p>
              <p className="text-sm"><strong>Start:</strong> {new Date(selectedOrgHackathon.start_date).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedOrgHackathon(null)
                }}
                variant="outline"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveOrgHackathon}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? 'Approving...' : 'Approve & Go Live'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Reject Modal */}
      {showRejectModal && selectedOrgHackathon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">Reject Hackathon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting "{selectedOrgHackathon.hackathon_name}". 
              This will be sent to the organizer.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full min-h-[120px] p-3 border rounded-md mb-4"
              required
            />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                  setSelectedOrgHackathon(null)
                }}
                variant="outline"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectOrgHackathon}
                disabled={actionLoading || !rejectionReason.trim()}
                variant="destructive"
              >
                {actionLoading ? 'Rejecting...' : 'Reject & Notify'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Unpublish Modal */}
      {showUnpublishModal && selectedOrgHackathon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-orange-600">Unpublish Hackathon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will take "{selectedOrgHackathon.hackathon_name}" offline. The organizer will need to request re-approval to publish again.
            </p>
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-md mb-4">
              <p className="text-sm text-orange-800 font-semibold">⚠️ Warning</p>
              <p className="text-sm text-orange-700 mt-1">
                This hackathon has {selectedOrgHackathon.registrations_count} registrations and {selectedOrgHackathon.views_count} views.
              </p>
            </div>
            <textarea
              value={unpublishReason}
              onChange={(e) => setUnpublishReason(e.target.value)}
              placeholder="Reason for unpublishing (optional)..."
              className="w-full min-h-[80px] p-3 border rounded-md mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowUnpublishModal(false)
                  setUnpublishReason('')
                  setSelectedOrgHackathon(null)
                }}
                variant="outline"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUnpublishOrgHackathon}
                disabled={actionLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {actionLoading ? 'Unpublishing...' : 'Unpublish'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Delete Organizer Hackathon Modal */}
      {showDeleteOrgModal && selectedOrgHackathon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">Delete Hackathon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to permanently delete "{selectedOrgHackathon.hackathon_name}"? 
              This action cannot be undone.
            </p>
            <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-4">
              <p className="text-sm text-red-800 font-semibold">⚠️ Permanent Deletion</p>
              <p className="text-sm text-red-700 mt-1">
                This will delete all registrations ({selectedOrgHackathon.registrations_count}), submissions, and associated data.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-md mb-4">
              <p className="text-sm"><strong>Organizer:</strong> {selectedOrgHackathon.organizer_email}</p>
              <p className="text-sm"><strong>Status:</strong> {selectedOrgHackathon.status}</p>
              <p className="text-sm"><strong>Created:</strong> {new Date(selectedOrgHackathon.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowDeleteOrgModal(false)
                  setSelectedOrgHackathon(null)
                }}
                variant="outline"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteOrgHackathon}
                disabled={actionLoading}
                variant="destructive"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Details Modal */}
      {showDetailsModal && selectedOrgHackathon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{selectedOrgHackathon.hackathon_name}</h3>
                <p className="text-sm text-muted-foreground">/{selectedOrgHackathon.slug}</p>
              </div>
              {getOrgStatusBadge(selectedOrgHackathon)}
            </div>
            
            {selectedOrgHackathon.tagline && (
              <p className="text-muted-foreground mb-4 italic">"{selectedOrgHackathon.tagline}"</p>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground">Organizer</p>
                <p className="font-medium text-sm">{selectedOrgHackathon.organizer_email}</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground">Format</p>
                <p className="font-medium text-sm capitalize">{selectedOrgHackathon.format}</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium text-sm">{new Date(selectedOrgHackathon.start_date).toLocaleDateString()}</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium text-sm">{new Date(selectedOrgHackathon.end_date).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-md text-center">
                <Eye className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-bold text-blue-600">{selectedOrgHackathon.views_count}</p>
                <p className="text-xs text-blue-700">Views</p>
              </div>
              <div className="bg-green-50 p-3 rounded-md text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{selectedOrgHackathon.registrations_count}</p>
                <p className="text-xs text-green-700">Registrations</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-md text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <p className="text-2xl font-bold text-purple-600">
                  {Math.ceil((new Date(selectedOrgHackathon.end_date).getTime() - new Date(selectedOrgHackathon.start_date).getTime()) / (1000 * 60 * 60 * 24))}
                </p>
                <p className="text-xs text-purple-700">Days</p>
              </div>
            </div>
            
            {selectedOrgHackathon.description && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Description</p>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {selectedOrgHackathon.description}
                </p>
              </div>
            )}
            
            {selectedOrgHackathon.venue && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Venue</p>
                <p className="text-sm text-muted-foreground">{selectedOrgHackathon.venue}</p>
              </div>
            )}
            
            {selectedOrgHackathon.rejection_reason && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-semibold text-red-800">Previous Rejection Reason</p>
                <p className="text-sm text-red-700">{selectedOrgHackathon.rejection_reason}</p>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground mb-4">
              <p>Created: {new Date(selectedOrgHackathon.created_at).toLocaleString()}</p>
              {selectedOrgHackathon.publish_requested_at && (
                <p>Publish Requested: {new Date(selectedOrgHackathon.publish_requested_at).toLocaleString()}</p>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedOrgHackathon(null)
                }}
                variant="outline"
              >
                Close
              </Button>
              {selectedOrgHackathon.status === 'published' && (
                <Button
                  onClick={() => window.open(`${API_BASE_URL}/hackathon/${selectedOrgHackathon.slug}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Live
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
