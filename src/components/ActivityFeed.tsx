/**
 * ActivityFeed Component
 * 
 * Displays a real-time feed of platform activities with filtering and detail panels.
 * Uses Supabase realtime subscriptions for live updates.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useActivities, useActivityStats, useInvalidateActivityFeed } from '@/hooks/useActivityFeed';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  User,
  Trophy,
  Users,
  FileText,
  Flag,
  Shield,
  RefreshCw,
  ChevronRight,
  X,
  Calendar,
  Filter,
  Loader2,
  Eye,
  ExternalLink,
  Clock,
  Zap,
} from 'lucide-react';
import type {
  ActivityItem,
  ActivityType,
  ActivitySeverity,
  ActivityTargetType,
  ActivityFilters,
} from '@/types/activity';

export interface ActivityFeedProps {
  /** Initial filters to apply */
  initialFilters?: ActivityFilters;
  /** Maximum number of items to show */
  limit?: number;
  /** Whether to enable real-time updates */
  enableRealtime?: boolean;
  /** Callback when an activity is selected */
  onActivitySelect?: (activity: ActivityItem) => void;
  /** Custom class name */
  className?: string;
  /** Whether to show the filter panel */
  showFilters?: boolean;
  /** Whether to show the stats header */
  showStats?: boolean;
}


/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'user_signup':
      return User;
    case 'hackathon_created':
    case 'hackathon_published':
    case 'hackathon_unpublished':
    case 'hackathon_ended':
      return Trophy;
    case 'registration_created':
    case 'registration_cancelled':
      return FileText;
    case 'team_formed':
    case 'team_joined':
    case 'team_left':
      return Users;
    case 'submission_created':
    case 'submission_updated':
      return FileText;
    case 'moderation_action':
      return Shield;
    case 'report_filed':
      return Flag;
    case 'suspicious_activity':
      return AlertTriangle;
    case 'organizer_approved':
    case 'organizer_revoked':
      return User;
    case 'judge_added':
    case 'judge_removed':
      return User;
    default:
      return Activity;
  }
}

/**
 * Get severity styles
 */
function getSeverityStyles(severity: ActivitySeverity): {
  badge: string;
  icon: string;
  row: string;
} {
  switch (severity) {
    case 'critical':
      return {
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        icon: 'text-red-600 dark:text-red-400',
        row: 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
      };
    case 'warning':
      return {
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        icon: 'text-yellow-600 dark:text-yellow-400',
        row: 'border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
      };
    case 'info':
    default:
      return {
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400',
        row: '',
      };
  }
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: ActivitySeverity) {
  switch (severity) {
    case 'critical':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return Info;
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * Activity type options for filter
 */
const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'user_signup', label: 'User Signups' },
  { value: 'hackathon_created', label: 'Hackathon Created' },
  { value: 'hackathon_published', label: 'Hackathon Published' },
  { value: 'hackathon_unpublished', label: 'Hackathon Unpublished' },
  { value: 'registration_created', label: 'Registrations' },
  { value: 'team_formed', label: 'Teams Formed' },
  { value: 'submission_created', label: 'Submissions' },
  { value: 'moderation_action', label: 'Moderation Actions' },
  { value: 'report_filed', label: 'Reports Filed' },
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
];

/**
 * Severity options for filter
 */
const SEVERITY_OPTIONS: { value: ActivitySeverity; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];


/**
 * Single activity item component
 */
