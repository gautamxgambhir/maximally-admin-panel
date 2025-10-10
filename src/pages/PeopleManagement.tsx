import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ExternalLink,
  Users,
  UserCog,
  Code,
  GraduationCap
} from 'lucide-react'
import { PersonForm } from '@/components/PersonForm'
import {
  usePeople,
  useCategoryCounts,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson
} from '@/hooks/usePeople'
import { Person, PersonCategory, PersonInput } from '@/lib/peopleApi'

const categories: Array<{ key: PersonCategory; label: string; icon: any; description: string }> = [
  {
    key: 'advisors',
    label: 'Advisors',
    icon: Users,
    description: 'Industry experts and mentors who provide strategic guidance'
  },
  {
    key: 'organizing_board',
    label: 'Organizing Board',
    icon: UserCog,
    description: 'Core team members who manage operations and events'
  },
  {
    key: 'developers',
    label: 'Developers',
    icon: Code,
    description: 'Technical team members building our platform and tools'
  },
  {
    key: 'alumni',
    label: 'Alumni',
    icon: GraduationCap,
    description: 'Former team members and program participants'
  }
]

export function PeopleManagement() {
  const [activeTab, setActiveTab] = useState<PersonCategory>('advisors')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Hooks
  const { data: people = [], isLoading } = usePeople(activeTab)
  const { data: counts = {} } = useCategoryCounts()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()
  const deletePerson = useDeletePerson()

  // Filter people based on search query
  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.role_in_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreatePerson = async (data: PersonInput) => {
    try {
      await createPerson.mutateAsync(data)
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Failed to create person:', error)
    }
  }

  const handleUpdatePerson = async (data: PersonInput) => {
    if (!editingPerson) return
    
    try {
      await updatePerson.mutateAsync({ ...data, id: editingPerson.id })
      setEditingPerson(null)
    } catch (error) {
      console.error('Failed to update person:', error)
    }
  }

  const handleDeletePerson = async () => {
    if (!deletingPerson) return
    
    try {
      await deletePerson.mutateAsync(deletingPerson.id)
      setDeletingPerson(null)
    } catch (error) {
      console.error('Failed to delete person:', error)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
          <p className="text-gray-600">
            Manage your team members across different categories
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Person
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PersonCategory)}>
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon
            const count = counts[category.key] || 0
            return (
              <TabsTrigger key={category.key} value={category.key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {category.label}
                <Badge variant="secondary" className="ml-1">
                  {count}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  {category.label}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={`Search ${category.label.toLowerCase()}...`}
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
                      {filteredPeople.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {person.image_url ? (
                                <img
                                  src={person.image_url}
                                  alt={person.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{person.name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  {person.linkedin_url && (
                                    <ExternalLink className="h-3 w-3" />
                                  )}
                                  {person.description && (
                                    <span className="truncate max-w-[200px]">
                                      {person.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{person.role_in_company}</TableCell>
                          <TableCell>{person.company || '-'}</TableCell>
                          <TableCell>{person.display_order}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingPerson(person)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingPerson(person)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPeople.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            {searchQuery 
                              ? `No ${category.label.toLowerCase()} found matching "${searchQuery}"`
                              : `No ${category.label.toLowerCase()} added yet. Click "Add Person" to get started.`
                            }
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Person Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Person</DialogTitle>
          </DialogHeader>
          <PersonForm
            onSubmit={handleCreatePerson}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createPerson.isPending}
            defaultCategory={activeTab}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Person Dialog */}
      <Dialog open={!!editingPerson} onOpenChange={() => setEditingPerson(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          {editingPerson && (
            <PersonForm
              person={editingPerson}
              onSubmit={handleUpdatePerson}
              onCancel={() => setEditingPerson(null)}
              isSubmitting={updatePerson.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPerson} onOpenChange={() => setDeletingPerson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingPerson?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePerson}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletePerson.isPending}
            >
              {deletePerson.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}