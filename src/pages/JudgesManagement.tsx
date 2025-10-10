import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Scale
} from 'lucide-react'
import { JudgeForm } from '@/components/JudgeForm'
import {
  useGeneralJudges,
  useGeneralJudgesCount,
  useCreateGeneralJudge,
  useUpdateGeneralJudge,
  useDeleteGeneralJudge
} from '@/hooks/useGeneralJudges'
import { Judge, JudgeInput } from '@/lib/judgesApi'

export function JudgesManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null)
  const [deletingJudge, setDeletingJudge] = useState<Judge | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Hooks
  const { data: judges = [], isLoading } = useGeneralJudges()
  const { data: judgesCount = 0 } = useGeneralJudgesCount()
  const createJudge = useCreateGeneralJudge()
  const updateJudge = useUpdateGeneralJudge()
  const deleteJudge = useDeleteGeneralJudge()

  // Filter judges based on search query
  const filteredJudges = judges.filter(judge =>
    judge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    judge.role_in_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    judge.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateJudge = async (data: JudgeInput) => {
    try {
      await createJudge.mutateAsync(data)
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Failed to create judge:', error)
    }
  }

  const handleUpdateJudge = async (data: JudgeInput) => {
    if (!editingJudge) return
    
    try {
      await updateJudge.mutateAsync({ ...data, id: editingJudge.id })
      setEditingJudge(null)
    } catch (error) {
      console.error('Failed to update judge:', error)
    }
  }

  const handleDeleteJudge = async () => {
    if (!deletingJudge) return
    
    try {
      await deleteJudge.mutateAsync(deletingJudge.id)
      setDeletingJudge(null)
    } catch (error) {
      console.error('Failed to delete judge:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Judges Management</h1>
          <p className="text-gray-600">
            Manage judges for hackathons and events ({judgesCount} total)
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Judge
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Judges
            <Badge variant="secondary" className="ml-2">
              {judgesCount}
            </Badge>
          </CardTitle>
          <CardDescription>Expert professionals who evaluate hackathon projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search judges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJudges.map((judge) => (
                  <TableRow key={judge.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {judge.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{judge.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{judge.role_in_company}</TableCell>
                    <TableCell>{judge.company}</TableCell>
                    <TableCell>{judge.display_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingJudge(judge)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingJudge(judge)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredJudges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {searchQuery 
                        ? `No judges found matching "${searchQuery}"`
                        : 'No judges added yet. Click "Add Judge" to get started.'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Judge Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Judge</DialogTitle>
          </DialogHeader>
          <JudgeForm
            onSubmit={handleCreateJudge}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createJudge.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Judge Dialog */}
      <Dialog open={!!editingJudge} onOpenChange={() => setEditingJudge(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Judge</DialogTitle>
          </DialogHeader>
          {editingJudge && (
            <JudgeForm
              judge={editingJudge}
              onSubmit={handleUpdateJudge}
              onCancel={() => setEditingJudge(null)}
              isSubmitting={updateJudge.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingJudge} onOpenChange={() => setDeletingJudge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Judge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingJudge?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJudge}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteJudge.isPending}
            >
              {deleteJudge.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}