import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useBlog, useUpdateBlog, useUploadImage } from '@/hooks/useBlogs'
import { generateSlug } from '@/lib/blogApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload } from 'lucide-react'
import { BlogStatus } from '@/types/blog'
import { toast } from 'sonner'

const editBlogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().optional(),
  author_name: z.string().min(1, 'Author name is required'),
  status: z.enum(['draft', 'published'] as const),
  cover_image: z.string().optional(),
  tags: z.string().optional(),
})

type EditBlogForm = z.infer<typeof editBlogSchema>

export function EditBlog() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: blog, isLoading, error } = useBlog(id!)
  const updateBlog = useUpdateBlog()
  const uploadImage = useUploadImage()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditBlogForm>({
    resolver: zodResolver(editBlogSchema),
  })

  const title = watch('title')

  useEffect(() => {
    if (blog) {
      setValue('title', blog.title)
      setValue('slug', blog.slug)
      setValue('content', blog.content || '')
      setValue('author_name', blog.author_name)
      setValue('status', blog.status as BlogStatus)
      setValue('cover_image', blog.cover_image || '')
      setValue('tags', blog.tags || '')
    }
  }, [blog, setValue])

  useEffect(() => {
    if (title) {
      const slug = generateSlug(title)
      setValue('slug', slug)
    }
  }, [title, setValue])

  const handleImageUpload = async (file: File) => {
    try {
      const url = await uploadImage.mutateAsync(file)
      setValue('cover_image', url)
    } catch {
      // handled by hook
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

  const onSubmit = async (data: EditBlogForm) => {
    try {
      await updateBlog.mutateAsync({ id: id!, ...data })
      navigate('/blogs')
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update blog')
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
        <p className="text-red-500">Error loading blog: {error.message}</p>
      </div>
    )
  }

  if (!blog) return null

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
            Edit Blog Post
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update the details of your blog post
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blog Details</CardTitle>
          <CardDescription>
            Modify the fields below and save your changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags (e.g. AI Hackathons)"
                  {...register('tags')}
                  disabled={isSubmitting}
                  className="text-sm sm:text-base"
                />
                {errors.tags && (
                  <p className="text-sm text-red-500">{errors.tags.message}</p>
                )}
              </div>
            </div>

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
                />
                {errors.author_name && (
                  <p className="text-sm text-red-500">{errors.author_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  onValueChange={(value: BlogStatus) => setValue('status', value)}
                  defaultValue={blog.status}
                >
                  <SelectTrigger>
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
                {blog.cover_image ? (
                  <div className="relative">
                    <img
                      src={watch('cover_image') || blog.cover_image}
                      alt="Cover"
                      className="max-w-full h-48 object-cover rounded-lg"
                    />
                    <div className="mt-4">
                      <label htmlFor="cover-image" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload a new cover image
                        </span>
                      </label>
                      <input
                        id="cover-image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="cover-image" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload a cover image
                        </span>
                      </label>
                      <input
                        id="cover-image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
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
