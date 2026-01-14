/**
 * Core Trust Score Functions (Pure, Testable)
 * 
 * This module contains pure functions for trust score calculations.
 * Requirements: 3.6, 7.2, 7.5
 */

import type {
  UserTrustFactors,
  OrganizerTrustFactors,
  TrustScoreResult,
  TrustScoreBreakdown,
  AutoFlagResult,
} from '@/types/trustScore';

/**
 * Trust score configuration
 */
export const TRUST_SCORE_CONFIG = {
  // Base score
  baseScore: 50,
  
  // Account age bonuses (per 30 days, max 20 points)
  accountAgeBonusPerMonth: 2,
  accountAgeBonusMax: 20,
  
  // Activity bonuses
  hackathonBonus: 3,        // Per successful hackathon
  hackathonBonusMax: 15,    // Max bonus from hackathons
  validReportBonus: 2,      // Per valid report filed
  validReportBonusMax: 10,  // Max bonus from valid reports
  
  // Penalties
  reportReceivedPenalty: 5,     // Per report received
  reportReceivedPenaltyMax: 25, // Max penalty from reports
  moderationPenalty: 10,        // Per moderation action
  moderationPenaltyMax: 30,     // Max penalty from moderation
  
  // Verification bonus
  verifiedEmailBonus: 5,
  
  // Score bounds
  minScore: 0,
  maxScore: 100,
} as const;

/**
 * Organizer-specific configuration
 */
export const ORGANIZER_TRUST_CONFIG = {
  // Base score
  baseScore: 50,
  
  // Account age bonuses
  accountAgeBonusPerMonth: 1,
  accountAgeBonusMax: 10,
  
  // Hackathon bonuses
  approvedHackathonBonus: 5,
  approvedHackathonBonusMax: 25,
  participantBonus: 0.1,        // Per participant
  participantBonusMax: 15,
  
  // Penalties
  rejectedHackathonPenalty: 10,
  rejectedHackathonPenaltyMax: 30,
  violationPenalty: 15,
  violationPenaltyMax: 45,
  
  // Score bounds
  minScore: 0,
  maxScore: 100,
  
  // Auto-flagging threshold
  autoFlagThreshold: 3,  // 3+ rejections or violations
} as const;

/**
 * Calculate user trust score
 * 
 * Requirement 3.6: Calculate from account age, hackathons, reports,
 * moderation history.
 * 
 * Property 6: Trust Score Bounds - The resulting score SHALL be between
 * 0 and 100 inclusive.
 * 
 * @param factors - User trust factors
 * @returns Trust score result with breakdown
 */
export function calculateUserTrustScore(factors: UserTrustFactors): TrustScoreResult {
  const config = TRUST_SCORE_CONFIG;
  
  // Start with base score
  let score = config.baseScore;
  
  // Account age bonus (2 points per month, max 20)
  const monthsOld = Math.floor(factors.account_age_days / 30);
  const accountAgeBonus = Math.min(
    monthsOld * config.accountAgeBonusPerMonth,
    config.accountAgeBonusMax
  );
  score += accountAgeBonus;
  
  // Hackathon participation bonus (3 points per hackathon, max 15)
  const hackathonBonus = Math.min(
    factors.successful_hackathons * config.hackathonBonus,
    config.hackathonBonusMax
  );
  score += hackathonBonus;
  
  // Valid reports filed bonus (2 points per valid report, max 10)
  const validReportBonus = Math.min(
    factors.reports_filed_valid * config.validReportBonus,
    config.validReportBonusMax
  );
  score += validReportBonus;
  
  // Reports received penalty (5 points per report, max 25)
  const reportsPenalty = Math.min(
    factors.reports_received * config.reportReceivedPenalty,
    config.reportReceivedPenaltyMax
  );
  score -= reportsPenalty;
  
  // Moderation actions penalty (10 points per action, max 30)
  const moderationPenalty = Math.min(
    factors.moderation_actions * config.moderationPenalty,
    config.moderationPenaltyMax
  );
  score -= moderationPenalty;
  
  // Verified email bonus
  const verificationBonus = factors.verified_email ? config.verifiedEmailBonus : 0;
  score += verificationBonus;
  
  // Clamp to bounds
  const finalScore = Math.max(config.minScore, Math.min(config.maxScore, Math.round(score)));
  
  const breakdown: TrustScoreBreakdown = {
    baseScore: config.baseScore,
    accountAgeBonus,
    activityBonus: hackathonBonus + validReportBonus,
    reportsPenalty,
    moderationPenalty,
    verificationBonus,
    finalScore,
  };
  
  return {
    score: finalScore,
    factors,
    breakdown,
  };
}

/**
 * Calculate organizer trust score
 * 
 * Requirement 7.5: Calculate from hackathon history, approval rate, violations.
 * 
 * Property 6: Trust Score Bounds - The resulting score SHALL be between
 * 0 and 100 inclusive.
 * 
 * @param factors - Organizer trust factors
 * @returns Trust score result with breakdown
 */
