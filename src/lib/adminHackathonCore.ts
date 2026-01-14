/**
 * Core Admin Hackathon Functions (Pure, Testable)
 * 
 * This module contains pure functions for admin hackathon operations that can be
 * tested without database access. These functions implement the core logic
 * for filtering, validation, and data transformation.
 * 
 * Requirements: 1.1, 2.2
 */

import type {
  OrganizerHackathon,
  OrganizerHackathonStatus,
  HackathonFormat,
  AdminHackathonFilters,
} from '@/types/adminHackathon';

/**
 * Valid hackathon statuses
 */
export const VALID_HACKATHON_STATUSES: readonly OrganizerHackathonStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'ended',
  'unpublished',
] as const;

/**
 * Valid hackathon formats
 */
export const VALID_HACKATHON_FORMATS: readonly HackathonFormat[] = [
  'online',
  'offline',
  'hybrid',
] as const;

/**
 * Check if a value is a valid hackathon status
 */
export function isValidHackathonStatus(value: unknown): value is OrganizerHackathonStatus {
  return typeof value === 'string' && VALID_HACKATHON_STATUSES.includes(value as OrganizerHackathonStatus);
}

/**
 * Check if a value is a valid hackathon format
 */
export function isValidHackathonFormat(value: unknown): value is HackathonFormat {
  return typeof value === 'string' && VALID_HACKATHON_FORMATS.includes(value as HackathonFormat);
}

/**
 * Filter hackathons by status
 * 
 * @param hackathons - Array of hackathons to filter
 * @param status - Status or array of statuses to filter by
 * @returns Filtered hackathons
 */
export function filterByStatus(
  hackathons: OrganizerHackathon[],
  status: OrganizerHackathonStatus | OrganizerHackathonStatus[] | undefined
): OrganizerHackathon[] {
  if (!status) return hackathons;
  
  const statuses = Array.isArray(status) ? status : [status];
  return hackathons.filter(h => statuses.includes(h.status));
}

/**
 * Filter hackathons by format
 * 
 * @param hackathons - Array of hackathons to filter
 * @param format - Format or array of formats to filter by
 * @returns Filtered hackathons
 */
export function filterByFormat(
  hackathons: OrganizerHackathon[],
  format: HackathonFormat | HackathonFormat[] | undefined
): OrganizerHackathon[] {
  if (!format) return hackathons;
  
  const formats = Array.isArray(format) ? format : [format];
  return hackathons.filter(h => formats.includes(h.format));
}

/**
 * Filter hackathons by organizer ID
 * 
 * @param hackathons - Array of hackathons to filter
 * @param organizerId - Organizer ID to filter by
 * @returns Filtered hackathons
 */
export function filterByOrganizerId(
  hackathons: OrganizerHackathon[],
  organizerId: string | undefined
): OrganizerHackathon[] {
  if (!organizerId) return hackathons;
  
  return hackathons.filter(h => h.organizer_id === organizerId);
}

/**
 * Filter hackathons by organizer email (partial match, case-insensitive)
 * 
 * @param hackathons - Array of hackathons to filter
 * @param organizerEmail - Organizer email to filter by
 * @returns Filtered hackathons
 */
export function filterByOrganizerEmail(
  hackathons: OrganizerHackathon[],
  organizerEmail: string | undefined
): OrganizerHackathon[] {
  if (!organizerEmail) return hackathons;
  
  const lowerEmail = organizerEmail.toLowerCase();
  return hackathons.filter(h => 
    h.organizer_email.toLowerCase().includes(lowerEmail)
  );
}

/**
 * Filter hackathons by date range (based on start_date)
 * 
 * @param hackathons - Array of hackathons to filter
 * @param dateFrom - Start of date range (inclusive)
 * @param dateTo - End of date range (inclusive)
 * @returns Filtered hackathons
 */
export function filterByDateRange(
  hackathons: OrganizerHackathon[],
  dateFrom: string | undefined,
  dateTo: string | undefined
): OrganizerHackathon[] {
  let result = hackathons;
  
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    result = result.filter(h => new Date(h.start_date) >= fromDate);
  }
  
  if (dateTo) {
    const toDate = new Date(dateTo);
    result = result.filter(h => new Date(h.start_date) <= toDate);
  }
  
  return result;
}

/**
 * Filter hackathons by registration count range
 * 
 * @param hackathons - Array of hackathons to filter
 * @param minRegistrations - Minimum registration count (inclusive)
 * @param maxRegistrations - Maximum registration count (inclusive)
 * @returns Filtered hackathons
 */
export function filterByRegistrationCount(
  hackathons: OrganizerHackathon[],
  minRegistrations: number | undefined,
  maxRegistrations: number | undefined
): OrganizerHackathon[] {
  let result = hackathons;
  
  if (minRegistrations !== undefined) {
    result = result.filter(h => h.registrations_count >= minRegistrations);
  }
  
  if (maxRegistrations !== undefined) {
    result = result.filter(h => h.registrations_count <= maxRegistrations);
  }
  
  return result;
}

/**
 * Filter hackathons by featured status
 * 
 * @param hackathons - Array of hackathons to filter
 * @param isFeatured - Featured status to filter by
 * @returns Filtered hackathons
 */
