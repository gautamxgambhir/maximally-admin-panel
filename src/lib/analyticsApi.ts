/**
 * Analytics API Functions
 * 
 * Provides API functions for querying analytics data.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { supabaseAdmin } from './supabase';
import type {
  AnalyticsOverviewResponse,
  DashboardMetrics,
  TimeSeriesDataPoint,
  TimeSeriesResponse,
  TimeSeriesQueryParams,
  AnalyticsAlert,
  AnalyticsExportRequest,
  OrganizerStats,
  HackathonStats,
  AnalyticsTimeRange,
  TimeSeriesGranularity,
  PeriodComparison,
} from '@/types/analytics';
import {
  getTimeRangeBoundaries,
  getPreviousPeriodBoundaries,
  getGranularityForTimeRange,
  groupByGranularity,
  calculatePeriodComparison,
  calculateTimeSeriesTotal,
  detectTimeSeriesAnomalies,
  createAlert,
  determineSystemHealth,
  exportToCSV,
  mergeTimeSeriesForComparison,
} from './analyticsCore';

/**
 * Get analytics overview with key metrics, trends, and alerts
 * 
 * Requirement 8.1: Display key metrics including total users, new users,
 * active hackathons, pending reviews, total registrations, and moderation actions.
 * 
 * GET /api/admin/analytics/overview
 * 
 * @param timeRange - Time range for trends (default: '7d')
 * @returns Analytics overview response
 */
export async function getAnalyticsOverview(
  timeRange: AnalyticsTimeRange = '7d'
): Promise<AnalyticsOverviewResponse> {
  const { start, end } = getTimeRangeBoundaries(timeRange);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodBoundaries(start, end);
  const granularity = getGranularityForTimeRange(timeRange);

  // Fetch all required data in parallel
  const [
    metrics,
    userTrends,
    hackathonTrends,
    registrationTrends,
    alerts,
  ] = await Promise.all([
    getDashboardMetrics(),
    getUserTimeSeries(start, end, granularity),
    getHackathonTimeSeries(start, end, granularity),
    getRegistrationTimeSeries(start, end, granularity),
    detectAnomalies(timeRange),
  ]);

  return {
    metrics,
    trends: {
      users: userTrends,
      hackathons: hackathonTrends,
      registrations: registrationTrends,
    },
    alerts,
  };
}

/**
 * Get dashboard metrics
 * 
 * Requirement 8.1: Display key metrics
 * 
 * @returns Dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all counts in parallel
  const [
    totalUsersResult,
    newUsersTodayResult,
    newUsersWeekResult,
    newUsersMonthResult,
    activeHackathonsResult,
    pendingReviewsResult,
    totalRegistrationsResult,
    moderationActionsTodayResult,
    errorRateResult,
  ] = await Promise.all([
    // Total users
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    // New users today
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    // New users this week
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString()),
    // New users this month
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString()),
    // Active hackathons (published status)
    supabaseAdmin
      .from('organizer_hackathons')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
    // Pending reviews
    supabaseAdmin
      .from('moderation_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Total registrations
    supabaseAdmin
      .from('hackathon_registrations')
      .select('id', { count: 'exact', head: true }),
    // Moderation actions today
    supabaseAdmin
      .from('admin_audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    // Error rate (from system metrics if available)
    supabaseAdmin
      .from('system_metrics')
      .select('value')
      .eq('metric_type', 'error_rate')
      .order('recorded_at', { ascending: false })
      .limit(1),
  ]);

  const errorRate = errorRateResult.data?.[0]?.value ?? 0;
  const responseTime = 200; // Default response time
  const pendingReviews = pendingReviewsResult.count ?? 0;

  return {
    totalUsers: totalUsersResult.count ?? 0,
    newUsersToday: newUsersTodayResult.count ?? 0,
    newUsersWeek: newUsersWeekResult.count ?? 0,
    newUsersMonth: newUsersMonthResult.count ?? 0,
    activeHackathons: activeHackathonsResult.count ?? 0,
    pendingReviews,
    totalRegistrations: totalRegistrationsResult.count ?? 0,
    moderationActionsToday: moderationActionsTodayResult.count ?? 0,
    systemHealth: determineSystemHealth(errorRate, responseTime, pendingReviews),
  };
}


/**
 * Get user growth time series data
 * 
 * Requirement 8.2: Show interactive charts for user growth over customizable time periods.
 * 
 * GET /api/admin/analytics/users
 * 
 * @param params - Time series query parameters
 * @returns Time series response with user growth data
 */
