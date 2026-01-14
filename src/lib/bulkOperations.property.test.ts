/**
 * Property-Based Tests for Bulk Operations
 * 
 * Feature: admin-moderation-system
 * 
 * Property 8: Bulk Action Result Accuracy
 * Validates: Requirements 4.4
 * 
 * For any bulk action performed, the sum of successful and failed operations
 * SHALL equal the total number of items selected.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateBulkHackathonRequest,
  validateBulkUserRequest,
  createBulkActionResponse,
  verifyBulkActionResultAccuracy,
  createSuccessResult,
  createFailureResult,
  getFailedItemIds,
  getSuccessfulItemIds,
  mergeBulkActionResponses,
  isFullSuccess,
  isFullFailure,
  isPartialSuccess,
  isValidBulkHackathonAction,
  isValidBulkUserAction,
} from './bulkOperationsCore';
import type {
  BulkHackathonRequest,
  BulkUserRequest,
  BulkActionItemResult,
  BulkActionResponse,
} from '@/types/bulkOperations';
import {
  VALID_BULK_HACKATHON_ACTIONS,
  VALID_BULK_USER_ACTIONS,
  DURATION_REQUIRED_ACTIONS,
} from '@/types/bulkOperations';

/**
 * Arbitrary generators
 */
const hackathonIdArb = fc.integer({ min: 1, max: 1000000 });
const userIdArb = fc.uuid();
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);
const validHackathonActionArb = fc.constantFrom(...VALID_BULK_HACKATHON_ACTIONS);
const validUserActionArb = fc.constantFrom(...VALID_BULK_USER_ACTIONS);
const durationHoursArb = fc.integer({ min: 1, max: 720 }); // 1 hour to 30 days

/**
 * Arbitrary generator for BulkActionItemResult
 */
const bulkActionItemResultArb: fc.Arbitrary<BulkActionItemResult> = fc.oneof(
  // Success result with number id
  fc.record({
    id: hackathonIdArb as fc.Arbitrary<string | number>,
    success: fc.constant(true),
  }),
  // Success result with string id
  fc.record({
    id: userIdArb as fc.Arbitrary<string | number>,
    success: fc.constant(true),
  }),
  // Failure result with number id
  fc.record({
    id: hackathonIdArb as fc.Arbitrary<string | number>,
    success: fc.constant(false),
    error: nonEmptyStringArb,
  }),
  // Failure result with string id
  fc.record({
    id: userIdArb as fc.Arbitrary<string | number>,
    success: fc.constant(false),
    error: nonEmptyStringArb,
  })
);

/**
 * Arbitrary generator for array of BulkActionItemResults
 */
const bulkActionItemResultsArb = fc.array(bulkActionItemResultArb, { minLength: 0, maxLength: 100 });

/**
 * Arbitrary generator for valid BulkHackathonRequest
 */
const validBulkHackathonRequestArb: fc.Arbitrary<BulkHackathonRequest> = fc.record({
  ids: fc.array(hackathonIdArb, { minLength: 1, maxLength: 50 }),
  action: validHackathonActionArb,
  reason: nonEmptyStringArb,
});

/**
 * Arbitrary generator for valid BulkUserRequest (without duration-required actions)
 */
const validBulkUserRequestNoDurationArb: fc.Arbitrary<BulkUserRequest> = fc.record({
  ids: fc.array(userIdArb, { minLength: 1, maxLength: 50 }),
  action: fc.constantFrom('warn', 'ban', 'unban'),
  reason: nonEmptyStringArb,
});

/**
 * Arbitrary generator for valid BulkUserRequest (with duration-required actions)
 */
const validBulkUserRequestWithDurationArb: fc.Arbitrary<BulkUserRequest> = fc.record({
  ids: fc.array(userIdArb, { minLength: 1, maxLength: 50 }),
  action: fc.constantFrom('mute', 'suspend'),
  reason: nonEmptyStringArb,
  duration_hours: durationHoursArb,
});

/**
 * Combined arbitrary for all valid BulkUserRequests
 */
const validBulkUserRequestArb = fc.oneof(
  validBulkUserRequestNoDurationArb,
  validBulkUserRequestWithDurationArb
);

