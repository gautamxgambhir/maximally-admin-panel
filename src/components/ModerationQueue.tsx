/**
 * ModerationQueue Component
 * 
 * Displays the moderation queue with priority sorting, tabs by type,
 * claim/release functionality, and quick action buttons.
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useQueueItems,
  useClaimQueueItem,
  useReleaseQueueItem,
  useResolveQueueItem,
  usePendingQueueCount,
} from '@/hooks/useQueue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Trophy,
  FileText,
  Flag,
  Lock,
  Unlock,
  ChevronRight,
  Loader2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Filter,
  Eye,
  ThumbsUp,
  ThumbsDown,
  X,
  SkipForward,
  AlertOctagon,
} from 'lucide-react';
import type {
  QueueItem,
  QueueItemType,
  QueueItemStatus,
  QueueFilters,
  QueueResolution,
} from '@/types/queue';
import { toast } from 'sonner';


export interface ModerationQueueProps {
  /** Custom class name */
  className?: string;
  /** Callback when queue count changes */
  onCountChange?: (count: number) => void;
}

/**
 * Get icon for queue item type
 */
function getItemTypeIcon(type: QueueItemType) {
  switch (type) {
    case 'hackathon':
      return Trophy;
    case 'user':
      return User;
    case 'project':
      return FileText;
    case 'report':
      return Flag;
    default:
      return AlertCircle;
  }
}

/**
 * Get priority styles
 */
function getPriorityStyles(priority: number): {
  badge: string;
  text: string;
  label: string;
} {
  if (priority >= 8) {
    return {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      text: 'text-red-600 dark:text-red-400',
      label: 'Critical',
    };
  }
  if (priority >= 5) {
    return {
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: 'High',
    };
  }
  if (priority >= 3) {
    return {
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'Medium',
    };
  }
  return {
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
    text: 'text-gray-600 dark:text-gray-400',
    label: 'Low',
  };
}

/**
 * Get status styles
 */
function getStatusStyles(status: QueueItemStatus): {
  badge: string;
  icon: typeof CheckCircle;
} {
  switch (status) {
    case 'pending':
      return { badge: 'bg-yellow-100 text-yellow-800', icon: Clock };
    case 'claimed':
      return { badge: 'bg-blue-100 text-blue-800', icon: Lock };
    case 'resolved':
      return { badge: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 'dismissed':
      return { badge: 'bg-gray-100 text-gray-800', icon: XCircle };
    default:
      return { badge: 'bg-gray-100 text-gray-800', icon: AlertCircle };
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}


/**
 * Single queue item row component
 */
function QueueItemRow({
  item,
  currentUserId,
  onClaim,
  onRelease,
  onResolve,
  onSelect,
  isSelected,
  isLoading,
}: {
  item: QueueItem;
  currentUserId: string;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  onResolve: (item: QueueItem) => void;
  onSelect: (item: QueueItem) => void;
  isSelected: boolean;
  isLoading: boolean;
}) {
  const Icon = getItemTypeIcon(item.item_type);
  const priorityStyles = getPriorityStyles(item.priority);
  const statusStyles = getStatusStyles(item.status);
  const StatusIcon = statusStyles.icon;
  const isClaimedByMe = item.claimed_by === currentUserId;
  const isClaimedByOther = item.claimed_by && !isClaimedByMe;
  const canClaim = item.status === 'pending' && !item.claimed_by;
  const canRelease = isClaimedByMe && item.status === 'claimed';
  const canResolve = isClaimedByMe && item.status === 'claimed';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-all',
        'hover:bg-accent/50 cursor-pointer',
        isSelected && 'ring-2 ring-primary',
        item.priority >= 8 && 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10',
        item.priority >= 5 && item.priority < 8 && 'border-l-4 border-l-yellow-500',
        isClaimedByOther && 'opacity-60'
      )}
      onClick={() => onSelect(item)}
    >
      {/* Priority indicator */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
        item.priority >= 8 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-muted'
      )}>
        <Icon className={cn('h-5 w-5', priorityStyles.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{item.title}</span>
          <Badge className={priorityStyles.badge}>
            {item.priority >= 8 ? <AlertOctagon className="h-3 w-3 mr-1" /> : null}
            P{item.priority} - {priorityStyles.label}
          </Badge>
          <Badge className={statusStyles.badge}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {item.status}
          </Badge>
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(item.created_at)}
          </span>
          {item.report_count > 0 && (
            <span className="flex items-center gap-1">
              <Flag className="h-3 w-3" />
              {item.report_count} report{item.report_count > 1 ? 's' : ''}
            </span>
          )}
          {item.claimed_by && (
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              {isClaimedByMe ? 'Claimed by you' : 'Claimed'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {canClaim && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClaim(item.id);
            }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Claim</span>
          </Button>
        )}
        {canRelease && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRelease(item.id);
            }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Release</span>
          </Button>
        )}
        {canResolve && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResolve(item);
            }}
            disabled={isLoading}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Resolve</span>
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}


