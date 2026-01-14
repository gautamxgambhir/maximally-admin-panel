/**
 * Property-Based Tests for User Management
 * 
 * Feature: admin-moderation-system
 * 
 * Property 10: Cascade Effect on Ban
 * Validates: Requirements 3.3, 7.3
 * 
 * Property 13: Search Result Relevance
 * Validates: Requirements 3.4
 * 
 * Property 18: Flagged Organizer Review Requirement
 * Validates: Requirements 7.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  userMatchesSearch,
  filterUsers,
  allUsersMatchSearch,
  determineCascadeEffects,
  isValidCascadeEffect,
  requiresManualReview,
  isValidReviewRequirement,
  VALID_USER_ROLES,
  VALID_MODERATION_STATUSES,
  type CascadeEffectInput,
} from './userManagementCore';
import type {
  UserWithDetails,
  UserSearchFilters,
} from '@/types/userManagement';

/**
 * Arbitrary generators
 */
const uuidArb = fc.uuid();
const emailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
  fc.constantFrom('example.com', 'test.org', 'admin.io')
).map(([local, domain]) => `${local}@${domain}`);
const usernameArb = fc.string({ minLength: 3, maxLength: 20 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s));
const fullNameArb = fc.tuple(
  fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[a-zA-Z]+$/.test(s)),
  fc.string({ minLength: 2, maxLength: 15 }).filter(s => /^[a-zA-Z]+$/.test(s))
).map(([first, last]) => `${first} ${last}`);
const phoneArb = fc.string({ minLength: 10, maxLength: 15 })
  .filter(s => /^[0-9+\-\s]+$/.test(s));