function ActivityItemRow({
  activity,
  onSelect,
  isSelected,
}: {
  activity: ActivityItem;
  onSelect?: (activity: ActivityItem) => void;
  isSelected?: boolean;
}) {
  const Icon = getActivityIcon(activity.activity_type);
  const SeverityIcon = getSeverityIcon(activity.severity);
  const styles = getSeverityStyles(activity.severity);
  const isSuspicious = activity.severity === 'critical' || activity.activity_type === 'suspicious_activity';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer',
        'hover:bg-accent/50',
        isSelected && 'ring-2 ring-primary',
        styles.row,
        isSuspicious && 'animate-pulse-subtle'
      )}
      onClick={() => onSelect?.(activity)}
    >
      {/* Activity Icon */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
        isSuspicious ? 'bg-red-100 dark:bg-red-900/50' : 'bg-muted'
      )}>
        <Icon className={cn('h-5 w-5', isSuspicious ? styles.icon : 'text-muted-foreground')} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{activity.action}</span>
          {isSuspicious && (
            <Badge className={styles.badge}>
              <SeverityIcon className="h-3 w-3 mr-1" />
              {activity.severity}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {activity.actor_username && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {activity.actor_username}
            </span>
          )}
          {activity.target_name && (
            <>
              <span>→</span>
              <span className="truncate max-w-[200px]">{activity.target_name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(activity.created_at)}</span>
          <Badge variant="outline" className="text-xs py-0">
            {activity.target_type}
          </Badge>
        </div>
      </div>

      {/* Action indicator */}
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}


/**
 * Activity detail panel component
 * Requirement 2.3: Show full context and quick action buttons
 */
function ActivityDetailPanel({
  activity,
  onClose,
  onAction,
}: {
  activity: ActivityItem;
  onClose: () => void;
  onAction?: (action: string, activity: ActivityItem) => void;
}) {
  const Icon = getActivityIcon(activity.activity_type);
  const styles = getSeverityStyles(activity.severity);
  const isSuspicious = activity.severity === 'critical' || activity.activity_type === 'suspicious_activity';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              isSuspicious ? 'bg-red-100 dark:bg-red-900/50' : 'bg-muted'
            )}>
              <Icon className={cn('h-6 w-6', isSuspicious ? styles.icon : 'text-muted-foreground')} />
            </div>
            <div>
              <CardTitle className="text-lg">{activity.action}</CardTitle>
              <CardDescription>
                {new Date(activity.created_at).toLocaleString()}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity Badge */}
        {isSuspicious && (
          <div className={cn('p-3 rounded-lg', styles.row)}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('h-5 w-5', styles.icon)} />
              <span className="font-medium">Suspicious Activity Detected</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This activity has been flagged for review.
            </p>
          </div>
        )}

        {/* Actor Info */}
        {activity.actor_id && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Actor</h4>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{activity.actor_username || activity.actor_email || activity.actor_id}</span>
            </div>
          </div>
        )}

        {/* Target Info */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">Target</h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{activity.target_type}</Badge>
            <span>{activity.target_name || activity.target_id}</span>
          </div>
        </div>

        {/* Metadata */}
        {Object.keys(activity.metadata).length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Details</h4>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
              {JSON.stringify(activity.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction?.('view_target', activity)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View {activity.target_type}
            </Button>
            {activity.actor_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction?.('view_actor', activity)}
              >
                <User className="h-4 w-4 mr-1" />
                View User
              </Button>
            )}
            {isSuspicious && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction?.('investigate', activity)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Investigate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onAction?.('take_action', activity)}
                >
                  <Flag className="h-4 w-4 mr-1" />
                  Take Action
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


/**
 * Activity stats header component
 */
function ActivityStatsHeader({
  stats,
  isLoading,
}: {
  stats?: {
    activitiesPerMinute: number;
    averageActivitiesPerMinute: number;
    isSpike: boolean;
    recentSuspiciousCount: number;
    totalActivitiesToday: number;
  };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg animate-pulse">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-lg',
      stats.isSpike ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900' : 'bg-muted/50'
    )}>
      <div className="flex items-center gap-2">
        <Zap className={cn('h-4 w-4', stats.isSpike ? 'text-yellow-600' : 'text-muted-foreground')} />
        <span className="text-sm">
          <strong>{stats.activitiesPerMinute.toFixed(1)}</strong> activities/min
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        Avg: {stats.averageActivitiesPerMinute.toFixed(1)}/min
      </div>
      {stats.isSpike && (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Activity Spike
        </Badge>
      )}
      {stats.recentSuspiciousCount > 0 && (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          {stats.recentSuspiciousCount} suspicious
        </Badge>
      )}
      <div className="ml-auto text-sm text-muted-foreground">
        {stats.totalActivitiesToday} today
      </div>
    </div>
  );
}


/**
 * Filter panel component
 * Requirement 2.2: Filter by type, severity, user, hackathon, date range
 */
