import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPeople,
  getPeopleByCategory,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
  reorderPeople,
  getCategoryCounts,
  type Person,
  type PersonInput,
  type PersonUpdate,
  type PersonCategory
} from '@/lib/peopleApi'
import { toast } from 'sonner'

// Query keys
export const peopleKeys = {
  all: ['people'] as const,
  lists: () => [...peopleKeys.all, 'list'] as const,
  list: (category?: PersonCategory) => [...peopleKeys.lists(), category] as const,
  details: () => [...peopleKeys.all, 'detail'] as const,
  detail: (id: number) => [...peopleKeys.details(), id] as const,
  counts: () => [...peopleKeys.all, 'counts'] as const,
}

// Get all people with optional category filter
export function usePeople(category?: PersonCategory) {
  return useQuery({
    queryKey: peopleKeys.list(category),
    queryFn: () => getPeople(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get people by specific category (active only)
export function usePeopleByCategory(category: PersonCategory) {
  return useQuery({
    queryKey: peopleKeys.list(category),
    queryFn: () => getPeopleByCategory(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get a single person
export function usePerson(id: number) {
  return useQuery({
    queryKey: peopleKeys.detail(id),
    queryFn: () => getPerson(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get category counts
export function useCategoryCounts() {
  return useQuery({
    queryKey: peopleKeys.counts(),
    queryFn: getCategoryCounts,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create person mutation
export function useCreatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPerson,
    onSuccess: (newPerson) => {
      // Invalidate and refetch all people queries
      queryClient.invalidateQueries({ queryKey: peopleKeys.all })
      
      // Update specific category query if it exists
      queryClient.setQueryData(
        peopleKeys.list(newPerson.category),
        (oldData: Person[] | undefined) => {
          if (!oldData) return [newPerson]
          return [...oldData, newPerson].sort((a, b) => a.display_order - b.display_order)
        }
      )

      toast.success('Person created successfully!')
    },
    onError: (error) => {
      console.error('Error creating person:', error)
      toast.error('Failed to create person. Please try again.')
    },
  })
}

// Update person mutation
export function useUpdatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updatePerson,
    onSuccess: (updatedPerson) => {
      // Update the specific person in cache
      queryClient.setQueryData(
        peopleKeys.detail(updatedPerson.id),
        updatedPerson
      )

      // Invalidate list queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: peopleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: peopleKeys.counts() })

      toast.success('Person updated successfully!')
    },
    onError: (error) => {
      console.error('Error updating person:', error)
      toast.error('Failed to update person. Please try again.')
    },
  })
}

// Delete person mutation
export function useDeletePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePerson,
    onSuccess: (_, deletedId) => {
      // Remove from all relevant queries
      queryClient.removeQueries({ queryKey: peopleKeys.detail(deletedId) })
      
      // Update list queries
      queryClient.setQueriesData(
        { queryKey: peopleKeys.lists() },
        (oldData: Person[] | undefined) => {
          if (!oldData) return []
          return oldData.filter(person => person.id !== deletedId)
        }
      )

      queryClient.invalidateQueries({ queryKey: peopleKeys.counts() })
      toast.success('Person deleted successfully!')
    },
    onError: (error) => {
      console.error('Error deleting person:', error)
      toast.error('Failed to delete person. Please try again.')
    },
  })
}


// Reorder people mutation
export function useReorderPeople() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderPeople,
    onSuccess: () => {
      // Invalidate all list queries to refetch with new order
      queryClient.invalidateQueries({ queryKey: peopleKeys.lists() })
      toast.success('People reordered successfully!')
    },
    onError: (error) => {
      console.error('Error reordering people:', error)
      toast.error('Failed to reorder people. Please try again.')
    },
  })
}

// Optimistic update for reordering (for better UX)
export function useOptimisticReorder(category: PersonCategory) {
  const queryClient = useQueryClient()

  return (updates: { id: number; display_order: number }[]) => {
    // Optimistically update the UI
    queryClient.setQueryData(
      peopleKeys.list(category),
      (oldData: Person[] | undefined) => {
        if (!oldData) return []
        
        const newData = [...oldData]
        updates.forEach(update => {
          const index = newData.findIndex(person => person.id === update.id)
          if (index !== -1) {
            newData[index] = { ...newData[index], display_order: update.display_order }
          }
        })
        
        return newData.sort((a, b) => a.display_order - b.display_order)
      }
    )
  }
}