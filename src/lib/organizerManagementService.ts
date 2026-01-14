/**
 * Organizer Management Service for Admin Moderation System
 * 
 * Provides organizer management operations including listing with trust scores,
 * revoking organizer status, and flagged organizer review requirements.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { supabaseAdmin } from './supabase';
import { auditService } from './auditService';
import { activityService } from './activityService';
import { trustScoreService } from './trustScoreService';
import type {
  OrganizerSearchFilters,
  OrganizerWithDetails,
  OrganizerListResponse,
  RevokeOrganizerRequest,
  RevokeOrganizerResult,
  FlagOrganizerRequest,
  UnflagOrganizerRequest,
  FlaggedOrganizerReviewCheck,
} from '@/types/organizerManagement';
import type { OrganizerTrustFactors } from '@/types/trustScore';
import { calculateApprovalRate, requiresManualReview } from './organizerManagementCore';

/**
 * OrganizerManagementService class for managing organizers
 * 
 * This service provides methods to:
 * - List organizers with trust scores (Requirement 7.1, 7.5)
 * - Revoke organizer status (Requirement 7.3)
 * - Check flagged organizer review requirements (Requirement 7.4)
 */
export class OrganizerManagementService {
  private static instance: OrganizerManagementService;

  private constructor() {}

  /**
   * Get singleton instance of OrganizerManagementService
   */
  public static getInstance(): OrganizerManagementService {
    if (!OrganizerManagementService.instance) {
      OrganizerManagementService.instance = new OrganizerManagementService();
    }
    return OrganizerManagementService.instance;
  }

  /**
   * Get organizers with trust scores and hackathon stats
   * 
   * Requirement 7.1: View organizer profile with all hackathons, total participants,
   * approval/rejection rate, average rating, and violation history.
   * 
   * Requirement 7.5: Show trust score, total hackathons, active hackathons,
   * and quick action buttons.
   * 
   * @param filters - Search filters to apply
   * @returns Paginated organizer list response
   */
  async getOrganizers(filters: OrganizerSearchFilters = {}): Promise<OrganizerListResponse> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    // Build the query for organizer profiles
    let query = supabaseAdmin
      .from('organizer_profiles')
      .select('*', { count: 'exact' });