export async function getUserTimeSeries(
  start: Date,
  end: Date,
  granularity: TimeSeriesGranularity
): Promise<TimeSeriesDataPoint[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get user time series: ${error.message}`);
  }

  return groupByGranularity(data ?? [], granularity, start, end);
}

/**
 * Get hackathon creation time series data
 * 
 * Requirement 8.2: Show interactive charts for hackathon creation over time.
 * 
 * @param start - Start date
 * @param end - End date
 * @param granularity - Time series granularity
 * @returns Time series data points
 */
export async function getHackathonTimeSeries(
  start: Date,
  end: Date,
  granularity: TimeSeriesGranularity
): Promise<TimeSeriesDataPoint[]> {
  const { data, error } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get hackathon time series: ${error.message}`);
  }

  return groupByGranularity(data ?? [], granularity, start, end);
}

/**
 * Get registration time series data
 * 
 * Requirement 8.2: Show interactive charts for registrations over time.
 * 
 * @param start - Start date
 * @param end - End date
 * @param granularity - Time series granularity
 * @returns Time series data points
 */
export async function getRegistrationTimeSeries(
  start: Date,
  end: Date,
  granularity: TimeSeriesGranularity
): Promise<TimeSeriesDataPoint[]> {
  const { data, error } = await supabaseAdmin
    .from('hackathon_registrations')
    .select('created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get registration time series: ${error.message}`);
  }

  return groupByGranularity(data ?? [], granularity, start, end);
}

/**
 * Get time series data with comparison to previous period
 * 
 * Requirement 8.4: Show comparison with previous period with percentage change indicators.
 * 
 * @param params - Time series query parameters
 * @param dataType - Type of data to fetch ('users' | 'hackathons' | 'registrations')
 * @returns Time series response with comparison data
 */
export async function getTimeSeriesWithComparison(
  params: TimeSeriesQueryParams,
  dataType: 'users' | 'hackathons' | 'registrations'
): Promise<TimeSeriesResponse> {
  const { start, end } = getTimeRangeBoundaries(
    params.timeRange,
    params.dateFrom,
    params.dateTo
  );
  const granularity = params.granularity ?? getGranularityForTimeRange(params.timeRange);

  // Get current period data
  let currentData: TimeSeriesDataPoint[];
  switch (dataType) {
    case 'users':
      currentData = await getUserTimeSeries(start, end, granularity);
      break;
    case 'hackathons':
      currentData = await getHackathonTimeSeries(start, end, granularity);
      break;
    case 'registrations':
      currentData = await getRegistrationTimeSeries(start, end, granularity);
      break;
  }

  const total = calculateTimeSeriesTotal(currentData);
  let previousTotal: number | undefined;
  let percentageChange: number | undefined;

  // Get previous period data if comparison is enabled
  if (params.comparison) {
    const { start: prevStart, end: prevEnd } = getPreviousPeriodBoundaries(start, end);
    
    let previousData: TimeSeriesDataPoint[];
    switch (dataType) {
      case 'users':
        previousData = await getUserTimeSeries(prevStart, prevEnd, granularity);
        break;
      case 'hackathons':
        previousData = await getHackathonTimeSeries(prevStart, prevEnd, granularity);
        break;
      case 'registrations':
        previousData = await getRegistrationTimeSeries(prevStart, prevEnd, granularity);
        break;
    }

    previousTotal = calculateTimeSeriesTotal(previousData);
    const comparison = calculatePeriodComparison(total, previousTotal);
    percentageChange = comparison.percentageChange;

    // Merge data for comparison view
    currentData = mergeTimeSeriesForComparison(currentData, previousData);
  }

  return {
    data: currentData,
    total,
    previousTotal,
    percentageChange,
    granularity,
    timeRange: params.timeRange,
  };
}


