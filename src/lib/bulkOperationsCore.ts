/**
 * Bulk Operations Core Logic
 * 
 * Pure functions for bulk operations validation and result processing.
 * These functions are designed to be testable without database dependencies.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import type {
  BulkHackathonRequest,
  BulkUserRequest,
  BulkActionResponse,
  BulkActionItemResult,
  BulkOperationValidationResult,
  BulkHackathonAction,
  BulkUserAction,
} from '@/types/bulkOperations';

import {
  VALID_BULK_HACKATHON_ACTIONS,
  VALID_BULK_USER_ACTIONS,
  DURATION_REQUIRED_ACTIONS,
} from '@/types/bulkOperations';

/**
 * Validate bulk hackathon request
 * 
 * @param request - The bulk hackathon request to validate
 * @returns Validation result with errors if invalid
 */
export function validateBulkHackathonRequest(
  request: Partial<BulkHackathonRequest>
): BulkOperationValidationResult {
  const errors: string[] = [];

  // Check ids
  if (!request.ids) {
    errors.push('ids is required');
  } else if (!Array.isArray(request.ids)) {
    errors.push('ids must be an array');
  } else if (request.ids.length === 0) {
    errors.push('ids cannot be empty');
  } else {
    // Validate each id is a number
    const invalidIds = request.ids.filter(id => typeof id !== 'number' || isNaN(id));
    if (invalidIds.length > 0) {
      errors.push('all ids must be valid numbers');
    }
  }

  // Check action
  if (!request.action) {
    errors.push('action is required');
  } else if (!isValidBulkHackathonAction(request.action)) {
    errors.push(`action must be one of: ${VALID_BULK_HACKATHON_ACTIONS.join(', ')}`);
  }

  // Check reason
  if (!request.reason) {
    errors.push('reason is required');
  } else if (typeof request.reason !== 'string') {
    errors.push('reason must be a string');
  } else if (request.reason.trim().length === 0) {
    errors.push('reason cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate bulk user request
 * 
 * @param request - The bulk user request to validate
 * @returns Validation result with errors if invalid
 */
export function validateBulkUserRequest(
  request: Partial<BulkUserRequest>
): BulkOperationValidationResult {
  const errors: string[] = [];

  // Check ids
  if (!request.ids) {
    errors.push('ids is required');
  } else if (!Array.isArray(request.ids)) {
    errors.push('ids must be an array');
  } else if (request.ids.length === 0) {
    errors.push('ids cannot be empty');
  } else {
    // Validate each id is a non-empty string (UUID format)
    const invalidIds = request.ids.filter(id => typeof id !== 'string' || id.trim().length === 0);
    if (invalidIds.length > 0) {
      errors.push('all ids must be valid non-empty strings');
    }
  }

  // Check action
  if (!request.action) {
    errors.push('action is required');
  } else if (!isValidBulkUserAction(request.action)) {
    errors.push(`action must be one of: ${VALID_BULK_USER_ACTIONS.join(', ')}`);
  } else {
    // Check duration for actions that require it
    if (DURATION_REQUIRED_ACTIONS.includes(request.action)) {
      if (request.duration_hours === undefined || request.duration_hours === null) {
        errors.push(`duration_hours is required for ${request.action} action`);
      } else if (typeof request.duration_hours !== 'number' || request.duration_hours <= 0) {
        errors.push('duration_hours must be a positive number');
      }
    }
  }

  // Check reason
  if (!request.reason) {
    errors.push('reason is required');
  } else if (typeof request.reason !== 'string') {
    errors.push('reason must be a string');
  } else if (request.reason.trim().length === 0) {
    errors.push('reason cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid bulk hackathon action
 * 
 * @param action - The action to check
 * @returns True if valid
 */
export function isValidBulkHackathonAction(action: string): action is BulkHackathonAction {
  return VALID_BULK_HACKATHON_ACTIONS.includes(action as BulkHackathonAction);
}

/**
 * Check if a string is a valid bulk user action
 * 
 * @param action - The action to check
 * @returns True if valid
 */
export function isValidBulkUserAction(action: string): action is BulkUserAction {
  return VALID_BULK_USER_ACTIONS.includes(action as BulkUserAction);
}

/**
 * Create a bulk action response from individual results
 * 
 * Property 8: Bulk Action Result Accuracy
 * For any bulk action performed, the sum of successful and failed operations
 * SHALL equal the total number of items selected.
 * 
 * @param results - Array of individual item results
 * @returns Aggregated bulk action response
 */
export function createBulkActionResponse(
  results: BulkActionItemResult[]
): BulkActionResponse {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  return {
    total,
    successful,
    failed,
    results,
  };
}

/**
 * Verify that a bulk action response satisfies the accuracy property
 * 
 * Property 8: Bulk Action Result Accuracy
 * For any bulk action performed, the sum of successful and failed operations
 * SHALL equal the total number of items selected.
 * 
 * @param response - The bulk action response to verify
 * @returns True if the response satisfies the accuracy property
 */
export function verifyBulkActionResultAccuracy(response: BulkActionResponse): boolean {
  // Property 8: successful + failed === total
  return response.successful + response.failed === response.total;
}

/**
 * Create a success result for a single item
 * 
 * @param id - The item ID
 * @returns Success result
 */
export function createSuccessResult(id: string | number): BulkActionItemResult {
  return {
    id,
    success: true,
  };
}

/**
 * Create a failure result for a single item
 * 
 * @param id - The item ID
 * @param error - The error message
 * @returns Failure result
 */
export function createFailureResult(id: string | number, error: string): BulkActionItemResult {
  return {
    id,
    success: false,
    error,
  };
}

/**
 * Get failed items from a bulk action response
 * 
 * Requirement 4.4: Option to retry failed items
 * 
 * @param response - The bulk action response
 * @returns Array of failed item IDs
 */
export function getFailedItemIds(response: BulkActionResponse): (string | number)[] {
  return response.results
    .filter(r => !r.success)
    .map(r => r.id);
}

/**
 * Get successful items from a bulk action response
 * 
 * @param response - The bulk action response
 * @returns Array of successful item IDs
 */
export function getSuccessfulItemIds(response: BulkActionResponse): (string | number)[] {
  return response.results
    .filter(r => r.success)
    .map(r => r.id);
}

/**
 * Merge multiple bulk action responses into one
 * Useful for retry operations
 * 
 * @param responses - Array of bulk action responses
 * @returns Merged response
 */
export function mergeBulkActionResponses(
  responses: BulkActionResponse[]
): BulkActionResponse {
  const allResults: BulkActionItemResult[] = [];
  
  for (const response of responses) {
    allResults.push(...response.results);
  }

  return createBulkActionResponse(allResults);
}

/**
 * Check if all items in a bulk action succeeded
 * 
 * @param response - The bulk action response
 * @returns True if all items succeeded
 */
export function isFullSuccess(response: BulkActionResponse): boolean {
  return response.failed === 0 && response.total > 0;
}

/**
 * Check if all items in a bulk action failed
 * 
 * @param response - The bulk action response
 * @returns True if all items failed
 */
export function isFullFailure(response: BulkActionResponse): boolean {
  return response.successful === 0 && response.total > 0;
}

/**
 * Check if a bulk action had partial success
 * 
 * @param response - The bulk action response
 * @returns True if some items succeeded and some failed
 */
export function isPartialSuccess(response: BulkActionResponse): boolean {
  return response.successful > 0 && response.failed > 0;
}

