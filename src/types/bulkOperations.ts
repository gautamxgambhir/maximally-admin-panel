/**
 * Bulk Operations Types for Admin Moderation System
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

/**
 * Valid bulk actions for hackathons
 * Requirement 4.1: Support approve, reject, unpublish, delete, feature, unfeature
 */
export type BulkHackathonAction =
  | 'approve'
  | 'reject'
  | 'unpublish'
  | 'delete'
  | 'feature'
  | 'unfeature';

/**
 * Valid bulk actions for users
 * Requirement 4.2: Support warn, mute, suspend, ban, unban
 */
export type BulkUserAction =
  | 'warn'
  | 'mute'
  | 'suspend'
  | 'ban'
  | 'unban';

/**
 * Request for bulk hackathon operations
 * Requirement 4.1: Enable bulk actions on multiple hackathons
 */
export interface BulkHackathonRequest {
  ids: number[];
  action: BulkHackathonAction;
  reason: string;
}

/**
 * Request for bulk user operations
 * Requirement 4.2: Enable bulk actions on multiple users
 */
export interface BulkUserRequest {
  ids: string[];
  action: BulkUserAction;
  reason: string;
  duration_hours?: number; // For mute and suspend actions
}

/**
 * Result for a single item in a bulk operation
 */
export interface BulkActionItemResult {
  id: string | number;
  success: boolean;
  error?: string;
}

/**
 * Response for bulk operations
 * Requirement 4.4: Display detailed results showing successful operations,
 * failed operations with reasons, and option to retry failed items
 */
export interface BulkActionResponse {
  total: number;
  successful: number;
  failed: number;
  results: BulkActionItemResult[];
}

/**
 * Validation result for bulk operation input
 */
export interface BulkOperationValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid hackathon actions array for validation
 */
export const VALID_BULK_HACKATHON_ACTIONS: BulkHackathonAction[] = [
  'approve',
  'reject',
  'unpublish',
  'delete',
  'feature',
  'unfeature',
];

/**
 * Valid user actions array for validation
 */
export const VALID_BULK_USER_ACTIONS: BulkUserAction[] = [
  'warn',
  'mute',
  'suspend',
  'ban',
  'unban',
];

/**
 * Actions that require duration parameter
 */
export const DURATION_REQUIRED_ACTIONS: BulkUserAction[] = ['mute', 'suspend'];

