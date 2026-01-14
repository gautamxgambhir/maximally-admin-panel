/**
 * Admin Hackathon API Functions
 * 
 * Provides API functions for admin hackathon management with advanced filtering,
 * detailed views, and moderation actions.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
 */

import { supabaseAdmin } from './supabase';
import { auditService } from './auditService';
import type {
  OrganizerHackathon,
  AdminHackathonFilters,
  AdminHackathonListResponse,
  AdminHackathonDetailResponse,
  UnpublishHackathonRequest,
  FeatureHackathonRequest,
  EditHackathonRequest,
  AdminHackathonActionResponse,
  OrganizerProfile,
} from '@/types/adminHackathon';
import type { AuditLogEntry } from '@/types/audit';
import { requiresManualReview } from './organizerManagementCore';

/**
 * Get admin hackathons with advanced filtering
 * 
 * Requirement 1.1: Display all organizer hackathons with filtering by status,
 * date range, organizer, registration count, and format.
 * 
 * @param filters - The filters to apply to the query
 * @returns Paginated hackathon list response
 */
export async function getAdminHackathons(
  filters: AdminHackathonFilters = {}
): Promise<AdminHackathonListResponse> {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 50, 100); // Cap at 100
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('organizer_hackathons')
    .select('*', { count: 'exact' });

  // Apply status filter
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  // Apply organizer filters
  if (filters.organizer_id) {
    query = query.eq('organizer_id', filters.organizer_id);
  }

  if (filters.organizer_email) {
    query = query.ilike('organizer_email', `%${filters.organizer_email}%`);
  }

  // Apply date range filters (on start_date)
  if (filters.date_from) {
    query = query.gte('start_date', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('start_date', filters.date_to);
  }

  // Apply format filter
  if (filters.format) {
    if (Array.isArray(filters.format)) {
      query = query.in('format', filters.format);
    } else {
      query = query.eq('format', filters.format);
    }
  }

  // Apply registration count filters
  if (filters.min_registrations !== undefined) {
    query = query.gte('registrations_count', filters.min_registrations);
  }

  if (filters.max_registrations !== undefined) {
    query = query.lte('registrations_count', filters.max_registrations);
  }

  // Apply featured filter
  if (filters.is_featured !== undefined) {
    query = query.eq('featured_badge', filters.is_featured);
  }

  // Apply search filter (searches hackathon name, tagline, description)
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `hackathon_name.ilike.${searchTerm},tagline.ilike.${searchTerm},description.ilike.${searchTerm}`
    );
  }

  // Order by created_at descending (newest first)
  query = query.order('created_at', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to query admin hackathons: ${error.message}`);
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    hackathons: (data ?? []) as OrganizerHackathon[],
    total,
    page,
    totalPages,
  };
}


/**
 * Get hackathon by ID with full details
 * 
 * Requirement 1.4: Display complete hackathon data including registrations count,
 * submissions count, teams count, judges added, organizer history, and timeline.
 * 
 * @param id - The hackathon ID
 * @returns Detailed hackathon response
 */
export async function getAdminHackathonById(
  id: number
): Promise<AdminHackathonDetailResponse> {
  // Get the hackathon
  const { data: hackathon, error: hackathonError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .eq('id', id)
    .single();

  if (hackathonError) {
    if (hackathonError.code === 'PGRST116') {
      throw new Error('Hackathon not found');
    }
    throw new Error(`Failed to get hackathon: ${hackathonError.message}`);
  }

  // Get registrations count
  const { count: registrationsCount, error: regError } = await supabaseAdmin
    .from('hackathon_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('hackathon_id', id);

  if (regError) {
    console.error('Failed to get registrations count:', regError);
  }

  // Get submissions count
  const { count: submissionsCount, error: subError } = await supabaseAdmin
    .from('hackathon_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('hackathon_id', id);

  if (subError) {
    console.error('Failed to get submissions count:', subError);
  }

  // Get teams count
  const { count: teamsCount, error: teamError } = await supabaseAdmin
    .from('hackathon_teams')
    .select('*', { count: 'exact', head: true })
    .eq('hackathon_id', id);

  if (teamError) {
    console.error('Failed to get teams count:', teamError);
  }

  // Get judges count
  const { count: judgesCount, error: judgeError } = await supabaseAdmin
    .from('hackathon_judges')
    .select('*', { count: 'exact', head: true })
    .eq('hackathon_id', id);

  if (judgeError) {
    console.error('Failed to get judges count:', judgeError);
  }

  // Get organizer profile info
  const organizerProfile = await getOrganizerProfile(hackathon.organizer_id);

  // Get audit log timeline for this hackathon
  const { data: timeline, error: timelineError } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .eq('target_type', 'hackathon')
    .eq('target_id', String(id))
    .order('created_at', { ascending: false })
    .limit(50);

  if (timelineError) {
    console.error('Failed to get audit timeline:', timelineError);
  }

  return {
    hackathon: hackathon as OrganizerHackathon,
    registrations_count: registrationsCount ?? 0,
    submissions_count: submissionsCount ?? 0,
    teams_count: teamsCount ?? 0,
    judges_count: judgesCount ?? 0,
    organizer: organizerProfile,
    timeline: (timeline ?? []) as AuditLogEntry[],
  };
}

/**
 * Get organizer profile with statistics
 * 
 * @param organizerId - The organizer ID
 * @returns Organizer profile with stats
 */
async function getOrganizerProfile(organizerId: string): Promise<OrganizerProfile> {
  // Get all hackathons by this organizer
  const { data: hackathons, error: hackathonsError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('id, status, registrations_count, organizer_email')
    .eq('organizer_id', organizerId);

  if (hackathonsError) {
    console.error('Failed to get organizer hackathons:', hackathonsError);
  }

  const allHackathons = hackathons ?? [];
  const publishedHackathons = allHackathons.filter(h => h.status === 'published' || h.status === 'ended');
  const rejectedHackathons = allHackathons.filter(h => h.status === 'rejected');
  const totalParticipants = allHackathons.reduce((sum, h) => sum + (h.registrations_count ?? 0), 0);

  // Get trust score if available
  const { data: trustScore, error: trustError } = await supabaseAdmin
    .from('organizer_trust_scores')
    .select('score, is_flagged, flag_reason')
    .eq('organizer_id', organizerId)
    .single();

  if (trustError && trustError.code !== 'PGRST116') {
    console.error('Failed to get organizer trust score:', trustError);
  }

  return {
    organizer_id: organizerId,
    organizer_email: allHackathons[0]?.organizer_email ?? '',
    total_hackathons: allHackathons.length,
    published_hackathons: publishedHackathons.length,
    rejected_hackathons: rejectedHackathons.length,
    total_participants: totalParticipants,
    trust_score: trustScore?.score,
    is_flagged: trustScore?.is_flagged ?? false,
    flag_reason: trustScore?.flag_reason ?? null,
  };
}

/**
 * Unpublish a hackathon
 * 
 * Requirement 1.3: Record the action in audit log, notify the organizer via email
 * with reason, and update hackathon status.
 * 
 * @param id - The hackathon ID
 * @param request - The unpublish request with reason
 * @param adminId - The admin's user ID
 * @param adminEmail - The admin's email
 * @returns Action response
 */
export async function unpublishHackathon(
  id: number,
  request: UnpublishHackathonRequest,
  adminId: string,
  adminEmail: string
): Promise<AdminHackathonActionResponse> {
  // Get current hackathon state
  const { data: currentHackathon, error: getError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .eq('id', id)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new Error('Hackathon not found');
    }
    throw new Error(`Failed to get hackathon: ${getError.message}`);
  }

  if (currentHackathon.status !== 'published') {
    throw new Error('Only published hackathons can be unpublished');
  }

  // Update hackathon status
  const { data: updatedHackathon, error: updateError } = await supabaseAdmin
    .from('organizer_hackathons')
    .update({
      status: 'unpublished',
      admin_notes: request.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to unpublish hackathon: ${updateError.message}`);
  }

  // Create audit log entry
  await auditService.createLog({
    action_type: 'hackathon_unpublished',
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'hackathon',
    target_id: String(id),
    reason: request.reason,
    before_state: currentHackathon as Record<string, unknown>,
    after_state: updatedHackathon as Record<string, unknown>,
  });

  // TODO: Send notification email to organizer if request.notify_organizer is true
  // TODO: Send notification to participants if request.notify_participants is true

  return {
    success: true,
    hackathon: updatedHackathon as OrganizerHackathon,
    message: 'Hackathon unpublished successfully',
  };
}