/**
 * Queue item detail panel
 */
function QueueDetailPanel({
  item,
  currentUserId,
  onClose,
  onClaim,
  onRelease,
  onResolve,
  isLoading,
}: {
  item: QueueItem;
  currentUserId: string;
  onClose: () => void;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  onResolve: (item: QueueItem) => void;
  isLoading: boolean;
}) {
  const Icon = getItemTypeIcon(item.item_type);
  const priorityStyles = getPriorityStyles(item.priority);
  const isClaimedByMe = item.claimed_by === currentUserId;
  const canClaim = item.status === 'pending' && !item.claimed_by;
  const canRelease = isClaimedByMe && item.status === 'claimed';
  const canResolve = isClaimedByMe && item.status === 'claimed';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              item.priority >= 8 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-muted'
            )}>
              <Icon className={cn('h-6 w-6', priorityStyles.text)} />
            </div>
            <div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>
                {item.item_type} • Created {formatRelativeTime(item.created_at)}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Priority and Status */}
        <div className="flex items-center gap-2">
          <Badge className={priorityStyles.badge}>
            Priority {item.priority} - {priorityStyles.label}
          </Badge>
          <Badge variant="outline">{item.status}</Badge>
        </div>

        {/* Description */}
        {item.description && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
            <p className="text-sm">{item.description}</p>
          </div>
        )}

        {/* Target Info */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">Target</h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{item.target_type}</Badge>
            <span className="text-sm font-mono">{item.target_id}</span>
          </div>
        </div>

        {/* Report Info */}
        {item.report_count > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Reports</h4>
            <p className="text-sm">
              {item.report_count} report{item.report_count > 1 ? 's' : ''} from{' '}
              {item.reporter_ids.length} user{item.reporter_ids.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Target Data */}
        {item.target_data && Object.keys(item.target_data).length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Additional Data</h4>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
              {JSON.stringify(item.target_data, null, 2)}
            </pre>
          </div>
        )}

        {/* Claim Info */}
        {item.claimed_by && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Claimed</h4>
            <p className="text-sm">
              {isClaimedByMe ? 'By you' : `By admin ${item.claimed_by}`}
              {item.claimed_at && ` • ${formatRelativeTime(item.claimed_at)}`}
            </p>
          </div>
        )}

        {/* Resolution */}
        {item.resolution && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Resolution</h4>
            <p className="text-sm">{item.resolution}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground">Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View {item.target_type}
            </Button>
            {canClaim && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onClaim(item.id)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}
                Claim
              </Button>
            )}
            {canRelease && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRelease(item.id)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Unlock className="h-4 w-4 mr-1" />}
                Release
              </Button>
            )}
            {canResolve && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onResolve(item)}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


/**
 * Resolve dialog component
 * Requirement 6.3: Quick action buttons for approve, reject, dismiss
 */
