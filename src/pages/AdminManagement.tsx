/**
 * Admin Management Page
 * 
 * Comprehensive admin management with role assignment, activity tracking,
 * and permission management.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Search,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  UserPlus,
  RefreshCw,
  Calendar,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  History,
  Target,
  User,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAdminList,
  useUpdateAdminRole,
  useAdminActivity,
} from '@/hooks/useAdminRoles';
import {
  VALID_ADMIN_ROLES,
  DEFAULT_PERMISSIONS_BY_ROLE,
  getEnabledPermissions,
  countEnabledPermissions,
} from '@/lib/adminRoleCore';
import type {
  AdminWithRole,
  AdminRoleType,
  AdminPermissions,
  AdminPermission,
} from '@/types/adminRole';

/**
 * Format permission name for display
 */
function formatPermissionName(permission: string): string {
  return permission
    .replace('can_', '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get role badge color
 */
function getRoleBadgeColor(role: AdminRoleType): string {
  switch (role) {
    case 'super_admin':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    case 'admin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case 'moderator':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case 'viewer':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get role icon
 */
function getRoleIcon(role: AdminRoleType) {
  switch (role) {
    case 'super_admin':
      return ShieldAlert;
    case 'admin':
      return ShieldCheck;
    case 'moderator':
      return Shield;
    case 'viewer':
      return Eye;
    default:
      return Shield;
  }
}

/**
 * Format action type for display
 */
function formatActionType(actionType: string): string {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get action type badge color
 */
function getActionTypeBadgeColor(actionType: string): string {
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
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
}


/**
 * Permission Preview Component
 * Shows permissions for a role with enabled/disabled indicators
 */
function PermissionPreview({ 
  role, 
  customPermissions 
}: { 
  role: AdminRoleType; 
  customPermissions?: Partial<AdminPermissions>;
}) {
  const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[role];
  const permissions = customPermissions 
    ? { ...defaultPerms, ...customPermissions } 
    : defaultPerms;
  
  const enabledCount = countEnabledPermissions(permissions);
  const totalCount = Object.keys(permissions).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Permissions</span>
        <Badge variant="outline">
          {enabledCount}/{totalCount} enabled
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(permissions) as [AdminPermission, boolean][]).map(([perm, enabled]) => (
          <div
            key={perm}
            className={cn(
              'flex items-center gap-2 text-xs p-2 rounded',
              enabled 
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                : 'bg-gray-50 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500'
            )}
          >
            {enabled ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span className="truncate">{formatPermissionName(perm)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Role Assignment Modal
 * Requirement 9.2: Role dropdown with permission preview
 */
function RoleAssignmentModal({
  admin,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: {
  admin: AdminWithRole | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: AdminRoleType) => void;
  isLoading: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<AdminRoleType>(admin?.role ?? 'moderator');

  if (!admin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Change Admin Role
          </DialogTitle>
          <DialogDescription>
            Update the role for {admin.full_name || admin.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Role */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Current Role</span>
            <Badge className={getRoleBadgeColor(admin.role)}>
              {admin.role.replace('_', ' ')}
            </Badge>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">New Role</label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as AdminRoleType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {VALID_ADMIN_ROLES.map((role) => {
                  const Icon = getRoleIcon(role);
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{role.replace('_', ' ')}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Permission Preview */}
          <PermissionPreview role={selectedRole} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave(selectedRole)} 
            disabled={isLoading || selectedRole === admin.role}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Admin Activity Modal
 * Requirement 9.5: Filter actions by admin with date range
 */
function AdminActivityModal({
  admin,
  isOpen,
  onClose,
}: {
  admin: AdminWithRole | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useAdminActivity(
    admin?.user_id,
    {
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      page,
      limit: 10,
    }
  );

  const handleApplyFilters = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  if (!admin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Admin Activity
          </DialogTitle>
          <DialogDescription>
            Actions taken by {admin.full_name || admin.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Range Filters */}
          <div className="flex items-end gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button size="sm" onClick={handleApplyFilters}>
                Apply
              </Button>
            </div>
          </div>

          {/* Activity List */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load activity: {error.message}</span>
              </div>
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No activity found</p>
              <p className="text-sm">This admin hasn't performed any actions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.logs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={getActionTypeBadgeColor(log.action_type)}>
                        {formatActionType(log.action_type)}
                      </Badge>
                      <Badge variant="outline">{log.target_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {log.reason}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span className="font-mono">{log.target_id.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {data.total} total actions
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Admin Row Component
 * Requirement 9.1: Display role, last active, action counts
 */
function AdminRow({
  admin,
  onViewActivity,
  onChangeRole,
}: {
  admin: AdminWithRole;
  onViewActivity: (admin: AdminWithRole) => void;
  onChangeRole: (admin: AdminWithRole) => void;
}) {
  const RoleIcon = getRoleIcon(admin.role);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={admin.avatar_url || undefined} />
          <AvatarFallback>{getInitials(admin.full_name)}</AvatarFallback>
        </Avatar>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              {admin.full_name || admin.username || 'Unknown User'}
            </h3>
            <Badge className={cn('flex items-center gap-1', getRoleBadgeColor(admin.role))}>
              <RoleIcon className="h-3 w-3" />
              {admin.role.replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {admin.email}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {admin.action_count} actions
            </span>
            {admin.last_active && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last active {formatDistanceToNow(new Date(admin.last_active), { addSuffix: true })}
              </span>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Admin since {format(new Date(admin.created_at), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewActivity(admin)}
          className="flex items-center gap-1"
        >
          <History className="h-3 w-3" />
          Activity
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChangeRole(admin)}
          className="flex items-center gap-1"
        >
          <Settings className="h-3 w-3" />
          Role
        </Button>
      </div>
    </div>
  );
}


/**
 * Main Admin Management Page Component
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */
export function AdminManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminWithRole | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Fetch admin list
  const { data, isLoading, error, refetch } = useAdminList(page, 20);

  // Update role mutation
  const updateRoleMutation = useUpdateAdminRole();

  // Filter admins by search term
  const filteredAdmins = data?.admins.filter(admin => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      admin.email?.toLowerCase().includes(term) ||
      admin.username?.toLowerCase().includes(term) ||
      admin.full_name?.toLowerCase().includes(term) ||
      admin.role.toLowerCase().includes(term)
    );
  }) ?? [];

  // Handle role change
  const handleRoleChange = useCallback(async (newRole: AdminRoleType) => {
    if (!selectedAdmin || !user?.id) return;

    try {
      await updateRoleMutation.mutateAsync({
        targetUserId: selectedAdmin.user_id,
        input: { role: newRole },
        actingAdminId: user.id,
      });
      setIsRoleModalOpen(false);
      setSelectedAdmin(null);
    } catch (err) {
      // Error is handled by the mutation
    }
  }, [selectedAdmin, user?.id, updateRoleMutation]);

  // Handle view activity
  const handleViewActivity = useCallback((admin: AdminWithRole) => {
    setSelectedAdmin(admin);
    setIsActivityModalOpen(true);
  }, []);

  // Handle change role
  const handleChangeRole = useCallback((admin: AdminWithRole) => {
    setSelectedAdmin(admin);
    setIsRoleModalOpen(true);
  }, []);

  // Calculate stats
  const stats = {
    total: data?.total ?? 0,
    superAdmins: data?.admins.filter(a => a.role === 'super_admin').length ?? 0,
    admins: data?.admins.filter(a => a.role === 'admin').length ?? 0,
    moderators: data?.admins.filter(a => a.role === 'moderator').length ?? 0,
    viewers: data?.admins.filter(a => a.role === 'viewer').length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage admin roles and view activity
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.superAdmins}</p>
                <p className="text-xs text-muted-foreground">Super Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.moderators}</p>
                <p className="text-xs text-muted-foreground">Moderators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.viewers}</p>
                <p className="text-xs text-muted-foreground">Viewers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Admin List
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admins by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Admin List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {filteredAdmins.length} Admin{filteredAdmins.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Error state */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to load admins: {error.message}</span>
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
              {!isLoading && !error && filteredAdmins.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No admins found</p>
                  <p className="text-sm">
                    {searchTerm ? 'Try adjusting your search' : 'No administrators have been added yet'}
                  </p>
                </div>
              )}

              {/* Admin list */}
              {!isLoading && !error && filteredAdmins.length > 0 && (
                <div className="space-y-2">
                  {filteredAdmins.map((admin) => (
                    <AdminRow
                      key={admin.id}
                      admin={admin}
                      onViewActivity={handleViewActivity}
                      onChangeRole={handleChangeRole}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {data.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VALID_ADMIN_ROLES.map((role) => {
              const Icon = getRoleIcon(role);
              const permissions = DEFAULT_PERMISSIONS_BY_ROLE[role];
              const enabledPerms = getEnabledPermissions(permissions);

              return (
                <Card key={role}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {role.replace('_', ' ')}
                    </CardTitle>
                    <CardDescription>
                      {enabledPerms.length} permissions enabled
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PermissionPreview role={role} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Assignment Modal */}
      <RoleAssignmentModal
        admin={selectedAdmin}
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedAdmin(null);
        }}
        onSave={handleRoleChange}
        isLoading={updateRoleMutation.isPending}
      />

      {/* Admin Activity Modal */}
      <AdminActivityModal
        admin={selectedAdmin}
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setSelectedAdmin(null);
        }}
      />
    </div>
  );
}
