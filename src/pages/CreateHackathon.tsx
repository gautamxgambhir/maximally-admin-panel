import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateHackathon, useUploadHackathonImage } from '@/hooks/useHackathons'
import { generateSlug } from '@/lib/hackathonApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { HackathonStatus } from '@/types/hackathon'

const createHackathonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  tagline: z.string().max(150, 'Tagline must be 150 characters or less').optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'upcoming', 'live', 'past'] as const),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  location: z.string().optional(),
  prize_pool: z.string().optional(),
  max_team_size: z.number().min(1).optional().or(z.literal(0)),
  registration_link: z.string().url().optional().or(z.literal('')),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date",
  path: ["end_date"],
})

type CreateHackathonForm = z.infer<typeof createHackathonSchema>

export function CreateHackathon() {
  const navigate = useNavigate()
  const createHackathon = useCreateHackathon()
  const uploadImage = useUploadHackathonImage()
  const [coverImageUrl, setCoverImageUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateHackathonForm>({
    resolver: zodResolver(createHackathonSchema),
    defaultValues: {
      status: 'draft',
    },
  })

  const name = watch('name')

  useEffect(() => {
    if (name) {
      const slug = generateSlug(name)
      setValue('slug', slug)
    }
  }, [name, setValue])

  const handleImageUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const url = await uploadImage.mutateAsync(file)
      setCoverImageUrl(url)
    } catch {
      // Error handled by hook
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (data: CreateHackathonForm) => {
    try {
      const formattedData = {
        ...data,
        cover_image: coverImageUrl || undefined,
        max_team_size: data.max_team_size || undefined,
        registration_link: data.registration_link || undefined,
        tagline: data.tagline || undefined,
        description: data.description || undefined,
        location: data.location || undefined,
        prize_pool: data.prize_pool || undefined,
      }
      await createHackathon.mutateAsync(formattedData)
      navigate('/hackathons')
    } catch (error) {
      console.error('Error creating hackathon:', error)
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

  const removeCoverImage = () => {
    setCoverImageUrl('')
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
            Create a new hackathon or event
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hackathon Details</CardTitle>
          <CardDescription>
            Fill in the details for your new hackathon or event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter hackathon name"
                  {...register('name')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  placeholder="hackathon-url-slug"
                  {...register('slug')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                placeholder="Short tagline for SEO (max 150 characters)"
                {...register('tagline')}
                disabled={isSubmitting}
                maxLength={150}
                className="text-sm sm:text-base"
              />
              {errors.tagline && (
                <p className="text-sm text-red-500">{errors.tagline.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <MarkdownEditor
                value={watch('description') || ''}
                onChange={(value) => setValue('description', value)}
                placeholder="Write your hackathon description in Markdown..."
                disabled={isSubmitting}
                error={errors.description?.message}
                height="400px"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  {...register('start_date')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.start_date && (
                  <p className="text-sm text-red-500">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  {...register('end_date')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.end_date && (
                  <p className="text-sm text-red-500">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Event location"
                  {...register('location')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  onValueChange={(value: HackathonStatus) => setValue('status', value)}
                  defaultValue="draft"
                >
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="prize_pool">Prize Pool</Label>
                <Input
                  id="prize_pool"
                  placeholder="e.g., $10,000 total prizes"
                  {...register('prize_pool')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_team_size">Max Team Size</Label>
                <Input
                  id="max_team_size"
                  type="number"
                  min="1"
                  placeholder="Maximum team size"
                  {...register('max_team_size', { valueAsNumber: true })}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_link">Registration Link</Label>
              <Input
                id="registration_link"
                type="url"
                placeholder="https://example.com/register"
                {...register('registration_link')}
                disabled={isSubmitting}
                className="text-sm sm:text-base"
              />
              {errors.registration_link && (
                <p className="text-sm text-red-500">{errors.registration_link.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {coverImageUrl ? (
                  <div className="relative">
                    <img
                      src={coverImageUrl}
                      alt="Cover"
                      className="max-w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeCoverImage}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="cover-image" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          {isUploading ? 'Uploading...' : 'Upload a cover image'}
                        </span>
                      </label>
                      <input
                        id="cover-image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading || isSubmitting}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
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
