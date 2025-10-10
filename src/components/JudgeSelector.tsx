import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Judge } from '@/lib/judgesApi'

interface JudgeSelectorProps {
  judges: Judge[]
  value: number | null
  onValueChange: (value: number | null) => void
  placeholder?: string
  label?: string
}

export function JudgeSelector({
  judges,
  value,
  onValueChange,
  placeholder = "Select judge...",
  label
}: JudgeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredJudges = useMemo(() => {
    if (!searchQuery) return judges
    
    return judges.filter(judge =>
      judge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      judge.role_in_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      judge.company.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [judges, searchQuery])

  const selectedJudge = judges.find(judge => judge.id === value)

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
              {selectedJudge ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-600">
                      {selectedJudge.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-left">
                      {selectedJudge.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate text-left">
                      {selectedJudge.role_in_company} • {selectedJudge.company}
                    </div>
                  </div>
                </div>
              ) : (
                <SelectValue placeholder={placeholder} />
              )}
            </div>
            {selectedJudge && (
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
                placeholder="Search judges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {filteredJudges.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No judges found</div>
            ) : (
              filteredJudges.map((judge) => (
                <SelectItem key={judge.id} value={judge.id.toString()}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {judge.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{judge.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {judge.role_in_company} • {judge.company}
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