/**
 * Feature a hackathon
 * 
 * Requirement 1.2: Toggle featured status with audit logging.
 * 
 * @param id - The hackathon ID
 * @param request - The feature request with reason
 * @param adminId - The admin's user ID
 * @param adminEmail - The admin's email
 * @returns Action response
 */
export async function featureHackathon(
  id: number,
  request: FeatureHackathonRequest,
  adminId: string,
  adminEmail: string
): Promise<AdminHackathonActionResponse> {
  // Get current hackathon state
  const { data: currentHackathon, error: getError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .eq('id', id)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new Error('Hackathon not found');
    }
    throw new Error(`Failed to get hackathon: ${getError.message}`);
  }

  if (currentHackathon.featured_badge) {
    throw new Error('Hackathon is already featured');
  }

  // Update hackathon featured status
  const { data: updatedHackathon, error: updateError } = await supabaseAdmin
    .from('organizer_hackathons')
    .update({
      featured_badge: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to feature hackathon: ${updateError.message}`);
  }

  // Create audit log entry
  await auditService.createLog({
    action_type: 'hackathon_featured',
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'hackathon',
    target_id: String(id),
    reason: request.reason,
    before_state: currentHackathon as Record<string, unknown>,
    after_state: updatedHackathon as Record<string, unknown>,
  });

  return {
    success: true,
    hackathon: updatedHackathon as OrganizerHackathon,
    message: 'Hackathon featured successfully',
  };
}

/**
 * Unfeature a hackathon
 * 
 * Requirement 1.2: Toggle featured status with audit logging.
 * 
 * @param id - The hackathon ID
 * @param request - The unfeature request with reason
 * @param adminId - The admin's user ID
 * @param adminEmail - The admin's email
 * @returns Action response
 */
export async function unfeatureHackathon(
  id: number,
  request: FeatureHackathonRequest,
  adminId: string,
  adminEmail: string
): Promise<AdminHackathonActionResponse> {
  // Get current hackathon state
  const { data: currentHackathon, error: getError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .eq('id', id)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new Error('Hackathon not found');
    }
    throw new Error(`Failed to get hackathon: ${getError.message}`);
  }

  if (!currentHackathon.featured_badge) {
    throw new Error('Hackathon is not featured');
  }

  // Update hackathon featured status
  const { data: updatedHackathon, error: updateError } = await supabaseAdmin
    .from('organizer_hackathons')
    .update({
      featured_badge: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to unfeature hackathon: ${updateError.message}`);
  }

  // Create audit log entry
  await auditService.createLog({
    action_type: 'hackathon_unfeatured',
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'hackathon',
    target_id: String(id),
    reason: request.reason,
    before_state: currentHackathon as Record<string, unknown>,
    after_state: updatedHackathon as Record<string, unknown>,
  });

  return {
    success: true,
    hackathon: updatedHackathon as OrganizerHackathon,
    message: 'Hackathon unfeatured successfully',
  };
}

