/**
 * Organizer Management API Functions
 * 
 * Provides API functions for admin organizer management with trust scores,
 * flagging, and revocation.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { organizerManagementService } from './organizerManagementService';
import type {
  OrganizerSearchFilters,
  OrganizerListResponse,
  OrganizerWithDetails,
  RevokeOrganizerRequest,
  RevokeOrganizerResult,
  FlagOrganizerRequest,
  UnflagOrganizerRequest,
  FlaggedOrganizerReviewCheck,
} from '@/types/organizerManagement';

/**
 * Get organizers with trust scores and hackathon stats
 * 
 * Requirement 7.1: View organizer profile with hackathon stats
 * Requirement 7.5: Show trust score, total hackathons, active hackathons
 * 
 * @param filters - Search filters to apply
 * @returns Paginated organizer list response
 */
export async function getAdminOrganizers(
  filters: OrganizerSearchFilters = {}
): Promise<OrganizerListResponse> {
  return organizerManagementService.getOrganizers(filters);
}

/**
 * Get a single organizer by ID with full details
 * 
 * @param organizerId - The organizer's user_id
 * @returns Organizer with full details or null if not found
 */
export async function getAdminOrganizerById(
  organizerId: string
): Promise<OrganizerWithDetails | null> {
  return organizerManagementService.getOrganizerById(organizerId);
}

/**
 * Revoke organizer status
 * 
 * Requirement 7.3: Unpublish all active hackathons, notify affected participants,
 * send revocation email with reason, and log the action.
 * 
 * @param organizerId - The organizer's user_id
 * @param request - Revoke request with reason
 * @param adminId - The admin performing the action
 * @param adminEmail - The admin's email
 * @returns Revoke result
 */
export async function revokeOrganizerStatus(
  organizerId: string,
  request: RevokeOrganizerRequest,
  adminId: string,
  adminEmail: string
): Promise<RevokeOrganizerResult> {
  return organizerManagementService.revokeOrganizerStatus(
    organizerId,
    request,
    adminId,
    adminEmail
  );
}

/**
 * Flag an organizer manually
 * 
 * Requirement 7.2: Flag organizers with multiple rejections or violations
 * 
 * @param organizerId - The organizer's user_id
 * @param request - Flag request with reason
 * @param adminId - The admin performing the action
 * @param adminEmail - The admin's email
 */
export async function flagOrganizer(
  organizerId: string,
  request: FlagOrganizerRequest,
  adminId: string,
  adminEmail: string
): Promise<void> {
  return organizerManagementService.flagOrganizer(
    organizerId,
    request,
    adminId,
    adminEmail
  );
}

/**
 * Unflag an organizer
 * 
 * @param organizerId - The organizer's user_id
 * @param request - Unflag request with reason
 * @param adminId - The admin performing the action
 * @param adminEmail - The admin's email
 */
export async function unflagOrganizer(
  organizerId: string,
  request: UnflagOrganizerRequest,
  adminId: string,
  adminEmail: string
): Promise<void> {
  return organizerManagementService.unflagOrganizer(
    organizerId,
    request,
    adminId,
    adminEmail
  );
}

/**
 * Check if a hackathon submission requires manual review
 * 
 * Requirement 7.4: Require manual review for flagged organizer submissions
 * 
 * @param organizerId - The organizer's user_id
 * @returns Review check result
 */
export async function checkFlaggedOrganizerReviewRequirement(
  organizerId: string
): Promise<FlaggedOrganizerReviewCheck> {
  return organizerManagementService.checkFlaggedOrganizerReviewRequirement(organizerId);
}

/**
 * Get flagged organizers list
 * 
 * Requirement 7.2: Display warning indicator for flagged organizers
 * 
 * @returns List of flagged organizers with details
 */
export async function getFlaggedOrganizers(): Promise<OrganizerWithDetails[]> {
  return organizerManagementService.getFlaggedOrganizers();
}

/**
 * Recalculate trust score for an organizer
 * 
 * @param organizerId - The organizer's user_id
 * @returns Updated trust score
 */
export async function recalculateOrganizerTrustScore(
  organizerId: string
): Promise<number> {
  return organizerManagementService.recalculateTrustScore(organizerId);
}