/**
 * Detect anomalies and generate alerts
 * 
 * Requirement 8.3: Highlight unusual patterns with alerts such as sudden drops,
 * unusual spikes, or trending issues.
 * 
 * @param timeRange - Time range to analyze
 * @returns Array of analytics alerts
 */
export async function detectAnomalies(
  timeRange: AnalyticsTimeRange = '7d'
): Promise<AnalyticsAlert[]> {
  const alerts: AnalyticsAlert[] = [];
  const { start, end } = getTimeRangeBoundaries(timeRange);
  const granularity = getGranularityForTimeRange(timeRange);

  // Check user growth anomalies
  const userTrends = await getUserTimeSeries(start, end, granularity);
  const userAnomalies = detectTimeSeriesAnomalies(userTrends, 2);
  
  for (const index of userAnomalies) {
    const point = userTrends[index];
    alerts.push(createAlert(
      'spike',
      'warning',
      'Unusual User Signup Activity',
      `User signups on ${point.date} (${point.value}) deviated significantly from the average.`,
      'user_signups',
      point.value
    ));
  }

  // Check registration anomalies
  const registrationTrends = await getRegistrationTimeSeries(start, end, granularity);
  const registrationAnomalies = detectTimeSeriesAnomalies(registrationTrends, 2);
  
  for (const index of registrationAnomalies) {
    const point = registrationTrends[index];
    alerts.push(createAlert(
      'spike',
      'warning',
      'Unusual Registration Activity',
      `Registrations on ${point.date} (${point.value}) deviated significantly from the average.`,
      'registrations',
      point.value
    ));
  }

  // Check pending reviews threshold
  const { count: pendingCount } = await supabaseAdmin
    .from('moderation_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if ((pendingCount ?? 0) > 100) {
    alerts.push(createAlert(
      'threshold_exceeded',
      'critical',
      'High Pending Reviews',
      `There are ${pendingCount} items pending review. Consider allocating more moderators.`,
      'pending_reviews',
      pendingCount ?? 0,
      100
    ));
  } else if ((pendingCount ?? 0) > 50) {
    alerts.push(createAlert(
      'threshold_exceeded',
      'warning',
      'Elevated Pending Reviews',
      `There are ${pendingCount} items pending review.`,
      'pending_reviews',
      pendingCount ?? 0,
      50
    ));
  }

  // Check for sudden drops in activity
  if (userTrends.length >= 2) {
    const lastValue = userTrends[userTrends.length - 1].value;
    const prevValue = userTrends[userTrends.length - 2].value;
    
    if (prevValue > 0 && lastValue / prevValue < 0.5) {
      alerts.push(createAlert(
        'drop',
        'warning',
        'Significant Drop in User Signups',
        `User signups dropped by ${Math.round((1 - lastValue / prevValue) * 100)}% compared to the previous period.`,
        'user_signups',
        lastValue
      ));
    }
  }

  return alerts;
}

/**
 * Get period comparison for a specific metric
 * 
 * Requirement 8.4: Show comparison with previous period with percentage change indicators.
 * 
 * Property 15: Period Comparison Accuracy - For any metric comparison between periods,
 * the percentage change SHALL be calculated as ((current - previous) / previous) * 100.
 * 
 * @param metric - Metric to compare ('users' | 'hackathons' | 'registrations' | 'moderation_actions')
 * @param timeRange - Time range for comparison
 * @returns Period comparison result
 */
