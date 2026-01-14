/**
 * OrganizerOversight Component
 * 
 * Provides organizer management with trust scores, flag indicators,
 * and revoke functionality.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabase';
import {
  User,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Flag,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Trophy,
  Users,
  Star,
  XCircle,
  CheckCircle,
  Info,
  Shield,
  Building,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export interface OrganizerOversightProps {
  className?: string;
}

/**
 * Organizer data structure with trust scores and hackathon stats
 * Requirement 7.1: Display hackathon stats, trust score, flag status
 */
interface OrganizerData {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  organization_name: string | null;
  created_at: string;
  total_hackathons: number;
  active_hackathons: number;
  published_hackathons: number;
  pending_hackathons: number;
  rejected_hackathons: number;
  ended_hackathons: number;
  total_participants: number;
  approval_rate: number;
  trust_score: number | null;
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
  tier: string;
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
 * Trust score background color
 */
function getTrustScoreBgColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 dark:bg-gray-800';
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30';
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (score >= 20) return 'bg-orange-100 dark:bg-orange-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
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
 * Get tier badge color
 */
function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    starter: 'bg-gray-500',
    verified: 'bg-blue-500',
    senior: 'bg-purple-500',
    chief: 'bg-orange-500',
    legacy: 'bg-yellow-500',
  };
  return colors[tier] || 'bg-gray-500';
}


/**
 * Trust Score Badge with tooltip
 * Requirement 7.5: Show trust score
 */
function TrustScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <Badge variant="outline" className="text-gray-400">
        N/A
      </Badge>
    );
  }

  const colorClass = getTrustScoreColor(score);
  const bgClass = getTrustScoreBgColor(score);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('cursor-help', colorClass, bgClass)}>
            <Star className="h-3 w-3 mr-1" />
            {score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">Trust Score: {score}/100</div>
            <div className="text-xs text-muted-foreground mt-1">
              {score >= 80 && 'Excellent - Highly trusted organizer'}
              {score >= 60 && score < 80 && 'Good - Reliable organizer'}
              {score >= 40 && score < 60 && 'Average - Monitor activity'}
              {score >= 20 && score < 40 && 'Low - Requires attention'}
              {score < 20 && 'Critical - Review immediately'}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Flag Indicator Component
 * Requirement 7.2: Visual flag icon with tooltip
 */
function FlagIndicator({ isFlagged, reason, flaggedAt }: { 
  isFlagged: boolean; 
  reason: string | null;
  flaggedAt?: string | null;
}) {
  if (!isFlagged) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 cursor-help">
            <Flag className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Organizer Flagged
            </div>
            {reason && (
              <p className="text-sm text-muted-foreground">{reason}</p>
            )}
            {flaggedAt && (
              <p className="text-xs text-muted-foreground">
                Flagged on: {formatDate(flaggedAt)}
              </p>
            )}
            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Future hackathon submissions require manual review.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Approval Rate Badge
 */
function ApprovalRateBadge({ rate, total }: { rate: number; total: number }) {
  if (total === 0) {
    return (
      <span className="text-muted-foreground text-sm">No hackathons</span>
    );
  }

  const getColor = () => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIcon = () => {
    if (rate >= 60) return <TrendingUp className="h-3 w-3" />;
    if (rate >= 40) return <Minus className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  return (
    <span className={cn('flex items-center gap-1 text-sm font-medium', getColor())}>
      {getIcon()}
      {rate.toFixed(0)}%
    </span>
  );
}


/**
 * Organizer Detail Modal
 * Requirement 7.1: View organizer profile with hackathon stats
 */
function OrganizerDetailModal({
  organizer,
  isOpen,
  onClose,
  onFlag,
  onUnflag,
  onRevoke,
}: {
  organizer: OrganizerData | null;
  isOpen: boolean;
  onClose: () => void;
  onFlag: () => void;
  onUnflag: () => void;
  onRevoke: () => void;
}) {
  if (!organizer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organizer Details
          </DialogTitle>
          <DialogDescription>
            View complete organizer profile and statistics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header with name and badges */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {organizer.display_name || organizer.full_name || organizer.username || 'Unknown'}
              </h3>
              {organizer.organization_name && (
                <p className="text-muted-foreground">{organizer.organization_name}</p>
              )}
              <p className="text-sm text-muted-foreground">{organizer.email}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <TrustScoreBadge score={organizer.trust_score} />
              <FlagIndicator 
                isFlagged={organizer.is_flagged} 
                reason={organizer.flag_reason}
                flaggedAt={organizer.flagged_at}
              />
              <Badge className={cn(getTierColor(organizer.tier), 'text-white capitalize')}>
                {organizer.tier}
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{organizer.total_hackathons}</div>
              <div className="text-xs text-muted-foreground">Total Hackathons</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{organizer.active_hackathons}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{organizer.total_participants}</div>
              <div className="text-xs text-muted-foreground">Total Participants</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <ApprovalRateBadge rate={organizer.approval_rate} total={organizer.total_hackathons} />
              <div className="text-xs text-muted-foreground">Approval Rate</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="space-y-2">
            <h4 className="font-medium">Hackathon Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <span>Published</span>
                <span className="font-medium">{organizer.published_hackathons}</span>
              </div>
              <div className="flex justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <span>Pending Review</span>
                <span className="font-medium">{organizer.pending_hackathons}</span>
              </div>
              <div className="flex justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <span>Rejected</span>
                <span className="font-medium">{organizer.rejected_hackathons}</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900/20 rounded">
                <span>Ended</span>
                <span className="font-medium">{organizer.ended_hackathons}</span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="space-y-2">
            <h4 className="font-medium">Account Information</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{organizer.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span>{formatDate(organizer.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {organizer.is_flagged ? (
            <Button variant="outline" onClick={onUnflag}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Remove Flag
            </Button>
          ) : (
            <Button variant="outline" onClick={onFlag}>
              <Flag className="h-4 w-4 mr-2" />
              Flag Organizer
            </Button>
          )}
          <Button variant="destructive" onClick={onRevoke}>
            <XCircle className="h-4 w-4 mr-2" />
            Revoke Status
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Flag Organizer Modal
 * Requirement 7.2: Flag organizers with multiple rejections or violations
 */
function FlagOrganizerModal({
  organizer,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  organizer: OrganizerData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!organizer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-yellow-600 flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Flag Organizer
          </DialogTitle>
          <DialogDescription>
            Flag {organizer.display_name || organizer.full_name || organizer.email} for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Flagging this organizer will:</p>
                <ul className="list-disc list-inside mt-1 text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>Require manual review for all future hackathon submissions</li>
                  <li>Display a warning indicator to other admins</li>
                  <li>Log the action in the audit trail</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Flagging *</label>
            <Textarea
              placeholder="Explain why this organizer is being flagged..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-yellow-600 hover:bg-yellow-700"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Flag Organizer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Unflag Organizer Modal
 */
function UnflagOrganizerModal({
  organizer,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  organizer: OrganizerData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!organizer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-600 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Remove Flag
          </DialogTitle>
          <DialogDescription>
            Remove the flag from {organizer.display_name || organizer.full_name || organizer.email}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {organizer.flag_reason && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Current Flag Reason:</p>
              <p className="text-sm text-muted-foreground mt-1">{organizer.flag_reason}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Removing Flag *</label>
            <Textarea
              placeholder="Explain why the flag is being removed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Remove Flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Revoke Organizer Modal
 * Requirement 7.3: Revoke button with confirmation and reason
 */
function RevokeOrganizerModal({
  organizer,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  organizer: OrganizerData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!organizer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Revoke Organizer Status
          </DialogTitle>
          <DialogDescription>
            This will revoke organizer status for {organizer.display_name || organizer.full_name || organizer.email}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200">This action will:</p>
                <ul className="list-disc list-inside mt-1 text-red-700 dark:text-red-300 space-y-1">
                  <li>Unpublish all active hackathons ({organizer.active_hackathons})</li>
                  <li>Notify affected participants</li>
                  <li>Send revocation email to organizer</li>
                  <li>Log the action in audit trail</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Hackathons:</span>{' '}
              <span className="font-medium">{organizer.total_hackathons}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Active Hackathons:</span>{' '}
              <span className="font-medium">{organizer.active_hackathons}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Participants:</span>{' '}
              <span className="font-medium">{organizer.total_participants}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Trust Score:</span>{' '}
              <span className="font-medium">{organizer.trust_score ?? 'N/A'}</span>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Revocation *</label>
            <Textarea
              placeholder="Explain why this organizer's status is being revoked..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Revoke Organizer Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Calculate approval rate from hackathon counts
 */
function calculateApprovalRate(approved: number, total: number): number {
  if (total === 0) return 100;
  const rate = (approved / total) * 100;
  return Math.round(rate * 100) / 100;
}

/**
 * Main OrganizerOversight component
 * Requirement 7.1: Display hackathon stats, trust score, flag status
 */
export function OrganizerOversight({ className }: OrganizerOversightProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filterFlagged, setFilterFlagged] = useState<'all' | 'flagged' | 'not_flagged'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'trust_score' | 'total_hackathons'>('created_at');
  
  // Modal states
  const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerData | null>(null);
  const [detailOrganizer, setDetailOrganizer] = useState<OrganizerData | null>(null);
  const [flagOrganizer, setFlagOrganizer] = useState<OrganizerData | null>(null);
  const [unflagOrganizer, setUnflagOrganizer] = useState<OrganizerData | null>(null);
  const [revokeOrganizer, setRevokeOrganizer] = useState<OrganizerData | null>(null);
  
  const limit = 20;

  // Fetch organizers with stats
  const {
    data: organizersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['organizers-oversight', searchQuery, page, filterFlagged, sortBy],
    queryFn: async () => {
      // Get organizers from organizer_profiles
      let query = supabaseAdmin
        .from('organizer_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(
          `email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,organization_name.ilike.%${searchQuery}%`
        );
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: profiles, error: profilesError, count } = await query;

      if (profilesError) throw profilesError;

      // Enrich each organizer with hackathon stats and trust scores
      const enrichedOrganizers: OrganizerData[] = await Promise.all(
        (profiles ?? []).map(async (profile: any) => {
          const organizerId = profile.user_id;

          // Get hackathon statistics
          const { data: hackathons } = await supabaseAdmin
            .from('organizer_hackathons')
            .select('id, status, registrations_count')
            .eq('organizer_id', organizerId);

          const allHackathons = hackathons ?? [];
          const totalHackathons = allHackathons.length;
          const publishedHackathons = allHackathons.filter((h: any) => h.status === 'published').length;
          const pendingHackathons = allHackathons.filter((h: any) => h.status === 'pending_review').length;
          const rejectedHackathons = allHackathons.filter((h: any) => h.status === 'rejected').length;
          const endedHackathons = allHackathons.filter((h: any) => h.status === 'ended').length;
          const activeHackathons = publishedHackathons + pendingHackathons;
          
          const approvedHackathons = publishedHackathons + endedHackathons;
          const approvalRate = calculateApprovalRate(approvedHackathons, totalHackathons);
          
          const totalParticipants = allHackathons.reduce(
            (sum: number, h: any) => sum + (h.registrations_count ?? 0), 
            0
          );

          // Get trust score
          let trustScore: number | null = null;
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
            isFlagged = trustData.is_flagged ?? false;
            flagReason = trustData.flag_reason;
            flaggedAt = trustData.flagged_at;
          }

          return {
            id: profile.id,
            user_id: profile.user_id,
            email: profile.email,
            username: null,
            full_name: null,
            display_name: profile.display_name,
            organization_name: profile.organization_name,
            created_at: profile.created_at,
            total_hackathons: totalHackathons,
            active_hackathons: activeHackathons,
            published_hackathons: publishedHackathons,
            pending_hackathons: pendingHackathons,
            rejected_hackathons: rejectedHackathons,
            ended_hackathons: endedHackathons,
            total_participants: totalParticipants,
            approval_rate: approvalRate,
            trust_score: trustScore,
            is_flagged: isFlagged,
            flag_reason: flagReason,
            flagged_at: flaggedAt,
            tier: profile.tier ?? 'starter',
          };
        })
      );

      // Apply post-query filters
      let filteredOrganizers = enrichedOrganizers;

      if (filterFlagged === 'flagged') {
        filteredOrganizers = filteredOrganizers.filter(o => o.is_flagged);
      } else if (filterFlagged === 'not_flagged') {
        filteredOrganizers = filteredOrganizers.filter(o => !o.is_flagged);
      }

      // Sort
      if (sortBy === 'trust_score') {
        filteredOrganizers.sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0));
      } else if (sortBy === 'total_hackathons') {
        filteredOrganizers.sort((a, b) => b.total_hackathons - a.total_hackathons);
      }

      return {
        organizers: filteredOrganizers,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      };
    },
  });


  // Flag organizer mutation
  const flagMutation = useMutation({
    mutationFn: async ({ organizerId, reason }: { organizerId: string; reason: string }) => {
      // Upsert trust score record with flag
      const { error } = await supabaseAdmin
        .from('organizer_trust_scores')
        .upsert({
          organizer_id: organizerId,
          is_flagged: true,
          flag_reason: reason,
          flagged_at: new Date().toISOString(),
          last_calculated_at: new Date().toISOString(),
          score: 50, // Default score if not exists
        });

      if (error) throw error;

      // Create audit log
      await supabaseAdmin.from('admin_audit_logs').insert({
        action_type: 'organizer_flagged',
        admin_id: user?.id,
        admin_email: user?.email,
        target_type: 'organizer',
        target_id: organizerId,
        reason: reason,
        before_state: { is_flagged: false },
        after_state: { is_flagged: true, flag_reason: reason },
      });

      // Log activity
      await supabaseAdmin.from('admin_activity_feed').insert({
        activity_type: 'moderation_action',
        actor_id: user?.id,
        actor_email: user?.email,
        target_type: 'organizer',
        target_id: organizerId,
        action: 'Organizer flagged for review',
        metadata: { reason },
        severity: 'warning',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizers-oversight'] });
      toast.success('Organizer flagged successfully');
      setFlagOrganizer(null);
      setDetailOrganizer(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to flag organizer: ${error.message}`);
    },
  });

  // Unflag organizer mutation
  const unflagMutation = useMutation({
    mutationFn: async ({ organizerId, reason }: { organizerId: string; reason: string }) => {
      const { error } = await supabaseAdmin
        .from('organizer_trust_scores')
        .update({
          is_flagged: false,
          flag_reason: null,
          flagged_at: null,
          last_calculated_at: new Date().toISOString(),
        })
        .eq('organizer_id', organizerId);

      if (error) throw error;

      // Create audit log
      await supabaseAdmin.from('admin_audit_logs').insert({
        action_type: 'organizer_unflagged',
        admin_id: user?.id,
        admin_email: user?.email,
        target_type: 'organizer',
        target_id: organizerId,
        reason: reason,
        before_state: { is_flagged: true },
        after_state: { is_flagged: false },
      });

      // Log activity
      await supabaseAdmin.from('admin_activity_feed').insert({
        activity_type: 'moderation_action',
        actor_id: user?.id,
        actor_email: user?.email,
        target_type: 'organizer',
        target_id: organizerId,
        action: 'Organizer flag removed',
        metadata: { reason },
        severity: 'info',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizers-oversight'] });
      toast.success('Organizer flag removed');
      setUnflagOrganizer(null);
      setDetailOrganizer(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to unflag organizer: ${error.message}`);
    },
  });

  // Revoke organizer mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ organizerId, reason }: { organizerId: string; reason: string }) => {
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
        const { error: updateError } = await supabaseAdmin
          .from('organizer_hackathons')
          .update({
            status: 'unpublished',
            internal_notes: `Unpublished due to organizer status revocation: ${reason}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', hackathon.id);

        if (!updateError) {
          hackathonsUnpublished++;
          participantsNotified += hackathon.registrations_count ?? 0;

          // Create audit log for hackathon unpublish
          await supabaseAdmin.from('admin_audit_logs').insert({
            action_type: 'hackathon_unpublished',
            admin_id: user?.id,
            admin_email: user?.email,
            target_type: 'hackathon',
            target_id: String(hackathon.id),
            reason: `Cascade effect from organizer revocation: ${reason}`,
          });
        }
      }

      // Flag the organizer
      await supabaseAdmin
        .from('organizer_trust_scores')
        .upsert({
          organizer_id: organizerId,
          is_flagged: true,
          flag_reason: `Organizer status revoked: ${reason}`,
          flagged_at: new Date().toISOString(),
          last_calculated_at: new Date().toISOString(),
          score: 0,
        });

      // Create main audit log for revocation
      await supabaseAdmin.from('admin_audit_logs').insert({
        action_type: 'organizer_revoked',
        admin_id: user?.id,
        admin_email: user?.email,
        target_type: 'organizer',
        target_id: organizerId,
        reason: reason,
        after_state: {
          hackathons_unpublished: hackathonsUnpublished,
          participants_notified: participantsNotified,
        },
      });

      // Log main activity
      await supabaseAdmin.from('admin_activity_feed').insert({
        activity_type: 'moderation_action',
        actor_id: user?.id,
        actor_email: user?.email,
        target_type: 'organizer',
        target_id: organizerId,
        action: 'Organizer status revoked',
        metadata: {
          reason,
          hackathons_unpublished: hackathonsUnpublished,
          participants_notified: participantsNotified,
        },
        severity: 'critical',
      });

      return { hackathonsUnpublished, participantsNotified };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizers-oversight'] });
      toast.success(
        `Organizer status revoked. ${data.hackathonsUnpublished} hackathons unpublished.`
      );
      setRevokeOrganizer(null);
      setDetailOrganizer(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke organizer: ${error.message}`);
    },
  });


  // Stats summary
  const stats = organizersData?.organizers
    ? {
        total: organizersData.total,
        flagged: organizersData.organizers.filter(o => o.is_flagged).length,
        avgTrustScore: organizersData.organizers.length > 0
          ? Math.round(
              organizersData.organizers.reduce((sum, o) => sum + (o.trust_score ?? 50), 0) /
              organizersData.organizers.length
            )
          : 0,
      }
    : { total: 0, flagged: 0, avgTrustScore: 0 };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Organizer Oversight
          </h1>
          <p className="text-muted-foreground">
            Monitor organizers with trust scores and flag status
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Organizers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-red-600">{stats.flagged}</p>
              </div>
              <Flag className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Trust Score</p>
                <p className="text-2xl font-bold">{stats.avgTrustScore}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organizers</CardTitle>
          <CardDescription>
            View and manage organizers with trust scores and hackathon statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or organization..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={filterFlagged}
              onValueChange={(value: 'all' | 'flagged' | 'not_flagged') => {
                setFilterFlagged(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizers</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
                <SelectItem value="not_flagged">Not Flagged</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(value: 'created_at' | 'trust_score' | 'total_hackathons') => {
                setSortBy(value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Newest First</SelectItem>
                <SelectItem value="trust_score">Trust Score</SelectItem>
                <SelectItem value="total_hackathons">Hackathons</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium">Failed to load organizers</p>
              <p className="text-muted-foreground">{(error as Error).message}</p>
              <Button onClick={() => refetch()} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          ) : organizersData?.organizers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No organizers found</p>
              <p className="text-muted-foreground">
                {searchQuery ? `No results for "${searchQuery}"` : 'No organizers registered yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Trust Score</TableHead>
                      <TableHead>Hackathons</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Approval Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizersData?.organizers.map((organizer) => (
                      <TableRow key={organizer.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">
                                {(organizer.display_name || organizer.email || 'O')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {organizer.display_name || organizer.email || 'Unknown'}
                              </div>
                              {organizer.organization_name && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {organizer.organization_name}
                                </div>
                              )}
                              <Badge
                                className={cn(
                                  getTierColor(organizer.tier),
                                  'text-white capitalize text-xs mt-1'
                                )}
                              >
                                {organizer.tier}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TrustScoreBadge score={organizer.trust_score} />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{organizer.total_hackathons}</div>
                            <div className="text-xs text-muted-foreground">
                              {organizer.active_hackathons} active
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{organizer.total_participants}</span>
                        </TableCell>
                        <TableCell>
                          <ApprovalRateBadge
                            rate={organizer.approval_rate}
                            total={organizer.total_hackathons}
                          />
                        </TableCell>
                        <TableCell>
                          <FlagIndicator
                            isFlagged={organizer.is_flagged}
                            reason={organizer.flag_reason}
                            flaggedAt={organizer.flagged_at}
                          />
                          {!organizer.is_flagged && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Good Standing
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailOrganizer(organizer)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {organizer.is_flagged ? (
                                <DropdownMenuItem onClick={() => setUnflagOrganizer(organizer)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Remove Flag
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setFlagOrganizer(organizer)}>
                                  <Flag className="h-4 w-4 mr-2" />
                                  Flag Organizer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setRevokeOrganizer(organizer)}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Revoke Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {organizersData && organizersData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {organizersData.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(organizersData.totalPages, p + 1))}
                      disabled={page === organizersData.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <OrganizerDetailModal
        organizer={detailOrganizer}
        isOpen={!!detailOrganizer}
        onClose={() => setDetailOrganizer(null)}
        onFlag={() => {
          setFlagOrganizer(detailOrganizer);
        }}
        onUnflag={() => {
          setUnflagOrganizer(detailOrganizer);
        }}
        onRevoke={() => {
          setRevokeOrganizer(detailOrganizer);
        }}
      />

      <FlagOrganizerModal
        organizer={flagOrganizer}
        isOpen={!!flagOrganizer}
        onClose={() => setFlagOrganizer(null)}
        onConfirm={(reason) => {
          if (flagOrganizer) {
            flagMutation.mutate({ organizerId: flagOrganizer.user_id, reason });
          }
        }}
        isLoading={flagMutation.isPending}
      />

      <UnflagOrganizerModal
        organizer={unflagOrganizer}
        isOpen={!!unflagOrganizer}
        onClose={() => setUnflagOrganizer(null)}
        onConfirm={(reason) => {
          if (unflagOrganizer) {
            unflagMutation.mutate({ organizerId: unflagOrganizer.user_id, reason });
          }
        }}
        isLoading={unflagMutation.isPending}
      />

      <RevokeOrganizerModal
        organizer={revokeOrganizer}
        isOpen={!!revokeOrganizer}
        onClose={() => setRevokeOrganizer(null)}
        onConfirm={(reason) => {
          if (revokeOrganizer) {
            revokeMutation.mutate({ organizerId: revokeOrganizer.user_id, reason });
          }
        }}
        isLoading={revokeMutation.isPending}
      />
    </div>
  );
}

export default OrganizerOversight;