const roleArb = fc.constantFrom(...VALID_USER_ROLES);
const moderationStatusArb = fc.constantFrom(...VALID_MODERATION_STATUSES);
const isoDateArb = fc.integer({
  min: new Date('2024-01-01').getTime(),
  max: new Date('2026-12-31').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

const userWithDetailsArb: fc.Arbitrary<UserWithDetails> = fc.record({
  id: uuidArb,
  email: emailArb,
  username: fc.option(fc.constant('testuser'), { nil: null }),
  full_name: fc.option(fc.constant('Test User'), { nil: null }),
  phone: fc.option(fc.constant('1234567890'), { nil: null }),
  avatar_url: fc.constant(null),
  role: roleArb,
  moderation_status: moderationStatusArb,
  created_at: isoDateArb,
  updated_at: isoDateArb,
  hackathons_participated: fc.integer({ min: 0, max: 100 }),
  teams_joined: fc.integer({ min: 0, max: 50 }),
  submissions_made: fc.integer({ min: 0, max: 200 }),
  certificates_earned: fc.integer({ min: 0, max: 50 }),
  trust_score: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  moderation_history: fc.constant([]),
});

const usersArb = fc.array(userWithDetailsArb, { minLength: 0, maxLength: 20 });

const cascadeEffectInputArb: fc.Arbitrary<CascadeEffectInput> = fc.record({
  userId: uuidArb,
  isOrganizer: fc.boolean(),
  activeHackathonIds: fc.array(uuidArb, { minLength: 0, maxLength: 10 }),
  teamIds: fc.array(uuidArb, { minLength: 0, maxLength: 10 }),
  affectedUserIds: fc.array(uuidArb, { minLength: 0, maxLength: 50 }),
});

describe('Property 13: Search Result Relevance', () => {
  /**
   * Feature: admin-moderation-system, Property 13: Search Result Relevance
   * Validates: Requirements 3.4
   * 
   * Property: For any user search query, all returned results SHALL match
   * at least one of the search criteria (email, username, full_name, phone).
   */
  it('Property 13: All filtered users match the search query', () => {
    fc.assert(
      fc.property(
        usersArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        (users, searchQuery) => {
          const filtered = filterUsers(users, { search: searchQuery });
          
          // All filtered users must match the search
          expect(allUsersMatchSearch(filtered, searchQuery)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13a: Email search returns only matching users
   */
  it('Property 13a: Email search returns only matching users', () => {
    fc.assert(
      fc.property(
        usersArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        (users, emailQuery) => {
          const filtered = filterUsers(users, { email: emailQuery });
          
          for (const user of filtered) {
            expect(user.email.toLowerCase()).toContain(emailQuery.toLowerCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13b: Username search returns only matching users
   */
  it('Property 13b: Username search returns only matching users', () => {
    fc.assert(
      fc.property(
        usersArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        (users, usernameQuery) => {
          const filtered = filterUsers(users, { username: usernameQuery });
          
          for (const user of filtered) {
            if (user.username) {
              expect(user.username.toLowerCase()).toContain(usernameQuery.toLowerCase());
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13c: Role filter returns only matching users
   */
  it('Property 13c: Role filter returns only matching users', () => {
    fc.assert(
      fc.property(
        usersArb,
        roleArb,
        (users, role) => {
          const filtered = filterUsers(users, { role });
          
          for (const user of filtered) {
            expect(user.role).toBe(role);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13d: Moderation status filter returns only matching users
   */
  it('Property 13d: Moderation status filter returns only matching users', () => {
    fc.assert(
      fc.property(
        usersArb,
        moderationStatusArb,
        (users, status) => {
          const filtered = filterUsers(users, { moderation_status: status });
          
          for (const user of filtered) {
            expect(user.moderation_status).toBe(status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13e: Empty filter returns all users
   */
  it('Property 13e: Empty filter returns all users', () => {
    fc.assert(
      fc.property(
        usersArb,
        (users) => {
          const filtered = filterUsers(users, {});
          expect(filtered.length).toBe(users.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 10: Cascade Effect on Ban', () => {
  /**
   * Feature: admin-moderation-system, Property 10: Cascade Effect on Ban
   * Validates: Requirements 3.3, 7.3
   * 
   * Property: For any user that is banned, all their active hackathons
   * (if organizer) SHALL be unpublished and logged.
   */
  it('Property 10: Organizer ban unpublishes all active hackathons', () => {
    fc.assert(
      fc.property(
        cascadeEffectInputArb,
        (input) => {
          // Force organizer with active hackathons
          const organizerInput: CascadeEffectInput = {
            ...input,
            isOrganizer: true,
            activeHackathonIds: input.activeHackathonIds.length > 0 
              ? input.activeHackathonIds 
              : [crypto.randomUUID()],
          };
          
          const result = determineCascadeEffects(organizerInput);
          
          // All active hackathons must be unpublished
          expect(result.shouldUnpublishHackathons).toBe(true);
          expect(result.hackathonsToUnpublish.length).toBe(organizerInput.activeHackathonIds.length);
          
          for (const hackathonId of organizerInput.activeHackathonIds) {
            expect(result.hackathonsToUnpublish).toContain(hackathonId);
          }
          
          expect(isValidCascadeEffect(organizerInput, result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10a: Non-organizer ban doesn't unpublish hackathons
   */
  it('Property 10a: Non-organizer ban does not unpublish hackathons', () => {
    fc.assert(
      fc.property(
        cascadeEffectInputArb,
        (input) => {
          const nonOrganizerInput: CascadeEffectInput = {
            ...input,
            isOrganizer: false,
            activeHackathonIds: [],
          };
          
          const result = determineCascadeEffects(nonOrganizerInput);
          
          expect(result.shouldUnpublishHackathons).toBe(false);
          expect(result.hackathonsToUnpublish.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10b: Ban removes user from all teams
   */
  it('Property 10b: Ban removes user from all teams', () => {
    fc.assert(
      fc.property(
        cascadeEffectInputArb,
        (input) => {
          if (input.teamIds.length === 0) return;
          
          const result = determineCascadeEffects(input);
          
          expect(result.shouldRemoveFromTeams).toBe(true);
          expect(result.teamsToRemoveFrom.length).toBe(input.teamIds.length);
          
          for (const teamId of input.teamIds) {
            expect(result.teamsToRemoveFrom).toContain(teamId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10c: Affected users are notified
   */
  it('Property 10c: Affected users are notified', () => {
    fc.assert(
      fc.property(
        cascadeEffectInputArb,
        (input) => {
          if (input.affectedUserIds.length === 0) return;
          
          const result = determineCascadeEffects(input);
          
          expect(result.shouldNotifyUsers).toBe(true);
          expect(result.usersToNotify.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10d: Cascade effect is always valid
   */
  it('Property 10d: Cascade effect is always valid', () => {
    fc.assert(
      fc.property(
        cascadeEffectInputArb,
        (input) => {
          const result = determineCascadeEffects(input);
          expect(isValidCascadeEffect(input, result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
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
        fc.boolean(), // autoApprovalEnabled
        (autoApprovalEnabled) => {
          const requiresReview = requiresManualReview(true, autoApprovalEnabled);
          
          // Flagged organizers always require review
          expect(requiresReview).toBe(true);
          expect(isValidReviewRequirement(true, requiresReview)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18a: Non-flagged organizers follow auto-approval setting
   */
  it('Property 18a: Non-flagged organizers follow auto-approval setting', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (autoApprovalEnabled) => {
          const requiresReview = requiresManualReview(false, autoApprovalEnabled);
          
          // Non-flagged organizers follow auto-approval
          expect(requiresReview).toBe(!autoApprovalEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18b: Review requirement is always valid
   */
  it('Property 18b: Review requirement is always valid', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isFlagged, autoApprovalEnabled) => {
          const requiresReview = requiresManualReview(isFlagged, autoApprovalEnabled);
          expect(isValidReviewRequirement(isFlagged, requiresReview)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('User Search Matching', () => {
  /**
   * Property: User matches search if any field contains query
   */
  it('User matches if email contains query', () => {
    fc.assert(
      fc.property(
        userWithDetailsArb,
        (user) => {
          // Extract part of email as query
          const query = user.email.substring(0, 3);
          expect(userMatchesSearch(user, query)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty query matches all users
   */
  it('Empty query matches all users', () => {
    fc.assert(
      fc.property(
        userWithDetailsArb,
        fc.constantFrom('', '   ', '\t'),
        (user, emptyQuery) => {
          expect(userMatchesSearch(user, emptyQuery)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Search is case-insensitive
   */
  it('Search is case-insensitive', () => {
    fc.assert(
      fc.property(
        userWithDetailsArb,
        (user) => {
          const query = user.email.substring(0, 3);
          const upperResult = userMatchesSearch(user, query.toUpperCase());
          const lowerResult = userMatchesSearch(user, query.toLowerCase());
          
          expect(upperResult).toBe(lowerResult);
        }
      ),
      { numRuns: 100 }
    );
  });
});
