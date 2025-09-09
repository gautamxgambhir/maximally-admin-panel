import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateBlog, useUploadImage } from '@/hooks/useBlogs'
import { generateSlug } from '@/lib/blogApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { BlogTemplates } from '@/components/BlogTemplates'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload, X, FileText } from 'lucide-react'
import { BlogStatus } from '@/types/blog'

const createBlogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().optional(),
  author_name: z.string().min(1, 'Author name is required'),
  status: z.enum(['draft', 'published'] as const),
})

type CreateBlogForm = z.infer<typeof createBlogSchema>

export function CreateBlog() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createBlog = useCreateBlog()
  const uploadImage = useUploadImage()
  const [coverImageUrl, setCoverImageUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateBlogForm>({
    resolver: zodResolver(createBlogSchema),
    defaultValues: {
      author_name: user?.email?.split('@')[0] || '',
      status: 'draft',
    },
  })

  const title = watch('title')

  useEffect(() => {
    if (title) {
      const slug = generateSlug(title)
      setValue('slug', slug)
    }
  }, [title, setValue])

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

  const onSubmit = async (data: CreateBlogForm) => {
    try {
      await createBlog.mutateAsync({
        ...data,
        cover_image: coverImageUrl || undefined,
      })
      navigate('/blogs')
    } catch (error) {
      console.error('Error creating blog:', error)
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

  const handleSelectTemplate = (content: string, title: string) => {
    setValue('content', content)
    if (!watch('title')) {
      setValue('title', title)
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
            Create Blog Post
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create a new blog post for your website
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blog Details</CardTitle>
          <CardDescription>
            Fill in the details for your new blog post
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter blog title"
                  {...register('title')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="blog-url-slug"
                  {...register('slug')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(true)}
                className="text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline ml-1">Use Template</span>
              </Button>
            </div>

            {showTemplates && (
              <BlogTemplates
                onSelectTemplate={handleSelectTemplate}
                onClose={() => setShowTemplates(false)}
              />
            )}

            <MarkdownEditor
              value={watch('content') || ''}
              onChange={(value) => setValue('content', value)}
              placeholder="Write your blog post content in Markdown..."
              disabled={isSubmitting}
              error={errors.content?.message}
              height="600px"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="author_name">Author Name</Label>
                <Input
                  id="author_name"
                  placeholder="Author name"
                  {...register('author_name')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.author_name && (
                  <p className="text-sm text-red-500">{errors.author_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  onValueChange={(value: BlogStatus) => setValue('status', value)}
                  defaultValue="draft"
                >
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {isSubmitting ? 'Creating...' : 'Create Blog Post'}
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
