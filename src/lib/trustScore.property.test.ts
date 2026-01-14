/**
 * Property-Based Tests for Trust Score
 * 
 * Feature: admin-moderation-system
 * 
 * Property 6: Trust Score Bounds
 * Validates: Requirements 3.6, 7.5
 * 
 * Property 9: Organizer Auto-Flagging Threshold
 * Validates: Requirements 7.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateUserTrustScore,
  calculateOrganizerTrustScore,
  isValidTrustScore,
  shouldAutoFlagOrganizer,
  isValidAutoFlagDecision,
  getTrustScoreLevel,
  TRUST_SCORE_CONFIG,
  ORGANIZER_TRUST_CONFIG,
} from './trustScoreCore';
import type {
  UserTrustFactors,
  OrganizerTrustFactors,
} from '@/types/trustScore';

/**
 * Arbitrary generators
 */
const userTrustFactorsArb: fc.Arbitrary<UserTrustFactors> = fc.record({
  account_age_days: fc.integer({ min: 0, max: 3650 }), // Up to 10 years
  successful_hackathons: fc.integer({ min: 0, max: 100 }),
  reports_received: fc.integer({ min: 0, max: 50 }),
  reports_filed_valid: fc.integer({ min: 0, max: 50 }),
  moderation_actions: fc.integer({ min: 0, max: 20 }),
  verified_email: fc.boolean(),
});

const organizerTrustFactorsArb: fc.Arbitrary<OrganizerTrustFactors> = fc.record({
  total_hackathons: fc.integer({ min: 0, max: 100 }),
  approved_hackathons: fc.integer({ min: 0, max: 100 }),
  rejected_hackathons: fc.integer({ min: 0, max: 50 }),
  total_participants: fc.integer({ min: 0, max: 10000 }),
  violations: fc.integer({ min: 0, max: 20 }),
  account_age_days: fc.integer({ min: 0, max: 3650 }),
});