/**
 * Edit a hackathon directly
 * 
 * Requirement 1.6: Allow admins to edit any field with audit logging.
 * 
 * @param id - The hackathon ID
 * @param request - The edit request with updates and reason
 * @param adminId - The admin's user ID
 * @param adminEmail - The admin's email
 * @returns Action response
 */
export async function editHackathon(
  id: number,
  request: EditHackathonRequest,
  adminId: string,
  adminEmail: string
): Promise<AdminHackathonActionResponse> {
  // Get current hackathon state
  const { data: currentHackathon, error: getError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .eq('id', id)
    .single();

  if (getError) {
    if (getError.code === 'PGRST116') {
      throw new Error('Hackathon not found');
    }
    throw new Error(`Failed to get hackathon: ${getError.message}`);
  }

  // Remove id from updates if present (shouldn't be updated)
  const { id: _id, ...updates } = request.updates as any;

  // Add updated_at timestamp
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Update hackathon
  const { data: updatedHackathon, error: updateError } = await supabaseAdmin
    .from('organizer_hackathons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to edit hackathon: ${updateError.message}`);
  }

  // Create audit log entry
  await auditService.createLog({
    action_type: 'hackathon_edited',
    admin_id: adminId,
    admin_email: adminEmail,
    target_type: 'hackathon',
    target_id: String(id),
    reason: request.reason,
    before_state: currentHackathon as Record<string, unknown>,
    after_state: updatedHackathon as Record<string, unknown>,
  });

  return {
    success: true,
    hackathon: updatedHackathon as OrganizerHackathon,
    message: 'Hackathon edited successfully',
  };
}

/**
 * Check if a hackathon requires manual review based on organizer flag status
 * 
 * Requirement 7.4: Require manual review for flagged organizer submissions
 * 
 * Property 18: Flagged Organizer Review Requirement
 * For any hackathon submission from a flagged organizer, the submission
 * SHALL require manual review regardless of auto-approval settings.
 * 
 * @param hackathonId - The hackathon ID
 * @returns Object with review requirement info
 */
export async function checkHackathonReviewRequirement(
  hackathonId: number
): Promise<{
  hackathon_id: number;
  organizer_id: string;
  organizer_is_flagged: boolean;
  flag_reason: string | null;
  requires_manual_review: boolean;
}> {
  // Get the hackathon to find the organizer
  const { data: hackathon, error: hackathonError } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('organizer_id')
    .eq('id', hackathonId)
    .single();

  if (hackathonError) {
    if (hackathonError.code === 'PGRST116') {
      throw new Error('Hackathon not found');
    }
    throw new Error(`Failed to get hackathon: ${hackathonError.message}`);
  }

  const organizerId = hackathon.organizer_id;

  // Check if organizer is flagged
  const { data: trustData } = await supabaseAdmin
    .from('organizer_trust_scores')
    .select('is_flagged, flag_reason')
    .eq('organizer_id', organizerId)
    .single();

  const isFlagged = trustData?.is_flagged ?? false;
  const flagReason = trustData?.flag_reason ?? null;

  return {
    hackathon_id: hackathonId,
    organizer_id: organizerId,
    organizer_is_flagged: isFlagged,
    flag_reason: flagReason,
    requires_manual_review: requiresManualReview(isFlagged),
  };
}

/**
 * Get all pending hackathons with organizer flag status
 * 
 * This helps admins identify which pending hackathons are from flagged organizers
 * and require extra scrutiny during review.
 * 
 * Requirement 7.4: Display flag reason to reviewing admin
 * 
 * @returns List of pending hackathons with flag info
 */
export async function getPendingHackathonsWithFlagStatus(): Promise<Array<{
  hackathon: OrganizerHackathon;
  organizer_is_flagged: boolean;
  flag_reason: string | null;
  requires_manual_review: boolean;
}>> {
  // Get all pending hackathons
  const { data: hackathons, error } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get pending hackathons: ${error.message}`);
  }

  // Get flag status for each organizer
  const results = await Promise.all(
    (hackathons ?? []).map(async (hackathon) => {
      const { data: trustData } = await supabaseAdmin
        .from('organizer_trust_scores')
        .select('is_flagged, flag_reason')
        .eq('organizer_id', hackathon.organizer_id)
        .single();

      const isFlagged = trustData?.is_flagged ?? false;
      const flagReason = trustData?.flag_reason ?? null;

      return {
        hackathon: hackathon as OrganizerHackathon,
        organizer_is_flagged: isFlagged,
        flag_reason: flagReason,
        requires_manual_review: requiresManualReview(isFlagged),
      };
    })
  );

  return results;
}