function ActivityFilterPanel({
  filters,
  onFiltersChange,
  onReset,
}: {
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  onReset: () => void;
}) {
  const hasFilters = filters.activity_type || filters.severity || filters.actor_id || 
                     filters.target_id || filters.date_from || filters.date_to;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Activity Type Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Activity Type</label>
          <Select
            value={filters.activity_type as string || 'all'}
            onValueChange={(value) => 
              onFiltersChange({
                ...filters,
                activity_type: value === 'all' ? undefined : value as ActivityType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ACTIVITY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Severity</label>
          <Select
            value={filters.severity as string || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                severity: value === 'all' ? undefined : value as ActivitySeverity,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From Date</label>
          <Input
            type="date"
            value={filters.date_from?.split('T')[0] || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                date_from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
              })
            }
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To Date</label>
          <Input
            type="date"
            value={filters.date_to?.split('T')[0] || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                date_to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
              })
            }
          />
        </div>
      </div>

      {/* User/Target ID filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">User ID</label>
          <Input
            placeholder="Filter by user ID..."
            value={filters.actor_id || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                actor_id: e.target.value || undefined,
              })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Target ID</label>
          <Input
            placeholder="Filter by target ID (hackathon, etc.)..."
            value={filters.target_id || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                target_id: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}


/**
 * Main ActivityFeed component
 * 
 * Requirement 2.1: Display a real-time feed of activities
 * Uses Supabase realtime subscription for live updates
 */
export function ActivityFeed({
  initialFilters = {},
  limit = 50,
  enableRealtime = true,
  onActivitySelect,
  className,
  showFilters = true,
  showStats = true,
}: ActivityFeedProps) {
  const [filters, setFilters] = useState<ActivityFilters>({
    ...initialFilters,
    limit,
  });
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [realtimeActivities, setRealtimeActivities] = useState<ActivityItem[]>([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const { invalidateAll } = useInvalidateActivityFeed();

  // Fetch activities with filters
  const {
    data: activitiesData,
    isLoading: isLoadingActivities,
    error: activitiesError,
    refetch: refetchActivities,
  } = useActivities(filters);

  // Fetch activity stats
  const {
    data: statsData,
    isLoading: isLoadingStats,
  } = useActivityStats();

  // Set up Supabase realtime subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabaseAdmin
      .channel('admin_activity_feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_activity_feed',
        },
        (payload) => {
          const newActivity = payload.new as ActivityItem;
          setRealtimeActivities((prev) => [newActivity, ...prev].slice(0, 10));
          // Invalidate queries to refresh data
          invalidateAll();
        }
      )
      .subscribe();

    return () => {
      supabaseAdmin.removeChannel(channel);
    };
  }, [enableRealtime, invalidateAll]);

  // Combine realtime activities with fetched activities
  const allActivities = [
    ...realtimeActivities.filter(
      (ra) => !activitiesData?.activities.some((a) => a.id === ra.id)
    ),
    ...(activitiesData?.activities || []),
  ];

  // Handle activity selection
  const handleActivitySelect = useCallback((activity: ActivityItem) => {
    setSelectedActivity(activity);
    onActivitySelect?.(activity);
  }, [onActivitySelect]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: ActivityFilters) => {
    setFilters({ ...newFilters, limit });
    setRealtimeActivities([]); // Clear realtime activities on filter change
  }, [limit]);

  // Handle filter reset
  const handleFilterReset = useCallback(() => {
    setFilters({ limit });
    setRealtimeActivities([]);
  }, [limit]);

  // Handle quick action from detail panel
  const handleQuickAction = useCallback((action: string, activity: ActivityItem) => {
    switch (action) {
      case 'view_target':
        // Navigate based on target type
        switch (activity.target_type) {
          case 'hackathon':
            window.open(`/hackathons/${activity.target_id}`, '_blank');
            break;
          case 'user':
            window.location.href = `/user-moderation?userId=${activity.target_id}`;
            break;
          case 'registration':
            window.location.href = `/hackathon-edit-requests?registrationId=${activity.target_id}`;
            break;
          case 'team':
            window.open(`/teams/${activity.target_id}`, '_blank');
            break;
          case 'submission':
            window.open(`/submissions/${activity.target_id}`, '_blank');
            break;
          default:
            console.log('View target:', activity.target_type, activity.target_id);
        }
        break;
        
      case 'view_actor':
        if (activity.actor_id) {
          window.location.href = `/user-moderation?userId=${activity.actor_id}`;
        }
        break;
        
      case 'investigate':
        // Open user moderation with the actor
        if (activity.actor_id) {
          window.location.href = `/user-moderation?userId=${activity.actor_id}&investigate=true`;
        }
        break;
        
      case 'take_action':
        // Open user moderation with action panel
        if (activity.actor_id) {
          window.location.href = `/user-moderation?userId=${activity.actor_id}&action=true`;
        }
        break;
        
      default:
        console.log('Quick action:', action, activity);
    }
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (activitiesData?.nextCursor) {
      setFilters((prev) => ({
        ...prev,
        cursor: activitiesData.nextCursor ?? undefined,
      }));
    }
  }, [activitiesData?.nextCursor]);

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Main feed */}
      <div className="flex-1 space-y-4">
        {/* Stats header */}
        {showStats && (
          <ActivityStatsHeader stats={statsData} isLoading={isLoadingStats} />
        )}

        {/* Filter toggle and refresh */}
        <div className="flex items-center justify-between">
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {isFiltersExpanded ? (
                <ChevronRight className="h-4 w-4 ml-1 rotate-90" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
            </Button>
          )}
          <div className="flex items-center gap-2">
            {realtimeActivities.length > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                <Zap className="h-3 w-3 mr-1" />
                {realtimeActivities.length} new
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchActivities()}
              disabled={isLoadingActivities}
            >
              <RefreshCw className={cn('h-4 w-4', isLoadingActivities && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && isFiltersExpanded && (
          <ActivityFilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleFilterReset}
          />
        )}

        {/* Error state */}
        {activitiesError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load activities: {activitiesError.message}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoadingActivities && allActivities.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Activity list */}
        {allActivities.length > 0 && (
          <div className="space-y-2">
            {allActivities.map((activity) => (
              <ActivityItemRow
                key={activity.id}
                activity={activity}
                onSelect={handleActivitySelect}
                isSelected={selectedActivity?.id === activity.id}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoadingActivities && allActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No activities found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {Object.keys(filters).length > 1
                ? 'Try adjusting your filters'
                : 'Activities will appear here as they happen'}
            </p>
          </div>
        )}

        {/* Load more */}
        {activitiesData?.hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingActivities}
            >
              {isLoadingActivities ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedActivity && (
        <div className="w-96 flex-shrink-0 hidden lg:block">
          <ActivityDetailPanel
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            onAction={handleQuickAction}
          />
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
