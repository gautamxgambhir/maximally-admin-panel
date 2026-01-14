/**
 * EnhancedUserModeration Component
 * 
 * Provides advanced user moderation with search, bulk actions,
 * detail modals, and trust score display.
 * 
 * Requirements: 3.1, 3.4, 3.6, 4.2
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabase';
import {
  User,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Ban,
  Volume2,
  VolumeX,
  Clock,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Trophy,
  Users,
  FileText,
  Award,
  History,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Star,
  Info,
} from 'lucide-react';
import type {
  UserWithDetails,
  UserSearchFilters,
  UserModerationStatus,
  UserRole,
} from '@/types/userManagement';
import { toast } from 'sonner';


export interface EnhancedUserModerationProps {
  className?: string;
}

/**
 * Moderation status styles
 */
function getModerationStatusStyles(status: UserModerationStatus): {
  badge: string;
  label: string;
} {
  switch (status) {
    case 'active':
      return { badge: 'bg-green-100 text-green-800', label: 'Active' };
    case 'warned':
      return { badge: 'bg-yellow-100 text-yellow-800', label: 'Warned' };
    case 'muted':
      return { badge: 'bg-orange-100 text-orange-800', label: 'Muted' };
    case 'suspended':
      return { badge: 'bg-red-100 text-red-800', label: 'Suspended' };
    case 'banned':
      return { badge: 'bg-red-200 text-red-900', label: 'Banned' };
    default:
      return { badge: 'bg-gray-100 text-gray-800', label: status };
  }
}

/**
 * Role styles
 */
function getRoleStyles(role: UserRole): {
  badge: string;
  label: string;
} {
  switch (role) {
    case 'admin':
      return { badge: 'bg-purple-100 text-purple-800', label: 'Admin' };
    case 'super_admin':
      return { badge: 'bg-purple-200 text-purple-900', label: 'Super Admin' };
    case 'organizer':
      return { badge: 'bg-blue-100 text-blue-800', label: 'Organizer' };
    case 'user':
    default:
      return { badge: 'bg-gray-100 text-gray-800', label: 'User' };
  }
}

/**
 * Trust score color based on value
 */
function getTrustScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Format date
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
const STATUS_OPTIONS: { value: UserModerationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'warned', label: 'Warned' },
  { value: 'muted', label: 'Muted' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

/**
 * Role filter options
 */
const ROLE_OPTIONS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'user', label: 'User' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

/**
 * Bulk action options
 */
const BULK_ACTIONS = [
  { value: 'warn', label: 'Warn', icon: AlertTriangle },
  { value: 'mute', label: 'Mute', icon: VolumeX },
  { value: 'suspend', label: 'Suspend', icon: Clock },
  { value: 'ban', label: 'Ban', icon: Ban, destructive: true },
  { value: 'unban', label: 'Unban', icon: CheckCircle },
];


/**
 * Trust Score Badge Component
 * Requirement 3.6: Score badge with breakdown tooltip
 */
function TrustScoreBadge({ score, factors }: { score: number | null; factors?: Record<string, unknown> }) {
  if (score === null) {
    return (
      <Badge variant="outline" className="text-gray-400">
        N/A
      </Badge>
    );
  }

  const colorClass = getTrustScoreColor(score);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('cursor-help', colorClass)}>
            <Star className="h-3 w-3 mr-1" />
            {score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">Trust Score: {score}/100</div>
            {factors && (
              <div className="text-xs space-y-0.5">
                {Object.entries(factors).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Advanced search filter panel
 * Requirement 3.4: Search by email, username, name, phone, date range, role, status
 */
function SearchFilterPanel({
  filters,
  onFiltersChange,
  onReset,
  isExpanded,
}: {
  filters: UserSearchFilters;
  onFiltersChange: (filters: UserSearchFilters) => void;
  onReset: () => void;
  isExpanded: boolean;
}) {
  if (!isExpanded) return null;

  const hasFilters = filters.email || filters.username || filters.full_name || 
                     filters.phone || filters.date_from || filters.date_to ||
                     filters.role || filters.moderation_status;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Advanced Search</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Email</label>
          <Input
            placeholder="Search by email..."
            value={filters.email || ''}
            onChange={(e) => onFiltersChange({ ...filters, email: e.target.value || undefined })}
          />
        </div>

        {/* Username */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Username</label>
          <Input
            placeholder="Search by username..."
            value={filters.username || ''}
            onChange={(e) => onFiltersChange({ ...filters, username: e.target.value || undefined })}
          />
        </div>

        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Full Name</label>
          <Input
            placeholder="Search by name..."
            value={filters.full_name || ''}
            onChange={(e) => onFiltersChange({ ...filters, full_name: e.target.value || undefined })}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Phone</label>
          <Input
            placeholder="Search by phone..."
            value={filters.phone || ''}
            onChange={(e) => onFiltersChange({ ...filters, phone: e.target.value || undefined })}
          />
        </div>

        {/* Role */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Role</label>
          <Select
            value={filters.role as string || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                role: value === 'all' ? undefined : value as UserRole,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Moderation Status */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={filters.moderation_status as string || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                moderation_status: value === 'all' ? undefined : value as UserModerationStatus,
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

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Joined From</label>
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
          <label className="text-xs text-muted-foreground">Joined To</label>
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
    </Card>
  );
}


/**
 * User detail modal component
 * Requirement 3.1: Display complete user history
 */
function UserDetailModal({
  userId,
  isOpen,
  onClose,
  onAction,
}: {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, userId: string) => void;
}) {
  const { data: userDetails, isLoading } = useQuery({
    queryKey: ['user-details', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw new Error(profileError.message);

      // Fetch moderation status
      const { data: modStatus } = await supabaseAdmin
        .from('user_moderation_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch moderation history
      const { data: modHistory } = await supabaseAdmin
        .from('user_moderation_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch trust score
      const { data: trustScore } = await supabaseAdmin
        .from('user_trust_scores')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch hackathon participation count
      const { count: hackathonsCount } = await supabaseAdmin
        .from('hackathon_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch teams count
      const { count: teamsCount } = await supabaseAdmin
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch submissions count
      const { count: submissionsCount } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch certificates count
      const { count: certificatesCount } = await supabaseAdmin
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        profile,
        moderation_status: modStatus?.is_banned ? 'banned' : 
                          modStatus?.is_muted ? 'muted' : 
                          modStatus?.is_suspended ? 'suspended' :
                          (modStatus?.warning_count || 0) > 0 ? 'warned' : 'active',
        moderation_history: modHistory || [],
        trust_score: trustScore?.score ?? null,
        trust_factors: trustScore?.factors ?? null,
        hackathons_participated: hackathonsCount || 0,
        teams_joined: teamsCount || 0,
        submissions_made: submissionsCount || 0,
        certificates_earned: certificatesCount || 0,
      };
    },
    enabled: !!userId && isOpen,
  });

  if (!isOpen || !userId) return null;

  const statusStyles = userDetails ? getModerationStatusStyles(userDetails.moderation_status as UserModerationStatus) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {userDetails?.profile?.full_name || userDetails?.profile?.username || 'Loading...'}
          </DialogTitle>
          <DialogDescription>
            Full user profile and moderation history
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : userDetails ? (
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="history">Mod History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Status and Trust Score */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusStyles?.badge}>{statusStyles?.label}</Badge>
                <TrustScoreBadge 
                  score={userDetails.trust_score} 
                  factors={userDetails.trust_factors as Record<string, unknown>} 
                />
              </div>

              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Contact</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {userDetails.profile.email}
                    </div>
                    {userDetails.profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {userDetails.profile.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Joined {formatDate(userDetails.profile.created_at)}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Account</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      @{userDetails.profile.username}
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Role: {userDetails.profile.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xl font-bold">{userDetails.hackathons_participated}</div>
                      <div className="text-xs text-muted-foreground">Hackathons</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xl font-bold">{userDetails.teams_joined}</div>
                      <div className="text-xs text-muted-foreground">Teams</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xl font-bold">{userDetails.submissions_made}</div>
                      <div className="text-xs text-muted-foreground">Submissions</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xl font-bold">{userDetails.certificates_earned}</div>
                      <div className="text-xs text-muted-foreground">Certificates</div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Activity timeline coming soon...
              </p>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {userDetails.moderation_history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No moderation history
                </p>
              ) : (
                <div className="space-y-2">
                  {userDetails.moderation_history.map((action: any) => (
                    <div key={action.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{action.action_type.toUpperCase()}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(action.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{action.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            User not found
          </div>
        )}

        {/* Actions */}
        {userDetails && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => onAction('warn', userId)}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Warn
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction('mute', userId)}>
              <VolumeX className="h-4 w-4 mr-1" />
              Mute
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction('suspend', userId)}>
              <Clock className="h-4 w-4 mr-1" />
              Suspend
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onAction('ban', userId)}>
              <Ban className="h-4 w-4 mr-1" />
              Ban
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


/**
 * Bulk action confirmation modal
 */
function BulkActionModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  userCount,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, duration?: number) => void;
  action: string;
  userCount: number;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');

  const isDestructive = ['ban', 'suspend'].includes(action);
  const needsDuration = ['mute', 'suspend', 'ban'].includes(action);

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    onConfirm(reason.trim(), duration ? parseInt(duration) : undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={isDestructive ? 'text-red-600' : ''}>
            Confirm Bulk {action.charAt(0).toUpperCase() + action.slice(1)}
          </DialogTitle>
          <DialogDescription>
            This action will affect {userCount} user{userCount > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason *</label>
            <Textarea
              placeholder="Explain the reason for this action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {needsDuration && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (hours, empty = permanent)</label>
              <Input
                type="number"
                min={1}
                placeholder="e.g., 24"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          )}
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
 * Main EnhancedUserModeration component
 */
export function EnhancedUserModeration({ className }: EnhancedUserModerationProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [filters, setFilters] = useState<UserSearchFilters>({ limit: 20 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ action: string; userIds: string[] } | null>(null);

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['enhanced-users', filters, searchQuery],
    queryFn: async () => {
      let query = supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      // Apply filters
      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      if (filters.username) {
        query = query.ilike('username', `%${filters.username}%`);
      }
      if (filters.full_name) {
        query = query.ilike('full_name', `%${filters.full_name}%`);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Pagination
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      // Fetch trust scores for users
      const userIds = (data || []).map((u: any) => u.id);
      const { data: trustScores } = await supabaseAdmin
        .from('user_trust_scores')
        .select('user_id, score, factors')
        .in('user_id', userIds);

      const trustScoreMap = new Map((trustScores || []).map((ts: any) => [ts.user_id, ts]));

      // Fetch moderation status
      const { data: modStatuses } = await supabaseAdmin
        .from('user_moderation_status')
        .select('*')
        .in('user_id', userIds);

      const modStatusMap = new Map((modStatuses || []).map((ms: any) => [ms.user_id, ms]));

      const users = (data || []).map((profile: any) => {
        const trustScore = trustScoreMap.get(profile.id);
        const modStatus = modStatusMap.get(profile.id);
        return {
          ...profile,
          trust_score: trustScore?.score ?? null,
          moderation_status: modStatus?.is_banned ? 'banned' :
                            modStatus?.is_muted ? 'muted' :
                            modStatus?.is_suspended ? 'suspended' :
                            (modStatus?.warning_count || 0) > 0 ? 'warned' : 'active',
        };
      });

      return {
        users,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, userIds, reason, duration }: {
      action: string;
      userIds: string[];
      reason: string;
      duration?: number;
    }) => {
      const { data: session } = await supabaseAdmin.auth.getSession();
      const adminId = session?.session?.user?.id;

      for (const userId of userIds) {
        await supabaseAdmin.from('user_moderation_actions').insert({
          user_id: userId,
          action_type: action,
          reason,
          duration_hours: duration || null,
          performed_by: adminId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-users'] });
      toast.success('Bulk action completed');
      setBulkAction(null);
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  // Computed
  const users = usersData?.users ?? [];
  const totalPages = usersData?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;
  const allSelected = users.length > 0 && users.every((u: any) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;

  // Handlers
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u: any) => u.id)));
    }
  }, [allSelected, users]);

  const handleSelectOne = useCallback((id: string) => {
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

  const handleBulkAction = useCallback((action: string) => {
    const selected = Array.from(selectedIds);
    if (selected.length === 0) {
      toast.error('No users selected');
      return;
    }
    setBulkAction({ action, userIds: selected });
  }, [selectedIds]);

  const handleConfirmBulkAction = useCallback((reason: string, duration?: number) => {
    if (!bulkAction) return;
    bulkActionMutation.mutate({
      action: bulkAction.action,
      userIds: bulkAction.userIds,
      reason,
      duration,
    });
  }, [bulkAction, bulkActionMutation]);

  const handleUserAction = useCallback((action: string, userId: string) => {
    setBulkAction({ action, userIds: [userId] });
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Moderation</h1>
          <p className="text-muted-foreground">
            Manage users and take moderation actions
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
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
      <SearchFilterPanel
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
            <span>Failed to load users: {(error as Error).message}</span>
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
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: any) => {
                    const statusStyles = getModerationStatusStyles(user.moderation_status);
                    const roleStyles = getRoleStyles(user.role);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={() => handleSelectOne(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{user.full_name || user.username}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusStyles.badge}>{statusStyles.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleStyles.badge}>{roleStyles.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <TrustScoreBadge score={user.trust_score} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailUserId(user.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUserAction('warn', user.id)}>
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Warn
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserAction('mute', user.id)}>
                                <VolumeX className="h-4 w-4 mr-2" />
                                Mute
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserAction('suspend', user.id)}>
                                <Clock className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleUserAction('ban', user.id)}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban
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
      <UserDetailModal
        userId={detailUserId}
        isOpen={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        onAction={handleUserAction}
      />

      {/* Bulk Action Modal */}
      <BulkActionModal
        isOpen={!!bulkAction}
        onClose={() => setBulkAction(null)}
        onConfirm={handleConfirmBulkAction}
        action={bulkAction?.action ?? ''}
        userCount={bulkAction?.userIds.length ?? 0}
        isLoading={bulkActionMutation.isPending}
      />
    </div>
  );
}

export default EnhancedUserModeration;
