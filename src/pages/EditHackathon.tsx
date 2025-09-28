import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useHackathonV2, useUpdateHackathonV2, useUploadHackathonImage } from '@/hooks/useHackathons'
import { generateSlug } from '@/lib/hackathonApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload } from 'lucide-react'
import { toast } from 'sonner'

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
  cover_image: z.string().optional(),
})

type EditHackathonForm = z.infer<typeof simpleHackathonSchema>

export function EditHackathon() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: hackathon, isLoading, error } = useHackathonV2(id!)
  const updateHackathon = useUpdateHackathonV2()
  const uploadImage = useUploadHackathonImage()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditHackathonForm>({
    resolver: zodResolver(simpleHackathonSchema),
  })

  useEffect(() => {
    if (hackathon) {
      setValue('title', hackathon.title)
      setValue('subtitle', hackathon.subtitle || '')
      setValue('start_date', hackathon.start_date)
      setValue('end_date', hackathon.end_date)
      setValue('duration', hackathon.duration)
      setValue('location', (hackathon as any).location || '')
      setValue('status', (hackathon as any).status || 'upcoming')
      setValue('focus_areas_text', Array.isArray((hackathon as any).focus_areas) ? (hackathon as any).focus_areas.join(', ') : '')
      setValue('devpost_url', (hackathon as any).devpost_url || '')
      setValue('devpost_register_url', (hackathon as any).devpost_register_url || '')
      setValue('cover_image', hackathon.cover_image || '')
    }
  }, [hackathon, setValue])

  const handleImageUpload = async (file: File) => {
    try {
      const url = await uploadImage.mutateAsync(file)
      setValue('cover_image', url)
    } catch {
      // Error is handled by the hook
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        handleImageUpload(file)
      } else {
        alert('Please select an image file')
      }
    }
  }

  const onSubmit = async (data: EditHackathonForm) => {
    try {
      const focusAreas = data.focus_areas_text.split(',').map(s => s.trim()).filter(Boolean)

      const updatePayload = {
        id: Number(id!),
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
        cover_image: data.cover_image,
        // Regenerate some derived fields
        slug: generateSlug(data.title),
        tagline: `${data.title} - Join us for this amazing event!`,
        description: `${data.title} is an exciting hackathon happening from ${data.start_date} to ${data.end_date}. Duration: ${data.duration}.${data.location ? ` Location: ${data.location}.` : ''} Come build amazing projects!`,
      }

      await updateHackathon.mutateAsync(updatePayload)
      navigate('/hackathons')
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update hackathon')
    }
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
        <p className="text-red-500">Error loading hackathon: {error.message}</p>
      </div>
    )
  }

  if (!hackathon) return null

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
            Edit Hackathon
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update the essential details of your hackathon
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hackathon Details</CardTitle>
          <CardDescription>
            Modify the fields below and save your changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register('title')} disabled={isSubmitting} />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle *</Label>
                <Input id="subtitle" {...register('subtitle')} disabled={isSubmitting} />
                {errors.subtitle && <p className="text-sm text-red-500">{errors.subtitle.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input id="start_date" {...register('start_date')} disabled={isSubmitting} />
                {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input id="end_date" {...register('end_date')} disabled={isSubmitting} />
                {errors.end_date && <p className="text-sm text-red-500">{errors.end_date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Input id="duration" {...register('duration')} disabled={isSubmitting} />
                {errors.duration && <p className="text-sm text-red-500">{errors.duration.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" {...register('location')} disabled={isSubmitting} />
                {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select onValueChange={(v) => setValue('status', v)} defaultValue={(hackathon as any)?.status || 'upcoming'}>
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
                {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus_areas_text">Focus Areas *</Label>
              <Input id="focus_areas_text" {...register('focus_areas_text')} disabled={isSubmitting} />
              {errors.focus_areas_text && <p className="text-sm text-red-500">{errors.focus_areas_text.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="devpost_url">Devpost URL *</Label>
                <Input id="devpost_url" type="url" {...register('devpost_url')} disabled={isSubmitting} />
                {errors.devpost_url && <p className="text-sm text-red-500">{errors.devpost_url.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="devpost_register_url">Devpost Register URL *</Label>
                <Input id="devpost_register_url" type="url" {...register('devpost_register_url')} disabled={isSubmitting} />
                {errors.devpost_register_url && <p className="text-sm text-red-500">{errors.devpost_register_url.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('cover-image-upload')?.click()}
                  disabled={isSubmitting || uploadImage.isPending}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadImage.isPending ? 'Uploading...' : 'Upload Image'}
                </Button>
                {watch('cover_image') && (
                  <div className="text-sm text-muted-foreground truncate max-w-xs">
                    Image uploaded
                  </div>
                )}
              </div>
              <input
                id="cover-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1 text-sm sm:text-base">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting} className="sm:w-auto text-sm sm:text-base">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
