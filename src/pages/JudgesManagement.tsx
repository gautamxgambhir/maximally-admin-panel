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
  Scale,
  GripVertical,
  ArrowUp,
  ArrowDown
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

  // Filter and sort judges based on search query and display order
  const filteredJudges = judges
    .filter(judge =>
      judge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      judge.role_in_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      judge.company.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  const moveJudge = async (judgeId: number, direction: 'up' | 'down') => {
    const currentIndex = filteredJudges.findIndex(j => j.id === judgeId)
    if (currentIndex === -1) return
    
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === filteredJudges.length - 1) return
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const currentJudge = filteredJudges[currentIndex]
    const targetJudge = filteredJudges[targetIndex]
    
    // Swap display orders
    try {
      await updateJudge.mutateAsync({
        ...currentJudge,
        display_order: targetJudge.display_order
      })
      await updateJudge.mutateAsync({
        ...targetJudge,
        display_order: currentJudge.display_order
      })
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const handleCreateJudge = async (data: JudgeInput) => {
    try {
      await createJudge.mutateAsync(data)
      setIsCreateDialogOpen(false)
    } catch (error) {
      // Error handling is done in the hook with toast notifications
    }
  }

  const handleUpdateJudge = async (data: JudgeInput) => {
    if (!editingJudge) return
    
    try {
      await updateJudge.mutateAsync({ ...data, id: editingJudge.id })
      setEditingJudge(null)
    } catch (error) {
      // Error handling is done in the hook with toast notifications
    }
  }

  const handleDeleteJudge = async () => {
    if (!deletingJudge) return
    
    try {
      await deleteJudge.mutateAsync(deletingJudge.id)
      setDeletingJudge(null)
    } catch (error) {
      // Error handling is done in the hook with toast notifications
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
            <div className="space-y-4">
              {filteredJudges.map((judge, index) => (
                <Card key={judge.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Display Order Indicator */}
                        <div className="flex flex-col items-center justify-center bg-gray-100 rounded px-3 py-2 min-w-[60px]">
                          <GripVertical className="h-4 w-4 text-gray-400 mb-1" />
                          <span className="text-sm font-bold text-gray-600">#{judge.display_order || index + 1}</span>
                        </div>
                        {/* Profile Picture */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-white">
                            {judge.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>

                        {/* Judge Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{judge.name}</h3>
                            {judge.username && (
                              <Badge variant="outline">@{judge.username}</Badge>
                            )}
                            {judge.tier && (
                              <Badge variant="secondary" className="capitalize">{judge.tier}</Badge>
                            )}
                            {judge.is_published && (
                              <Badge className="bg-green-500">Published</Badge>
                            )}
                          </div>
                          
                          {judge.headline && (
                            <p className="text-sm text-gray-600 mb-3">{judge.headline}</p>
                          )}
                          
                          <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Role:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.role_in_company || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Company:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.company || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.location || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Events Judged:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.total_events_judged || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Teams Evaluated:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.total_teams_evaluated || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Mentorship Hours:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.total_mentorship_hours || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Display Order:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.display_order}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Created:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {new Date(judge.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">ID:</span>
                              <span className="ml-2 font-medium text-gray-900">{judge.id}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* Sort buttons */}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveJudge(judge.id, 'up')}
                            disabled={filteredJudges.findIndex(j => j.id === judge.id) === 0}
                            className="h-6 px-2"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveJudge(judge.id, 'down')}
                            disabled={filteredJudges.findIndex(j => j.id === judge.id) === filteredJudges.length - 1}
                            className="h-6 px-2"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingJudge(judge)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingJudge(judge)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredJudges.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">
                      {searchQuery 
                        ? `No judges found matching "${searchQuery}"`
                        : 'No judges added yet.'
                      }
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Judge
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Judge Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
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
        <DialogContent className="max-w-3xl max-h-[90vh]">
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