export function filterByFeatured(
  hackathons: OrganizerHackathon[],
  isFeatured: boolean | undefined
): OrganizerHackathon[] {
  if (isFeatured === undefined) return hackathons;
  
  return hackathons.filter(h => h.featured_badge === isFeatured);
}

/**
 * Filter hackathons by search term (searches name, tagline, description)
 * 
 * @param hackathons - Array of hackathons to filter
 * @param search - Search term
 * @returns Filtered hackathons
 */
export function filterBySearch(
  hackathons: OrganizerHackathon[],
  search: string | undefined
): OrganizerHackathon[] {
  if (!search) return hackathons;
  
  const lowerSearch = search.toLowerCase();
  return hackathons.filter(h => 
    h.hackathon_name.toLowerCase().includes(lowerSearch) ||
    (h.tagline?.toLowerCase().includes(lowerSearch) ?? false) ||
    (h.description?.toLowerCase().includes(lowerSearch) ?? false)
  );
}

/**
 * Apply all filters to hackathons
 * 
 * Requirement 1.1: Filter by status, organizer, date range, format, registration count
 * Requirement 2.2: Support filtering by activity type, user, hackathon, severity level
 * 
 * Property 2: Hackathon Filter Consistency
 * For any filter combination, the returned hackathons SHALL all match the specified filter criteria.
 * 
 * @param hackathons - Array of hackathons to filter
 * @param filters - Filters to apply
 * @returns Filtered hackathons
 */
export function applyFilters(
  hackathons: OrganizerHackathon[],
  filters: AdminHackathonFilters
): OrganizerHackathon[] {
  let result = hackathons;
  
  result = filterByStatus(result, filters.status);
  result = filterByFormat(result, filters.format);
  result = filterByOrganizerId(result, filters.organizer_id);
  result = filterByOrganizerEmail(result, filters.organizer_email);
  result = filterByDateRange(result, filters.date_from, filters.date_to);
  result = filterByRegistrationCount(result, filters.min_registrations, filters.max_registrations);
  result = filterByFeatured(result, filters.is_featured);
  result = filterBySearch(result, filters.search);
  
  return result;
}

/**
 * Verify that all hackathons in the result match the given filters
 * 
 * This is the core property that must hold for filter consistency:
 * For any filter combination, ALL returned hackathons must match ALL specified criteria.
 * 
 * @param hackathons - Array of hackathons to verify
 * @param filters - Filters that should be matched
 * @returns True if all hackathons match all filters
 */
export function verifyFilterConsistency(
  hackathons: OrganizerHackathon[],
  filters: AdminHackathonFilters
): boolean {
  for (const hackathon of hackathons) {
    // Check status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(hackathon.status)) {
        return false;
      }
    }
    
    // Check format filter
    if (filters.format) {
      const formats = Array.isArray(filters.format) ? filters.format : [filters.format];
      if (!formats.includes(hackathon.format)) {
        return false;
      }
    }
    
    // Check organizer_id filter
    if (filters.organizer_id) {
      if (hackathon.organizer_id !== filters.organizer_id) {
        return false;
      }
    }
    
    // Check organizer_email filter (partial match, case-insensitive)
    if (filters.organizer_email) {
      if (!hackathon.organizer_email.toLowerCase().includes(filters.organizer_email.toLowerCase())) {
        return false;
      }
    }
    
    // Check date_from filter
    if (filters.date_from) {
      if (new Date(hackathon.start_date) < new Date(filters.date_from)) {
        return false;
      }
    }
    
    // Check date_to filter
    if (filters.date_to) {
      if (new Date(hackathon.start_date) > new Date(filters.date_to)) {
        return false;
      }
    }
    
    // Check min_registrations filter
    if (filters.min_registrations !== undefined) {
      if (hackathon.registrations_count < filters.min_registrations) {
        return false;
      }
    }
    
    // Check max_registrations filter
    if (filters.max_registrations !== undefined) {
      if (hackathon.registrations_count > filters.max_registrations) {
        return false;
      }
    }
    
    // Check is_featured filter
    if (filters.is_featured !== undefined) {
      if (hackathon.featured_badge !== filters.is_featured) {
        return false;
      }
    }
    
    // Check search filter
    if (filters.search) {
      const lowerSearch = filters.search.toLowerCase();
      const matchesName = hackathon.hackathon_name.toLowerCase().includes(lowerSearch);
      const matchesTagline = hackathon.tagline?.toLowerCase().includes(lowerSearch) ?? false;
      const matchesDescription = hackathon.description?.toLowerCase().includes(lowerSearch) ?? false;
      
      if (!matchesName && !matchesTagline && !matchesDescription) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Sort hackathons by created_at descending (newest first)
 * 
 * @param hackathons - Array of hackathons to sort
 * @returns Sorted hackathons
 */
export function sortByCreatedAtDesc(hackathons: OrganizerHackathon[]): OrganizerHackathon[] {
  return [...hackathons].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Paginate hackathons
 * 
 * @param hackathons - Array of hackathons to paginate
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Paginated hackathons
 */
export function paginate(
  hackathons: OrganizerHackathon[],
  page: number,
  limit: number
): OrganizerHackathon[] {
  const offset = (page - 1) * limit;
  return hackathons.slice(offset, offset + limit);
}
