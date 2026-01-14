/**
 * Organizer Management Core Functions
 * 
 * Pure functions for organizer management logic.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type {
  OrganizerWithDetails,
  OrganizerSearchFilters,
} from '@/types/organizerManagement';

/**
 * Calculate approval rate from hackathon counts
 * 
 * @param approved - Number of approved/published hackathons
 * @param total - Total number of hackathons
 * @returns Approval rate as percentage (0-100)
 */
export function calculateApprovalRate(approved: number, total: number): number {
  if (total === 0) return 100; // No hackathons = 100% approval rate (no rejections)
  const rate = (approved / total) * 100;
  return Math.round(rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Filter organizers based on search criteria
 * 
 * Requirement 7.1: View organizer profile with hackathon stats
 * 
 * This is a pure function that filters organizers in memory.
 * Used for testing and client-side filtering.
 * 
 * @param organizers - Array of organizers to filter
 * @param filters - Search filters to apply
 * @returns Filtered array of organizers
 */
export function filterOrganizers(
  organizers: OrganizerWithDetails[],
  filters: OrganizerSearchFilters
): OrganizerWithDetails[] {
  return organizers.filter((organizer) => {
    // Email filter (case-insensitive partial match)
    if (filters.email) {
      const email = organizer.email?.toLowerCase() ?? '';
      if (!email.includes(filters.email.toLowerCase())) {
        return false;
      }
    }

    // Display name filter (case-insensitive partial match)
    if (filters.display_name) {
      const displayName = organizer.display_name?.toLowerCase() ?? '';
      if (!displayName.includes(filters.display_name.toLowerCase())) {
        return false;
      }
    }

    // Organization name filter (case-insensitive partial match)
    if (filters.organization_name) {
      const orgName = organizer.organization_name?.toLowerCase() ?? '';
      if (!orgName.includes(filters.organization_name.toLowerCase())) {
        return false;
      }
    }

    // Flagged filter
    if (filters.is_flagged !== undefined) {
      if (organizer.is_flagged !== filters.is_flagged) {
        return false;
      }
    }

    // Trust score range filters
    if (filters.min_trust_score !== undefined) {
      if (organizer.trust_score < filters.min_trust_score) {
        return false;
      }
    }

    if (filters.max_trust_score !== undefined) {
      if (organizer.trust_score > filters.max_trust_score) {
        return false;
      }
    }

    // Hackathon count range filters
    if (filters.min_hackathons !== undefined) {
      if (organizer.total_hackathons < filters.min_hackathons) {
        return false;
      }
    }

    if (filters.max_hackathons !== undefined) {
      if (organizer.total_hackathons > filters.max_hackathons) {
        return false;
      }
    }

    // Tier filter
    if (filters.tier) {
      const tiers = Array.isArray(filters.tier) ? filters.tier : [filters.tier];
      if (!tiers.includes(organizer.tier)) {
        return false;
      }
    }

    // General search (searches across multiple fields)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableFields = [
        organizer.email,
        organizer.display_name,
        organizer.organization_name,
        organizer.bio,
        organizer.location,
      ];
      
      const matchesSearch = searchableFields.some((field) => 
        field?.toLowerCase().includes(searchLower)
      );
      
      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if an organizer requires manual review for hackathon submissions
 * 
 * Requirement 7.4: Require manual review for flagged organizer submissions
 * 
 * Property 18: Flagged Organizer Review Requirement
 * For any hackathon submission from a flagged organizer, the submission
 * SHALL require manual review regardless of auto-approval settings.
 * 
 * @param isFlagged - Whether the organizer is flagged
 * @returns Whether manual review is required
 */
export function requiresManualReview(isFlagged: boolean): boolean {
  return isFlagged;
}

/**
 * Determine if a hackathon submission should be auto-approved
 * 
 * Requirement 7.4: Flagged organizers require manual review
 * 
 * @param organizerIsFlagged - Whether the organizer is flagged
 * @param hackathonAutoApproveEnabled - Whether auto-approve is enabled for the hackathon type
 * @returns Whether the submission can be auto-approved
 */
export function canAutoApproveSubmission(
  organizerIsFlagged: boolean,
  hackathonAutoApproveEnabled: boolean
): boolean {
  // If organizer is flagged, never auto-approve
  if (organizerIsFlagged) {
    return false;
  }
  
  // Otherwise, follow the hackathon's auto-approve setting
  return hackathonAutoApproveEnabled;
}

/**
 * Sort organizers by various criteria
 * 
 * @param organizers - Array of organizers to sort
 * @param sortBy - Field to sort by
 * @param ascending - Sort direction
 * @returns Sorted array of organizers
 */
export function sortOrganizers(
  organizers: OrganizerWithDetails[],
  sortBy: 'trust_score' | 'total_hackathons' | 'total_participants' | 'created_at' | 'approval_rate',
  ascending: boolean = false
): OrganizerWithDetails[] {
  const sorted = [...organizers].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'trust_score':
        comparison = a.trust_score - b.trust_score;
        break;
      case 'total_hackathons':
        comparison = a.total_hackathons - b.total_hackathons;
        break;
      case 'total_participants':
        comparison = a.total_participants - b.total_participants;
        break;
      case 'approval_rate':
        comparison = a.approval_rate - b.approval_rate;
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    
    return ascending ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Paginate organizers array
 * 
 * @param organizers - Array of organizers to paginate
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Paginated array of organizers
 */
export function paginateOrganizers(
  organizers: OrganizerWithDetails[],
  page: number,
  limit: number
): OrganizerWithDetails[] {
  const startIndex = (page - 1) * limit;
  return organizers.slice(startIndex, startIndex + limit);
}

/**
 * Get organizer statistics summary
 * 
 * @param organizers - Array of organizers
 * @returns Summary statistics
 */
export function getOrganizerStatsSummary(organizers: OrganizerWithDetails[]): {
  totalOrganizers: number;
  flaggedOrganizers: number;
  averageTrustScore: number;
  totalHackathons: number;
  totalParticipants: number;
} {
  const totalOrganizers = organizers.length;
  const flaggedOrganizers = organizers.filter(o => o.is_flagged).length;
  
  const totalTrustScore = organizers.reduce((sum, o) => sum + o.trust_score, 0);
  const averageTrustScore = totalOrganizers > 0 
    ? Math.round((totalTrustScore / totalOrganizers) * 100) / 100 
    : 0;
  
  const totalHackathons = organizers.reduce((sum, o) => sum + o.total_hackathons, 0);
  const totalParticipants = organizers.reduce((sum, o) => sum + o.total_participants, 0);
  
  return {
    totalOrganizers,
    flaggedOrganizers,
    averageTrustScore,
    totalHackathons,
    totalParticipants,
  };
}