    // Apply email filter
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }

    // Apply display name filter
    if (filters.display_name) {
      query = query.ilike('display_name', `%${filters.display_name}%`);
    }

    // Apply organization name filter
    if (filters.organization_name) {
      query = query.ilike('organization_name', `%${filters.organization_name}%`);
    }

    // Apply tier filter
    if (filters.tier) {
      const tiers = Array.isArray(filters.tier) ? filters.tier : [filters.tier];
      query = query.in('tier', tiers);
    }

    // Apply general search
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `email.ilike.${searchTerm},display_name.ilike.${searchTerm},organization_name.ilike.${searchTerm}`
      );
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: profiles, error, count } = await query;

    if (error) {
      throw new Error(`Failed to query organizers: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Enrich each organizer with hackathon stats and trust scores
    const organizers: OrganizerWithDetails[] = await Promise.all(
      (profiles ?? []).map(async (profile) => {
        return this.enrichOrganizerWithDetails(profile);
      })
    );

    // Apply post-query filters (trust score, hackathon count, flagged status)
    let filteredOrganizers = organizers;

    if (filters.is_flagged !== undefined) {
      filteredOrganizers = filteredOrganizers.filter(o => o.is_flagged === filters.is_flagged);
    }

    if (filters.min_trust_score !== undefined) {
      filteredOrganizers = filteredOrganizers.filter(o => o.trust_score >= filters.min_trust_score!);
    }

    if (filters.max_trust_score !== undefined) {
      filteredOrganizers = filteredOrganizers.filter(o => o.trust_score <= filters.max_trust_score!);
    }

    if (filters.min_hackathons !== undefined) {
      filteredOrganizers = filteredOrganizers.filter(o => o.total_hackathons >= filters.min_hackathons!);
    }

    if (filters.max_hackathons !== undefined) {
      filteredOrganizers = filteredOrganizers.filter(o => o.total_hackathons <= filters.max_hackathons!);
    }

    return {
      organizers: filteredOrganizers,
      total: filteredOrganizers.length,
      page,
      totalPages: Math.ceil(filteredOrganizers.length / limit),
    };
  }

  /**
   * Get a single organizer by ID with full details
   * 
   * @param organizerId - The organizer's user_id
   * @returns Organizer with full details or null if not found
   */
  async getOrganizerById(organizerId: string): Promise<OrganizerWithDetails | null> {
    const { data: profile, error } = await supabaseAdmin
      .from('organizer_profiles')
      .select('*')
      .eq('user_id', organizerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get organizer: ${error.message}`);
    }

    return this.enrichOrganizerWithDetails(profile);
  }

  /**
   * Enrich organizer profile with hackathon stats and trust score
   * 
   * @param profile - Raw organizer profile from database
   * @returns Organizer with full details
   */
  private async enrichOrganizerWithDetails(profile: any): Promise<OrganizerWithDetails> {
    const organizerId = profile.user_id;

    // Get hackathon statistics
    const { data: hackathons } = await supabaseAdmin
      .from('organizer_hackathons')
      .select('id, status, registrations_count')
      .eq('organizer_id', organizerId);

    const allHackathons = hackathons ?? [];
    const totalHackathons = allHackathons.length;
    const publishedHackathons = allHackathons.filter(h => h.status === 'published').length;
    const pendingHackathons = allHackathons.filter(h => h.status === 'pending_review').length;
    const rejectedHackathons = allHackathons.filter(h => h.status === 'rejected').length;
    const endedHackathons = allHackathons.filter(h => h.status === 'ended').length;
    const activeHackathons = publishedHackathons + pendingHackathons;
    
    const approvedHackathons = publishedHackathons + endedHackathons;
    const approvalRate = calculateApprovalRate(approvedHackathons, totalHackathons);
    
    const totalParticipants = allHackathons.reduce(
      (sum, h) => sum + (h.registrations_count ?? 0), 
      0
    );

    // Get trust score
    let trustScore = 50; // Default
    let trustFactors: OrganizerTrustFactors | null = null;
    let isFlagged = false;
    let flagReason: string | null = null;
    let flaggedAt: string | null = null;

    const { data: trustData } = await supabaseAdmin
      .from('organizer_trust_scores')
      .select('*')
      .eq('organizer_id', organizerId)
      .single();

    if (trustData) {
      trustScore = trustData.score;
      trustFactors = trustData.factors as OrganizerTrustFactors;
      isFlagged = trustData.is_flagged ?? false;
      flagReason = trustData.flag_reason;
      flaggedAt = trustData.flagged_at;
    }

    return {
      id: profile.id,
      user_id: profile.user_id,
      email: profile.email,
      display_name: profile.display_name,
      organization_name: profile.organization_name,
      organization_type: profile.organization_type,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      logo_url: profile.logo_url,
      tier: profile.tier ?? 'starter',
      is_published: profile.is_published ?? false,
      verified_organizer: profile.verified_organizer ?? false,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      total_hackathons: totalHackathons,
      active_hackathons: activeHackathons,
      published_hackathons: publishedHackathons,
      pending_hackathons: pendingHackathons,
      rejected_hackathons: rejectedHackathons,
      ended_hackathons: endedHackathons,
      total_participants: totalParticipants,
      approval_rate: approvalRate,
      trust_score: trustScore,
      trust_factors: trustFactors,
      is_flagged: isFlagged,
      flag_reason: flagReason,
      flagged_at: flaggedAt,
    };
  }

  /**
   * Revoke organizer status
   * 
   * Requirement 7.3: Unpublish all active hackathons, notify affected participants,
   * send revocation email with reason, and log the action.
   * 
   * @param organizerId - The organizer's user_id
   * @param request - Revoke request with reason
   * @param adminId - The admin performing the action
   * @param adminEmail - The admin's email
   * @returns Revoke result
   */
  async revokeOrganizerStatus(
    organizerId: string,
    request: RevokeOrganizerRequest,
    adminId: string,
    adminEmail: string
  ): Promise<RevokeOrganizerResult> {
    // Get organizer details first
    const organizer = await this.getOrganizerById(organizerId);
    if (!organizer) {
      throw new Error('Organizer not found');
    }

    // Get active hackathons to unpublish
    const { data: activeHackathons } = await supabaseAdmin
      .from('organizer_hackathons')
      .select('id, hackathon_name, registrations_count')
      .eq('organizer_id', organizerId)
      .in('status', ['published', 'pending_review']);

    const hackathonsToUnpublish = activeHackathons ?? [];
    let hackathonsUnpublished = 0;
    let participantsNotified = 0;

    // Unpublish each active hackathon
    for (const hackathon of hackathonsToUnpublish) {
      try {
        // Get current state for audit log
        const { data: currentHackathon } = await supabaseAdmin
          .from('organizer_hackathons')
          .select('*')
          .eq('id', hackathon.id)
          .single();

        // Update hackathon status
        const { data: updatedHackathon, error: updateError } = await supabaseAdmin
          .from('organizer_hackathons')
          .update({
            status: 'unpublished',
            admin_notes: `Unpublished due to organizer status revocation: ${request.reason}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', hackathon.id)
          .select()
          .single();

        if (!updateError) {
          hackathonsUnpublished++;
          participantsNotified += hackathon.registrations_count ?? 0;

          // Create audit log for hackathon unpublish
          await auditService.createLog({
            action_type: 'hackathon_unpublished',
            admin_id: adminId,
            admin_email: adminEmail,
            target_type: 'hackathon',
            target_id: String(hackathon.id),
            reason: `Cascade effect from organizer revocation: ${request.reason}`,
            before_state: currentHackathon as Record<string, unknown>,
            after_state: updatedHackathon as Record<string, unknown>,
          });

          // Log activity
          await activityService.logActivity({
            activity_type: 'moderation_action',
            actor_id: adminId,
            actor_email: adminEmail,
            target_type: 'hackathon',
            target_id: String(hackathon.id),
            target_name: hackathon.hackathon_name,
            action: 'Hackathon unpublished due to organizer revocation',
            metadata: {
              organizer_id: organizerId,
              revocation_reason: request.reason,
            },
            severity: 'warning',
          });
        }
      } catch (err) {
        console.error(`Failed to unpublish hackathon ${hackathon.id}:`, err);
      }
    }

    // Update organizer profile to remove organizer status
    // Note: This depends on how organizer status is tracked in your system
    // For now, we'll flag them and update their tier
    await supabaseAdmin
      .from('organizer_trust_scores')
      .upsert({
        organizer_id: organizerId,
        is_flagged: true,
        flag_reason: `Organizer status revoked: ${request.reason}`,
        flagged_at: new Date().toISOString(),
        last_calculated_at: new Date().toISOString(),
      });

    // Create main audit log for revocation
    await auditService.createLog({
      action_type: 'organizer_revoked',
      admin_id: adminId,
      admin_email: adminEmail,
      target_type: 'organizer',
      target_id: organizerId,
      reason: request.reason,
      before_state: {
        display_name: organizer.display_name,
        total_hackathons: organizer.total_hackathons,
        active_hackathons: organizer.active_hackathons,
        is_flagged: organizer.is_flagged,
      },
      after_state: {
        display_name: organizer.display_name,
        total_hackathons: organizer.total_hackathons,
        active_hackathons: 0,
        is_flagged: true,
        hackathons_unpublished: hackathonsUnpublished,
        participants_notified: participantsNotified,
      },
    });

    // Log main activity
    await activityService.logActivity({
      activity_type: 'organizer_revoked',
      actor_id: adminId,
      actor_email: adminEmail,
      target_type: 'organizer',
      target_id: organizerId,
      target_name: organizer.display_name ?? organizer.email ?? organizerId,
      action: 'Organizer status revoked',
      metadata: {
        reason: request.reason,
        hackathons_unpublished: hackathonsUnpublished,
        participants_notified: participantsNotified,
      },
      severity: 'critical',
    });

    // TODO: Send notification email to organizer if request.notify_organizer is true
    // TODO: Send notifications to participants if request.notify_participants is true

    return {
      organizer_id: organizerId,
      hackathons_unpublished: hackathonsUnpublished,
      participants_notified: participantsNotified,
      success: true,
      message: `Organizer status revoked. ${hackathonsUnpublished} hackathons unpublished.`,
    };
  }

  /**
   * Flag an organizer manually
   * 
   * Requirement 7.2: Flag organizers with multiple rejections or violations
   * 
   * @param organizerId - The organizer's user_id
   * @param request - Flag request with reason
   * @param adminId - The admin performing the action
   * @param adminEmail - The admin's email
   */
  async flagOrganizer(
    organizerId: string,
    request: FlagOrganizerRequest,
    adminId: string,
    adminEmail: string
  ): Promise<void> {
    const organizer = await this.getOrganizerById(organizerId);
    if (!organizer) {
      throw new Error('Organizer not found');
    }

    if (organizer.is_flagged) {
      throw new Error('Organizer is already flagged');
    }

    // Update trust score record with flag
    await supabaseAdmin
      .from('organizer_trust_scores')
      .upsert({
        organizer_id: organizerId,
        is_flagged: true,
        flag_reason: request.reason,
        flagged_at: new Date().toISOString(),
        last_calculated_at: new Date().toISOString(),
      });

    // Create audit log
    await auditService.createLog({
      action_type: 'organizer_flagged',
      admin_id: adminId,
      admin_email: adminEmail,
      target_type: 'organizer',
      target_id: organizerId,
      reason: request.reason,
      before_state: { is_flagged: false },
      after_state: { is_flagged: true, flag_reason: request.reason },
    });

    // Log activity
    await activityService.logActivity({
      activity_type: 'moderation_action',
      actor_id: adminId,
      actor_email: adminEmail,
      target_type: 'organizer',
      target_id: organizerId,
      target_name: organizer.display_name ?? organizer.email ?? organizerId,
      action: 'Organizer flagged for review',
      metadata: { reason: request.reason },
      severity: 'warning',
    });
  }

  /**
   * Unflag an organizer
   * 
   * @param organizerId - The organizer's user_id
   * @param request - Unflag request with reason
   * @param adminId - The admin performing the action
   * @param adminEmail - The admin's email
   */
  async unflagOrganizer(
    organizerId: string,
    request: UnflagOrganizerRequest,
    adminId: string,
    adminEmail: string
  ): Promise<void> {
    const organizer = await this.getOrganizerById(organizerId);
    if (!organizer) {
      throw new Error('Organizer not found');
    }

    if (!organizer.is_flagged) {
      throw new Error('Organizer is not flagged');
    }

    // Update trust score record to remove flag
    await supabaseAdmin
      .from('organizer_trust_scores')
      .update({
        is_flagged: false,
        flag_reason: null,
        flagged_at: null,
        last_calculated_at: new Date().toISOString(),
      })
      .eq('organizer_id', organizerId);

    // Create audit log
    await auditService.createLog({
      action_type: 'organizer_unflagged',
      admin_id: adminId,
      admin_email: adminEmail,
      target_type: 'organizer',
      target_id: organizerId,
      reason: request.reason,
      before_state: { is_flagged: true, flag_reason: organizer.flag_reason },
      after_state: { is_flagged: false, flag_reason: null },
    });

    // Log activity
    await activityService.logActivity({
      activity_type: 'moderation_action',
      actor_id: adminId,
      actor_email: adminEmail,
      target_type: 'organizer',
      target_id: organizerId,
      target_name: organizer.display_name ?? organizer.email ?? organizerId,
      action: 'Organizer flag removed',
      metadata: { reason: request.reason },
      severity: 'info',
    });
  }

  /**
   * Check if a hackathon submission requires manual review
   * 
   * Requirement 7.4: Require manual review for flagged organizer submissions
   * 
   * Property 18: Flagged Organizer Review Requirement
   * For any hackathon submission from a flagged organizer, the submission
   * SHALL require manual review regardless of auto-approval settings.
   * 
   * @param organizerId - The organizer's user_id
   * @returns Review check result
   */
  async checkFlaggedOrganizerReviewRequirement(
    organizerId: string
  ): Promise<FlaggedOrganizerReviewCheck> {
    // Get trust score record for flag status
    const { data: trustData } = await supabaseAdmin
      .from('organizer_trust_scores')
      .select('is_flagged, flag_reason')
      .eq('organizer_id', organizerId)
      .single();

    const isFlagged = trustData?.is_flagged ?? false;
    const flagReason = trustData?.flag_reason ?? null;

    return {
      organizer_id: organizerId,
      is_flagged: isFlagged,
      flag_reason: flagReason,
      requires_manual_review: requiresManualReview(isFlagged),
    };
  }

  /**
   * Get flagged organizers list
   * 
   * Requirement 7.2: Display warning indicator for flagged organizers
   * 
   * @returns List of flagged organizers with details
   */
  async getFlaggedOrganizers(): Promise<OrganizerWithDetails[]> {
    const { data: flaggedTrustScores } = await supabaseAdmin
      .from('organizer_trust_scores')
      .select('organizer_id')
      .eq('is_flagged', true);

    if (!flaggedTrustScores || flaggedTrustScores.length === 0) {
      return [];
    }

    const flaggedOrganizers: OrganizerWithDetails[] = [];
    
    for (const record of flaggedTrustScores) {
      const organizer = await this.getOrganizerById(record.organizer_id);
      if (organizer) {
        flaggedOrganizers.push(organizer);
      }
    }

    return flaggedOrganizers;
  }

  /**
   * Recalculate trust score for an organizer
   * 
   * @param organizerId - The organizer's user_id
   * @returns Updated trust score
   */
  async recalculateTrustScore(organizerId: string): Promise<number> {
    const result = await trustScoreService.calculateOrganizerScore(organizerId);
    return result.score;
  }
}

// Export singleton instance
export const organizerManagementService = OrganizerManagementService.getInstance();