describe('Property 8: Bulk Action Result Accuracy', () => {
  /**
   * Feature: admin-moderation-system, Property 8: Bulk Action Result Accuracy
   * Validates: Requirements 4.4
   * 
   * Property: For any bulk action performed, the sum of successful and failed
   * operations SHALL equal the total number of items selected.
   */
  it('Property 8: successful + failed === total for any bulk action response', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb,
        (results) => {
          const response = createBulkActionResponse(results);
          
          // Property 8: successful + failed === total
          expect(response.successful + response.failed).toBe(response.total);
          expect(verifyBulkActionResultAccuracy(response)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8a: Total equals the number of input results
   */
  it('Property 8a: Total equals the number of input results', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb,
        (results) => {
          const response = createBulkActionResponse(results);
          expect(response.total).toBe(results.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8b: Successful count equals number of success results
   */
  it('Property 8b: Successful count equals number of success results', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb,
        (results) => {
          const response = createBulkActionResponse(results);
          const expectedSuccessful = results.filter(r => r.success).length;
          expect(response.successful).toBe(expectedSuccessful);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8c: Failed count equals number of failure results
   */
  it('Property 8c: Failed count equals number of failure results', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb,
        (results) => {
          const response = createBulkActionResponse(results);
          const expectedFailed = results.filter(r => !r.success).length;
          expect(response.failed).toBe(expectedFailed);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8d: Results array is preserved in response
   */
  it('Property 8d: Results array is preserved in response', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb,
        (results) => {
          const response = createBulkActionResponse(results);
          expect(response.results).toEqual(results);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8e: Empty results produce zero counts
   */
  it('Property 8e: Empty results produce zero counts', () => {
    const response = createBulkActionResponse([]);
    expect(response.total).toBe(0);
    expect(response.successful).toBe(0);
    expect(response.failed).toBe(0);
    expect(verifyBulkActionResultAccuracy(response)).toBe(true);
  });

  /**
   * Property 8f: All success results produce zero failed count
   */
  it('Property 8f: All success results produce zero failed count', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.oneof(hackathonIdArb, userIdArb) as fc.Arbitrary<string | number>,
            success: fc.constant(true),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (results) => {
          const response = createBulkActionResponse(results);
          expect(response.failed).toBe(0);
          expect(response.successful).toBe(response.total);
          expect(isFullSuccess(response)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8g: All failure results produce zero successful count
   */
  it('Property 8g: All failure results produce zero successful count', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.oneof(hackathonIdArb, userIdArb) as fc.Arbitrary<string | number>,
            success: fc.constant(false),
            error: nonEmptyStringArb,
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (results) => {
          const response = createBulkActionResponse(results);
          expect(response.successful).toBe(0);
          expect(response.failed).toBe(response.total);
          expect(isFullFailure(response)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Bulk Operation Helper Functions', () => {
  /**
   * Property: getFailedItemIds returns only failed item IDs
   */
  it('getFailedItemIds returns only failed item IDs', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb,
        (results) => {
          const response = createBulkActionResponse(results);
          const failedIds = getFailedItemIds(response);
          
          expect(failedIds.length).toBe(response.failed);
          
          // All returned IDs should be from failed results
          const failedResultIds = results.filter(r => !r.success).map(r => r.id);
          expect(failedIds).toEqual(failedResultIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getSuccessfulItemIds returns only successful item IDs
   */
  it('getSuccessfulItemIds returns only successful item IDs', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb,
        (results) => {
          const response = createBulkActionResponse(results);
          const successfulIds = getSuccessfulItemIds(response);
          
          expect(successfulIds.length).toBe(response.successful);
          
          // All returned IDs should be from successful results
          const successResultIds = results.filter(r => r.success).map(r => r.id);
          expect(successfulIds).toEqual(successResultIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Merging responses preserves total accuracy
   */
  it('Merging responses preserves total accuracy', () => {
    fc.assert(
      fc.property(
        fc.array(bulkActionItemResultsArb, { minLength: 1, maxLength: 5 }),
        (resultArrays) => {
          const responses = resultArrays.map(createBulkActionResponse);
          const merged = mergeBulkActionResponses(responses);
          
          // Merged total should equal sum of all results
          const expectedTotal = resultArrays.reduce((sum, arr) => sum + arr.length, 0);
          expect(merged.total).toBe(expectedTotal);
          
          // Property 8 should still hold
          expect(verifyBulkActionResultAccuracy(merged)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isPartialSuccess is true only when both success and failure exist
   */
  it('isPartialSuccess is true only when both success and failure exist', () => {
    fc.assert(
      fc.property(
        bulkActionItemResultsArb.filter(arr => arr.length > 0),
        (results) => {
          const response = createBulkActionResponse(results);
          const hasSuccess = results.some(r => r.success);
          const hasFailure = results.some(r => !r.success);
          
          expect(isPartialSuccess(response)).toBe(hasSuccess && hasFailure);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Bulk Hackathon Request Validation', () => {
  /**
   * Property: Valid hackathon requests pass validation
   */
  it('Valid hackathon requests pass validation', () => {
    fc.assert(
      fc.property(
        validBulkHackathonRequestArb,
        (request) => {
          const result = validateBulkHackathonRequest(request);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing ids fails validation
   */
  it('Missing ids fails validation', () => {
    fc.assert(
      fc.property(
        validHackathonActionArb,
        nonEmptyStringArb,
        (action, reason) => {
          const result = validateBulkHackathonRequest({ action, reason });
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('ids'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty ids array fails validation
   */
  it('Empty ids array fails validation', () => {
    fc.assert(
      fc.property(
        validHackathonActionArb,
        nonEmptyStringArb,
        (action, reason) => {
          const result = validateBulkHackathonRequest({ ids: [], action, reason });
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('empty'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid action fails validation
   */
  it('Invalid action fails validation', () => {
    fc.assert(
      fc.property(
        fc.array(hackathonIdArb, { minLength: 1, maxLength: 10 }),
        fc.string().filter(s => !VALID_BULK_HACKATHON_ACTIONS.includes(s as any)),
        nonEmptyStringArb,
        (ids, action, reason) => {
          const result = validateBulkHackathonRequest({ ids, action: action as any, reason });
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('action'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing reason fails validation
   */
  it('Missing reason fails validation', () => {
    fc.assert(
      fc.property(
        fc.array(hackathonIdArb, { minLength: 1, maxLength: 10 }),
        validHackathonActionArb,
        (ids, action) => {
          const result = validateBulkHackathonRequest({ ids, action });
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('reason'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All valid hackathon actions are recognized
   */
  it('All valid hackathon actions are recognized', () => {
    for (const action of VALID_BULK_HACKATHON_ACTIONS) {
      expect(isValidBulkHackathonAction(action)).toBe(true);
    }
  });
});

describe('Bulk User Request Validation', () => {
  /**
   * Property: Valid user requests pass validation
   */
  it('Valid user requests pass validation', () => {
    fc.assert(
      fc.property(
        validBulkUserRequestArb,
        (request) => {
          const result = validateBulkUserRequest(request);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing ids fails validation
   */
  it('Missing ids fails validation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('warn', 'ban', 'unban'),
        nonEmptyStringArb,
        (action, reason) => {
          const result = validateBulkUserRequest({ action, reason });
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('ids'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Duration-required actions without duration fail validation
   */
  it('Duration-required actions without duration fail validation', () => {
    fc.assert(
      fc.property(
        fc.array(userIdArb, { minLength: 1, maxLength: 10 }),
        fc.constantFrom(...DURATION_REQUIRED_ACTIONS),
        nonEmptyStringArb,
        (ids, action, reason) => {
          const result = validateBulkUserRequest({ ids, action, reason });
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('duration_hours'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Duration-required actions with valid duration pass validation
   */
  it('Duration-required actions with valid duration pass validation', () => {
    fc.assert(
      fc.property(
        fc.array(userIdArb, { minLength: 1, maxLength: 10 }),
        fc.constantFrom(...DURATION_REQUIRED_ACTIONS),
        nonEmptyStringArb,
        durationHoursArb,
        (ids, action, reason, duration_hours) => {
          const result = validateBulkUserRequest({ ids, action, reason, duration_hours });
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All valid user actions are recognized
   */
  it('All valid user actions are recognized', () => {
    for (const action of VALID_BULK_USER_ACTIONS) {
      expect(isValidBulkUserAction(action)).toBe(true);
    }
  });
});

describe('Result Creation Functions', () => {
  /**
   * Property: createSuccessResult always creates success result
   */
  it('createSuccessResult always creates success result', () => {
    fc.assert(
      fc.property(
        fc.oneof(hackathonIdArb, userIdArb) as fc.Arbitrary<string | number>,
        (id) => {
          const result = createSuccessResult(id);
          expect(result.success).toBe(true);
          expect(result.id).toBe(id);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: createFailureResult always creates failure result with error
   */
  it('createFailureResult always creates failure result with error', () => {
    fc.assert(
      fc.property(
        fc.oneof(hackathonIdArb, userIdArb) as fc.Arbitrary<string | number>,
        nonEmptyStringArb,
        (id, error) => {
          const result = createFailureResult(id, error);
          expect(result.success).toBe(false);
          expect(result.id).toBe(id);
          expect(result.error).toBe(error);
        }
      ),
      { numRuns: 100 }
    );
  });
});

