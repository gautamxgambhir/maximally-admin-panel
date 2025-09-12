export type BlogStatus = 'draft' | 'published'

export interface Blog {
  id: string
  title: string
  slug: string
  content: string | null
  cover_image: string | null
  author_name: string
  status: BlogStatus
  created_at: string
  updated_at: string
  tag?: string | null
  tags?: string | null
  reading_time_minutes?: number | null
}

export interface CreateBlogData {
  title: string
  slug: string
  content?: string
  cover_image?: string
  author_name: string
  status: BlogStatus
  tag?: string
  tags?: string
  reading_time_minutes?: number
}

export interface UpdateBlogData extends Partial<CreateBlogData> {
  id: string
}
