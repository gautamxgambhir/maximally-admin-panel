export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string | null
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  skills: string[] | null
  github_username: string | null
  linkedin_username: string | null
  twitter_username: string | null
  website_url: string | null
  role: UserRole
  is_verified: boolean
  preferences: any
  created_at: string
  updated_at: string
}

export interface ProfileWithUser extends Profile {
  user: {
    id: string
    email: string
  }
}