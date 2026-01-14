/**
 * Organizer Management Types for Admin Moderation System
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { OrganizerTrustFactors } from './trustScore';

/**
 * Organizer search filters
 * Requirement 7.1: View organizer profile with hackathon stats
 */
export interface OrganizerSearchFilters {
  email?: string;
  display_name?: string;
  organization_name?: string;
  is_flagged?: boolean;
  min_trust_score?: number;
  max_trust_score?: number;
  min_hackathons?: number;
  max_hackathons?: number;
  tier?: string | string[];
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Organizer with full details for admin view
 * Requirement 7.1, 7.5: Display hackathon stats, trust score, flag status
 */
export interface OrganizerWithDetails {
  // Basic profile info
  id: number;
  user_id: string;
  email: string | null;
  display_name: string | null;
  organization_name: string | null;
  organization_type: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  logo_url: string | null;
  tier: string;
  is_published: boolean;
  verified_organizer: boolean;
  created_at: string;
  updated_at: string;
  
  // Hackathon statistics
  total_hackathons: number;
  active_hackathons: number;
  published_hackathons: number;
  pending_hackathons: number;
  rejected_hackathons: number;
  ended_hackathons: number;
  total_participants: number;
  approval_rate: number;
  
  // Trust score info
  trust_score: number;
  trust_factors: OrganizerTrustFactors | null;
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
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
 * Revoke organizer request
 * Requirement 7.3: Revoke status, unpublish hackathons, send notification
 */
export interface RevokeOrganizerRequest {
  reason: string;
  notify_organizer?: boolean;
  notify_participants?: boolean;
}

/**
 * Revoke organizer result
 */
export interface RevokeOrganizerResult {
  organizer_id: string;
  hackathons_unpublished: number;
  participants_notified: number;
  success: boolean;
  message: string;
}

/**
 * Flag organizer request
 * Requirement 7.2: Flag organizers with multiple rejections or violations
 */
export interface FlagOrganizerRequest {
  reason: string;
}

/**
 * Unflag organizer request
 */
export interface UnflagOrganizerRequest {
  reason: string;
}

/**
 * Hackathon submission review requirement check
 * Requirement 7.4: Require manual review for flagged organizer submissions
 */
export interface FlaggedOrganizerReviewCheck {
  organizer_id: string;
  is_flagged: boolean;
  flag_reason: string | null;
  requires_manual_review: boolean;
}
