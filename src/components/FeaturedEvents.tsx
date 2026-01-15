import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Loader2, Save, Star, Check, ChevronsUpDown } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Hackathon {
  id: number
  name: string
  type: 'admin' | 'organizer'
  status?: string
  start_date?: string
}

interface FeaturedSlot {
  type: 'admin' | 'organizer' | null
  id: number | null
}

export function FeaturedEvents() {
  const [adminHackathons, setAdminHackathons] = useState<Hackathon[]>([])
  const [organizerHackathons, setOrganizerHackathons] = useState<Hackathon[]>([])
  const [slots, setSlots] = useState<FeaturedSlot[]>(Array(6).fill({ type: null, id: null }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openPopovers, setOpenPopovers] = useState<boolean[]>(Array(6).fill(false))

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch admin hackathons - sorted by start_date descending (most recent first)
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('hackathons')
        .select('id, title, status, start_date')
        .eq('is_active', true)
        .order('start_date', { ascending: false })

      if (adminError) throw adminError

      // Fetch organizer hackathons - sorted by start_date descending
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizer_hackathons')
        .select('id, hackathon_name, status, start_date')
        .eq('status', 'published')
        .order('start_date', { ascending: false })

      if (orgError) throw orgError

      setAdminHackathons((adminData || []).map(h => ({
        id: h.id,
        name: h.title,
        type: 'admin' as const,
        status: h.status,
        start_date: h.start_date
      })))

      setOrganizerHackathons((orgData || []).map(h => ({
        id: h.id,
        name: h.hackathon_name,
        type: 'organizer' as const,
        status: h.status,
        start_date: h.start_date
      })))

      // Fetch current featured hackathons
      const { data: featuredData, error: featuredError } = await supabaseAdmin
        .from('featured_hackathons')
        .select('*')
        .eq('id', 1)
        .single()

      if (featuredError && featuredError.code !== 'PGRST116') throw featuredError

      if (featuredData) {
        const newSlots: FeaturedSlot[] = []
        for (let i = 1; i <= 6; i++) {
          newSlots.push({
            type: featuredData[`slot_${i}_type`] || null,
            id: featuredData[`slot_${i}_id`] || null
          })
        }
        setSlots(newSlots)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load hackathons')
    } finally {
      setLoading(false)
    }
  }

  const handleSlotChange = (index: number, value: string) => {
    if (value === 'none') {
      setSlots(prev => {
        const newSlots = [...prev]
        newSlots[index] = { type: null, id: null }
        return newSlots
      })
    } else {
      const [type, id] = value.split('-')
      setSlots(prev => {
        const newSlots = [...prev]
        newSlots[index] = { type: type as 'admin' | 'organizer', id: parseInt(id) }
        return newSlots
      })
    }
    setOpenPopovers(prev => {
      const newOpen = [...prev]
      newOpen[index] = false
      return newOpen
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Get auth token
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session?.access_token) {
        toast.error('Not authenticated')
        return
      }

      // Call API endpoint instead of direct Supabase call
      const response = await fetch('/api/admin/featured-hackathons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          slots: slots
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save featured events')
      }

      toast.success('Featured events updated successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save featured events')
    } finally {
      setSaving(false)
    }
  }

  const allHackathons = [
    ...adminHackathons.map(h => ({ ...h, label: `[Maximally] ${h.name}`, value: `admin-${h.id}` })),
    ...organizerHackathons.map(h => ({ ...h, label: `[Organizer] ${h.name}`, value: `organizer-${h.id}` }))
  ]

  const getDisplayValue = (slot: FeaturedSlot) => {
    if (!slot.type || !slot.id) return 'Select a hackathon'
    const hackathon = allHackathons.find(h => h.type === slot.type && h.id === slot.id)
    return hackathon?.label || 'Select a hackathon'
  }

  const getHackathonName = (slot: FeaturedSlot) => {
    if (!slot.type || !slot.id) return null
    const list = slot.type === 'admin' ? adminHackathons : organizerHackathons
    return list.find(h => h.id === slot.id)?.name
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Featured Events
        </CardTitle>
        <CardDescription>
          Select 6 hackathons to feature on the landing page. These will appear in the "Join The Next Wave" section.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map((slot, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm font-medium">
                Slot {index + 1}
                {getHackathonName(slot) && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({slot.type === 'admin' ? 'Maximally' : 'Organizer'})
                  </span>
                )}
              </Label>
              <Popover open={openPopovers[index]} onOpenChange={(open) => {
                setOpenPopovers(prev => {
                  const newOpen = [...prev]
                  newOpen[index] = open
                  return newOpen
                })
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPopovers[index]}
                    className="w-full justify-between"
                  >
                    <span className="truncate">{getDisplayValue(slot)}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search hackathons..." />
                    <CommandList>
                      <CommandEmpty>No hackathon found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => handleSlotChange(index, 'none')}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !slot.type && !slot.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          -- None --
                        </CommandItem>
                        {allHackathons.map((h) => (
                          <CommandItem
                            key={h.value}
                            value={h.label}
                            onSelect={() => handleSlotChange(index, h.value)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                slot.type === h.type && slot.id === h.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {h.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Featured Events
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
