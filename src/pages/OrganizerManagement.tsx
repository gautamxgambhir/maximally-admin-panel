import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, Trash2, ExternalLink, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Organizer {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  created_at: string
  hackathon_count: number
}

export function OrganizerManagement() {
  const [organizers, setOrganizers] = useState<Organizer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingOrganizer, setDeletingOrganizer] = useState<Organizer | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchOrganizers()
  }, [])

  const fetchOrganizers = async () => {
    try {
      setLoading(true)
      
      // Get all users with organizer role
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username, full_name, role, created_at')
        .eq('role', 'organizer')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Get hackathon counts for each organizer
      const organizersWithCounts = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from('organizer_hackathons')
            .select('*', { count: 'exact', head: true })
            .eq('organizer_id', profile.id)

          return {
            ...profile,
            hackathon_count: count || 0
          }
        })
      )

      setOrganizers(organizersWithCounts)
    } catch (error: any) {
      console.error('Error fetching organizers:', error)
      toast.error('Failed to load organizers')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveOrganizer = async () => {
    if (!deletingOrganizer) return

    try {
      setDeleteLoading(true)

      // 1. Delete all hackathons by this organizer
      const { error: hackathonsError } = await supabase
        .from('organizer_hackathons')
        .delete()
        .eq('organizer_id', deletingOrganizer.id)

      if (hackathonsError) throw hackathonsError

      // 2. Delete organizer profile entry
      const { error: profileError } = await supabase
        .from('organizer_profiles')
        .delete()
        .eq('user_id', deletingOrganizer.id)

      if (profileError) throw profileError

      // 3. Update user role back to 'user'
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', deletingOrganizer.id)

      if (roleError) throw roleError

      toast.success(`Removed ${deletingOrganizer.username} as organizer and deleted ${deletingOrganizer.hackathon_count} hackathon(s)`)
      
      // Refresh the list
      fetchOrganizers()
      setDeletingOrganizer(null)
    } catch (error: any) {
      console.error('Error removing organizer:', error)
      toast.error('Failed to remove organizer: ' + error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredOrganizers = organizers.filter(org =>
    org.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organizer Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizers and their hackathons
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {organizers.length} Organizers
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizers</CardTitle>
          <CardDescription>
            View and manage users with organizer privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by username, email, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading organizers...
            </div>
          ) : filteredOrganizers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No organizers found matching your search' : 'No organizers found'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Hackathons</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizers.map((organizer) => (
                    <TableRow key={organizer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {organizer.username || 'N/A'}
                          <a
                            href={`${import.meta.env.VITE_MAIN_WEBSITE_URL}/profile/${organizer.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>{organizer.email || 'N/A'}</TableCell>
                      <TableCell>{organizer.full_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={organizer.hackathon_count > 0 ? 'default' : 'secondary'}>
                          {organizer.hackathon_count} hackathon{organizer.hackathon_count !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(organizer.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingOrganizer(organizer)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingOrganizer} onOpenChange={() => setDeletingOrganizer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Organizer?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to remove <strong>{deletingOrganizer?.username}</strong> as an organizer?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
                <p className="font-semibold text-destructive">This action will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Delete all {deletingOrganizer?.hackathon_count} hackathon(s) created by this organizer</li>
                  <li>Remove their organizer profile</li>
                  <li>Change their role back to regular user</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveOrganizer}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? 'Removing...' : 'Remove Organizer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
