/**
 * Core User Management Functions (Pure, Testable)
 * 
 * Requirements: 3.1, 3.3, 3.4
 */

import type {
  UserSearchFilters,
  UserWithDetails,
  UserModerationStatus,
  UserRole,
} from '@/types/userManagement';

/**
 * Valid user roles
 */
export const VALID_USER_ROLES: readonly UserRole[] = [
  'user',
  'organizer',
  'admin',
  'super_admin',
] as const;

/**
 * Valid moderation statuses
 */
export const VALID_MODERATION_STATUSES: readonly UserModerationStatus[] = [
  'active',
  'warned',
  'muted',
  'suspended',
  'banned',
] as const;

/**
 * Check if search query matches user
 * 
 * Requirement 3.4: Search by email, username, name, phone
 * 
 * Property 13: Search Result Relevance - For any user search query,
 * all returned results SHALL match at least one of the search criteria.
 */
export function userMatchesSearch(
  user: UserWithDetails,
  query: string
): boolean {
  if (!query || query.trim() === '') {
    return true;
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Check email
  if (user.email?.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  // Check username
  if (user.username?.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  // Check full name
  if (user.full_name?.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  // Check phone
  if (user.phone?.includes(normalizedQuery)) {
    return true;
  }

  return false;
}

/**
 * Filter users by criteria
 * 
 * Requirement 3.4: Support search by email, username, full name, phone,
 * registration date range, role, and moderation status.
 */
export function filterUsers(
  users: UserWithDetails[],
  filters: UserSearchFilters
): UserWithDetails[] {
  return users.filter((user) => {
    // Filter by email
    if (filters.email && !user.email?.toLowerCase().includes(filters.email.toLowerCase())) {
      return false;
    }

    // Filter by username
    if (filters.username && !user.username?.toLowerCase().includes(filters.username.toLowerCase())) {
      return false;
    }

    // Filter by full name
    if (filters.full_name && !user.full_name?.toLowerCase().includes(filters.full_name.toLowerCase())) {
      return false;
    }

    // Filter by phone
    if (filters.phone && !user.phone?.includes(filters.phone)) {
      return false;
    }

    // Filter by date range
    if (filters.date_from) {
      const userDate = new Date(user.created_at);
      const fromDate = new Date(filters.date_from);
      if (userDate < fromDate) {
        return false;
      }
    }

    if (filters.date_to) {
      const userDate = new Date(user.created_at);
      const toDate = new Date(filters.date_to);
      if (userDate > toDate) {
        return false;
      }
    }

    // Filter by role
    if (filters.role) {
      const roles = Array.isArray(filters.role) ? filters.role : [filters.role];
      if (!roles.includes(user.role)) {
        return false;
      }
    }

    // Filter by moderation status
    if (filters.moderation_status) {
      const statuses = Array.isArray(filters.moderation_status) 
        ? filters.moderation_status 
        : [filters.moderation_status];
      if (!statuses.includes(user.moderation_status)) {
        return false;
      }
    }

    // General search
    if (filters.search && !userMatchesSearch(user, filters.search)) {
      return false;
    }

    return true;
  });
}

/**
 * Check if all filtered users match search criteria
 * 
 * Property 13: Search Result Relevance validation
 */
export function allUsersMatchSearch(
  users: UserWithDetails[],
  query: string
): boolean {
  if (!query || query.trim() === '') {
    return true;
  }

  return users.every(user => userMatchesSearch(user, query));
}

/**
 * Determine cascade effects for user ban
 * 
 * Requirement 3.3: Handle active content when user is banned.
 * 
 * Property 10: Cascade Effect on Ban - For any user that is banned,
 * all their active hackathons SHALL be unpublished and logged.
 */
export interface CascadeEffectInput {
  userId: string;
  isOrganizer: boolean;
  activeHackathonIds: string[];
  teamIds: string[];
  affectedUserIds: string[];
}

export interface CascadeEffectResult {
  shouldUnpublishHackathons: boolean;
  hackathonsToUnpublish: string[];
  shouldRemoveFromTeams: boolean;
  teamsToRemoveFrom: string[];
  shouldNotifyUsers: boolean;
  usersToNotify: string[];
}

export function determineCascadeEffects(input: CascadeEffectInput): CascadeEffectResult {
  return {
    shouldUnpublishHackathons: input.isOrganizer && input.activeHackathonIds.length > 0,
    hackathonsToUnpublish: input.isOrganizer ? input.activeHackathonIds : [],
    shouldRemoveFromTeams: input.teamIds.length > 0,
    teamsToRemoveFrom: input.teamIds,
    shouldNotifyUsers: input.affectedUserIds.length > 0,
    usersToNotify: input.affectedUserIds,
  };
}

/**
 * Validate cascade effect result
 * 
 * Property 10: Validation helper
 */
export function isValidCascadeEffect(
  input: CascadeEffectInput,
  result: CascadeEffectResult
): boolean {
  // If organizer with active hackathons, they must be unpublished
  if (input.isOrganizer && input.activeHackathonIds.length > 0) {
    if (!result.shouldUnpublishHackathons) {
      return false;
    }
    // All active hackathons must be in the unpublish list
    for (const hackathonId of input.activeHackathonIds) {
      if (!result.hackathonsToUnpublish.includes(hackathonId)) {
        return false;
      }
    }
  }

  // If in teams, must be removed
  if (input.teamIds.length > 0) {
    if (!result.shouldRemoveFromTeams) {
      return false;
    }
    for (const teamId of input.teamIds) {
      if (!result.teamsToRemoveFrom.includes(teamId)) {
        return false;
      }
    }
  }

  // If affected users, they must be notified
  if (input.affectedUserIds.length > 0) {
    if (!result.shouldNotifyUsers) {
      return false;
    }
  }

  return true;
}

/**
 * Check if flagged organizer requires review
 * 
 * Requirement 7.4: Require manual review for flagged organizer submissions.
 * 
 * Property 18: Flagged Organizer Review Requirement
 */
export function requiresManualReview(
  isFlagged: boolean,
  autoApprovalEnabled: boolean
): boolean {
  // Flagged organizers always require manual review
  if (isFlagged) {
    return true;
  }
  
  // Non-flagged organizers follow auto-approval setting
  return !autoApprovalEnabled;
}

/**
 * Validate flagged organizer review requirement
 * 
 * Property 18: Validation helper
 */
export function isValidReviewRequirement(
  isFlagged: boolean,
  requiresReview: boolean
): boolean {
  // If flagged, must require review
  if (isFlagged && !requiresReview) {
    return false;
  }
  return true;
}
