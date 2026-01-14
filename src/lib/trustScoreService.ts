/**
 * Trust Score Service for Admin Moderation System
 * 
 * Provides trust score calculation and management.
 * Requirements: 3.6, 7.2, 7.5
 */

import { supabaseAdmin } from './supabase';
import type {
  UserTrustScore,
  OrganizerTrustScore,
  UserTrustFactors,
  OrganizerTrustFactors,
  TrustScoreResult,
  AutoFlagResult,
} from '@/types/trustScore';
import {
  calculateUserTrustScore,
  calculateOrganizerTrustScore,
  shouldAutoFlagOrganizer,
  createDefaultUserFactors,
  createDefaultOrganizerFactors,
} from './trustScoreCore';

/**
 * TrustScoreService class for managing trust scores
 */
export class TrustScoreService {
  private static instance: TrustScoreService;

  private constructor() {}

  public static getInstance(): TrustScoreService {
    if (!TrustScoreService.instance) {
      TrustScoreService.instance = new TrustScoreService();
    }
    return TrustScoreService.instance;
  }

  /**
   * Calculate and update user trust score
   * 
   * Requirement 3.6: Calculate from account age, hackathons, reports,
   * moderation history.
   */
  async calculateUserScore(userId: string): Promise<TrustScoreResult> {
    // Fetch user data to calculate factors
    const factors = await this.fetchUserFactors(userId);
    const result = calculateUserTrustScore(factors);

    // Update or insert trust score
    await supabaseAdmin
      .from('user_trust_scores')
      .upsert({
        user_id: userId,
        score: result.score,
        factors,
        last_calculated_at: new Date().toISOString(),
      });

    return result;
  }

  /**
   * Calculate and update organizer trust score
   * 
   * Requirement 7.5: Calculate from hackathon history, approval rate, violations.
   */
  async calculateOrganizerScore(organizerId: string): Promise<TrustScoreResult> {
    const factors = await this.fetchOrganizerFactors(organizerId);
    const result = calculateOrganizerTrustScore(factors);

    // Check for auto-flagging
    const flagResult = shouldAutoFlagOrganizer(factors);

    // Update or insert trust score
    await supabaseAdmin
      .from('organizer_trust_scores')
      .upsert({
        organizer_id: organizerId,
        score: result.score,
        factors,
        is_flagged: flagResult.shouldFlag,
        flag_reason: flagResult.reason,
        flagged_at: flagResult.shouldFlag ? new Date().toISOString() : null,
        last_calculated_at: new Date().toISOString(),
      });

    return result;
  }

  /**
   * Get user trust score
   */
  async getUserTrustScore(userId: string): Promise<UserTrustScore | null> {
    const { data, error } = await supabaseAdmin
      .from('user_trust_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get user trust score: ${error.message}`);
    }

    return data as UserTrustScore;
  }

  /**
   * Get organizer trust score
   */
  async getOrganizerTrustScore(organizerId: string): Promise<OrganizerTrustScore | null> {
    const { data, error } = await supabaseAdmin
      .from('organizer_trust_scores')
      .select('*')
      .eq('organizer_id', organizerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get organizer trust score: ${error.message}`);
    }

    return data as OrganizerTrustScore;
  }

  /**
   * Check if organizer should be auto-flagged
   * 
   * Requirement 7.2: Flag organizers with 3+ rejections or violations.
   */
  async checkOrganizerAutoFlag(organizerId: string): Promise<AutoFlagResult> {
    const factors = await this.fetchOrganizerFactors(organizerId);
    return shouldAutoFlagOrganizer(factors);
  }

  /**
   * Get flagged organizers
   */
  async getFlaggedOrganizers(): Promise<OrganizerTrustScore[]> {
    const { data, error } = await supabaseAdmin
      .from('organizer_trust_scores')
      .select('*')
      .eq('is_flagged', true)
      .order('flagged_at', { ascending: false });

    if (error) throw new Error(`Failed to get flagged organizers: ${error.message}`);
    return (data ?? []) as OrganizerTrustScore[];
  }

  /**
   * Fetch user factors from database
   */
  private async fetchUserFactors(userId: string): Promise<UserTrustFactors> {
    const factors = createDefaultUserFactors();

    // Get profile for account age and email verification
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('created_at, is_verified')
      .eq('id', userId)
      .single();

    if (profile) {
      const createdAt = new Date(profile.created_at);
      factors.account_age_days = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      factors.verified_email = profile.is_verified ?? false;
    }

    // Count successful hackathon participations
    const { count: hackathonCount } = await supabaseAdmin
      .from('hackathon_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    factors.successful_hackathons = hackathonCount ?? 0;

    // Count reports received (from moderation queue)
    const { count: reportsCount } = await supabaseAdmin
      .from('moderation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'user')
      .eq('target_id', userId);

    factors.reports_received = reportsCount ?? 0;

    // Count moderation actions against user (from audit logs)
    const { count: moderationCount } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'user')
      .eq('target_id', userId)
      .in('action_type', ['user_warned', 'user_muted', 'user_suspended', 'user_banned']);

    factors.moderation_actions = moderationCount ?? 0;

    return factors;
  }

  /**
   * Fetch organizer factors from database
   */
  private async fetchOrganizerFactors(organizerId: string): Promise<OrganizerTrustFactors> {
    const factors = createDefaultOrganizerFactors();

    // Get organizer profile for account age
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .eq('id', organizerId)
      .single();

    if (profile) {
      const createdAt = new Date(profile.created_at);
      factors.account_age_days = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Count hackathons by status
    const { data: hackathons } = await supabaseAdmin
      .from('organizer_hackathons')
      .select('status')
      .eq('organizer_id', organizerId);

    if (hackathons) {
      factors.total_hackathons = hackathons.length;
      factors.approved_hackathons = hackathons.filter(h => 
        h.status === 'published' || h.status === 'ended'
      ).length;
      factors.rejected_hackathons = hackathons.filter(h => 
        h.status === 'rejected'
      ).length;
    }

    // Count total participants
    const { data: registrations } = await supabaseAdmin
      .from('organizer_hackathons')
      .select('id')
      .eq('organizer_id', organizerId);

    if (registrations && registrations.length > 0) {
      const hackathonIds = registrations.map(h => h.id);
      const { count: participantCount } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('*', { count: 'exact', head: true })
        .in('hackathon_id', hackathonIds);

      factors.total_participants = participantCount ?? 0;
    }

    // Count violations from audit logs
    const { count: violationCount } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'organizer')
      .eq('target_id', organizerId)
      .in('action_type', ['organizer_warned', 'organizer_violation', 'hackathon_unpublished']);

    factors.violations = violationCount ?? 0;

    return factors;
  }
}

export const trustScoreService = TrustScoreService.getInstance();
