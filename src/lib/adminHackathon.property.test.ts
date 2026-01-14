/**
 * Property-Based Tests for Hackathon Filter Consistency
 * 
 * Feature: admin-moderation-system, Property 2: Hackathon Filter Consistency
 * Validates: Requirements 1.1, 2.2
 * 
 * Property: For any filter combination (status, date range, organizer, format),
 * the returned hackathons SHALL all match the specified filter criteria.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  applyFilters,
  verifyFilterConsistency,
  filterByStatus,
  filterByFormat,
  filterByOrganizerId,
  filterByOrganizerEmail,
  filterByDateRange,
  filterByRegistrationCount,
  filterByFeatured,
  filterBySearch,
  VALID_HACKATHON_STATUSES,
  VALID_HACKATHON_FORMATS,
} from './adminHackathonCore';
import type {
  OrganizerHackathon,
  OrganizerHackathonStatus,
  HackathonFormat,
  AdminHackathonFilters,
} from '@/types/adminHackathon';

/**
 * Arbitrary generator for valid hackathon statuses
 */
const validStatusArb = fc.constantFrom(...VALID_HACKATHON_STATUSES);

/**
 * Arbitrary generator for valid hackathon formats
 */
const validFormatArb = fc.constantFrom(...VALID_HACKATHON_FORMATS);

/**
 * Arbitrary generator for valid email addresses
 */
const emailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
  fc.constantFrom('example.com', 'test.org', 'organizer.io')
).map(([local, domain]) => `${local}@${domain}`);

/**
 * Arbitrary generator for organizer IDs
 */
const organizerIdArb = fc.string({ minLength: 5, maxLength: 30 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

/**
 * Arbitrary generator for hackathon names
 */
const hackathonNameArb = fc.string({ minLength: 3, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary generator for dates within a reasonable range
 */
const dateArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * Arbitrary generator for registration counts
 */
const registrationCountArb = fc.integer({ min: 0, max: 10000 });

/**
 * Arbitrary generator for a minimal OrganizerHackathon
 */
const hackathonArb: fc.Arbitrary<OrganizerHackathon> = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  organizer_id: organizerIdArb,
  organizer_email: emailArb,
  hackathon_name: hackathonNameArb,
  slug: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-z0-9-]+$/.test(s)),
  tagline: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: null }),
  start_date: dateArb,
  end_date: dateArb,
  format: validFormatArb,
  venue: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  registration_deadline: fc.option(dateArb, { nil: null }),
  duration: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  eligibility: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  team_size_min: fc.integer({ min: 1, max: 5 }),
  team_size_max: fc.integer({ min: 1, max: 10 }),
  registration_fee: fc.integer({ min: 0, max: 1000 }),
  max_participants: fc.option(fc.integer({ min: 10, max: 10000 }), { nil: null }),
  expected_participants: fc.option(fc.integer({ min: 10, max: 10000 }), { nil: null }),
  communication_channel: fc.option(fc.constantFrom('discord', 'slack', 'whatsapp'), { nil: null }),
  communication_link: fc.option(fc.webUrl(), { nil: null }),
  tracks: fc.constant('[]'),
  open_innovation: fc.boolean(),
  total_prize_pool: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  prize_breakdown: fc.constant('[]'),
  perks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  judging_criteria: fc.constant('[]'),
  judges_mentors: fc.constant('[]'),
  discord_link: fc.option(fc.webUrl(), { nil: null }),
  whatsapp_link: fc.option(fc.webUrl(), { nil: null }),
  website_url: fc.option(fc.webUrl(), { nil: null }),
  submission_platform: fc.constantFrom('maximally', 'devpost', 'other'),
  submission_platform_link: fc.option(fc.webUrl(), { nil: null }),
  contact_email: fc.option(emailArb, { nil: null }),
  key_rules: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  code_of_conduct: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  promo_video_link: fc.option(fc.webUrl(), { nil: null }),
  gallery_images: fc.array(fc.webUrl(), { maxLength: 5 }),
  cover_image: fc.option(fc.webUrl(), { nil: null }),
  featured_badge: fc.boolean(),
  verification_docs: fc.array(fc.webUrl(), { maxLength: 3 }),
  status: validStatusArb,
  publish_requested_at: fc.option(dateArb, { nil: null }),
  reviewed_at: fc.option(dateArb, { nil: null }),
  reviewed_by: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  rejection_reason: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  admin_notes: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  views_count: fc.integer({ min: 0, max: 100000 }),
  registrations_count: registrationCountArb,
  created_at: dateArb,
  updated_at: dateArb,
  rules_content: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  eligibility_criteria: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  submission_guidelines: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  judging_process: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  themes: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  sponsors: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  partners: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  faqs: fc.constant('[]'),
  require_approval: fc.boolean(),
  allow_team_changes: fc.boolean(),
  show_participant_count: fc.boolean(),
  submission_opens_at: fc.option(dateArb, { nil: null }),
  submission_closes_at: fc.option(dateArb, { nil: null }),
  results_announced_at: fc.option(dateArb, { nil: null }),
  hackathon_status: fc.constantFrom('draft', 'live', 'ended'),
  hackathon_logo: fc.option(fc.webUrl(), { nil: null }),
  winners_announced: fc.boolean(),
  winners_announced_at: fc.option(dateArb, { nil: null }),
  banner_image: fc.option(fc.webUrl(), { nil: null }),
  primary_color: fc.constant('#8B5CF6'),
  secondary_color: fc.constant('#EC4899'),
  accent_color: fc.constant('#06B6D4'),
  font_style: fc.option(fc.constantFrom('default', 'modern', 'retro', 'minimal'), { nil: null }),
  domains: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  gallery_published_at: fc.option(dateArb, { nil: null }),
});

