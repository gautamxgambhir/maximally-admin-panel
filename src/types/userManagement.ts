/**
 * User Management Types for Admin Moderation System
 * Requirements: 3.1, 3.3, 3.4, 3.6
 */

/**
 * User moderation status
 */
export type UserModerationStatus = 
  | 'active'
  | 'warned'
  | 'muted'
  | 'suspended'
  | 'banned';

/**
 * User role
 */
export type UserRole = 'user' | 'organizer' | 'admin' | 'super_admin';

/**
 * User search filters
 */
export interface UserSearchFilters {
  email?: string;
  username?: string;
  full_name?: string;
  phone?: string;
  date_from?: string;
  date_to?: string;
  role?: UserRole | UserRole[];
  moderation_status?: UserModerationStatus | UserModerationStatus[];
  search?: string; // General search across multiple fields
  page?: number;
  limit?: number;
}

/**
 * User with full details
 */
export interface UserWithDetails {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  moderation_status: UserModerationStatus;
  created_at: string;
  updated_at: string;
  // Extended details
  hackathons_participated: number;
  teams_joined: number;
  submissions_made: number;
  certificates_earned: number;
  trust_score: number | null;
  moderation_history: ModerationHistoryEntry[];
}

/**
 * Moderation history entry
 */
export interface ModerationHistoryEntry {
  id: string;
  action_type: string;
  reason: string;
  admin_id: string;
  admin_email: string;
  created_at: string;
  reversed_at?: string;
  reversed_by?: string;
}

/**
 * User list response
 */
export interface UserListResponse {
  users: UserWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Ban cascade result
 */
export interface BanCascadeResult {
  userId: string;
  hackathonsUnpublished: number;
  teamsRemoved: number;
  notificationsSent: number;
  affectedUsers: string[];
}

/**
 * Organizer with details
 */
export interface OrganizerWithDetails {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  created_at: string;
  // Organizer-specific
  total_hackathons: number;
  active_hackathons: number;
  total_participants: number;
  approval_rate: number;
  trust_score: number;
  is_flagged: boolean;
  flag_reason: string | null;
}

/**
 * Organizer list response
 */
export interface OrganizerListResponse {
  organizers: OrganizerWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Cascade effect input for user ban
 * Requirement 3.3: Handle active content when user is banned
 */
export interface CascadeEffectInput {
  userId: string;
  isOrganizer: boolean;
  activeHackathonIds: string[];
  teamIds: string[];
  affectedUserIds: string[];
}

/**
 * Cascade effect result
 */
export interface CascadeEffectResult {
  shouldUnpublishHackathons: boolean;
  hackathonsToUnpublish: string[];
  shouldRemoveFromTeams: boolean;
  teamsToRemoveFrom: string[];
  shouldNotifyUsers: boolean;
  usersToNotify: string[];
}
