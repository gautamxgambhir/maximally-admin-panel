import { supabase } from './supabase'
import { Blog, CreateBlogData, UpdateBlogData } from '@/types/blog'

export async function getBlogs(): Promise<Blog[]> {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  const rows = data || []
  // normalize backend column `author` to `author_name` expected by the UI
  return rows.map((r: any) => ({
    ...r,
    author_name: r.author ?? r.author_name ?? '',
  }))
}

export async function getBlogById(id: string): Promise<Blog> {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  
  if (error) throw error
  const row: any = data
  if (!row) throw new Error('Blog not found')
  row.author_name = row.author ?? row.author_name ?? ''
  return row as Blog
}

export async function createBlog(blogData: CreateBlogData): Promise<Blog> {
  // The DB column is `author` (not `author_name`). Map the payload accordingly
  const payload: any = {
    title: blogData.title,
    slug: blogData.slug,
    content: blogData.content ?? null,
    cover_image: blogData.cover_image ?? null,
    author: (blogData as any).author_name ?? (blogData as any).author,
    status: blogData.status,
    tags: blogData.tags ?? null,
    reading_time_minutes: blogData.reading_time_minutes ?? null,
  }

  const { data, error } = await supabase
    .from('blogs')
    .insert(payload)
    .select()

  if (error) throw error
  // supabase returns an array for insert; return the first row
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('No row returned from insert')
  return row as Blog
}

export async function updateBlog(blogData: UpdateBlogData): Promise<Blog> {
  const { id, ...updateData } = blogData
  // map author_name -> author for updates as well
  const payload: any = {}
  if ((updateData as any).title !== undefined) payload.title = (updateData as any).title
  if ((updateData as any).slug !== undefined) payload.slug = (updateData as any).slug
  if ((updateData as any).content !== undefined) payload.content = (updateData as any).content
  if ((updateData as any).cover_image !== undefined) payload.cover_image = (updateData as any).cover_image
  if ((updateData as any).author_name !== undefined) payload.author = (updateData as any).author_name
  else if ((updateData as any).author !== undefined) payload.author = (updateData as any).author
  if ((updateData as any).status !== undefined) payload.status = (updateData as any).status
  if ((updateData as any).tags !== undefined) payload.tags = (updateData as any).tags
  // Include reading_time_minutes if provided
  if ((updateData as any).reading_time_minutes !== undefined) payload.reading_time_minutes = (updateData as any).reading_time_minutes

  const { data, error } = await supabase
    .from('blogs')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('No row returned from update')
  return row as Blog
}

export async function deleteBlog(id: string): Promise<void> {
  const { error } = await supabase
    .from('blogs')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export async function uploadCoverImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `blog-covers/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('blog-images')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('blog-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}
