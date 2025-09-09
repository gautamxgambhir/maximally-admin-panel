import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useHackathon, useUpdateHackathon, useUploadHackathonImage } from '@/hooks/useHackathons'
import { generateSlug } from '@/lib/hackathonApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload, X, Users } from 'lucide-react'
import { HackathonStatus } from '@/types/hackathon'
import { toast } from 'sonner'
import { JudgeManager } from '@/components/JudgeManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const editHackathonSchema = z.object({
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
  cover_image: z.string().optional(),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date",
  path: ["end_date"],
})

type EditHackathonForm = z.infer<typeof editHackathonSchema>

export function EditHackathon() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: hackathon, isLoading, error } = useHackathon(id!)
  const updateHackathon = useUpdateHackathon()
  const uploadImage = useUploadHackathonImage()
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditHackathonForm>({
    resolver: zodResolver(editHackathonSchema),
  })

  const name = watch('name')

  useEffect(() => {
    if (hackathon) {
      setValue('name', hackathon.name)
      setValue('slug', hackathon.slug)
      setValue('tagline', hackathon.tagline || '')
      setValue('description', hackathon.description || '')
      setValue('status', hackathon.status as HackathonStatus)
      setValue('start_date', hackathon.start_date?.slice(0, 16) || '') // Format for datetime-local
      setValue('end_date', hackathon.end_date?.slice(0, 16) || '')
      setValue('location', hackathon.location || '')
      setValue('prize_pool', hackathon.prize_pool || '')
      setValue('max_team_size', hackathon.max_team_size || 0)
      setValue('registration_link', hackathon.registration_link || '')
      setValue('cover_image', hackathon.cover_image || '')
    }
  }, [hackathon, setValue])

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
      setValue('cover_image', url)
    } catch {
      // Error handled by hook
    } finally {
      setIsUploading(false)
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
      const formattedData = {
        id: id!,
        ...data,
        max_team_size: data.max_team_size || undefined,
        registration_link: data.registration_link || undefined,
        tagline: data.tagline || undefined,
        description: data.description || undefined,
        location: data.location || undefined,
        prize_pool: data.prize_pool || undefined,
        cover_image: data.cover_image || undefined,
      }
      await updateHackathon.mutateAsync(formattedData)
      navigate('/hackathons')
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update hackathon')
    }
  }

  const removeCoverImage = () => {
    setValue('cover_image', '')
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
            Update the details of your hackathon
          </p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Hackathon Details</TabsTrigger>
          <TabsTrigger value="judges">
            <Users className="h-4 w-4 mr-2" />
            Judges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hackathon Details</CardTitle>
              <CardDescription>
                Modify the fields below and save your changes
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
                      defaultValue={hackathon.status}
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
                    {watch('cover_image') ? (
                      <div className="relative">
                        <img
                          src={watch('cover_image')}
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
                        <div className="mt-4">
                          <label htmlFor="cover-image" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              {isUploading ? 'Uploading...' : 'Upload a new cover image'}
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
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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
        </TabsContent>

        <TabsContent value="judges" className="space-y-6">
          <JudgeManager hackathonId={hackathon.id} hackathonName={hackathon.name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
