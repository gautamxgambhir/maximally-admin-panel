/**
 * Data Management Page
 * 
 * Displays orphaned records, cleanup options, and storage usage.
 * 
 * Requirements: 11.1, 11.2, 11.4
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useDataManagementOverview,
  useOrphanDetection,
  useStorageStats,
  useCleanupOrphans,
} from '@/hooks/useDataManagement';
import { useAuth } from '@/contexts/AuthContext';
import {
  Database,
  Trash2,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  FileWarning,
  Loader2,
  AlertCircle,
  CheckCircle,
  Archive,
  Clock,
  Users,
  Calendar,
  FileText,
  Shield,
} from 'lucide-react';
import type {
  OrphanType,
  OrphanRecord,
  OrphanDetectionFilters,
} from '@/types/dataManagement';
import { VALID_ORPHAN_TYPES } from '@/types/dataManagement';
import { toast } from 'sonner';


/**
 * Format orphan type for display
 */
function formatOrphanType(type: OrphanType): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get orphan type icon
 */
function getOrphanTypeIcon(type: OrphanType) {
  if (type.includes('hackathon')) return Calendar;
  if (type.includes('registration')) return Users;
  if (type.includes('team')) return Users;
  if (type.includes('submission')) return FileText;
  if (type.includes('certificate')) return Shield;
  return FileWarning;
}

/**
 * Get orphan type badge color
 */