describe('Property 6: Trust Score Bounds', () => {
  /**
   * Feature: admin-moderation-system, Property 6: Trust Score Bounds
   * Validates: Requirements 3.6, 7.5
   * 
   * Property: For any user or organizer trust score calculation, the resulting
   * score SHALL be between 0 and 100 inclusive.
   */
  it('Property 6: User trust score is always between 0 and 100', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        (factors) => {
          const result = calculateUserTrustScore(factors);
          
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          expect(isValidTrustScore(result.score)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6a: Organizer trust score is always between 0 and 100
   */
  it('Property 6a: Organizer trust score is always between 0 and 100', () => {
    fc.assert(
      fc.property(
        organizerTrustFactorsArb,
        (factors) => {
          const result = calculateOrganizerTrustScore(factors);
          
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          expect(isValidTrustScore(result.score)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6b: Trust score is always an integer
   */
  it('Property 6b: Trust score is always an integer', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        (factors) => {
          const result = calculateUserTrustScore(factors);
          expect(Number.isInteger(result.score)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6c: Extreme negative factors don't go below 0
   */
  it('Property 6c: Extreme negative factors produce score >= 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 10, max: 50 }),
        (reports, moderationActions) => {
          const factors: UserTrustFactors = {
            account_age_days: 0,
            successful_hackathons: 0,
            reports_received: reports,
            reports_filed_valid: 0,
            moderation_actions: moderationActions,
            verified_email: false,
          };
          
          const result = calculateUserTrustScore(factors);
          expect(result.score).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6d: Extreme positive factors don't exceed 100
   */
  it('Property 6d: Extreme positive factors produce score <= 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 3650 }),
        fc.integer({ min: 50, max: 100 }),
        fc.integer({ min: 20, max: 50 }),
        (accountAge, hackathons, validReports) => {
          const factors: UserTrustFactors = {
            account_age_days: accountAge,
            successful_hackathons: hackathons,
            reports_received: 0,
            reports_filed_valid: validReports,
            moderation_actions: 0,
            verified_email: true,
          };
          
          const result = calculateUserTrustScore(factors);
          expect(result.score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 9: Organizer Auto-Flagging Threshold', () => {
  /**
   * Feature: admin-moderation-system, Property 9: Organizer Auto-Flagging Threshold
   * Validates: Requirements 7.2
   * 
   * Property: For any organizer with rejection count exceeding the threshold
   * (3 rejections), the organizer SHALL be automatically flagged.
   */
  it('Property 9: Organizers with >= threshold rejections are flagged', () => {
    const threshold = ORGANIZER_TRUST_CONFIG.autoFlagThreshold;
    
    fc.assert(
      fc.property(
        fc.integer({ min: threshold, max: 50 }),
        organizerTrustFactorsArb,
        (rejections, baseFactors) => {
          const factors: OrganizerTrustFactors = {
            ...baseFactors,
            rejected_hackathons: rejections,
            violations: 0, // Isolate rejection test
          };
          
          const result = shouldAutoFlagOrganizer(factors);
          
          expect(result.shouldFlag).toBe(true);
          expect(result.reason).not.toBeNull();
          expect(isValidAutoFlagDecision(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9a: Organizers with >= threshold violations are flagged
   */
  it('Property 9a: Organizers with >= threshold violations are flagged', () => {
    const threshold = ORGANIZER_TRUST_CONFIG.autoFlagThreshold;
    
    fc.assert(
      fc.property(
        fc.integer({ min: threshold, max: 20 }),
        organizerTrustFactorsArb,
        (violations, baseFactors) => {
          const factors: OrganizerTrustFactors = {
            ...baseFactors,
            rejected_hackathons: 0, // Isolate violation test
            violations,
          };
          
          const result = shouldAutoFlagOrganizer(factors);
          
          expect(result.shouldFlag).toBe(true);
          expect(result.reason).not.toBeNull();
          expect(isValidAutoFlagDecision(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9b: Organizers below threshold are not flagged
   */
  it('Property 9b: Organizers below threshold are not flagged', () => {
    const threshold = ORGANIZER_TRUST_CONFIG.autoFlagThreshold;
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: threshold - 1 }),
        fc.integer({ min: 0, max: threshold - 1 }),
        organizerTrustFactorsArb,
        (rejections, violations, baseFactors) => {
          // Ensure combined is also below threshold
          if (rejections + violations >= threshold) return;
          
          const factors: OrganizerTrustFactors = {
            ...baseFactors,
            rejected_hackathons: rejections,
            violations,
          };
          
          const result = shouldAutoFlagOrganizer(factors);
          
          expect(result.shouldFlag).toBe(false);
          expect(result.reason).toBeNull();
          expect(isValidAutoFlagDecision(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9c: Combined rejections + violations >= threshold triggers flag
   */
  it('Property 9c: Combined rejections + violations >= threshold triggers flag', () => {
    const threshold = ORGANIZER_TRUST_CONFIG.autoFlagThreshold;
    
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: threshold - 1 }),
        fc.integer({ min: 1, max: threshold - 1 }),
        organizerTrustFactorsArb,
        (rejections, violations, baseFactors) => {
          // Only test when combined meets threshold but individual don't
          if (rejections >= threshold || violations >= threshold) return;
          if (rejections + violations < threshold) return;
          
          const factors: OrganizerTrustFactors = {
            ...baseFactors,
            rejected_hackathons: rejections,
            violations,
          };
          
          const result = shouldAutoFlagOrganizer(factors);
          
          expect(result.shouldFlag).toBe(true);
          expect(isValidAutoFlagDecision(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9d: Auto-flag decision is always valid
   */
  it('Property 9d: Auto-flag decision is always valid', () => {
    fc.assert(
      fc.property(
        organizerTrustFactorsArb,
        (factors) => {
          const result = shouldAutoFlagOrganizer(factors);
          expect(isValidAutoFlagDecision(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Trust Score Calculation Properties', () => {
  /**
   * Property: More positive factors increase score
   */
  it('More hackathons increase or maintain user score', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        fc.integer({ min: 1, max: 10 }),
        (factors, additionalHackathons) => {
          const score1 = calculateUserTrustScore(factors).score;
          const score2 = calculateUserTrustScore({
            ...factors,
            successful_hackathons: factors.successful_hackathons + additionalHackathons,
          }).score;
          
          expect(score2).toBeGreaterThanOrEqual(score1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: More negative factors decrease score
   */
  it('More reports decrease or maintain user score', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        fc.integer({ min: 1, max: 10 }),
        (factors, additionalReports) => {
          const score1 = calculateUserTrustScore(factors).score;
          const score2 = calculateUserTrustScore({
            ...factors,
            reports_received: factors.reports_received + additionalReports,
          }).score;
          
          expect(score2).toBeLessThanOrEqual(score1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Verified email increases score
   */
  it('Verified email increases user score', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        (factors) => {
          const unverified = calculateUserTrustScore({
            ...factors,
            verified_email: false,
          }).score;
          const verified = calculateUserTrustScore({
            ...factors,
            verified_email: true,
          }).score;
          
          expect(verified).toBeGreaterThanOrEqual(unverified);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Account age increases score
   */
  it('Older accounts have higher or equal scores', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        fc.integer({ min: 30, max: 365 }),
        (factors, additionalDays) => {
          const score1 = calculateUserTrustScore(factors).score;
          const score2 = calculateUserTrustScore({
            ...factors,
            account_age_days: factors.account_age_days + additionalDays,
          }).score;
          
          expect(score2).toBeGreaterThanOrEqual(score1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: More approved hackathons increase organizer score
   */
  it('More approved hackathons increase organizer score', () => {
    fc.assert(
      fc.property(
        organizerTrustFactorsArb,
        fc.integer({ min: 1, max: 10 }),
        (factors, additionalApproved) => {
          const score1 = calculateOrganizerTrustScore(factors).score;
          const score2 = calculateOrganizerTrustScore({
            ...factors,
            approved_hackathons: factors.approved_hackathons + additionalApproved,
          }).score;
          
          expect(score2).toBeGreaterThanOrEqual(score1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: More rejected hackathons decrease organizer score
   */
  it('More rejected hackathons decrease organizer score', () => {
    fc.assert(
      fc.property(
        organizerTrustFactorsArb,
        fc.integer({ min: 1, max: 10 }),
        (factors, additionalRejected) => {
          const score1 = calculateOrganizerTrustScore(factors).score;
          const score2 = calculateOrganizerTrustScore({
            ...factors,
            rejected_hackathons: factors.rejected_hackathons + additionalRejected,
          }).score;
          
          expect(score2).toBeLessThanOrEqual(score1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Trust Score Level', () => {
  /**
   * Property: Score level is consistent with score value
   */
  it('Score level is consistent with score value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (score) => {
          const level = getTrustScoreLevel(score);
          
          if (score >= 80) expect(level).toBe('excellent');
          else if (score >= 60) expect(level).toBe('good');
          else if (score >= 40) expect(level).toBe('fair');
          else if (score >= 20) expect(level).toBe('poor');
          else expect(level).toBe('critical');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Higher scores have better or equal levels
   */
  it('Higher scores have better or equal levels', () => {
    const levelOrder = ['critical', 'poor', 'fair', 'good', 'excellent'];
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 1, max: 100 }),
        (score1, delta) => {
          const score2 = Math.min(score1 + delta, 100);
          const level1 = getTrustScoreLevel(score1);
          const level2 = getTrustScoreLevel(score2);
          
          const index1 = levelOrder.indexOf(level1);
          const index2 = levelOrder.indexOf(level2);
          
          expect(index2).toBeGreaterThanOrEqual(index1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Trust Score Breakdown', () => {
  /**
   * Property: Breakdown components are non-negative
   */
  it('Breakdown bonuses are non-negative', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        (factors) => {
          const result = calculateUserTrustScore(factors);
          
          expect(result.breakdown.baseScore).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.accountAgeBonus).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.activityBonus).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.verificationBonus).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Breakdown penalties are non-negative
   */
  it('Breakdown penalties are non-negative', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        (factors) => {
          const result = calculateUserTrustScore(factors);
          
          expect(result.breakdown.reportsPenalty).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.moderationPenalty).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Final score matches result score
   */
  it('Breakdown final score matches result score', () => {
    fc.assert(
      fc.property(
        userTrustFactorsArb,
        (factors) => {
          const result = calculateUserTrustScore(factors);
          expect(result.breakdown.finalScore).toBe(result.score);
        }
      ),
      { numRuns: 100 }
    );
  });
});
