import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateHackathonV2 } from '@/hooks/useHackathons'
import { generateSlug } from '@/lib/hackathonApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { CreateHackathonV2Data } from '@/types/hackathon'

const simpleHackathonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().min(1, 'Subtitle is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  duration: z.string().min(1, 'Duration is required'),
  location: z.string().min(1, 'Location is required'),
  status: z.string().min(1, 'Status is required'),
  focus_areas_text: z.string().min(1, 'Focus areas are required'),
  devpost_url: z.string().url('Please enter a valid URL').min(1, 'Devpost URL is required'),
  devpost_register_url: z.string().url('Please enter a valid URL').min(1, 'Devpost register URL is required'),
  sort_order: z.number().optional(),
})

type SimpleHackathonForm = z.infer<typeof simpleHackathonSchema>

export function CreateHackathon() {
  const navigate = useNavigate()
  const createHackathon = useCreateHackathonV2()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SimpleHackathonForm>({
    resolver: zodResolver(simpleHackathonSchema),
    defaultValues: {
      status: 'upcoming',
    },
  })

  const title = watch('title')

  const onSubmit = async (data: SimpleHackathonForm) => {
    try {
      // Parse focus areas from comma-separated text
      const focusAreas = data.focus_areas_text 
        ? data.focus_areas_text.split(',').map(area => area.trim()).filter(area => area) 
        : []

      // Get the sort order - use provided value or get next available for top position
      let sortOrder = data.sort_order
      if (sortOrder === undefined || sortOrder === null) {
        const { getNextSortOrder } = await import('@/lib/hackathonApi')
        sortOrder = await getNextSortOrder()
      }

      const formattedData: CreateHackathonV2Data = {
        // User provided fields (all required now)
        title: data.title,
        subtitle: data.subtitle,
        start_date: data.start_date,
        end_date: data.end_date,
        duration: data.duration,
        location: data.location,
        status: data.status,
        focus_areas: focusAreas,
        devpost_url: data.devpost_url,
        devpost_register_url: data.devpost_register_url,
        
        // Auto-generated fields
        slug: generateSlug(data.title),
        tagline: `${data.title} - Join us for this amazing event!`,
        description: `${data.title} is an exciting hackathon happening from ${data.start_date} to ${data.end_date}. Duration: ${data.duration}.${data.location ? ` Location: ${data.location}.` : ''} Come build amazing projects!`,
        
        // Default values for required fields
        format: 'Online',
        team_size: '1-4 members',
        judging_type: 'Panel review',
        results_date: data.end_date,
        what_it_is: `${data.title} is a hackathon where developers, designers, and innovators come together to build amazing projects.`,
        the_idea: 'Build innovative solutions, learn new technologies, and network with fellow creators in this exciting competition.',
        who_joins: ['Developers', 'Designers', 'Students', 'Innovators'],
        tech_rules: ['Any technology stack allowed', 'Open source encouraged', 'AI tools permitted'],
        fun_awards: ['Best Overall Project', 'Most Creative', 'Best Technical Implementation'],
        perks: ['Networking opportunities', 'Learning experience', 'Recognition and prizes'],
        judging_description: 'Projects will be evaluated by industry experts based on creativity, technical implementation, and overall impact.',
        judging_criteria: 'Innovation (25%), Technical Excellence (25%), Design & UX (25%), Impact & Feasibility (25%)',
        required_submissions: ['Project demo', 'Source code', 'Project description'],
        theme_color_primary: '#dc2626',
        theme_color_secondary: '#fbbf24',
        theme_color_accent: '#10b981',
        is_active: true,
        sort_order: sortOrder, // Add at the top
      }

      await createHackathon.mutateAsync(formattedData)
      navigate('/hackathons')
    } catch (error) {
      console.error('Error creating hackathon:', error)
    }
  }


  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
            Create Hackathon
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create a new hackathon quickly with essential details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hackathon Details</CardTitle>
          <CardDescription>
            Fill in the essential details for your hackathon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Code Hypothesis Hackathon"
                  {...register('title')}
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle *</Label>
                <Input
                  id="subtitle"
                  placeholder="Test your coding theories"
                  {...register('subtitle')}
                  disabled={isSubmitting}
                />
                {errors.subtitle && (
                  <p className="text-sm text-red-500">{errors.subtitle.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  placeholder="Sep 1, 2025"
                  {...register('start_date')}
                  disabled={isSubmitting}
                />
                {errors.start_date && (
                  <p className="text-sm text-red-500">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  placeholder="Sep 3, 2025"
                  {...register('end_date')}
                  disabled={isSubmitting}
                />
                {errors.end_date && (
                  <p className="text-sm text-red-500">{errors.end_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  placeholder="48 hours"
                  {...register('duration')}
                  disabled={isSubmitting}
                />
                {errors.duration && (
                  <p className="text-sm text-red-500">{errors.duration.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="Online / City, Country"
                  {...register('location')}
                  disabled={isSubmitting}
                />
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select onValueChange={(value) => setValue('status', value)} defaultValue="upcoming">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-500">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus_areas_text">Focus Areas *</Label>
              <Input
                id="focus_areas_text"
                placeholder="AI/ML, Web Development, Mobile Apps, Blockchain"
                {...register('focus_areas_text')}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter comma-separated focus areas
              </p>
              {errors.focus_areas_text && (
                <p className="text-sm text-red-500">{errors.focus_areas_text.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="devpost_url">Devpost URL *</Label>
                <Input
                  id="devpost_url"
                  type="url"
                  placeholder="https://hackathon-name.devpost.com"
                  {...register('devpost_url')}
                  disabled={isSubmitting}
                />
                {errors.devpost_url && (
                  <p className="text-sm text-red-500">{errors.devpost_url.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="devpost_register_url">Devpost Register URL *</Label>
                <Input
                  id="devpost_register_url"
                  type="url"
                  placeholder="https://hackathon-name.devpost.com/register"
                  {...register('devpost_register_url')}
                  disabled={isSubmitting}
                />
                {errors.devpost_register_url && (
                  <p className="text-sm text-red-500">{errors.devpost_register_url.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Display Order (Optional)</Label>
              <Input
                id="sort_order"
                type="number"
                placeholder="0 (lower numbers appear first)"
                {...register('sort_order', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to add at the top. Lower numbers appear first in the events page.
              </p>
              {errors.sort_order && (
                <p className="text-sm text-red-500">{errors.sort_order.message}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 text-sm sm:text-base"
              >
                {isSubmitting ? 'Creating...' : 'Create Hackathon'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
                className="sm:w-auto text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
