import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Loader2, Save, FileText, Check, ChevronsUpDown } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Blog {
  id: number
  title: string
  status: string
}

export function FeaturedBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openPopovers, setOpenPopovers] = useState<boolean[]>([false, false, false])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch all blogs - sorted by created_at descending (most recent first)
      const { data: blogsData, error: blogsError } = await supabaseAdmin
        .from('blogs')
        .select('id, title, status')
        .order('created_at', { ascending: false })

      if (blogsError) throw blogsError

      setBlogs(blogsData || [])

      // Fetch current featured blogs
      const { data: featuredData, error: featuredError } = await supabaseAdmin
        .from('featured_blogs')
        .select('*')
        .eq('id', 1)
        .single()

      if (featuredError && featuredError.code !== 'PGRST116') throw featuredError

      if (featuredData) {
        setSlots([
          featuredData.slot_1_id || null,
          featuredData.slot_2_id || null,
          featuredData.slot_3_id || null
        ])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load blogs')
    } finally {
      setLoading(false)
    }
  }

  const handleSlotChange = (index: number, value: string) => {
    setSlots(prev => {
      const newSlots = [...prev]
      newSlots[index] = value === 'none' ? null : parseInt(value)
      return newSlots
    })
    setOpenPopovers(prev => {
      const newOpen = [...prev]
      newOpen[index] = false
      return newOpen
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabaseAdmin
        .from('featured_blogs')
        .upsert({
          id: 1,
          slot_1_id: slots[0],
          slot_2_id: slots[1],
          slot_3_id: slots[2],
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Featured blogs updated successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save featured blogs')
    } finally {
      setSaving(false)
    }
  }

  const getBlogTitle = (id: number | null) => {
    if (!id) return null
    return blogs.find(b => b.id === id)?.title
  }

  const getDisplayValue = (id: number | null) => {
    if (!id) return 'Select a blog'
    const blog = blogs.find(b => b.id === id)
    return blog ? `${blog.title}${blog.status === 'draft' ? ' (Draft)' : ''}` : 'Select a blog'
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
          <FileText className="h-5 w-5 text-purple-500" />
          Featured Blogs
        </CardTitle>
        <CardDescription>
          Select 3 blogs to feature on the landing page "Latest Stories" section.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slots.map((slotId, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm font-medium">
                Slot {index + 1}
                {getBlogTitle(slotId) && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({blogs.find(b => b.id === slotId)?.status})
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
                    <span className="truncate">{getDisplayValue(slotId)}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search blogs..." />
                    <CommandList>
                      <CommandEmpty>No blog found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => handleSlotChange(index, 'none')}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !slotId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          -- None --
                        </CommandItem>
                        {blogs.map((blog) => (
                          <CommandItem
                            key={blog.id}
                            value={`${blog.title} ${blog.status}`}
                            onSelect={() => handleSlotChange(index, blog.id.toString())}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                slotId === blog.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {blog.title} {blog.status === 'draft' && '(Draft)'}
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
                Save Featured Blogs
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