export function calculateOrganizerTrustScore(factors: OrganizerTrustFactors): TrustScoreResult {
  const config = ORGANIZER_TRUST_CONFIG;
  
  // Start with base score
  let score = config.baseScore;
  
  // Account age bonus (1 point per month, max 10)
  const monthsOld = Math.floor(factors.account_age_days / 30);
  const accountAgeBonus = Math.min(
    monthsOld * config.accountAgeBonusPerMonth,
    config.accountAgeBonusMax
  );
  score += accountAgeBonus;
  
  // Approved hackathons bonus (5 points per approved, max 25)
  const approvedBonus = Math.min(
    factors.approved_hackathons * config.approvedHackathonBonus,
    config.approvedHackathonBonusMax
  );
  score += approvedBonus;
  
  // Participant bonus (0.1 points per participant, max 15)
  const participantBonus = Math.min(
    Math.floor(factors.total_participants * config.participantBonus),
    config.participantBonusMax
  );
  score += participantBonus;
  
  // Rejected hackathons penalty (10 points per rejection, max 30)
  const rejectedPenalty = Math.min(
    factors.rejected_hackathons * config.rejectedHackathonPenalty,
    config.rejectedHackathonPenaltyMax
  );
  score -= rejectedPenalty;
  
  // Violations penalty (15 points per violation, max 45)
  const violationPenalty = Math.min(
    factors.violations * config.violationPenalty,
    config.violationPenaltyMax
  );
  score -= violationPenalty;
  
  // Clamp to bounds
  const finalScore = Math.max(config.minScore, Math.min(config.maxScore, Math.round(score)));
  
  const breakdown: TrustScoreBreakdown = {
    baseScore: config.baseScore,
    accountAgeBonus,
    activityBonus: approvedBonus + participantBonus,
    reportsPenalty: 0,
    moderationPenalty: rejectedPenalty + violationPenalty,
    verificationBonus: 0,
    finalScore,
  };
  
  return {
    score: finalScore,
    factors,
    breakdown,
  };
}


/**
 * Check if trust score is within valid bounds
 * 
 * Property 6: Trust Score Bounds validation
 * 
 * @param score - The trust score to validate
 * @returns True if score is between 0 and 100 inclusive
 */
export function isValidTrustScore(score: number): boolean {
  return score >= 0 && score <= 100 && Number.isInteger(score);
}

/**
 * Determine if an organizer should be auto-flagged
 * 
 * Requirement 7.2: Flag organizers with 3+ rejections or violations.
 * 
 * Property 9: Organizer Auto-Flagging Threshold - For any organizer with
 * rejection count exceeding the threshold, the organizer SHALL be automatically flagged.
 * 
 * @param factors - Organizer trust factors
 * @returns Auto-flag result
 */
export function shouldAutoFlagOrganizer(factors: OrganizerTrustFactors): AutoFlagResult {
  const threshold = ORGANIZER_TRUST_CONFIG.autoFlagThreshold;
  const rejectionCount = factors.rejected_hackathons;
  const violationCount = factors.violations;
  
  // Check if rejections exceed threshold
  if (rejectionCount >= threshold) {
    return {
      shouldFlag: true,
      reason: `Organizer has ${rejectionCount} rejected hackathons (threshold: ${threshold})`,
      rejectionCount,
      violationCount,
      threshold,
    };
  }
  
  // Check if violations exceed threshold
  if (violationCount >= threshold) {
    return {
      shouldFlag: true,
      reason: `Organizer has ${violationCount} violations (threshold: ${threshold})`,
      rejectionCount,
      violationCount,
      threshold,
    };
  }
  
  // Check combined count
  const combinedCount = rejectionCount + violationCount;
  if (combinedCount >= threshold) {
    return {
      shouldFlag: true,
      reason: `Organizer has ${combinedCount} combined rejections and violations (threshold: ${threshold})`,
      rejectionCount,
      violationCount,
      threshold,
    };
  }
  
  return {
    shouldFlag: false,
    reason: null,
    rejectionCount,
    violationCount,
    threshold,
  };
}

/**
 * Check if auto-flagging decision is valid according to Property 9
 * 
 * @param result - Auto-flag result
 * @returns True if the decision is valid
 */
export function isValidAutoFlagDecision(result: AutoFlagResult): boolean {
  const totalIssues = result.rejectionCount + result.violationCount;
  
  // If flagged, at least one count must meet threshold
  if (result.shouldFlag) {
    return (
      result.rejectionCount >= result.threshold ||
      result.violationCount >= result.threshold ||
      totalIssues >= result.threshold
    );
  }
  
  // If not flagged, all counts must be below threshold
  return (
    result.rejectionCount < result.threshold &&
    result.violationCount < result.threshold &&
    totalIssues < result.threshold
  );
}

/**
 * Get trust score level label
 * 
 * @param score - The trust score
 * @returns Label for the trust level
 */
export function getTrustScoreLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

/**
 * Create default user trust factors
 */
export function createDefaultUserFactors(): UserTrustFactors {
  return {
    account_age_days: 0,
    successful_hackathons: 0,
    reports_received: 0,
    reports_filed_valid: 0,
    moderation_actions: 0,
    verified_email: false,
  };
}

/**
 * Create default organizer trust factors
 */
export function createDefaultOrganizerFactors(): OrganizerTrustFactors {
  return {
    total_hackathons: 0,
    approved_hackathons: 0,
    rejected_hackathons: 0,
    total_participants: 0,
    violations: 0,
    account_age_days: 0,
  };
}