/**
 * Arbitrary generator for an array of hackathons
 */
const hackathonsArb = fc.array(hackathonArb, { minLength: 0, maxLength: 50 });

/**
 * Arbitrary generator for AdminHackathonFilters
 */
const filtersArb: fc.Arbitrary<AdminHackathonFilters> = fc.record({
  status: fc.option(
    fc.oneof(
      validStatusArb,
      fc.array(validStatusArb, { minLength: 1, maxLength: 3 })
    ),
    { nil: undefined }
  ),
  organizer_id: fc.option(organizerIdArb, { nil: undefined }),
  organizer_email: fc.option(
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
    { nil: undefined }
  ),
  date_from: fc.option(dateArb, { nil: undefined }),
  date_to: fc.option(dateArb, { nil: undefined }),
  format: fc.option(
    fc.oneof(
      validFormatArb,
      fc.array(validFormatArb, { minLength: 1, maxLength: 3 })
    ),
    { nil: undefined }
  ),
  min_registrations: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
  max_registrations: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
  is_featured: fc.option(fc.boolean(), { nil: undefined }),
  search: fc.option(
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    { nil: undefined }
  ),
});

describe('Property 2: Hackathon Filter Consistency', () => {
  /**
   * Feature: admin-moderation-system, Property 2: Hackathon Filter Consistency
   * Validates: Requirements 1.1, 2.2
   * 
   * Property: For any filter combination, the returned hackathons SHALL all
   * match the specified filter criteria.
   */
  it('Property 2: All filtered hackathons match all specified filter criteria', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        filtersArb,
        (hackathons, filters) => {
          const filtered = applyFilters(hackathons, filters);
          
          // Verify that all filtered hackathons match all filter criteria
          const isConsistent = verifyFilterConsistency(filtered, filters);
          
          expect(isConsistent).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2a: Filtering by status returns only hackathons with matching status
   */
  it('Property 2a: Status filter returns only matching statuses', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        fc.oneof(
          validStatusArb.map(s => [s] as OrganizerHackathonStatus[]),
          fc.array(validStatusArb, { minLength: 1, maxLength: 3 })
        ),
        (hackathons, statuses) => {
          const filtered = filterByStatus(hackathons, statuses);
          
          // All filtered hackathons should have a status in the filter list
          for (const h of filtered) {
            expect(statuses).toContain(h.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2b: Filtering by format returns only hackathons with matching format
   */
  it('Property 2b: Format filter returns only matching formats', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        fc.oneof(
          validFormatArb.map(f => [f] as HackathonFormat[]),
          fc.array(validFormatArb, { minLength: 1, maxLength: 3 })
        ),
        (hackathons, formats) => {
          const filtered = filterByFormat(hackathons, formats);
          
          // All filtered hackathons should have a format in the filter list
          for (const h of filtered) {
            expect(formats).toContain(h.format);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2c: Filtering by organizer ID returns only hackathons from that organizer
   */
  it('Property 2c: Organizer ID filter returns only matching organizer', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        organizerIdArb,
        (hackathons, organizerId) => {
          const filtered = filterByOrganizerId(hackathons, organizerId);
          
          // All filtered hackathons should have the specified organizer ID
          for (const h of filtered) {
            expect(h.organizer_id).toBe(organizerId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2d: Filtering by organizer email returns only hackathons with matching email
   */
  it('Property 2d: Organizer email filter returns only matching emails (case-insensitive)', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        (hackathons, emailPart) => {
          const filtered = filterByOrganizerEmail(hackathons, emailPart);
          
          // All filtered hackathons should have the email part in their organizer email
          const lowerEmailPart = emailPart.toLowerCase();
          for (const h of filtered) {
            expect(h.organizer_email.toLowerCase()).toContain(lowerEmailPart);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2e: Filtering by date range returns only hackathons within range
   */
  it('Property 2e: Date range filter returns only hackathons within range', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        dateArb,
        dateArb,
        (hackathons, date1, date2) => {
          // Ensure date_from <= date_to
          const [dateFrom, dateTo] = date1 < date2 ? [date1, date2] : [date2, date1];
          
          const filtered = filterByDateRange(hackathons, dateFrom, dateTo);
          
          // All filtered hackathons should have start_date within range
          const fromDate = new Date(dateFrom);
          const toDate = new Date(dateTo);
          
          for (const h of filtered) {
            const startDate = new Date(h.start_date);
            expect(startDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
            expect(startDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2f: Filtering by registration count returns only hackathons within range
   */
  it('Property 2f: Registration count filter returns only hackathons within range', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 10000 }),
        (hackathons, count1, count2) => {
          // Ensure min <= max
          const [minReg, maxReg] = count1 <= count2 ? [count1, count2] : [count2, count1];
          
          const filtered = filterByRegistrationCount(hackathons, minReg, maxReg);
          
          // All filtered hackathons should have registrations_count within range
          for (const h of filtered) {
            expect(h.registrations_count).toBeGreaterThanOrEqual(minReg);
            expect(h.registrations_count).toBeLessThanOrEqual(maxReg);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2g: Filtering by featured status returns only matching hackathons
   */
  it('Property 2g: Featured filter returns only matching featured status', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        fc.boolean(),
        (hackathons, isFeatured) => {
          const filtered = filterByFeatured(hackathons, isFeatured);
          
          // All filtered hackathons should have the specified featured status
          for (const h of filtered) {
            expect(h.featured_badge).toBe(isFeatured);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2h: Filtering by search returns only hackathons matching search term
   */
  it('Property 2h: Search filter returns only hackathons matching search term', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        (hackathons, searchTerm) => {
          const filtered = filterBySearch(hackathons, searchTerm);
          
          // All filtered hackathons should match the search term in name, tagline, or description
          const lowerSearch = searchTerm.toLowerCase();
          for (const h of filtered) {
            const matchesName = h.hackathon_name.toLowerCase().includes(lowerSearch);
            const matchesTagline = h.tagline?.toLowerCase().includes(lowerSearch) ?? false;
            const matchesDescription = h.description?.toLowerCase().includes(lowerSearch) ?? false;
            
            expect(matchesName || matchesTagline || matchesDescription).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Filter Preservation Properties', () => {
  /**
   * Property: Empty filter returns all hackathons
   */
  it('Empty filter returns all hackathons', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        (hackathons) => {
          const filtered = applyFilters(hackathons, {});
          
          expect(filtered.length).toBe(hackathons.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering never increases the result count
   */
  it('Filtering never increases the result count', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        filtersArb,
        (hackathons, filters) => {
          const filtered = applyFilters(hackathons, filters);
          
          expect(filtered.length).toBeLessThanOrEqual(hackathons.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering is idempotent
   */
  it('Filtering is idempotent', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        filtersArb,
        (hackathons, filters) => {
          const filtered1 = applyFilters(hackathons, filters);
          const filtered2 = applyFilters(filtered1, filters);
          
          // Applying the same filter twice should give the same result
          expect(filtered2.length).toBe(filtered1.length);
          expect(filtered2).toEqual(filtered1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering preserves hackathon data integrity
   */
  it('Filtering preserves hackathon data integrity', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        filtersArb,
        (hackathons, filters) => {
          const filtered = applyFilters(hackathons, filters);
          
          // All filtered hackathons should be exact references from the original array
          for (const h of filtered) {
            expect(hackathons).toContain(h);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Filter Combination Properties', () => {
  /**
   * Property: Combining filters is more restrictive than individual filters
   */
  it('Combining filters is more restrictive than individual filters', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        validStatusArb,
        validFormatArb,
        (hackathons, status, format) => {
          const filteredByStatus = filterByStatus(hackathons, status);
          const filteredByFormat = filterByFormat(hackathons, format);
          const filteredByBoth = applyFilters(hackathons, { status, format });
          
          // Combined filter should be at most as large as each individual filter
          expect(filteredByBoth.length).toBeLessThanOrEqual(filteredByStatus.length);
          expect(filteredByBoth.length).toBeLessThanOrEqual(filteredByFormat.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Order of filter application doesn't matter
   */
  it('Order of filter application does not matter', () => {
    fc.assert(
      fc.property(
        hackathonsArb,
        validStatusArb,
        validFormatArb,
        (hackathons, status, format) => {
          // Apply status then format
          const result1 = filterByFormat(filterByStatus(hackathons, status), format);
          
          // Apply format then status
          const result2 = filterByStatus(filterByFormat(hackathons, format), status);
          
          // Results should be the same (same elements, possibly different order)
          expect(result1.length).toBe(result2.length);
          expect(new Set(result1.map(h => h.id))).toEqual(new Set(result2.map(h => h.id)));
        }
      ),
      { numRuns: 100 }
    );
  });
});
