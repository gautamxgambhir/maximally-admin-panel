export type HackathonStatus = 'draft' | 'upcoming' | 'ongoing' | 'past'

// Legacy interface for backward compatibility
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

// Legacy create interface
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

// New interface matching SQL schema
export interface HackathonV2 {
  id: number
  slug: string
  title: string
  subtitle?: string
  tagline: string
  badge_text?: string
  description: string
  registration_url?: string
  cover_image?: string
  start_date: string
  end_date: string
  duration: string
  format: string
  team_size: string
  judging_type: string
  results_date: string
  what_it_is: string
  the_idea: string
  who_joins: string[]
  tech_rules: string[]
  fun_awards: string[]
  perks: string[]
  cash_pool?: string
  prize_pool?: any // JSONB
  judging_description: string
  judging_criteria: string
  required_submissions: string[]
  optional_submissions?: string[]
  announcements?: string
  event_highlights?: string
  sponsor_message?: string
  faq_content?: string
  timeline_details?: string
  special_instructions?: string
  theme_config?: any // JSONB
  theme_color_primary: string
  theme_color_secondary: string
  theme_color_accent: string
  // New fields for simplified form
  location?: string
  status?: string
  focus_areas?: string[]
  devpost_url?: string
  devpost_register_url?: string
  is_active: boolean
  sort_order: number // New field for custom sorting
  created_at: string
  updated_at: string
}

export interface CreateHackathonV2Data {
  slug: string
  title: string
  subtitle?: string
  tagline: string
  badge_text?: string
  description: string
  registration_url?: string
  cover_image?: string
  start_date: string
  end_date: string
  duration: string
  format: string
  team_size: string
  judging_type: string
  results_date: string
  what_it_is: string
  the_idea: string
  who_joins: string[]
  tech_rules: string[]
  fun_awards: string[]
  perks: string[]
  cash_pool?: string
  prize_pool?: any // JSONB
  judging_description: string
  judging_criteria: string
  required_submissions: string[]
  optional_submissions?: string[]
  announcements?: string
  event_highlights?: string
  sponsor_message?: string
  faq_content?: string
  timeline_details?: string
  special_instructions?: string
  theme_config?: any // JSONB
  theme_color_primary: string
  theme_color_secondary: string
  theme_color_accent: string
  // New fields for simplified form
  location?: string
  status?: string
  focus_areas?: string[]
  devpost_url?: string
  devpost_register_url?: string
  is_active?: boolean
  sort_order?: number // New field for custom sorting
}

export interface UpdateHackathonV2Data extends Partial<CreateHackathonV2Data> {
  id: number
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
