/**
 * Property-Based Tests for Organizer Management
 * 
 * Feature: admin-moderation-system
 * 
 * Property 18: Flagged Organizer Review Requirement
 * Validates: Requirements 7.4
 * 
 * For any hackathon submission from a flagged organizer, the submission
 * SHALL require manual review regardless of auto-approval settings.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  requiresManualReview,
  canAutoApproveSubmission,
  filterOrganizers,
  calculateApprovalRate,
  sortOrganizers,
  paginateOrganizers,
} from './organizerManagementCore';
import type {
  OrganizerWithDetails,
  OrganizerSearchFilters,
} from '@/types/organizerManagement';
import type { OrganizerTrustFactors } from '@/types/trustScore';

/**
 * Arbitrary generator for OrganizerWithDetails
 */
const organizerWithDetailsArb: fc.Arbitrary<OrganizerWithDetails> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  user_id: fc.uuid(),
  email: fc.emailAddress(),
  display_name: fc.string({ minLength: 1, maxLength: 100 }),
  organization_name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  organization_type: fc.constantFrom('individual', 'student_club', 'company', 'nonprofit', 'community', null),
  bio: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  location: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  website: fc.option(fc.webUrl(), { nil: null }),
  logo_url: fc.option(fc.webUrl(), { nil: null }),
  tier: fc.constantFrom('starter', 'verified', 'senior', 'chief', 'legacy'),
  is_published: fc.boolean(),
  verified_organizer: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
  updated_at: fc.constant(new Date().toISOString()),
  total_hackathons: fc.integer({ min: 0, max: 100 }),
  active_hackathons: fc.integer({ min: 0, max: 50 }),
  published_hackathons: fc.integer({ min: 0, max: 50 }),
  pending_hackathons: fc.integer({ min: 0, max: 20 }),
  rejected_hackathons: fc.integer({ min: 0, max: 30 }),
  ended_hackathons: fc.integer({ min: 0, max: 50 }),
  total_participants: fc.integer({ min: 0, max: 10000 }),
  approval_rate: fc.float({ min: 0, max: 100 }),
  trust_score: fc.integer({ min: 0, max: 100 }),
  trust_factors: fc.option(
    fc.record({
      total_hackathons: fc.integer({ min: 0, max: 100 }),
      approved_hackathons: fc.integer({ min: 0, max: 100 }),
      rejected_hackathons: fc.integer({ min: 0, max: 50 }),
      total_participants: fc.integer({ min: 0, max: 10000 }),
      violations: fc.integer({ min: 0, max: 20 }),
      account_age_days: fc.integer({ min: 0, max: 3650 }),
    }) as fc.Arbitrary<OrganizerTrustFactors>,
    { nil: null }
  ),
  is_flagged: fc.boolean(),
  flag_reason: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  flagged_at: fc.option(fc.constant(new Date().toISOString()), { nil: null }),
});

/**
 * Arbitrary generator for search filters
 */
const searchFiltersArb: fc.Arbitrary<OrganizerSearchFilters> = fc.record({
  email: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  display_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  organization_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  is_flagged: fc.option(fc.boolean()),
  min_trust_score: fc.option(fc.integer({ min: 0, max: 100 })),
  max_trust_score: fc.option(fc.integer({ min: 0, max: 100 })),
  min_hackathons: fc.option(fc.integer({ min: 0, max: 100 })),
  max_hackathons: fc.option(fc.integer({ min: 0, max: 100 })),
  tier: fc.option(fc.constantFrom('starter', 'verified', 'senior', 'chief', 'legacy')),
  search: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  page: fc.option(fc.integer({ min: 1, max: 100 })),
  limit: fc.option(fc.integer({ min: 1, max: 100 })),
});