function getOrphanTypeBadgeColor(type: OrphanType): string {
  if (type.includes('hackathon')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
  }
  if (type.includes('registration')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
  }
  if (type.includes('team')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
  }
  if (type.includes('submission')) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
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
 * Orphan Summary Card Component
 */
function OrphanSummaryCard({
  type,
  count,
  onClick,
}: {
  type: OrphanType;
  count: number;
  onClick: () => void;
}) {
  const Icon = getOrphanTypeIcon(type);
  
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        count > 0 && 'border-orange-200 dark:border-orange-800'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              count > 0 
                ? 'bg-orange-100 dark:bg-orange-900/30' 
                : 'bg-muted'
            )}>
              <Icon className={cn(
                'h-5 w-5',
                count > 0 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-muted-foreground'
              )} />
            </div>
            <div>
              <p className="text-sm font-medium">{formatOrphanType(type)}</p>
              <p className="text-xs text-muted-foreground">
                {count} orphan{count !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          {count > 0 && (
            <Badge variant="destructive" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Storage Usage Card Component
 */
function StorageUsageCard({
  category,
  sizeFormatted,
  fileCount,
  percentage,
}: {
  category: string;
  sizeFormatted: string;
  fileCount: number;
  percentage: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{category}</span>
        <span className="text-muted-foreground">{sizeFormatted}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {fileCount.toLocaleString()} record{fileCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

/**
 * Orphan Record Row Component
 */
function OrphanRecordRow({
  orphan,
  isSelected,
  onSelect,
}: {
  orphan: OrphanRecord;
  isSelected: boolean;
  onSelect: (id: string | number) => void;
}) {
  const Icon = getOrphanTypeIcon(orphan.type);
  
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 border rounded-lg transition-colors',
        isSelected && 'bg-accent border-primary'
      )}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(orphan.id)}
        className="h-4 w-4 rounded border-gray-300"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <Badge className={getOrphanTypeBadgeColor(orphan.type)}>
            {formatOrphanType(orphan.type)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ID: {String(orphan.id).substring(0, 8)}...
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Missing: {orphan.missing_reference.table}.{orphan.missing_reference.column} = {String(orphan.missing_reference.expected_id ?? 'null').substring(0, 8)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Created: {formatRelativeTime(orphan.created_at)}
        </p>
      </div>
    </div>
  );
}

/**
 * Cleanup Confirmation Dialog
 */
function CleanupConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  orphanType,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, createBackup: boolean) => void;
  selectedCount: number;
  orphanType: OrphanType | null;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');
  const [createBackup, setCreateBackup] = useState(true);

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for cleanup');
      return;
    }
    onConfirm(reason, createBackup);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Confirm Cleanup
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete {selectedCount} orphaned record{selectedCount !== 1 ? 's' : ''}.
            {orphanType && (
              <span className="block mt-1">
                Type: <Badge className={getOrphanTypeBadgeColor(orphanType)}>{formatOrphanType(orphanType)}</Badge>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for cleanup *</label>
            <Input
              placeholder="Enter reason for this cleanup..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createBackup"
              checked={createBackup}
              onChange={(e) => setCreateBackup(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="createBackup" className="text-sm">
              Create backup before deletion (recommended)
            </label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedCount} Record{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


/**
 * Main Data Management Page Component
 * 
 * Requirement 11.1: Display orphaned records with cleanup options
 * Requirement 11.4: Display storage consumption by category
 */
export default function DataManagement() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<OrphanType | 'all'>('all');
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string | number>>(new Set());
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  // Fetch data
  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useDataManagementOverview();
  
  const filters: OrphanDetectionFilters = selectedType === 'all' 
    ? {} 
    : { types: [selectedType] };
  const { data: orphanData, isLoading: isOrphansLoading, refetch: refetchOrphans } = useOrphanDetection(filters);
  
  const { data: storageData, isLoading: isStorageLoading } = useStorageStats();

  // Cleanup mutation
  const cleanupMutation = useCleanupOrphans();

  // Handle orphan selection
  const handleSelectOrphan = useCallback((id: string | number) => {
    setSelectedOrphans(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!orphanData) return;
    
    if (selectedOrphans.size === orphanData.orphans.length) {
      setSelectedOrphans(new Set());
    } else {
      setSelectedOrphans(new Set(orphanData.orphans.map(o => o.id)));
    }
  }, [orphanData, selectedOrphans.size]);

  // Handle cleanup
  const handleCleanup = useCallback(async (reason: string, createBackup: boolean) => {
    if (!user || selectedOrphans.size === 0 || !orphanData) return;

    // Get the orphan type from the first selected orphan
    const firstOrphan = orphanData.orphans.find(o => selectedOrphans.has(o.id));
    if (!firstOrphan) return;

    try {
      const result = await cleanupMutation.mutateAsync({
        request: {
          orphan_ids: Array.from(selectedOrphans),
          orphan_type: firstOrphan.type,
          reason,
          create_backup: createBackup,
        },
        adminId: user.id,
        adminEmail: user.email ?? 'unknown',
      });

      if (result.deleted > 0) {
        toast.success(`Successfully deleted ${result.deleted} orphaned record${result.deleted !== 1 ? 's' : ''}`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to delete ${result.failed} record${result.failed !== 1 ? 's' : ''}`);
      }

      setSelectedOrphans(new Set());
      setShowCleanupDialog(false);
      refetchOrphans();
      refetchOverview();
    } catch (err) {
      toast.error(`Cleanup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [user, selectedOrphans, orphanData, cleanupMutation, refetchOrphans, refetchOverview]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchOverview();
    refetchOrphans();
  }, [refetchOverview, refetchOrphans]);

  // Calculate storage percentages
  const maxStorageBytes = storageData?.by_category.reduce(
    (max, cat) => Math.max(max, cat.size_bytes),
    1
  ) ?? 1;

  const isLoading = isOverviewLoading || isOrphansLoading || isStorageLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage orphaned records and monitor storage usage
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <FileWarning className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overview?.orphan_summary.total_orphans ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Orphans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <HardDrive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {storageData?.total_size_formatted ?? '0 Bytes'}
                </p>
                <p className="text-sm text-muted-foreground">Total Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overview?.cleanup_history.length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Recent Cleanups</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orphans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orphans" className="flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Orphaned Records
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage Usage
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Cleanup History
          </TabsTrigger>
        </TabsList>

        {/* Orphaned Records Tab */}
        <TabsContent value="orphans" className="space-y-4">
          {/* Orphan Type Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {VALID_ORPHAN_TYPES.slice(0, 5).map((type) => (
              <OrphanSummaryCard
                key={type}
                type={type}
                count={overview?.orphan_summary.by_type[type] ?? 0}
                onClick={() => setSelectedType(type)}
              />
            ))}
          </div>

          {/* Orphan List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Orphaned Records</CardTitle>
                  <CardDescription>
                    {orphanData?.summary.total_orphans ?? 0} orphan{(orphanData?.summary.total_orphans ?? 0) !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedType} 
                    onValueChange={(v) => {
                      setSelectedType(v as OrphanType | 'all');
                      setSelectedOrphans(new Set());
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {VALID_ORPHAN_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatOrphanType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedOrphans.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowCleanupDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedOrphans.size})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isOrphansLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : orphanData && orphanData.orphans.length > 0 ? (
                <div className="space-y-2">
                  {/* Select All */}
                  <div className="flex items-center gap-2 p-2 border-b">
                    <input
                      type="checkbox"
                      checked={selectedOrphans.size === orphanData.orphans.length && orphanData.orphans.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-muted-foreground">
                      Select all ({orphanData.orphans.length})
                    </span>
                  </div>
                  
                  {orphanData.orphans.map((orphan) => (
                    <OrphanRecordRow
                      key={`${orphan.type}-${orphan.id}`}
                      orphan={orphan}
                      isSelected={selectedOrphans.has(orphan.id)}
                      onSelect={handleSelectOrphan}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-lg font-medium">No orphaned records found</p>
                  <p className="text-sm">Your database is clean!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Usage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage by Category</CardTitle>
              <CardDescription>
                Total: {storageData?.total_size_formatted ?? '0 Bytes'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isStorageLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : storageData ? (
                <>
                  {storageData.by_category.map((category) => (
                    <StorageUsageCard
                      key={category.category}
                      category={category.category}
                      sizeFormatted={category.size_formatted}
                      fileCount={category.file_count}
                      percentage={(category.size_bytes / maxStorageBytes) * 100}
                    />
                  ))}
                  
                  {storageData.recommendations.length > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Recommendations
                      </h4>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        {storageData.recommendations.map((rec, i) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No storage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cleanup History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Cleanup Operations</CardTitle>
              <CardDescription>
                History of data cleanup operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview && overview.cleanup_history.length > 0 ? (
                <div className="space-y-3">
                  {overview.cleanup_history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="p-2 bg-muted rounded-lg">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getOrphanTypeBadgeColor(entry.orphan_type)}>
                            {formatOrphanType(entry.orphan_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(entry.performed_at)}
                          </span>
                        </div>
                        <p className="text-sm">
                          Deleted {entry.records_deleted} record{entry.records_deleted !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {entry.performed_by} • Reason: {entry.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No cleanup history</p>
                  <p className="text-sm">Cleanup operations will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cleanup Confirmation Dialog */}
      <CleanupConfirmDialog
        isOpen={showCleanupDialog}
        onClose={() => setShowCleanupDialog(false)}
        onConfirm={handleCleanup}
        selectedCount={selectedOrphans.size}
        orphanType={orphanData?.orphans.find(o => selectedOrphans.has(o.id))?.type ?? null}
        isLoading={cleanupMutation.isPending}
      />
    </div>
  );
}
