/**
 * Audit Logs Page
 * 
 * Displays comprehensive audit logs with filtering by admin, action type,
 * target type, and date range. Includes detail view with diff and export.
 * 
 * Requirements: 5.2, 5.4, 5.5
 */

import { useState, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useAuditLogs,
  useAuditLogDiff,
  useExportAuditLogs,
  downloadExport,
} from '@/hooks/useAuditLogs';
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Target,
  Clock,
  Loader2,
  AlertCircle,
  Eye,
  Plus,
  Minus,
  Edit,
  X,
} from 'lucide-react';
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditActionType,
  AuditTargetType,
  AuditExportFormat,
  AuditDiffEntry,
} from '@/types/audit';
import { toast } from 'sonner';
import { VALID_ACTION_TYPES, VALID_TARGET_TYPES } from '@/lib/auditLogCore';


/**
 * Format action type for display
 */
function formatActionType(actionType: AuditActionType): string {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get action type badge color
 */
function getActionTypeBadgeColor(actionType: AuditActionType): string {
  if (actionType.includes('deleted') || actionType.includes('banned')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
  }
  if (actionType.includes('approved') || actionType.includes('unbanned')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
  }
  if (actionType.includes('rejected') || actionType.includes('revoked')) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
  }
  if (actionType.includes('edited') || actionType.includes('changed')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
  }
  if (actionType.includes('warned') || actionType.includes('flagged')) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
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
 * Format full date time
 */
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}


/**
 * Diff Entry Component
 * Shows a single diff entry with before/after values
 * Requirement 5.5: Display full diff of changes with highlighted additions and removals
 */
