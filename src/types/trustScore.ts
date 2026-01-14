/**
 * Trust Score Types for Admin Moderation System
 * Requirements: 3.6, 7.2, 7.5
 */

/**
 * User trust score factors
 */
export interface UserTrustFactors {
  account_age_days: number;
  successful_hackathons: number;
  reports_received: number;
  reports_filed_valid: number;
  moderation_actions: number;
  verified_email: boolean;
}

/**
 * Organizer trust score factors
 */
export interface OrganizerTrustFactors {
  total_hackathons: number;
  approved_hackathons: number;
  rejected_hackathons: number;
  total_participants: number;
  violations: number;
  account_age_days: number;
}

/**
 * User trust score record
 */
export interface UserTrustScore {
  user_id: string;
  score: number;
  factors: UserTrustFactors;
  last_calculated_at: string;
  created_at: string;
}

/**
 * Organizer trust score record
 */
export interface OrganizerTrustScore {
  organizer_id: string;
  score: number;
  factors: OrganizerTrustFactors;
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
  last_calculated_at: string;
  created_at: string;
}

/**
 * Trust score calculation result
 */
export interface TrustScoreResult {
  score: number;
  factors: UserTrustFactors | OrganizerTrustFactors;
  breakdown: TrustScoreBreakdown;
}

/**
 * Breakdown of trust score calculation
 */
export interface TrustScoreBreakdown {
  baseScore: number;
  accountAgeBonus: number;
  activityBonus: number;
  reportsPenalty: number;
  moderationPenalty: number;
  verificationBonus: number;
  finalScore: number;
}

/**
 * Auto-flagging result
 */
export interface AutoFlagResult {
  shouldFlag: boolean;
  reason: string | null;
  rejectionCount: number;
  violationCount: number;
  threshold: number;
}
