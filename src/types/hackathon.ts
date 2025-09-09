export type HackathonStatus = 'draft' | 'upcoming' | 'live' | 'past'

export interface Hackathon {
  id: string
  name: string
  slug: string
  tagline: string | null
  description: string | null
  cover_image: string | null
  status: HackathonStatus
  start_date: string
  end_date: string
  location: string | null
  prize_pool: string | null
  max_team_size: number | null
  registration_link: string | null
  created_at: string
  updated_at: string
}

export interface CreateHackathonData {
  name: string
  slug: string
  tagline?: string
  description?: string
  cover_image?: string
  status: HackathonStatus
  start_date: string
  end_date: string
  location?: string
  prize_pool?: string
  max_team_size?: number
  registration_link?: string
}

export interface UpdateHackathonData extends Partial<CreateHackathonData> {
  id: string
}

export interface Judge {
  id: string
  hackathon_id: string
  name: string
  role: string
  profile_image: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface CreateJudgeData {
  hackathon_id: string
  name: string
  role: string
  profile_image?: string
  bio?: string
}

export interface UpdateJudgeData extends Partial<CreateJudgeData> {
  id: string
}