function DiffEntryRow({ entry }: { entry: AuditDiffEntry }) {
  const getChangeIcon = () => {
    switch (entry.changeType) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-blue-500" />;
    }
  };

  const getChangeColor = () => {
    switch (entry.changeType) {
      case 'added':
        return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
      case 'removed':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case 'modified':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === undefined) return '(undefined)';
    if (value === null) return '(null)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className={cn('border-l-4 p-3 rounded-r-lg', getChangeColor())}>
      <div className="flex items-center gap-2 mb-2">
        {getChangeIcon()}
        <span className="font-medium text-sm">{entry.field}</span>
        <Badge variant="outline" className="text-xs">
          {entry.changeType}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {entry.changeType !== 'added' && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Before:</span>
            <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
              {formatValue(entry.before)}
            </pre>
          </div>
        )}
        {entry.changeType !== 'removed' && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1">After:</span>
            <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
              {formatValue(entry.after)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * Audit Log Detail Modal
 * Shows full details of an audit log entry including diff
 * Requirement 5.5: Display full diff of changes made with highlighted additions and removals
 */
function AuditLogDetailModal({
  log,
  isOpen,
  onClose,
}: {
  log: AuditLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: diff, isLoading: isDiffLoading } = useAuditLogDiff(log?.id ?? null);

  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="diff">Changes</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Action Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Action Type</span>
                <div>
                  <Badge className={getActionTypeBadgeColor(log.action_type)}>
                    {formatActionType(log.action_type)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Timestamp</span>
                <p className="text-sm font-medium">{formatDateTime(log.created_at)}</p>
              </div>
            </div>

            {/* Admin Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Admin
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2">{log.admin_email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <span className="ml-2 font-mono text-xs">{log.admin_id}</span>
                </div>
              </div>
            </div>

            {/* Target Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="ml-2">{log.target_type}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <span className="ml-2 font-mono text-xs">{log.target_id}</span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Reason</span>
              <p className="text-sm p-3 bg-muted rounded-lg">{log.reason}</p>
            </div>

            {/* Metadata */}
            {(log.ip_address || log.user_agent) && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Metadata</h4>
                <div className="space-y-1 text-sm">
                  {log.ip_address && (
                    <div>
                      <span className="text-muted-foreground">IP Address:</span>
                      <span className="ml-2 font-mono">{log.ip_address}</span>
                    </div>
                  )}
                  {log.user_agent && (
                    <div>
                      <span className="text-muted-foreground">User Agent:</span>
                      <span className="ml-2 text-xs">{log.user_agent}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="diff" className="mt-4">
            {isDiffLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : diff && diff.hasChanges ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {diff.entries.length} field{diff.entries.length !== 1 ? 's' : ''} changed
                </p>
                {diff.entries.map((entry, index) => (
                  <DiffEntryRow key={index} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No changes recorded for this action</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Before State</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-48">
                  {log.before_state ? JSON.stringify(log.before_state, null, 2) : '(none)'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">After State</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-48">
                  {log.after_state ? JSON.stringify(log.after_state, null, 2) : '(none)'}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Audit Log Row Component
 */
function AuditLogRow({
  log,
  onSelect,
}: {
  log: AuditLogEntry;
  onSelect: (log: AuditLogEntry) => void;
}) {
  return (
    <div
      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => onSelect(log)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge className={getActionTypeBadgeColor(log.action_type)}>
            {formatActionType(log.action_type)}
          </Badge>
          <Badge variant="outline">{log.target_type}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(log.created_at)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">{log.reason}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {log.admin_email}
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {log.target_id.substring(0, 8)}...
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon">
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}


/**
 * Main Audit Logs Page Component
 * Requirement 5.2: Support filtering by admin, action type, target type, date range with pagination
 */
export default function AuditLogs() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');

  // Fetch audit logs
  const { data, isLoading, error, refetch } = useAuditLogs(filters);

  // Export mutation
  const exportMutation = useExportAuditLogs();

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    const newFilters: AuditLogFilters = {
      page: 1,
      limit: 20,
    };

    if (adminFilter.trim()) {
      newFilters.admin_id = adminFilter.trim();
    }
    if (actionTypeFilter !== 'all') {
      newFilters.action_type = actionTypeFilter as AuditActionType;
    }
    if (targetTypeFilter !== 'all') {
      newFilters.target_type = targetTypeFilter as AuditTargetType;
    }
    if (dateFrom) {
      newFilters.date_from = new Date(dateFrom).toISOString();
    }
    if (dateTo) {
      newFilters.date_to = new Date(dateTo + 'T23:59:59').toISOString();
    }

    setFilters(newFilters);
  }, [adminFilter, actionTypeFilter, targetTypeFilter, dateFrom, dateTo]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setAdminFilter('');
    setActionTypeFilter('all');
    setTargetTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setFilters({ page: 1, limit: 20 });
  }, []);

  // Handle export
  // Requirement 5.4: Support CSV, JSON export formats with date range and filter selection
  const handleExport = useCallback(async (format: AuditExportFormat) => {
    try {
      const exportFilters: Omit<AuditLogFilters, 'page' | 'limit'> = {};
      
      if (adminFilter.trim()) {
        exportFilters.admin_id = adminFilter.trim();
      }
      if (actionTypeFilter !== 'all') {
        exportFilters.action_type = actionTypeFilter as AuditActionType;
      }
      if (targetTypeFilter !== 'all') {
        exportFilters.target_type = targetTypeFilter as AuditTargetType;
      }
      if (dateFrom) {
        exportFilters.date_from = new Date(dateFrom).toISOString();
      }
      if (dateTo) {
        exportFilters.date_to = new Date(dateTo + 'T23:59:59').toISOString();
      }

      const result = await exportMutation.mutateAsync({ filters: exportFilters, format });
      downloadExport(result, format);
      toast.success(`Audit logs exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [exportMutation, adminFilter, actionTypeFilter, targetTypeFilter, dateFrom, dateTo]);

  // Pagination
  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            View and export all administrative actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            JSON
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            >
              {isFiltersExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </CardHeader>
        {isFiltersExpanded && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Admin Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Admin ID</label>
                <Input
                  placeholder="Filter by admin ID..."
                  value={adminFilter}
                  onChange={(e) => setAdminFilter(e.target.value)}
                />
              </div>

              {/* Action Type Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Action Type</label>
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {VALID_ACTION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatActionType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Type Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Target Type</label>
                <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All targets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All targets</SelectItem>
                    {VALID_TARGET_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date Range</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button size="sm" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {data?.total ?? 0} Audit Log{(data?.total ?? 0) !== 1 ? 's' : ''}
            </CardTitle>
            {data && data.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(filters.page! - 1)}
                  disabled={filters.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {filters.page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(filters.page! + 1)}
                  disabled={filters.page === data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Error state */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load audit logs: {error.message}</span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && data?.logs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}

          {/* Logs list */}
          {!isLoading && !error && data && data.logs.length > 0 && (
            <div className="space-y-2">
              {data.logs.map((log) => (
                <AuditLogRow
                  key={log.id}
                  log={log}
                  onSelect={setSelectedLog}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
