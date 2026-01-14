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
  Trash2,
  UserMinus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAdminList,
  useUpdateAdminRole,
  useAdminActivity,
  useCreateAdminRole,
  useAdminRole,
  useDeleteAdminRole,
} from '@/hooks/useAdminRoles';
import { supabaseAdmin } from '@/lib/supabase';
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
 * Add Admin Modal
 * Allows super admins to add new admins by searching users
 */
function AddAdminModal({
  isOpen,
  onClose,
  onSuccess,
  actingAdminId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actingAdminId: string;
}) {
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    full_name: string | null;
    username: string | null;
    role: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRoleType>('moderator');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    email: string;
    full_name: string | null;
    username: string | null;
    role: string;
  }>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const createAdminMutation = useCreateAdminRole();

  // Search for users by email
  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedUser(null);

    try {
      // Search in profiles table
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, username, role')
        .ilike('email', `%${searchEmail}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users who are already admins in admin_roles
      const { data: existingAdmins } = await supabaseAdmin
        .from('admin_roles')
        .select('user_id');

      const existingAdminIds = new Set(existingAdmins?.map(a => a.user_id) ?? []);
      const availableUsers = profiles?.filter(p => !existingAdminIds.has(p.id)) ?? [];

      setSearchResults(availableUsers);
      
      if (availableUsers.length === 0) {
        setSearchError('No users found or all matching users are already admins');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle adding the admin
  const handleAddAdmin = async () => {
    if (!selectedUser) return;

    try {
      // First, update the user's profile role to 'admin' if not already
      if (selectedUser.role !== 'admin') {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', selectedUser.id);

        if (profileError) {
          throw new Error(`Failed to update profile role: ${profileError.message}`);
        }
      }

      // Then create the admin_roles entry
      await createAdminMutation.mutateAsync({
        input: {
          user_id: selectedUser.id,
          role: selectedRole,
        },
        actingAdminId,
      });

      toast.success(`${selectedUser.email} has been added as ${selectedRole.replace('_', ' ')}`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add admin');
    }
  };

  const handleClose = () => {
    setSearchEmail('');
    setSelectedUser(null);
    setSelectedRole('moderator');
    setSearchResults([]);
    setSearchError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Admin
          </DialogTitle>
          <DialogDescription>
            Search for a user by email and assign them an admin role
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search User by Email</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching || !searchEmail.trim()}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'p-3 cursor-pointer hover:bg-muted transition-colors',
                      selectedUser?.id === user.id && 'bg-muted'
                    )}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.full_name || user.username || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      {selectedUser?.id === user.id && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Error */}
          {searchError && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">{searchError}</p>
            </div>
          )}

          {/* Selected User & Role Selection */}
          {selectedUser && (
            <>
              <Separator />
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Selected User</p>
                <p className="font-medium">{selectedUser.full_name || selectedUser.username}</p>
                <p className="text-sm">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Role</label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as AdminRoleType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_ADMIN_ROLES.filter(role => role !== 'super_admin').map((role) => {
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
                <p className="text-xs text-muted-foreground">
                  Note: Super Admin role can only be assigned directly in the database for security.
                </p>
              </div>

              {/* Permission Preview - Compact */}
              <PermissionPreview role={selectedRole} />
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddAdmin} 
            disabled={!selectedUser || createAdminMutation.isPending}
          >
            {createAdminMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  onRemove,
  canManage,
  isCurrentUser,
}: {
  admin: AdminWithRole;
  onViewActivity: (admin: AdminWithRole) => void;
  onChangeRole: (admin: AdminWithRole) => void;
  onRemove: (admin: AdminWithRole) => void;
  canManage: boolean;
  isCurrentUser: boolean;
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
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
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
        {canManage && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangeRole(admin)}
              className="flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Role
            </Button>
            {!isCurrentUser && admin.role !== 'super_admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemove(admin)}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <UserMinus className="h-3 w-3" />
                Remove
              </Button>
            )}
          </>
        )}
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
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Fetch admin list
  const { data, isLoading, error, refetch } = useAdminList(page, 20);

  // Get current user's admin role to check if they're super_admin
  const { data: currentUserRole } = useAdminRole(user?.id);
  const isSuperAdmin = currentUserRole?.role === 'super_admin';
  const canManageAdmins = currentUserRole?.permissions?.can_manage_admins === true;

  // Update role mutation
  const updateRoleMutation = useUpdateAdminRole();
  
  // Delete admin mutation
  const deleteAdminMutation = useDeleteAdminRole();

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

  // Handle remove admin
  const handleRemoveAdmin = useCallback((admin: AdminWithRole) => {
    setSelectedAdmin(admin);
    setIsRemoveModalOpen(true);
  }, []);

  // Confirm remove admin
  const confirmRemoveAdmin = useCallback(async () => {
    if (!selectedAdmin || !user?.id) return;

    try {
      await deleteAdminMutation.mutateAsync({
        targetUserId: selectedAdmin.user_id,
        actingAdminId: user.id,
        reason: 'Removed by super admin',
      });
      setIsRemoveModalOpen(false);
      setSelectedAdmin(null);
      refetch();
    } catch (err) {
      // Error is handled by the mutation
    }
  }, [selectedAdmin, user?.id, deleteAdminMutation, refetch]);

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
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button onClick={() => setIsAddAdminModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
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
                      onRemove={handleRemoveAdmin}
                      canManage={canManageAdmins}
                      isCurrentUser={admin.user_id === user?.id}
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

      {/* Add Admin Modal (Super Admin Only) */}
      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        onSuccess={() => refetch()}
        actingAdminId={user?.id ?? ''}
      />

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

      {/* Remove Admin Confirmation Modal */}
      <Dialog open={isRemoveModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsRemoveModalOpen(false);
          setSelectedAdmin(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserMinus className="h-5 w-5" />
              Remove Admin
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove admin access for this user?
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{selectedAdmin.full_name || selectedAdmin.username || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                <Badge className={getRoleBadgeColor(selectedAdmin.role)}>
                  {selectedAdmin.role.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This will remove their admin role and revert their account to a regular user. They will no longer be able to access the admin panel.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRemoveModalOpen(false);
                setSelectedAdmin(null);
              }}
              disabled={deleteAdminMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveAdmin}
              disabled={deleteAdminMutation.isPending}
            >
              {deleteAdminMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove Admin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
