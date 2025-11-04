import React, { useState } from 'react'
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
import { Plus, Edit, Trash2, Calendar, MapPin, Trophy, GripVertical } from 'lucide-react'
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
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateHackathonSortOrders } from '@/lib/hackathonApi'

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

  // Update sorted hackathons when data changes
  React.useEffect(() => {
    setSortedHackathons([...hackathons])
  }, [hackathons])

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

  if (isLoading) {
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
            Hackathons
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your hackathons and events
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/hackathons/create" className="text-sm sm:text-base">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            Create Hackathon
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Hackathons ({hackathons.length})</CardTitle>
          <CardDescription>
            A list of all your hackathons and events. Drag and drop to reorder how they appear on the events page.
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
    </div>
  )
}