export async function getPeriodComparison(
  metric: 'users' | 'hackathons' | 'registrations' | 'moderation_actions',
  timeRange: AnalyticsTimeRange = '7d'
): Promise<PeriodComparison> {
  const { start, end } = getTimeRangeBoundaries(timeRange);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodBoundaries(start, end);

  let currentCount: number;
  let previousCount: number;

  switch (metric) {
    case 'users': {
      const [current, previous] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
        supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', prevEnd.toISOString()),
      ]);
      currentCount = current.count ?? 0;
      previousCount = previous.count ?? 0;
      break;
    }
    case 'hackathons': {
      const [current, previous] = await Promise.all([
        supabaseAdmin
          .from('organizer_hackathons')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
        supabaseAdmin
          .from('organizer_hackathons')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', prevEnd.toISOString()),
      ]);
      currentCount = current.count ?? 0;
      previousCount = previous.count ?? 0;
      break;
    }
    case 'registrations': {
      const [current, previous] = await Promise.all([
        supabaseAdmin
          .from('hackathon_registrations')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
        supabaseAdmin
          .from('hackathon_registrations')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', prevEnd.toISOString()),
      ]);
      currentCount = current.count ?? 0;
      previousCount = previous.count ?? 0;
      break;
    }
    case 'moderation_actions': {
      const [current, previous] = await Promise.all([
        supabaseAdmin
          .from('admin_audit_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),
        supabaseAdmin
          .from('admin_audit_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', prevEnd.toISOString()),
      ]);
      currentCount = current.count ?? 0;
      previousCount = previous.count ?? 0;
      break;
    }
  }

  return calculatePeriodComparison(currentCount, previousCount);
}


/**
 * Get top organizers by various metrics
 * 
 * @param limit - Maximum number of organizers to return
 * @returns Array of organizer statistics
 */
export async function getTopOrganizers(limit: number = 10): Promise<OrganizerStats[]> {
  // Get organizers with their hackathon counts
  const { data: hackathons, error } = await supabaseAdmin
    .from('organizer_hackathons')
    .select(`
      organizer_id,
      organizer_name,
      status,
      id
    `);

  if (error) {
    throw new Error(`Failed to get top organizers: ${error.message}`);
  }

  // Group by organizer
  const organizerMap = new Map<string, {
    organizerId: string;
    organizerName: string;
    totalHackathons: number;
    activeHackathons: number;
    hackathonIds: number[];
  }>();

  for (const h of hackathons ?? []) {
    const existing = organizerMap.get(h.organizer_id) ?? {
      organizerId: h.organizer_id,
      organizerName: h.organizer_name ?? 'Unknown',
      totalHackathons: 0,
      activeHackathons: 0,
      hackathonIds: [] as number[],
    };

    existing.totalHackathons++;
    if (h.status === 'published') {
      existing.activeHackathons++;
    }
    existing.hackathonIds.push(h.id as number);
    organizerMap.set(h.organizer_id, existing);
  }

  // Get registration counts for each organizer's hackathons
  const organizers = Array.from(organizerMap.values());
  
  const results: OrganizerStats[] = await Promise.all(
    organizers.slice(0, limit * 2).map(async (org) => {
      // Get total participants across all hackathons
      const { count: participantCount } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('id', { count: 'exact', head: true })
        .in('hackathon_id', org.hackathonIds);

      // Get trust score if available
      const { data: trustData } = await supabaseAdmin
        .from('organizer_trust_scores')
        .select('score')
        .eq('organizer_id', org.organizerId)
        .single();

      return {
        organizerId: org.organizerId,
        organizerName: org.organizerName,
        totalHackathons: org.totalHackathons,
        activeHackathons: org.activeHackathons,
        totalParticipants: participantCount ?? 0,
        averageRating: null, // Rating system not implemented
        trustScore: trustData?.score ?? 50,
      };
    })
  );

  // Sort by total participants and return top N
  return results
    .sort((a, b) => b.totalParticipants - a.totalParticipants)
    .slice(0, limit);
}

/**
 * Get top hackathons by registration count
 * 
 * @param limit - Maximum number of hackathons to return
 * @returns Array of hackathon statistics
 */
