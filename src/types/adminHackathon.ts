/**
 * Admin Hackathon Types for Admin Moderation System
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
 */

/**
 * Valid hackathon statuses for organizer hackathons
 */
export type OrganizerHackathonStatus = 
  | 'draft' 
  | 'pending_review' 
  | 'published' 
  | 'rejected' 
  | 'ended'
  | 'unpublished';

/**
 * Valid hackathon formats
 */
export type HackathonFormat = 'online' | 'offline' | 'hybrid';

/**
 * Organizer hackathon as stored in the database
 */
export interface OrganizerHackathon {
  id: number;
  organizer_id: string;
  organizer_email: string;
  hackathon_name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  format: HackathonFormat;
  venue: string | null;
  registration_deadline: string | null;
  duration: string | null;
  eligibility: string[];
  team_size_min: number;
  team_size_max: number;
  registration_fee: number;
  max_participants: number | null;
  expected_participants: number | null;
  communication_channel: string | null;
  communication_link: string | null;
  tracks: string;
  open_innovation: boolean;
  total_prize_pool: string | null;
  prize_breakdown: string;
  perks: string[];
  judging_criteria: string;
  judges_mentors: string;
  discord_link: string | null;
  whatsapp_link: string | null;
  website_url: string | null;
  submission_platform: string;
  submission_platform_link: string | null;
  contact_email: string | null;
  key_rules: string | null;
  code_of_conduct: string | null;
  promo_video_link: string | null;
  gallery_images: string[];
  cover_image: string | null;
  featured_badge: boolean;
  verification_docs: string[];
  status: OrganizerHackathonStatus;
  publish_requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  views_count: number;
  registrations_count: number;
  created_at: string;
  updated_at: string;
  rules_content: string | null;
  eligibility_criteria: string | null;
  submission_guidelines: string | null;
  judging_process: string | null;
  themes: string[];
  sponsors: string[];
  partners: string[];
  faqs: string;
  require_approval: boolean;
  allow_team_changes: boolean;
  show_participant_count: boolean;
  submission_opens_at: string | null;
  submission_closes_at: string | null;
  results_announced_at: string | null;
  hackathon_status: string;
  hackathon_logo: string | null;
  winners_announced: boolean;
  winners_announced_at: string | null;
  banner_image: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_style: string | null;
  domains: string[];
  gallery_published_at: string | null;
  // Admin-specific fields
  is_featured?: boolean;
  internal_notes?: string | null;
}

/**
 * Filters for querying admin hackathons
 * Requirement 1.1: Filter by status, organizer, date range, format, registration count
 */
export interface AdminHackathonFilters {
  status?: OrganizerHackathonStatus | OrganizerHackathonStatus[];
  organizer_id?: string;
  organizer_email?: string;
  date_from?: string;
  date_to?: string;
  format?: HackathonFormat | HackathonFormat[];
  min_registrations?: number;
  max_registrations?: number;
  is_featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Response for paginated admin hackathon queries
 */
export interface AdminHackathonListResponse {
  hackathons: OrganizerHackathon[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Organizer profile information
 */
export interface OrganizerProfile {
  organizer_id: string;
  organizer_email: string;
  total_hackathons: number;
  published_hackathons: number;
  rejected_hackathons: number;
  total_participants: number;
  trust_score?: number;
  is_flagged?: boolean;
  flag_reason?: string | null;
}

/**
 * Detailed hackathon response with related data
 * Requirement 1.4: Include registrations, submissions, teams, judges, organizer history, timeline
 */
export interface AdminHackathonDetailResponse {
  hackathon: OrganizerHackathon;
  registrations_count: number;
  submissions_count: number;
  teams_count: number;
  judges_count: number;
  organizer: OrganizerProfile;
  timeline: import('./audit').AuditLogEntry[];
}

/**
 * Request for unpublishing a hackathon
 * Requirement 1.3: Update status, create audit log, send notification email
 */
export interface UnpublishHackathonRequest {
  reason: string;
  notify_organizer?: boolean;
  notify_participants?: boolean;
}

/**
 * Request for featuring/unfeaturing a hackathon
 * Requirement 1.2: Toggle featured status with audit logging
 */
export interface FeatureHackathonRequest {
  reason: string;
}

/**
 * Request for directly editing a hackathon
 * Requirement 1.6: Allow admins to edit any field with audit logging
 */
export interface EditHackathonRequest {
  updates: Partial<OrganizerHackathon>;
  reason: string;
}

/**
 * Response for hackathon admin actions
 */
export interface AdminHackathonActionResponse {
  success: boolean;
  hackathon: OrganizerHackathon;
  message: string;
}
