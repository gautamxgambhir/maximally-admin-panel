/**
 * EnhancedHackathonManagement Component
 * 
 * Provides advanced hackathon management with filtering, bulk actions,
 * detail modals, and admin actions.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 4.1, 4.3
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAdminHackathons,
  useAdminHackathon,
  useUnpublishHackathon,
  useFeatureHackathon,
  useUnfeatureHackathon,
  useEditHackathon,
} from '@/hooks/useAdminHackathons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Calendar,
  Users,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  MoreHorizontal,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Clock,
  MapPin,
  Globe,
  Building,
} from 'lucide-react';
import type {
  OrganizerHackathon,
  OrganizerHackathonStatus,
  HackathonFormat,
  AdminHackathonFilters,
} from '@/types/adminHackathon';
import { toast } from 'sonner';


export interface EnhancedHackathonManagementProps {
  className?: string;
}

/**
 * Status badge styles
 */
function getStatusStyles(status: OrganizerHackathonStatus): {
  badge: string;
  label: string;
} {
  switch (status) {
    case 'draft':
      return { badge: 'bg-gray-100 text-gray-800', label: 'Draft' };
    case 'pending_review':
      return { badge: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' };
    case 'published':
      return { badge: 'bg-green-100 text-green-800', label: 'Published' };
    case 'rejected':
      return { badge: 'bg-red-100 text-red-800', label: 'Rejected' };
    case 'ended':
      return { badge: 'bg-blue-100 text-blue-800', label: 'Ended' };
    case 'unpublished':
      return { badge: 'bg-orange-100 text-orange-800', label: 'Unpublished' };
    default:
      return { badge: 'bg-gray-100 text-gray-800', label: status };
  }
}

/**
 * Format badge styles
 */
function getFormatStyles(format: HackathonFormat): {
  badge: string;
  icon: typeof Globe;
} {
  switch (format) {
    case 'online':
      return { badge: 'bg-purple-100 text-purple-800', icon: Globe };
    case 'offline':
      return { badge: 'bg-teal-100 text-teal-800', icon: Building };
    case 'hybrid':
      return { badge: 'bg-indigo-100 text-indigo-800', icon: MapPin };
    default:
      return { badge: 'bg-gray-100 text-gray-800', icon: Globe };
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Status filter options
 */
const STATUS_OPTIONS: { value: OrganizerHackathonStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'ended', label: 'Ended' },
  { value: 'unpublished', label: 'Unpublished' },
];

/**
 * Format filter options
 */
const FORMAT_OPTIONS: { value: HackathonFormat | 'all'; label: string }[] = [
  { value: 'all', label: 'All Formats' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
];

/**
 * Bulk action options
 */
const BULK_ACTIONS = [
  { value: 'approve', label: 'Approve', icon: CheckCircle },
  { value: 'reject', label: 'Reject', icon: XCircle },
  { value: 'unpublish', label: 'Unpublish', icon: EyeOff },
  { value: 'feature', label: 'Feature', icon: Star },
  { value: 'unfeature', label: 'Unfeature', icon: StarOff },
  { value: 'delete', label: 'Delete', icon: Trash2, destructive: true },
];


/**
 * Advanced filter panel component
 * Requirement 1.1: Filter by status, organizer, date range, format, registration count
 */
function FilterPanel({
  filters,
  onFiltersChange,
  onReset,
  isExpanded,
}: {
  filters: AdminHackathonFilters;
  onFiltersChange: (filters: AdminHackathonFilters) => void;
  onReset: () => void;
  isExpanded: boolean;
}) {
  if (!isExpanded) return null;

  const hasFilters = filters.status || filters.format || filters.date_from || 
                     filters.date_to || filters.min_registrations || filters.is_featured !== undefined;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Advanced Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={filters.status as string || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                status: value === 'all' ? undefined : value as OrganizerHackathonStatus,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Format</label>
          <Select
            value={filters.format as string || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                format: value === 'all' ? undefined : value as HackathonFormat,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All formats" />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Start Date From</label>
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
          <label className="text-xs text-muted-foreground">Start Date To</label>
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

        {/* Min Registrations */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Min Registrations</label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={filters.min_registrations || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                min_registrations: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>

        {/* Max Registrations */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Max Registrations</label>
          <Input
            type="number"
            min={0}
            placeholder="No limit"
            value={filters.max_registrations || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                max_registrations: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>

        {/* Featured Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Featured</label>
          <Select
            value={filters.is_featured === undefined ? 'all' : filters.is_featured ? 'yes' : 'no'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                is_featured: value === 'all' ? undefined : value === 'yes',
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Featured Only</SelectItem>
              <SelectItem value="no">Not Featured</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Organizer Email */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Organizer Email</label>
          <Input
            placeholder="Filter by organizer..."
            value={filters.organizer_email || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                organizer_email: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>
    </Card>
  );
}


/**
 * Hackathon detail modal component
 * Requirement 1.4: Display complete hackathon data including registrations, submissions, teams, judges
 */
function HackathonDetailModal({
  hackathonId,
  isOpen,
  onClose,
  onAction,
}: {
  hackathonId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, hackathon: OrganizerHackathon) => void;
}) {
  const { data: detailData, isLoading } = useAdminHackathon(hackathonId ?? 0);

  if (!isOpen || !hackathonId) return null;

  const hackathon = detailData?.hackathon;
  const statusStyles = hackathon ? getStatusStyles(hackathon.status) : null;
  const formatStyles = hackathon ? getFormatStyles(hackathon.format) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {hackathon?.hackathon_name || 'Loading...'}
          </DialogTitle>
          <DialogDescription>
            Full hackathon details and management options
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hackathon ? (
          <div className="space-y-6">
            {/* Status and Format */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusStyles?.badge}>{statusStyles?.label}</Badge>
              <Badge className={formatStyles?.badge}>
                {hackathon.format}
              </Badge>
              {hackathon.is_featured && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-3">
                <div className="text-2xl font-bold">{detailData?.registrations_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">Registrations</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold">{detailData?.submissions_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">Submissions</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold">{detailData?.teams_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">Teams</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold">{detailData?.judges_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">Judges</div>
              </Card>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Dates</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(hackathon.start_date)} - {formatDate(hackathon.end_date)}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Organizer</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {hackathon.organizer_email}
                </div>
              </div>
              {hackathon.venue && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Venue</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {hackathon.venue}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Team Size</h4>
                <div className="text-sm">
                  {hackathon.team_size_min} - {hackathon.team_size_max} members
                </div>
              </div>
            </div>

            {/* Description */}
            {hackathon.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Description</h4>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {hackathon.description}
                </p>
              </div>
            )}

            {/* Admin Notes */}
            {hackathon.internal_notes && (
              <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <h4 className="text-sm font-medium">Internal Notes</h4>
                <p className="text-sm">{hackathon.internal_notes}</p>
              </div>
            )}

            {/* Organizer Info */}
            {detailData?.organizer && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium">Organizer Stats</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Hackathons:</span>{' '}
                    {detailData.organizer.total_hackathons}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Published:</span>{' '}
                    {detailData.organizer.published_hackathons}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rejected:</span>{' '}
                    {detailData.organizer.rejected_hackathons}
                  </div>
                  {detailData.organizer.trust_score !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Trust Score:</span>{' '}
                      {detailData.organizer.trust_score}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => onAction('edit', hackathon)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              {hackathon.status === 'published' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onAction('unpublish', hackathon)}>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Unpublish
                  </Button>
                  {hackathon.is_featured ? (
                    <Button variant="outline" size="sm" onClick={() => onAction('unfeature', hackathon)}>
                      <StarOff className="h-4 w-4 mr-1" />
                      Unfeature
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => onAction('feature', hackathon)}>
                      <Star className="h-4 w-4 mr-1" />
                      Feature
                    </Button>
                  )}
                </>
              )}
              {hackathon.status === 'pending_review' && (
                <>
                  <Button variant="default" size="sm" onClick={() => onAction('approve', hackathon)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onAction('reject', hackathon)}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            Hackathon not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


/**
 * Confirmation modal for destructive actions
 * Requirement 4.3: Summary, reason input, confirmation
 */
function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  hackathons,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  action: string;
  hackathons: OrganizerHackathon[];
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');

  const isDestructive = ['delete', 'reject', 'unpublish'].includes(action);

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={isDestructive ? 'text-red-600' : ''}>
            Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
          </DialogTitle>
          <DialogDescription>
            This action will affect {hackathons.length} hackathon{hackathons.length > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Affected Hackathons:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {hackathons.map((h) => (
                <div key={h.id} className="text-sm flex items-center gap-2">
                  <Trophy className="h-3 w-3 text-muted-foreground" />
                  {h.hackathon_name}
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason *</label>
            <Textarea
              placeholder="Explain the reason for this action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Confirm {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Main EnhancedHackathonManagement component
 */
export function EnhancedHackathonManagement({ className }: EnhancedHackathonManagementProps) {
  const { user } = useAuth();
  const adminId = user?.id ?? '';
  const adminEmail = user?.email ?? '';

  // State
  const [filters, setFilters] = useState<AdminHackathonFilters>({ limit: 20 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailHackathonId, setDetailHackathonId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    hackathons: OrganizerHackathon[];
  } | null>(null);

  // Queries
  const {
    data: hackathonsData,
    isLoading,
    error,
    refetch,
  } = useAdminHackathons({
    ...filters,
    search: searchQuery || undefined,
  });

  // Mutations
  const unpublishMutation = useUnpublishHackathon();
  const featureMutation = useFeatureHackathon();
  const unfeatureMutation = useUnfeatureHackathon();

  const isActionLoading = unpublishMutation.isPending || featureMutation.isPending || unfeatureMutation.isPending;

  // Computed
  const hackathons = hackathonsData?.hackathons ?? [];
  const totalPages = hackathonsData?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;
  const allSelected = hackathons.length > 0 && hackathons.every((h) => selectedIds.has(h.id));
  const someSelected = selectedIds.size > 0;

  // Handlers
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(hackathons.map((h) => h.id)));
    }
  }, [allSelected, hackathons]);

  const handleSelectOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedIds(new Set());
  }, []);

  const handleFilterReset = useCallback(() => {
    setFilters({ limit: 20 });
    setSearchQuery('');
    setSelectedIds(new Set());
  }, []);

  const handleAction = useCallback((action: string, hackathon: OrganizerHackathon) => {
    setConfirmAction({ action, hackathons: [hackathon] });
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    const selected = hackathons.filter((h) => selectedIds.has(h.id));
    if (selected.length === 0) {
      toast.error('No hackathons selected');
      return;
    }
    setConfirmAction({ action, hackathons: selected });
  }, [hackathons, selectedIds]);

  const handleConfirmAction = useCallback(async (reason: string) => {
    if (!confirmAction) return;

    const { action, hackathons: targetHackathons } = confirmAction;

    try {
      for (const hackathon of targetHackathons) {
        switch (action) {
          case 'unpublish':
            await unpublishMutation.mutateAsync({
              id: hackathon.id,
              request: { reason, notify_organizer: true, notify_participants: true },
              adminId,
              adminEmail,
            });
            break;
          case 'feature':
            await featureMutation.mutateAsync({
              id: hackathon.id,
              request: { reason },
              adminId,
              adminEmail,
            });
            break;
          case 'unfeature':
            await unfeatureMutation.mutateAsync({
              id: hackathon.id,
              request: { reason },
              adminId,
              adminEmail,
            });
            break;
          // Add more actions as needed
        }
      }
      setConfirmAction(null);
      setSelectedIds(new Set());
      refetch();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }, [confirmAction, unpublishMutation, featureMutation, unfeatureMutation, adminId, adminEmail, refetch]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hackathon Management</h1>
          <p className="text-muted-foreground">
            Manage and moderate organizer hackathons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hackathons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {isFiltersExpanded ? ' ▲' : ' ▼'}
          </Button>
          {someSelected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions ({selectedIds.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {BULK_ACTIONS.map((action) => (
                  <DropdownMenuItem
                    key={action.value}
                    onClick={() => handleBulkAction(action.value)}
                    className={action.destructive ? 'text-red-600' : ''}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleFilterReset}
        isExpanded={isFiltersExpanded}
      />

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load hackathons: {error.message}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Hackathon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : hackathons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hackathons found
                    </TableCell>
                  </TableRow>
                ) : (
                  hackathons.map((hackathon) => {
                    const statusStyles = getStatusStyles(hackathon.status);
                    const formatStyles = getFormatStyles(hackathon.format);
                    return (
                      <TableRow key={hackathon.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(hackathon.id)}
                            onCheckedChange={() => handleSelectOne(hackathon.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {hackathon.is_featured && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                            <div>
                              <div className="font-medium">{hackathon.hackathon_name}</div>
                              <div className="text-xs text-muted-foreground">/{hackathon.slug}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusStyles.badge}>{statusStyles.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={formatStyles.badge}>{hackathon.format}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(hackathon.start_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {hackathon.registrations_count}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">
                          {hackathon.organizer_email}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailHackathonId(hackathon.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('edit', hackathon)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {hackathon.status === 'published' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleAction('unpublish', hackathon)}>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Unpublish
                                  </DropdownMenuItem>
                                  {hackathon.is_featured ? (
                                    <DropdownMenuItem onClick={() => handleAction('unfeature', hackathon)}>
                                      <StarOff className="h-4 w-4 mr-2" />
                                      Unfeature
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleAction('feature', hackathon)}>
                                      <Star className="h-4 w-4 mr-2" />
                                      Feature
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAction('delete', hackathon)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <HackathonDetailModal
        hackathonId={detailHackathonId}
        isOpen={!!detailHackathonId}
        onClose={() => setDetailHackathonId(null)}
        onAction={handleAction}
      />

      {/* Confirm Action Modal */}
      <ConfirmActionModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        action={confirmAction?.action ?? ''}
        hackathons={confirmAction?.hackathons ?? []}
        isLoading={isActionLoading}
      />
    </div>
  );
}

export default EnhancedHackathonManagement;