export async function getTopHackathons(limit: number = 10): Promise<HackathonStats[]> {
  // Get hackathons with registration counts
  const { data: hackathons, error } = await supabaseAdmin
    .from('organizer_hackathons')
    .select(`
      id,
      hackathon_name,
      status,
      start_date
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to get top hackathons: ${error.message}`);
  }

  const results: HackathonStats[] = await Promise.all(
    (hackathons ?? []).map(async (h) => {
      // Get registration count
      const { count: registrations } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('hackathon_id', h.id);

      // Get submission count
      const { count: submissions } = await supabaseAdmin
        .from('hackathon_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('hackathon_id', h.id);

      // Get team count
      const { count: teams } = await supabaseAdmin
        .from('hackathon_teams')
        .select('id', { count: 'exact', head: true })
        .eq('hackathon_id', h.id);

      return {
        hackathonId: h.id,
        hackathonName: h.hackathon_name,
        registrations: registrations ?? 0,
        submissions: submissions ?? 0,
        teams: teams ?? 0,
        status: h.status,
        startDate: h.start_date,
      };
    })
  );

  // Sort by registrations and return top N
  return results
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, limit);
}

/**
 * Export analytics data to CSV
 * 
 * Requirement 8.5: Support CSV and PDF export of dashboard data and charts.
 * 
 * @param request - Export request parameters
 * @returns CSV string
 */
export async function exportAnalyticsToCSV(
  request: AnalyticsExportRequest
): Promise<string> {
  const { start, end } = getTimeRangeBoundaries(
    request.timeRange,
    request.dateFrom,
    request.dateTo
  );
  const granularity = getGranularityForTimeRange(request.timeRange);

  const metrics = request.metrics ?? ['users', 'hackathons', 'registrations'];
  const rows: Record<string, unknown>[] = [];

  // Get time series data for each metric
  const dataPromises = metrics.map(async (metric) => {
    switch (metric) {
      case 'users':
        return { metric, data: await getUserTimeSeries(start, end, granularity) };
      case 'hackathons':
        return { metric, data: await getHackathonTimeSeries(start, end, granularity) };
      case 'registrations':
        return { metric, data: await getRegistrationTimeSeries(start, end, granularity) };
      default:
        return { metric, data: [] };
    }
  });

  const allData = await Promise.all(dataPromises);

  // Combine data into rows by date
  const dateMap = new Map<string, Record<string, unknown>>();

  for (const { metric, data } of allData) {
    for (const point of data) {
      const existing = dateMap.get(point.date) ?? { date: point.date };
      existing[metric] = point.value;
      dateMap.set(point.date, existing);
    }
  }

  // Convert to array and sort by date
  const sortedRows = Array.from(dateMap.values()).sort((a, b) => 
    String(a.date).localeCompare(String(b.date))
  );

  const headers = ['date', ...metrics];
  return exportToCSV(sortedRows, headers);
}

/**
 * Get activity breakdown by type for a time period
 * 
 * @param timeRange - Time range to analyze
 * @returns Activity counts by type
 */
export async function getActivityBreakdown(
  timeRange: AnalyticsTimeRange = '7d'
): Promise<Record<string, number>> {
  const { start, end } = getTimeRangeBoundaries(timeRange);

  const { data, error } = await supabaseAdmin
    .from('admin_activity_feed')
    .select('activity_type')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) {
    throw new Error(`Failed to get activity breakdown: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const activity of data ?? []) {
    counts[activity.activity_type] = (counts[activity.activity_type] ?? 0) + 1;
  }

  return counts;
}

/**
 * Get moderation action breakdown by type
 * 
 * @param timeRange - Time range to analyze
 * @returns Moderation action counts by type
 */
export async function getModerationBreakdown(
  timeRange: AnalyticsTimeRange = '7d'
): Promise<Record<string, number>> {
  const { start, end } = getTimeRangeBoundaries(timeRange);

  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('action_type')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) {
    throw new Error(`Failed to get moderation breakdown: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const log of data ?? []) {
    counts[log.action_type] = (counts[log.action_type] ?? 0) + 1;
  }

  return counts;
}

/**
 * Get hackathon status distribution
 * 
 * @returns Hackathon counts by status
 */
export async function getHackathonStatusDistribution(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('organizer_hackathons')
    .select('status');

  if (error) {
    throw new Error(`Failed to get hackathon status distribution: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const h of data ?? []) {
    counts[h.status] = (counts[h.status] ?? 0) + 1;
  }

  return counts;
}