describe('Property 18: Flagged Organizer Review Requirement', () => {
  /**
   * Feature: admin-moderation-system, Property 18: Flagged Organizer Review Requirement
   * Validates: Requirements 7.4
   * 
   * Property: For any hackathon submission from a flagged organizer, the submission
   * SHALL require manual review regardless of auto-approval settings.
   */
  it('Property 18: Flagged organizers always require manual review', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // isFlagged = true
        (isFlagged) => {
          const result = requiresManualReview(isFlagged);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18a: Non-flagged organizers do not require manual review
   */
  it('Property 18a: Non-flagged organizers do not require manual review', () => {
    fc.assert(
      fc.property(
        fc.constant(false), // isFlagged = false
        (isFlagged) => {
          const result = requiresManualReview(isFlagged);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18b: Flagged organizers cannot have auto-approved submissions
   */
  it('Property 18b: Flagged organizers cannot have auto-approved submissions', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // hackathonAutoApproveEnabled
        (hackathonAutoApproveEnabled) => {
          // When organizer is flagged, auto-approve should always be false
          const result = canAutoApproveSubmission(true, hackathonAutoApproveEnabled);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18c: Non-flagged organizers follow hackathon auto-approve setting
   */
  it('Property 18c: Non-flagged organizers follow hackathon auto-approve setting', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // hackathonAutoApproveEnabled
        (hackathonAutoApproveEnabled) => {
          // When organizer is not flagged, result should match hackathon setting
          const result = canAutoApproveSubmission(false, hackathonAutoApproveEnabled);
          expect(result).toBe(hackathonAutoApproveEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18d: requiresManualReview is the inverse of canAutoApprove for flagged organizers
   */
  it('Property 18d: Manual review requirement is consistent with auto-approve', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isFlagged
        fc.boolean(), // hackathonAutoApproveEnabled
        (isFlagged, hackathonAutoApproveEnabled) => {
          const requiresReview = requiresManualReview(isFlagged);
          const canAutoApprove = canAutoApproveSubmission(isFlagged, hackathonAutoApproveEnabled);
          
          // If flagged, must require review and cannot auto-approve
          if (isFlagged) {
            expect(requiresReview).toBe(true);
            expect(canAutoApprove).toBe(false);
          }
          
          // If not flagged, doesn't require review (based on flag alone)
          if (!isFlagged) {
            expect(requiresReview).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Organizer Filter Properties', () => {
  /**
   * Property: Filtered organizers match all specified criteria
   */
  it('Filtered organizers match is_flagged filter', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 0, maxLength: 20 }),
        fc.boolean(),
        (organizers, isFlagged) => {
          const filters: OrganizerSearchFilters = { is_flagged: isFlagged };
          const filtered = filterOrganizers(organizers, filters);
          
          // All filtered organizers should match the flag status
          for (const org of filtered) {
            expect(org.is_flagged).toBe(isFlagged);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Trust score range filter works correctly
   */
  it('Filtered organizers match trust score range', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 50, max: 100 }),
        (organizers, minScore, maxScore) => {
          const filters: OrganizerSearchFilters = {
            min_trust_score: minScore,
            max_trust_score: maxScore,
          };
          const filtered = filterOrganizers(organizers, filters);
          
          // All filtered organizers should be within the trust score range
          for (const org of filtered) {
            expect(org.trust_score).toBeGreaterThanOrEqual(minScore);
            expect(org.trust_score).toBeLessThanOrEqual(maxScore);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Hackathon count range filter works correctly
   */
  it('Filtered organizers match hackathon count range', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 20, max: 100 }),
        (organizers, minHackathons, maxHackathons) => {
          const filters: OrganizerSearchFilters = {
            min_hackathons: minHackathons,
            max_hackathons: maxHackathons,
          };
          const filtered = filterOrganizers(organizers, filters);
          
          // All filtered organizers should be within the hackathon count range
          for (const org of filtered) {
            expect(org.total_hackathons).toBeGreaterThanOrEqual(minHackathons);
            expect(org.total_hackathons).toBeLessThanOrEqual(maxHackathons);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Tier filter works correctly
   */
  it('Filtered organizers match tier filter', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 0, maxLength: 20 }),
        fc.constantFrom('starter', 'verified', 'senior', 'chief', 'legacy'),
        (organizers, tier) => {
          const filters: OrganizerSearchFilters = { tier };
          const filtered = filterOrganizers(organizers, filters);
          
          // All filtered organizers should have the specified tier
          for (const org of filtered) {
            expect(org.tier).toBe(tier);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering preserves organizer data integrity
   */
  it('Filtering preserves organizer data integrity', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 1, maxLength: 20 }),
        searchFiltersArb,
        (organizers, filters) => {
          const filtered = filterOrganizers(organizers, filters);
          
          // Each filtered organizer should be from the original array
          for (const filteredOrg of filtered) {
            const original = organizers.find(o => o.id === filteredOrg.id);
            expect(original).toBeDefined();
            expect(filteredOrg).toEqual(original);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Approval Rate Calculation Properties', () => {
  /**
   * Property: Approval rate is always between 0 and 100
   */
  it('Approval rate is always between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (approved, total) => {
          // Ensure approved <= total for valid input
          const validApproved = Math.min(approved, total);
          const rate = calculateApprovalRate(validApproved, total);
          
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Zero total hackathons gives 100% approval rate
   */
  it('Zero total hackathons gives 100% approval rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (approved) => {
          const rate = calculateApprovalRate(approved, 0);
          expect(rate).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All approved gives 100% rate
   */
  it('All approved gives 100% rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (total) => {
          const rate = calculateApprovalRate(total, total);
          expect(rate).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: None approved gives 0% rate
   */
  it('None approved gives 0% rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (total) => {
          const rate = calculateApprovalRate(0, total);
          expect(rate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Organizer Sorting Properties', () => {
  /**
   * Property: Sorting by trust_score maintains order
   */
  it('Sorting by trust_score produces correct order', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 2, maxLength: 20 }),
        fc.boolean(),
        (organizers, ascending) => {
          const sorted = sortOrganizers(organizers, 'trust_score', ascending);
          
          for (let i = 1; i < sorted.length; i++) {
            if (ascending) {
              expect(sorted[i].trust_score).toBeGreaterThanOrEqual(sorted[i - 1].trust_score);
            } else {
              expect(sorted[i].trust_score).toBeLessThanOrEqual(sorted[i - 1].trust_score);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting preserves all elements
   */
  it('Sorting preserves all elements', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 0, maxLength: 20 }),
        fc.constantFrom('trust_score', 'total_hackathons', 'total_participants', 'approval_rate') as fc.Arbitrary<'trust_score' | 'total_hackathons' | 'total_participants' | 'approval_rate'>,
        fc.boolean(),
        (organizers, sortBy, ascending) => {
          const sorted = sortOrganizers(organizers, sortBy, ascending);
          
          expect(sorted.length).toBe(organizers.length);
          
          // Each original organizer should be in the sorted array
          for (const org of organizers) {
            expect(sorted.some(s => s.id === org.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Organizer Pagination Properties', () => {
  /**
   * Property: Pagination returns correct number of items
   */
  it('Pagination returns at most limit items', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 20 }),
        (organizers, page, limit) => {
          const paginated = paginateOrganizers(organizers, page, limit);
          expect(paginated.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Pagination returns items from correct offset
   */
  it('Pagination returns items from correct offset', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 10, maxLength: 50 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (organizers, page, limit) => {
          const paginated = paginateOrganizers(organizers, page, limit);
          const expectedStartIndex = (page - 1) * limit;
          
          if (expectedStartIndex < organizers.length && paginated.length > 0) {
            expect(paginated[0].id).toBe(organizers[expectedStartIndex].id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All pages together contain all items
   */
  it('All pages together contain all items', () => {
    fc.assert(
      fc.property(
        fc.array(organizerWithDetailsArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 1, max: 10 }),
        (organizers, limit) => {
          const allPaginated: OrganizerWithDetails[] = [];
          const totalPages = Math.ceil(organizers.length / limit);
          
          for (let page = 1; page <= totalPages; page++) {
            allPaginated.push(...paginateOrganizers(organizers, page, limit));
          }
          
          expect(allPaginated.length).toBe(organizers.length);
          
          // Each original organizer should be in the combined pages
          for (const org of organizers) {
            expect(allPaginated.some(p => p.id === org.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
