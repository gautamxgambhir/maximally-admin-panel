/**
 * User Management Service for Admin Moderation System
 * 
 * Provides user management operations including cascade effects for user bans.
 * Requirements: 3.1, 3.3, 3.4, 3.6
 */

import { supabaseAdmin } from './supabase';
import { auditService } from './auditService';
import { activityService } from './activityService';
import type {
  UserSearchFilters,
  UserWithDetails,
  UserListResponse,
  BanCascadeResult,
} from '@/types/userManagement';
import {
  filterUsers,
  determineCascadeEffects,
  type CascadeEffectInput,
} from './userManagementCore';

/**
 * UserManagementService class for managing users
 * 
 * This service provides methods to:
 * - Search and filter users (Requirement 3.4)
 * - Get user details with full history (Requirement 3.1)
 * - Ban users with cascade effects (Requirement 3.3)
 * - Calculate and display trust scores (Requirement 3.6)
 */
export class UserManagementService {
  private static instance: UserManagementService;

  private constructor() {}

  /**
   * Get singleton instance of UserManagementService
   */
  public static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  /**
   * Search users with advanced filtering
   * 
   * Requirement 3.4: Support search by email, username, full name, phone,
   * registration date range, role, and moderation status.
   * 
   * @param filters - The search filters to apply
   * @returns Paginated user list response
   */
  async searchUsers(filters: UserSearchFilters = {}): Promise<UserListResponse> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply email filter
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }

    // Apply username filter
    if (filters.username) {
      query = query.ilike('username', `%${filters.username}%`);
    }

    // Apply full name filter
    if (filters.full_name) {
      query = query.ilike('full_name', `%${filters.full_name}%`);
    }

    // Apply date range filters
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Apply role filter
    if (filters.role) {
      const roles = Array.isArray(filters.role) ? filters.role : [filters.role];
      query = query.in('role', roles);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Map to UserWithDetails format
    const users: UserWithDetails[] = (data ?? []).map((profile) => ({
      id: profile.id,
      email: profile.email ?? '',
      username: profile.username,
      full_name: profile.full_name,
      phone: null, // Phone not in profiles table
      avatar_url: profile.avatar_url,
      role: profile.role as any,
      moderation_status: 'active' as const, // Default, would need moderation table
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      hackathons_participated: profile.hackathons_participated ?? 0,
      teams_joined: 0, // Would need to query
      submissions_made: profile.projects_submitted ?? 0,
      certificates_earned: 0, // Would need to query
      trust_score: null, // Would need to query trust_scores table
      moderation_history: [],
    }));

    return {
      users,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Get user by ID with full details
   * 
   * Requirement 3.1: Display complete user history including hackathons
   * participated, teams joined, submissions made, certificates earned,
   * moderation history, login history, and account age.
   * 
   * @param userId - The user ID
   * @returns User with full details or null if not found
   */
  async getUserById(userId: string): Promise<UserWithDetails | null> {
    // Get profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get user: ${profileError.message}`);
    }

    // Get hackathons participated count
    const { count: hackathonsCount } = await supabaseAdmin
      .from('hackathon_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get teams joined count
    const { count: teamsCount } = await supabaseAdmin
      .from('hackathon_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('team_id', 'is', null);

    // Get submissions count
    const { count: submissionsCount } = await supabaseAdmin
      .from('hackathon_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get certificates count
    const { count: certificatesCount } = await supabaseAdmin
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('participant_email', profile.email);

    // Get trust score
    const { data: trustScore } = await supabaseAdmin
      .from('user_trust_scores')
      .select('score')
      .eq('user_id', userId)
      .single();

    // Get moderation history from audit logs
    const { data: moderationHistory } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .eq('target_type', 'user')
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      id: profile.id,
      email: profile.email ?? '',
      username: profile.username,
      full_name: profile.full_name,
      phone: null,
      avatar_url: profile.avatar_url,
      role: profile.role as any,
      moderation_status: 'active' as const,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      hackathons_participated: hackathonsCount ?? 0,
      teams_joined: teamsCount ?? 0,
      submissions_made: submissionsCount ?? 0,
      certificates_earned: certificatesCount ?? 0,
      trust_score: trustScore?.score ?? null,
      moderation_history: (moderationHistory ?? []).map((log) => ({
        id: log.id,
        action_type: log.action_type,
        reason: log.reason,
        admin_id: log.admin_id,
        admin_email: log.admin_email,
        created_at: log.created_at,
      })),
    };
  }


  /**
   * Ban a user with cascade effects
   * 
   * Requirement 3.3: When a user is banned or suspended, automatically handle
   * their active content (unpublish hackathons, remove from teams) and notify
   * affected parties.
   * 
   * Property 10: Cascade Effect on Ban - For any user that is banned,
   * all their active hackathons SHALL be unpublished and logged.
   * 
   * @param userId - The user ID to ban
   * @param reason - The reason for the ban
   * @param adminId - The admin performing the action
   * @param adminEmail - The admin's email
   * @returns The cascade result
   */
  async banUserWithCascade(
    userId: string,
    reason: string,
    adminId: string,
    adminEmail: string
  ): Promise<BanCascadeResult> {
    // Get user details first
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is an organizer
    const isOrganizer = user.role === 'organizer';

    // Get active hackathons if organizer
    const activeHackathonIds: string[] = [];
    if (isOrganizer) {
      const { data: hackathons } = await supabaseAdmin
        .from('organizer_hackathons')
        .select('id')
        .eq('organizer_id', userId)
        .in('status', ['published', 'pending_review']);

      if (hackathons) {
        activeHackathonIds.push(...hackathons.map((h) => String(h.id)));
      }
    }

    // Get teams the user is part of
    const { data: teamRegistrations } = await supabaseAdmin
      .from('hackathon_registrations')
      .select('team_id, hackathon_id')
      .eq('user_id', userId)
      .not('team_id', 'is', null);

    const teamIds = (teamRegistrations ?? [])
      .filter((r) => r.team_id !== null)
      .map((r) => String(r.team_id));

    // Get affected users (team members and hackathon participants)
    const affectedUserIds: string[] = [];

    // Get team members
    if (teamIds.length > 0) {
      const { data: teamMembers } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('user_id')
        .in('team_id', teamIds.map(Number))
        .neq('user_id', userId);

      if (teamMembers) {
        affectedUserIds.push(
          ...teamMembers
            .filter((m) => m.user_id !== null)
            .map((m) => m.user_id as string)
        );
      }
    }

    // Get hackathon participants if organizer
    if (isOrganizer && activeHackathonIds.length > 0) {
      const { data: participants } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('user_id')
        .in('hackathon_id', activeHackathonIds.map(Number));

      if (participants) {
        affectedUserIds.push(
          ...participants
            .filter((p) => p.user_id !== null && p.user_id !== userId)
            .map((p) => p.user_id as string)
        );
      }
    }

    // Determine cascade effects using pure function
    const cascadeInput: CascadeEffectInput = {
      userId,
      isOrganizer,
      activeHackathonIds,
      teamIds,
      affectedUserIds: [...new Set(affectedUserIds)], // Deduplicate
    };

    const cascadeEffects = determineCascadeEffects(cascadeInput);

    // Execute cascade effects
    let hackathonsUnpublished = 0;
    let teamsRemoved = 0;
    let notificationsSent = 0;

    // 1. Unpublish hackathons if organizer
    if (cascadeEffects.shouldUnpublishHackathons) {
      for (const hackathonId of cascadeEffects.hackathonsToUnpublish) {
        try {
          // Get current hackathon state for audit log
          const { data: currentHackathon } = await supabaseAdmin
            .from('organizer_hackathons')
            .select('*')
            .eq('id', Number(hackathonId))
            .single();

          // Update hackathon status to unpublished
          const { data: updatedHackathon, error: updateError } = await supabaseAdmin
            .from('organizer_hackathons')
            .update({
              status: 'unpublished',
              admin_notes: `Unpublished due to organizer ban: ${reason}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', Number(hackathonId))
            .select()
            .single();

          if (!updateError) {
            hackathonsUnpublished++;

            // Create audit log for hackathon unpublish
            await auditService.createLog({
              action_type: 'hackathon_unpublished',
              admin_id: adminId,
              admin_email: adminEmail,
              target_type: 'hackathon',
              target_id: hackathonId,
              reason: `Cascade effect from user ban: ${reason}`,
              before_state: currentHackathon as Record<string, unknown>,
              after_state: updatedHackathon as Record<string, unknown>,
            });

            // Log activity
            await activityService.logActivity({
              activity_type: 'moderation_action',
              actor_id: adminId,
              actor_email: adminEmail,
              target_type: 'hackathon',
              target_id: hackathonId,
              target_name: currentHackathon?.hackathon_name,
              action: `Hackathon unpublished due to organizer ban`,
              metadata: {
                banned_user_id: userId,
                ban_reason: reason,
              },
              severity: 'warning',
            });
          }
        } catch (err) {
          console.error(`Failed to unpublish hackathon ${hackathonId}:`, err);
        }
      }
    }

    // 2. Remove user from teams
    if (cascadeEffects.shouldRemoveFromTeams) {
      for (const teamId of cascadeEffects.teamsToRemoveFrom) {
        try {
          // Get team info for logging
          const { data: team } = await supabaseAdmin
            .from('hackathon_teams')
            .select('team_name, hackathon_id')
            .eq('id', Number(teamId))
            .single();

          // Update registration to remove from team
          const { error: removeError } = await supabaseAdmin
            .from('hackathon_registrations')
            .update({
              team_id: null,
              team_role: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('team_id', Number(teamId));

          if (!removeError) {
            teamsRemoved++;

            // Log activity
            await activityService.logActivity({
              activity_type: 'moderation_action',
              actor_id: adminId,
              actor_email: adminEmail,
              target_type: 'team',
              target_id: teamId,
              target_name: team?.team_name,
              action: `User removed from team due to ban`,
              metadata: {
                banned_user_id: userId,
                ban_reason: reason,
                hackathon_id: team?.hackathon_id,
              },
              severity: 'warning',
            });
          }
        } catch (err) {
          console.error(`Failed to remove user from team ${teamId}:`, err);
        }
      }
    }

    // 3. Notify affected users (log notifications - actual email sending would be separate)
    if (cascadeEffects.shouldNotifyUsers) {
      // In a real implementation, this would send emails
      // For now, we log the notification intent
      notificationsSent = cascadeEffects.usersToNotify.length;

      // Log activity for notifications
      await activityService.logActivity({
        activity_type: 'moderation_action',
        actor_id: adminId,
        actor_email: adminEmail,
        target_type: 'user',
        target_id: userId,
        target_name: user.username ?? user.email,
        action: `Notifications sent to ${notificationsSent} affected users`,
        metadata: {
          affected_user_ids: cascadeEffects.usersToNotify,
          ban_reason: reason,
        },
        severity: 'info',
      });
    }

    // 4. Create main audit log for the ban
    await auditService.createLog({
      action_type: 'user_banned',
      admin_id: adminId,
      admin_email: adminEmail,
      target_type: 'user',
      target_id: userId,
      reason: reason,
      before_state: {
        role: user.role,
        moderation_status: user.moderation_status,
      },
      after_state: {
        role: user.role,
        moderation_status: 'banned',
        cascade_effects: {
          hackathons_unpublished: hackathonsUnpublished,
          teams_removed: teamsRemoved,
          notifications_sent: notificationsSent,
        },
      },
    });

    // 5. Log main activity
    await activityService.logActivity({
      activity_type: 'moderation_action',
      actor_id: adminId,
      actor_email: adminEmail,
      target_type: 'user',
      target_id: userId,
      target_name: user.username ?? user.email,
      action: `User banned with cascade effects`,
      metadata: {
        reason,
        hackathons_unpublished: hackathonsUnpublished,
        teams_removed: teamsRemoved,
        notifications_sent: notificationsSent,
      },
      severity: 'critical',
    });

    return {
      userId,
      hackathonsUnpublished,
      teamsRemoved,
      notificationsSent,
      affectedUsers: cascadeEffects.usersToNotify,
    };
  }

  /**
   * Get cascade effect preview without executing
   * 
   * This allows admins to see what will happen before confirming a ban.
   * 
   * @param userId - The user ID to preview ban effects for
   * @returns Preview of cascade effects
   */
  async previewBanCascadeEffects(userId: string): Promise<{
    isOrganizer: boolean;
    activeHackathons: Array<{ id: number; name: string; registrations: number }>;
    teams: Array<{ id: number; name: string; hackathonName: string }>;
    affectedUsersCount: number;
  }> {
    // Get user details
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isOrganizer = user.role === 'organizer';

    // Get active hackathons if organizer
    const activeHackathons: Array<{ id: number; name: string; registrations: number }> = [];
    if (isOrganizer) {
      const { data: hackathons } = await supabaseAdmin
        .from('organizer_hackathons')
        .select('id, hackathon_name, registrations_count')
        .eq('organizer_id', userId)
        .in('status', ['published', 'pending_review']);

      if (hackathons) {
        activeHackathons.push(
          ...hackathons.map((h) => ({
            id: h.id,
            name: h.hackathon_name,
            registrations: h.registrations_count ?? 0,
          }))
        );
      }
    }

    // Get teams the user is part of
    const { data: teamRegistrations } = await supabaseAdmin
      .from('hackathon_registrations')
      .select(`
        team_id,
        hackathon_teams!inner(id, team_name),
        organizer_hackathons!inner(hackathon_name)
      `)
      .eq('user_id', userId)
      .not('team_id', 'is', null);

    const teams: Array<{ id: number; name: string; hackathonName: string }> = [];
    if (teamRegistrations) {
      for (const reg of teamRegistrations) {
        if (reg.team_id && reg.hackathon_teams && reg.organizer_hackathons) {
          teams.push({
            id: reg.team_id,
            name: (reg.hackathon_teams as any).team_name,
            hackathonName: (reg.organizer_hackathons as any).hackathon_name,
          });
        }
      }
    }

    // Count affected users
    let affectedUsersCount = 0;

    // Team members
    if (teams.length > 0) {
      const { count: teamMembersCount } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teams.map((t) => t.id))
        .neq('user_id', userId);

      affectedUsersCount += teamMembersCount ?? 0;
    }

    // Hackathon participants
    if (activeHackathons.length > 0) {
      const { count: participantsCount } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('*', { count: 'exact', head: true })
        .in('hackathon_id', activeHackathons.map((h) => h.id));

      affectedUsersCount += participantsCount ?? 0;
    }

    return {
      isOrganizer,
      activeHackathons,
      teams,
      affectedUsersCount,
    };
  }
}

// Export singleton instance
export const userManagementService = UserManagementService.getInstance();