function ResolveDialog({
  item,
  isOpen,
  onClose,
  onResolve,
  isLoading,
}: {
  item: QueueItem | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: QueueResolution, reason: string, actionTaken?: string) => void;
  isLoading: boolean;
}) {
  const [resolution, setResolution] = useState<QueueResolution>('approved');
  const [reason, setReason] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    onResolve(resolution, reason.trim(), actionTaken.trim() || undefined);
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Queue Item</DialogTitle>
          <DialogDescription>
            {item.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Resolution Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={resolution === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResolution('approved')}
                className="justify-start"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant={resolution === 'rejected' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setResolution('rejected')}
                className="justify-start"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                variant={resolution === 'dismissed' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setResolution('dismissed')}
                className="justify-start"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
              <Button
                variant={resolution === 'escalated' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setResolution('escalated')}
                className="justify-start"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Escalate
              </Button>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason *</label>
            <Textarea
              placeholder="Explain your decision..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Taken */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Action Taken (optional)</label>
            <Input
              placeholder="e.g., User warned, Content removed..."
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Confirm Resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Queue count badge component
 * Requirement 6.4: Show pending count in sidebar
 */
export function QueueCountBadge({ className }: { className?: string }) {
  const { data: count, isLoading } = usePendingQueueCount();

  if (isLoading || !count || count === 0) return null;

  return (
    <Badge
      className={cn(
        'bg-red-500 text-white hover:bg-red-600',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

/**
 * Main ModerationQueue component
 * 
 * Requirement 6.2: Display items sorted by priority with tabs by type
 */
export function ModerationQueue({
  className,
  onCountChange,
}: ModerationQueueProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const [activeTab, setActiveTab] = useState<QueueItemType | 'all'>('all');
  const [filters, setFilters] = useState<QueueFilters>({
    status: ['pending', 'claimed'],
    limit: 50,
  });
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [resolveItem, setResolveItem] = useState<QueueItem | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Build filters based on active tab
  const effectiveFilters: QueueFilters = {
    ...filters,
    item_type: activeTab === 'all' ? undefined : activeTab,
  };

  // Fetch queue items
  const {
    data: queueData,
    isLoading,
    error,
    refetch,
  } = useQueueItems(effectiveFilters, currentUserId);

  // Mutations
  const claimMutation = useClaimQueueItem();
  const releaseMutation = useReleaseQueueItem();
  const resolveMutation = useResolveQueueItem();

  const isActionLoading = claimMutation.isPending || releaseMutation.isPending || resolveMutation.isPending;

  // Handle claim
  const handleClaim = useCallback(async (id: string) => {
    try {
      await claimMutation.mutateAsync({ id, adminId: currentUserId });
      toast.success('Item claimed successfully');
    } catch (error) {
      toast.error(`Failed to claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [claimMutation, currentUserId]);

  // Handle release
  const handleRelease = useCallback(async (id: string) => {
    try {
      await releaseMutation.mutateAsync({ id, adminId: currentUserId });
      toast.success('Item released');
      setSelectedItem(null);
    } catch (error) {
      toast.error(`Failed to release: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [releaseMutation, currentUserId]);

  // Handle resolve
  const handleResolve = useCallback(async (
    resolution: QueueResolution,
    reason: string,
    actionTaken?: string
  ) => {
    if (!resolveItem) return;
    try {
      await resolveMutation.mutateAsync({
        id: resolveItem.id,
        adminId: currentUserId,
        input: { resolution, reason, action_taken: actionTaken },
      });
      toast.success('Item resolved successfully');
      setResolveItem(null);
      setSelectedItem(null);
    } catch (error) {
      toast.error(`Failed to resolve: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [resolveMutation, currentUserId, resolveItem]);

  // Notify parent of count changes
  const pendingCount = queueData?.counts.pending ?? 0;
  if (onCountChange) {
    onCountChange(pendingCount);
  }

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Main queue */}
      <div className="flex-1 space-y-4">
        {/* Header with counts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Moderation Queue</h2>
            {queueData?.counts && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {queueData.counts.pending} pending
                </Badge>
                <Badge variant="outline">
                  {queueData.counts.claimed} claimed
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {isFiltersExpanded && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select
                  value={filters.priority || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, priority: value as QueueFilters['priority'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High (8-10)</SelectItem>
                    <SelectItem value="medium">Medium (5-7)</SelectItem>
                    <SelectItem value="low">Low (1-4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Claimed By</label>
                <Select
                  value={filters.claimed_by || 'all'}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      claimed_by: value === 'all' ? undefined : value as QueueFilters['claimed_by'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unclaimed">Unclaimed only</SelectItem>
                    <SelectItem value="mine">My claims</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select
                  value={Array.isArray(filters.status) ? 'active' : filters.status || 'active'}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      status: value === 'active' ? ['pending', 'claimed'] : value as QueueItemStatus,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Active" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (pending + claimed)</SelectItem>
                    <SelectItem value="pending">Pending only</SelectItem>
                    <SelectItem value="claimed">Claimed only</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs by type */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QueueItemType | 'all')}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1">
              All
              {queueData?.counts.total ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {queueData.counts.total}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="hackathon" className="gap-1">
              <Trophy className="h-4 w-4" />
              Hackathons
              {queueData?.counts.byType.hackathon ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {queueData.counts.byType.hackathon}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="user" className="gap-1">
              <User className="h-4 w-4" />
              Users
              {queueData?.counts.byType.user ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {queueData.counts.byType.user}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-1">
              <FileText className="h-4 w-4" />
              Projects
              {queueData?.counts.byType.project ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {queueData.counts.byType.project}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1">
              <Flag className="h-4 w-4" />
              Reports
              {queueData?.counts.byType.report ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {queueData.counts.byType.report}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {/* Error state */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load queue: {error.message}</span>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Queue items */}
            {!isLoading && queueData?.items && queueData.items.length > 0 && (
              <div className="space-y-2">
                {queueData.items.map((item) => (
                  <QueueItemRow
                    key={item.id}
                    item={item}
                    currentUserId={currentUserId}
                    onClaim={handleClaim}
                    onRelease={handleRelease}
                    onResolve={setResolveItem}
                    onSelect={setSelectedItem}
                    isSelected={selectedItem?.id === item.id}
                    isLoading={isActionLoading}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && (!queueData?.items || queueData.items.length === 0) && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Queue is empty</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No items require moderation at this time.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="w-96 flex-shrink-0 hidden lg:block">
          <QueueDetailPanel
            item={selectedItem}
            currentUserId={currentUserId}
            onClose={() => setSelectedItem(null)}
            onClaim={handleClaim}
            onRelease={handleRelease}
            onResolve={setResolveItem}
            isLoading={isActionLoading}
          />
        </div>
      )}

      {/* Resolve dialog */}
      <ResolveDialog
        item={resolveItem}
        isOpen={!!resolveItem}
        onClose={() => setResolveItem(null)}
        onResolve={handleResolve}
        isLoading={resolveMutation.isPending}
      />
    </div>
  );
}

export default ModerationQueue;
