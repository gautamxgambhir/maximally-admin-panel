import { useState, useMemo } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Person } from '@/lib/peopleApi'

interface PersonSelectorProps {
  people: Person[]
  value: number | null
  onValueChange: (value: number | null) => void
  placeholder?: string
  label?: string
}

export function PersonSelector({
  people,
  value,
  onValueChange,
  placeholder = "Select person...",
  label
}: PersonSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPeople = useMemo(() => {
    if (!searchQuery) return people
    
    return people.filter(person =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.role_in_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.company?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [people, searchQuery])

  const selectedPerson = people.find(person => person.id === value)

  const handleClear = () => {
    onValueChange(null)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <Select
          value={value ? value.toString() : ""}
          onValueChange={(val) => onValueChange(val ? parseInt(val) : null)}
        >
          <SelectTrigger className="w-full h-auto min-h-[40px] py-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedPerson ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-600">
                      {selectedPerson.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-left">
                      {selectedPerson.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate text-left">
                      {selectedPerson.role_in_company} • {selectedPerson.company}
                    </div>
                  </div>
                </div>
              ) : (
                <SelectValue placeholder={placeholder} />
              )}
            </div>
            {selectedPerson && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100 mr-2"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <div className="flex items-center border-b border-gray-200 p-2">
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {filteredPeople.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No people found</div>
            ) : (
              filteredPeople.map((person) => (
                <SelectItem key={person.id} value={person.id.toString()}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{person.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {person.role_in_company} • {person.company}
                      </div>
                      <div className="text-xs text-gray-400 truncate capitalize">
                        {person.category.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
